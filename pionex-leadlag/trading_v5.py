#!/usr/bin/env python3
"""Pionex BTC lead-lag V5: chronologically separated validation for spot trading.

Output is observational trading research, NOT a real execution guarantee.
Hourly closes: signal at close t, entry proxy at close t+1, exit close t+1+H.
Train 55%, tune 20%, untouched final test 25%, embargo at boundaries.
Only one selected hypothesis per coin is tested; Benjamini-Hochberg across coins.
"""
from __future__ import annotations
import datetime as dt
import json
import math
import random
import statistics
import time
from pathlib import Path
from analysis import (HOUR, HOUR_DIR, DATA, parallel_collect,
                      tickers_and_symbols, try_commit, say)

DAY = 24 * HOUR
DAYS = 180
MAX_COINS = 60
HORIZONS = (3, 6, 12)
LAGS = (1, 2, 3, 4, 6, 9, 12, 18, 24)
FEE_PER_SIDE = .10
SLIPPAGE_PER_SIDE = .07
MIN_VOLUME_USDT = 300_000
MAX_SPREAD_PCT = .35
MIN_TUNE_TRADES = 10
MIN_TEST_TRADES = 25
FDR_LIMIT = .05
ROUNDTRIP_EXTRA_PCT = 2 * (FEE_PER_SIDE + SLIPPAGE_PER_SIDE)


def ret(x, y):
    return 100 * math.log(y / x) if x is not None and y is not None and x > 0 and y > 0 else None


def quantile(xs, p):
    if not xs:
        return None
    xs = sorted(xs)
    k = (len(xs) - 1) * p
    lo = int(k)
    hi = min(len(xs) - 1, lo + 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


def avg(xs):
    return sum(xs) / len(xs) if xs else None


def stdev(xs):
    return statistics.stdev(xs) if len(xs) > 1 else 0.0


def wilson(success, n, z=1.96):
    if not n:
        return (0.0, 1.0)
    p = success / n
    den = 1 + z*z/n
    center = (p + z*z/(2*n))/den
    width = z*math.sqrt(p*(1-p)/n + z*z/(4*n*n))/den
    return max(0, center-width), min(1, center+width)


def beta_fit(btc, alt, end):
    pairs = []
    for i in range(3, end-12, 3):
        br = ret(btc[i-3], btc[i])
        ar = ret(alt[i-3], alt[i])
        if br is not None and ar is not None:
            pairs.append((br, ar))
    if len(pairs) < 100:
        return 1.0
    xb = avg([p[0] for p in pairs])
    ya = avg([p[1] for p in pairs])
    denom = sum((x-xb)**2 for x,y in pairs)
    return min(3.0, max(.20, sum((x-xb)*(y-ya) for x,y in pairs)/denom if denom > 1e-8 else 1.0))


def training_params(btc, alt, cut, spread):
    impulses = []
    for t in range(3, cut-25, 3):
        d = ret(btc[t-3], btc[t])
        if d is not None:
            impulses.append(max(0.0, d))
    positives = [v for v in impulses if v > 0]
    if len(positives) < 100:
        return None
    # This threshold is frozen before touching validation and final test.
    threshold = max(.30, quantile(positives, .50))
    # One full displayed spread and two-sided fees and slippage; account-specific
    # fees and real bid/ask fills must be verified before any live order.
    cost = ROUNDTRIP_EXTRA_PCT + spread
    return {"threshold": threshold, "beta": beta_fit(btc, alt, cut),
            "cost": cost, "target": max(.50, math.ceil((cost+.15)*4)/4)}


def signal(btc, alt, t, lag, pars):
    ev = t-lag
    if ev < 3 or t >= len(btc):
        return None
    impulse = ret(btc[ev-3], btc[ev])
    if impulse is None:
        return None
    already = ret(alt[ev], alt[t])
    if already is None:
        return None
    # BTC must have climbed materially; ALT must not have already repriced.
    room = max(.20, .55 * pars["beta"] * impulse)
    return {"shock_pct": impulse, "repriced_pct": already,
            "room_pct": room, "event_index": ev,
            "strong": impulse >= pars["threshold"],
            "not_repriced": already < room,
            "active": impulse >= pars["threshold"] and already < room}


def trade_return(alt, t, horizon, cost):
    """Conservative close-proxy fill one FULL hourly bar AFTER decision.
    This deliberately avoids filling at a close known only after it occurred.
    Yet actual order fills can be worse: NOT an executable price model.
    """
    gross = ret(alt[t+1], alt[t+1+horizon]) if t+1+horizon < len(alt) else None
    return (gross-cost) if gross is not None else None


def find_trades(btc, alt, begin, end, lag, horizon, pars, mode="lead"):
    """Trade candidates never overlap; selection is made at most once per horizon.
    No access to future price data during the signal decision.
    """
    trades=[]
    start=max(begin, lag+5)
    t=start
    while t < min(end,len(alt)-horizon-2):
        if mode=="lead":
            sg=signal(btc,alt,t,lag,pars)
            active=sg is not None and sg["active"]
        elif mode=="btc_only":
            x=ret(btc[t-3],btc[t])
            active=x is not None and x >= pars["threshold"]
        else:
            active=True
        if active:
            net=trade_return(alt,t,horizon,pars["cost"])
            gross=ret(alt[t+1],alt[t+1+horizon])
            b_forward=ret(btc[t+1],btc[t+1+horizon])
            if net is not None:
                trades.append({"t":t,"net":net,"gross":gross,
                               "btc_forward":b_forward,"signal":sg if mode=="lead" else None})
                t+=horizon+1
                continue
        t+=1
    return trades


def metrics(trades, horizon, pars, beta):
    vals=[x["net"] for x in trades]
    gross=[x["gross"] for x in trades]
    afterbtc=[x["net"]-beta*x["btc_forward"]
              for x in trades if x["btc_forward"] is not None]
    n=len(vals)
    if not n:
        return {"n":0,"hit_prob_pct":None,"hit_ci_pct":None,
                "net_profit_prob_pct":None,"avg_net_pct":None,
                "btc_excess_net_pct":None,"net_ci_pct":None,"drawdown_pct":None,
                "profit_factor":None,"wins":0,"median_net_pct":None,"loss_risk_pct":None}
    hits=sum(v>=pars["target"] for v in vals)
    netwins=sum(v>0 for v in vals)
    loss=sum(v<=-1 for v in vals)
    good=sum(v for v in vals if v>0)
    bad=-sum(v for v in vals if v<0)
    equity=0.0;peak=0.0;maxdd=0.0
    for v in vals:
        equity+=v;peak=max(peak,equity);maxdd=max(maxdd,peak-equity)
    low,high=wilson(netwins,n)
    return {"n":n,"wins":netwins,"hit_prob_pct":round(100*(hits+2)/(n+4),1),
            "hit_ci_pct":[round(100*x,1) for x in wilson(hits,n)],
            "net_profit_prob_pct":round(100*(netwins+2)/(n+4),1),
            "profit_ci_pct":[round(100*low,1),round(100*high,1)],
            "avg_net_pct":round(avg(vals),3),
            "median_net_pct":round(statistics.median(vals),3),
            "btc_excess_net_pct":round(avg(afterbtc),3) if afterbtc else None,
            "profit_factor":round(good/bad,2) if bad>0 else (99 if good>0 else 0),
            "drawdown_pct":round(maxdd,2),
            "loss_risk_pct":round(100*loss/n,1)}


def bootstrap_mean_low(data, seed=17, reps=500, block=3):
    if len(data)<3:
        return None
    rng=random.Random(seed)
    n=len(data)
    results=[]
    for _ in range(reps):
        sample=[]
        while len(sample)<n:
            j=rng.randrange(n)
            sample.extend(data[(j+k)%n] for k in range(block))
        results.append(avg(sample[:n]))
    return quantile(results,.05)


def train_validate(btc, alt, cut_train, cut_validate, pars):
    best=None
    for lag in LAGS:
        for horizon in HORIZONS:
            # Separate training split for regime stability; no validation data
            # influences the definition of the BTC event or cost assumptions.
            first=find_trades(btc,alt,27,cut_train//2-lag-horizon-2,
                              lag,horizon,pars)
            second=find_trades(btc,alt,cut_train//2,cut_train-lag-horizon-2,
                               lag,horizon,pars)
            val=find_trades(btc,alt,cut_train+lag+horizon+4,
                            cut_validate-lag-horizon-2,lag,horizon,pars)
            if len(val)<MIN_TUNE_TRADES or min(len(first),len(second))<7:
                continue
            train_a=avg([x["net"] for x in first])
            train_b=avg([x["net"] for x in second])
            valavg=avg([x["net"] for x in val])
            if valavg is None:
                continue
            # The training period must not be catastrophically negative in either half.
            if min(train_a,train_b)<-.50:
                continue
            vbaseline=find_trades(btc,alt,cut_train+lag+horizon+4,
                                  cut_validate-lag-horizon-2,lag,horizon,
                                  pars,"btc_only")
            baseavg=avg([x["net"] for x in vbaseline]) or 0.0
            # Data-driven ranking is confined to validation only.
            score=valavg-.50*max(baseavg,0)+.002*len(val)
            # Do not optimize solely for the highest win probability.
            if best is None or score>best[0]:
                best=(score,lag,horizon,len(val),valavg,baseavg,
                      round(train_a,3),round(train_b,3))
    return best


def evaluate_coin(info, btc_bars, alt_bars, generated):
    times=[t for t,c in btc_bars]
    btc=[v for _,v in btc_bars]
    alt_by_time=dict(alt_bars)
    alt=[alt_by_time.get(t) for t in times]
    n=len(times)
    if n<2000 or sum(x is not None for x in alt)<n*.85:
        return None
    cut_train=int(n*.55)
    cut_val=int(n*.75)
    pars=training_params(btc,alt,cut_train,info["spread_pct"])
    if pars is None:
        return None
    selected=train_validate(btc,alt,cut_train,cut_val,pars)
    if selected is None:
        return None
    score,lag,horizon,nval,valnet,valbtc,halfa,halfb=selected
    # Untouched final 25%, with embargo for overlapping future labels.
    begin=cut_val+lag+horizon+3
    limit=n-horizon-2
    hold=find_trades(btc,alt,begin,limit,lag,horizon,pars)
    btc_reference=find_trades(btc,alt,begin,limit,lag,horizon,pars,"btc_only")
    passive_reference=find_trades(btc,alt,begin,limit,lag,horizon,pars,"unconditional")
    perf=metrics(hold,horizon,pars,pars["beta"])
    btc_ref=metrics(btc_reference,horizon,pars,pars["beta"])
    passive=metrics(passive_reference,horizon,pars,pars["beta"])
    rets=[x["net"] for x in hold]
    alpha=[x["net"]-pars["beta"]*x["btc_forward"]
           for x in hold if x["btc_forward"] is not None]
    low=bootstrap_mean_low(rets,seed=13+len(info["symbol"])*5)
    alpha_low=bootstrap_mean_low(alpha,seed=29+len(info["symbol"])*7)
    control_means=[m["avg_net_pct"] for m in (btc_ref,passive)
                   if m["avg_net_pct"] is not None]
    strongest_baseline=max(control_means) if control_means else None
    excess=round(perf["avg_net_pct"]-strongest_baseline,3) if strongest_baseline is not None and perf["avg_net_pct"] is not None else None
    # Current signal must use only the LAST COMPLETED bar. Entry would be
    # estimated at NEXT hourly close, never represented as a guaranteed fill.
    now_index=n-1
    live=signal(btc,alt,now_index,lag,pars)
    if live is None:
        return None
    valid_market=(info["spread_pct"]<=MAX_SPREAD_PCT and
                  info["volume_24h_usdt"]>=MIN_VOLUME_USDT)
    historical=(perf["n"]>=MIN_TEST_TRADES and
                perf["avg_net_pct"] is not None and
                perf["avg_net_pct"]>0 and
                excess is not None and excess>.12 and
                low is not None and low>0 and
                alpha_low is not None and alpha_low>0 and
                perf["net_profit_prob_pct"]>=55 and
                valnet>0 and
                halfa>-.15 and halfb>-.15)
    # Approximate one-sided normal p for net returns above strongest benchmark;
    # BH across all post-selection coin tests; final gate ALSO uses bootstrap.
    if perf["n"]>=4 and strongest_baseline is not None:
        vals=rets
        sem=stdev(vals)/math.sqrt(len(vals))
        z=((avg(vals)-strongest_baseline)/sem) if sem>1e-8 else -999
        pvalue=.5*math.erfc(z/math.sqrt(2))
    else:
        pvalue=1.
    now=dt.datetime.fromtimestamp(times[-1]/1000,dt.timezone.utc)
    signal_t=dt.datetime.fromtimestamp(times[live["event_index"]]/1000,dt.timezone.utc)
    return {
        "symbol":info["symbol"],"lag_hours":lag,"horizon_hours":horizon,
        "target_net_pct":round(pars["target"],2),
        "signal_time_utc":signal_t.isoformat(timespec="minutes"),
        "latest_bar_utc":now.isoformat(timespec="minutes"),
        "btc_signal_pct":round(live["shock_pct"],2),
        "coin_since_signal_pct":round(live["repriced_pct"],2),
        "unpriced_limit_pct":round(live["room_pct"],2),
        "signal_current":bool(live["active"]),
        "historical_pass":bool(historical),
        "market_valid":bool(valid_market),
        "fdr_p":pvalue,
        "volume_24h_usdt":round(info["volume_24h_usdt"]),
        "spread_pct":round(info["spread_pct"],4),
        "assumed_round_trip_cost_pct":round(pars["cost"],3),
        "training":{"train_half_net_pct":[halfa,halfb],"validation_avg_net_pct":round(valnet,3),
                    "validation_n":nval,"validation_btc_only_pct":round(valbtc,3)},
        "test":{"first_date_utc":dt.datetime.fromtimestamp(times[begin]/1000,dt.timezone.utc).isoformat(timespec="minutes"),
                **perf,
                "net_lower90_pct":round(low,3) if low is not None else None,
                "btc_excess_net_lower90_pct":round(alpha_low,3) if alpha_low is not None else None,
                "btc_only_avg_net_pct":btc_ref["avg_net_pct"],
                "buy_anytime_avg_net_pct":passive["avg_net_pct"],
                "edge_over_best_baseline_pct":excess},
        "status":"calculating"
    }


def fdr_adjust(rows):
    # Benjamini-Hochberg only for one FROZEN model per eligible coin.
    rank=sorted(rows,key=lambda x:x["fdr_p"])
    m=len(rank)
    q=1.
    for i in range(m-1,-1,-1):
        row=rank[i]
        q=min(q, m * row["fdr_p"]/(i+1))
        row["fdr_q"]=round(q,5)
    for row in rows:
        p=row["test"]
        confirmed=(row["historical_pass"] and row["fdr_q"]<=FDR_LIMIT and
                   row["market_valid"])
        row["validated"]=confirmed
        row["status"]=("opportunity" if confirmed and row["signal_current"] else
                       "validated_inactive" if confirmed else
                       "watch" if row["signal_current"] and row["market_valid"] and
                         p["n"]>=12 and
                         p["avg_net_pct"] is not None and p["avg_net_pct"]>0 and
                         p["edge_over_best_baseline_pct"] is not None and
                         p["edge_over_best_baseline_pct"]>0 else
                       "excluded")


def changes(bars):
    d=dict(bars);t=bars[-1][0]
    return {str(h)+"h":round(ret(d.get(t-h*HOUR),d[t]),2)
            if ret(d.get(t-h*HOUR),d[t]) is not None else None for h in (3,6,24)}


def run():
    now=(int(time.time()*1000)//HOUR)*HOUR
    symbols=tickers_and_symbols()[:MAX_COINS]
    btc_info={"symbol":"BTC_USDT","volume_24h_usdt":0,"spread_pct":0}
    prices, errors=parallel_collect([btc_info]+symbols,"60M",HOUR,DAYS,
                                   HOUR_DIR,now,5)
    if len(prices.get("BTC_USDT",[]))<2000:
        raise ValueError("BTC series incomplete; stale results retained")
    btc=prices["BTC_USDT"]
    results=[]
    for info in symbols:
        coin=prices.get(info["symbol"])
        if not coin:
            continue
        try:
            row=evaluate_coin(info,btc,coin,now)
            if row:
                results.append(row)
        except Exception as exc:
            say("MODEL ERROR",info["symbol"],str(exc)[:160])
    if len(results)<12:
        raise ValueError("Too few successfully evaluated Pionex pairs")
    fdr_adjust(results)
    status_order={"opportunity":0,"watch":1,"validated_inactive":2,"excluded":3}
    results.sort(key=lambda r:(status_order[r["status"]],
                               -(r["test"]["edge_over_best_baseline_pct"] or -999),
                               -(r["test"]["n"] or 0)))
    summary={
        "version":5,
        "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "data_through":dt.datetime.fromtimestamp((btc[-1][0]+HOUR)/1000,
                                                 dt.timezone.utc).isoformat(timespec="minutes"),
        "period_days":DAYS,"scanned_coins":len(symbols),
        "analyzed_coins":len(results),
        "btc_change_pct":changes(btc),
        "trade_opportunities":sum(x["status"]=="opportunity" for x in results),
        "watch_count":sum(x["status"]=="watch" for x in results),
        "validated_inactive_count":sum(x["status"]=="validated_inactive" for x in results),
        "positive_average_count":sum(x["test"]["avg_net_pct"] is not None
                                     and x["test"]["avg_net_pct"]>0 for x in results),
        "results":results,
        "execution":{"basis":"signal at close t, entry proxy at next hour close t+1, exit close t+1+H",
                     "real_fill_tested":False,
                     "roundtrip_fee_each_side_pct":FEE_PER_SIDE,
                     "slippage_each_side_pct":SLIPPAGE_PER_SIDE,
                     "spread":"1 full observed bid/ask spread"},
        "validation":{"train":.55,"validation":.20,"untouched_test":.25,
                      "select_on":"validation net returns; BTC lead and horizon frozen before final test",
                      "baseline":["BTC immediate momentum","unconditional spot holding"],
                      "uncertainty":"90% 3-trade moving-block bootstrap lower bound, Wilson interval for hit rate",
                      "multiple_testing":"BH over one selected model per coin",
                      "warning":"Not a calibrated future probability; no measured execution fills, no live paper-trade track record"},
        "errors":len(errors)
    }
    DATA.mkdir(exist_ok=True)
    (DATA/"v5.json").write_text(json.dumps(summary,ensure_ascii=False,
                                         separators=(",",":"))+"\n",encoding="utf-8")
    try_commit("Update Pionex V5 true-out-of-sample trading research")
    say("V5 DONE",len(results),"evaluated",
        summary["trade_opportunities"],"eligible",
        summary["watch_count"],"experimental")

if __name__=="__main__":
    run()
