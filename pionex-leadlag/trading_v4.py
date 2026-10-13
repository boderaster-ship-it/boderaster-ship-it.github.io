#!/usr/bin/env python3
"""Pionex BTC lead/lag V4: predefined hourly entry policy, held-out evidence.

This scanner deliberately does NOT issue automated orders. It evaluates spot-long
entry hypotheses at the next hourly open (approximated by close-to-close prices),
estimates round-trip execution costs, and checks an untouched 35% time holdout.
A statistical significance correction is applied across all tested spot pairs.
"""
from __future__ import annotations
import datetime as dt
import math
import statistics
import time
from analysis import (HOUR, HOUR_DIR, DATA, fetch_history, parallel_collect,
                      tickers_and_symbols, try_commit, say)

DAYS = 180
MAX_COINS = 60
HORIZONS = (3, 6, 12)
DELAYS = (2, 3, 6, 9, 12, 18, 24)
FEE_EACH_SIDE_PCT = 0.10  # conservative assumption, NOT official account fee
SLIP_EACH_SIDE_PCT = 0.07  # execution assumption, may be higher
MIN_N_HOLDOUT = 20
MIN_N_TRAIN_HALF = 12
HOUR_MS = 3_600_000

def change(a, b):
    return 100*math.log(b/a) if a and b and a > 0 and b > 0 else None

def quantile(values, part):
    values=sorted(values)
    return values[min(len(values)-1,max(0,int((len(values)-1)*part)))] if values else None

def rebase_data(bars, all_btc):
    lookup=dict(bars)
    return [lookup.get(t) for t in all_btc]

def beta_train(b,a,n):
    # Simple 3-hour synchronous market sensitivity, training only.
    pairs=[]
    for i in range(3,n,3):
        x=change(b[i-3],b[i])
        y=change(a[i-3],a[i])
        if x is not None and y is not None:pairs.append((x,y))
    if len(pairs)<100:return 1.0
    xb=sum(x for x,y in pairs)/len(pairs)
    ya=sum(y for x,y in pairs)/len(pairs)
    den=sum((x-xb)**2 for x,y in pairs)
    result=sum((x-xb)*(y-ya) for x,y in pairs)/den if den>0 else 1.
    return min(2.5,max(.25,result))

def calibration(b,a,train_cut):
    changes=[]
    for t in range(3,train_cut,3):
        x=change(b[t-3],b[t])
        if x is not None:changes.append(abs(x))
    trigger=max(.20,quantile(changes,.60) or .3)
    return trigger,beta_train(b,a,train_cut)

def feature(b,a,t,delay,direction,trigger,beta):
    """All inputs available at close of hour t. No future knowledge."""
    event=t-delay
    if event<3 or t>=len(b) or t>=len(a):return None
    move=change(b[event-3],b[event])
    if move is None:return None
    moved=change(a[event],a[t])
    if moved is None:return None
    # A signal is alive only if ALT has not already made most of BTC-implied move.
    threshold=max(.20,.60*max(.25,beta)*abs(move))
    already=moved*direction
    shock=move*direction>=trigger
    unpriced=already<=threshold
    return {"btc_pct":round(move,3),"already_pct":round(moved,3),
            "unpriced":unpriced,"shock":shock,
            "threshold_pct":round(threshold,3),
            "active":shock and unpriced,
            "event_t":event}

def entries(b,a,start,end,delay,horizon,direction,trigger,beta,cost,origin_hour):
    """Disjoint decision and holding periods; entry cost assumed at observed close."""
    records=[]
    start=max(28+delay,start)
    # Fix sampling phase at epoch zero so training/test timing is comparable.
    start+=(-(start+origin_hour))%horizon
    for t in range(start,min(end,len(b)-horizon)):
        if (t+origin_hour)%horizon:continue
        f=feature(b,a,t,delay,direction,trigger,beta)
        outcome=change(a[t],a[t+horizon])
        if outcome is None:continue
        net=direction*outcome-cost  # for downsides: hypothetical short only
        btc_forward=change(b[t],b[t+horizon])
        alpha_net=direction*(outcome-beta*btc_forward)-cost if btc_forward is not None else None
        records.append((t,f,outcome,net,alpha_net))
    return records

def mean(items):
    return sum(items)/len(items) if items else None

def std(items):
    if len(items)<2:return 0.
    return statistics.stdev(items)

def rates(records,trigger_target,direction):
    all_outcomes=[r[2] for r in records]
    active=[r for r in records if r[1] is not None and r[1]["active"]]
    n=len(active);sample_net=[r[3] for r in active]
    sample_alpha=[r[4] for r in active if r[4] is not None]
    targets=sum(1 for r in active if direction*r[2]>=trigger_target)
    directions=sum(1 for r in active if direction*r[2]>0)
    prior_target=sum(1 for x in all_outcomes if direction*x>=trigger_target)/len(all_outcomes) if all_outcomes else 0
    # Compare against an ALT-return-state-matched no-BTC-shock group, too.
    comparable=[r for r in records if r[1] is not None and r[1]["unpriced"] and not r[1]["shock"]]
    other=[r for r in records if r[1] is None or not r[1]["active"]]
    control=comparable if len(comparable)>=25 else other
    comp_base=(sum(1 for r in control if direction*r[2]>=trigger_target)/len(control)) if control else prior_target
    baseline=max(comp_base,prior_target)
    p=(targets+2)/(n+4) if n else 0
    q=(directions+2)/(n+4) if n else 0
    av=mean(sample_net)
    sem=(std(sample_net)/math.sqrt(n)) if n>1 else None
    # Conservative normal approximation; small-N cases cannot be strong signals.
    low=av-1.96*sem if av is not None and sem is not None else None
    alpha_mean=mean(sample_alpha)
    alpha_low=(alpha_mean-1.96*std(sample_alpha)/math.sqrt(len(sample_alpha))
               if len(sample_alpha)>1 else None)
    # One-sided, independent-group two-proportion comparison, with a
    # conservative baseline that is at least as high as the unconditional rate.
    n0=len(control);wins0=sum(1 for r in control if direction*r[2]>=trigger_target)
    if n>=2 and n0>=20 and .0001<baseline<.9999:
        pooled=(targets+wins0)/(n+n0)
        se=math.sqrt(max(1e-8,pooled*(1-pooled)*(1/n+1/n0)))
        z=(targets/n-baseline)/se
        pval=.5*math.erfc(z/math.sqrt(2))
    else:pval=1.
    return {"n":n,"success":targets,"success_direction":directions,
            "p_target":round(100*p,1),"p_direction":round(100*q,1),
            "base_target":round(100*baseline,1),
            "delta_pp":round(100*(p-baseline),1),
            "net_average_pct":round(av,3) if av is not None else None,
            "net_lower95_pct":round(low,3) if low is not None else None,
            "btc_adjusted_net_mean_pct":round(alpha_mean,3) if alpha_mean is not None else None,
            "btc_adjusted_net_lower95_pct":round(alpha_low,3) if alpha_low is not None else None,
            "p_value":pval,
            "n_baseline":len(records),"mean_net":av or 0.}

def fit_model(b,a,cut,trigger,beta,spread,origin_hour):
    """Select a fixed hypothesis using TRAINING ONLY."""
    cost=2*FEE_EACH_SIDE_PCT+2*SLIP_EACH_SIDE_PCT+spread
    target=max(.50,math.ceil((cost+.15)*4)/4)
    midpoint=cut//2
    candidates=[]
    # Only upward price direction can be traded on Pionex spot.
    for direction in (1,-1):
        for horizon in HORIZONS:
            for delay in DELAYS:
                # delay >= h? This would make the event older than the horizon.
                # It's allowed if the current asset price is still underreacting.
                first=entries(b,a,30,midpoint-horizon,delay,horizon,direction,trigger,beta,cost,origin_hour)
                second=entries(b,a,midpoint,cut-horizon,delay,horizon,direction,trigger,beta,cost,origin_hour)
                q1=rates(first,target,direction);q2=rates(second,target,direction)
                if min(q1["n"],q2["n"])<MIN_N_TRAIN_HALF:continue
                # Penalize unstable regimes and weak samples; no look at held-out.
                delta=min(q1["delta_pp"],q2["delta_pp"])
                av=min(q1["mean_net"],q2["mean_net"])
                score=.6*delta+8*av+.7*min(q1["n"],q2["n"])**.5
                if direction==-1:score-=3 # spot-focused selection
                candidates.append((score,delay,horizon,direction,target,
                                   q1["delta_pp"],q2["delta_pp"],av))
    return max(candidates) if candidates else None

def compute_one(info,btc,alt,now):
    b_times=[t for t,c in btc]
    b=[c for t,c in btc]
    a=rebase_data(alt,b_times)
    valid=sum(x is not None for x in a)
    if valid<.80*len(a) or len(b)<1600:return None
    cut=int(len(b)*.65)
    trigger,beta=calibration(b,a,cut)
    spread=info["spread_pct"]
    origin_hour=b_times[0]//HOUR
    selected=fit_model(b,a,cut,trigger,beta,spread,origin_hour)
    if not selected:return None
    score,delay,horizon,direction,target,d1,d2,av=selected
    cost=2*FEE_EACH_SIDE_PCT+2*SLIP_EACH_SIDE_PCT+spread
    # Embargo around the training/test boundary avoids overlapping event windows.
    records=entries(b,a,cut+max(horizon,delay)+12,len(b)-horizon,
                    delay,horizon,direction,trigger,beta,cost,origin_hour)
    stats=rates(records,target,direction)
    current=feature(b,a,len(b)-1,delay,direction,trigger,beta)
    if not current:return None
    now_t=b_times[-1]
    # Do not claim the event is tradeable if it was observed before latest candles.
    effective=bool(current["active"])
    if stats["n"]>=MIN_N_HOLDOUT and stats["p_target"]>=50 and stats["delta_pp"]>=5 and stats["mean_net"]>0:
        group="watch" if effective else "historical"
    else:group="weak"
    return {"symbol":info["symbol"],"direction":"up" if direction>0 else "down",
            "horizon_hours":horizon,"lag_hours":delay,"target_pct":target,
            "cost_assumption_pct":round(cost,3),"volume_usdt":round(info["volume_24h_usdt"]),
            "spread_pct":spread,"train_halves_edge_pp":[round(d1,1),round(d2,1)],
            "btc_trigger_pct":round(trigger,2),"beta_estimate":round(beta,2),
            "event":{**current,"age_hours":delay,
                     "event_time_utc":dt.datetime.fromtimestamp(
                         b_times[current["event_t"]]/1000,dt.timezone.utc).isoformat(timespec="minutes")},
            "active":effective,"evidence":stats,"status":group,
            "model_score":round(score,2),"test_from":dt.datetime.fromtimestamp(
                b_times[cut+max(horizon,delay)+12]/1000,dt.timezone.utc).isoformat(timespec="minutes")}

def bh_adjust(rows):
    # Correct ONE-sided p-values over all coin hypotheses, not just the winners.
    ranked=sorted(rows,key=lambda r:r["evidence"]["p_value"])
    m=len(ranked);nextq=1.
    for i in range(m-1,-1,-1):
        row=ranked[i]
        q=min(nextq,m*row["evidence"]["p_value"]/(i+1))
        row["evidence"]["fdr_q"]=round(q,5)
        nextq=q
    for row in rows:
        e=row["evidence"]
        current=row["event"]
        confirm=(row["direction"]=="up" and row["active"]
                 and e["n"]>=25 and e["fdr_q"]<=.05
                 and e["p_target"]>=60 and e["delta_pp"]>=10
                 and e["net_lower95_pct"] is not None
                 and e["net_lower95_pct"]>0.0
                 and e["btc_adjusted_net_lower95_pct"] is not None
                 and e["btc_adjusted_net_lower95_pct"]>0.0
                 and row["train_halves_edge_pp"][0]>0
                 and row["train_halves_edge_pp"][1]>0)
        row["status"]="tested_positive" if confirm else (
            "watch" if row["active"] and e["n"]>=MIN_N_HOLDOUT
                         and e["delta_pp"]>=5 and e["mean_net"]>0
                         and row["direction"]=="up" else
            "risk" if row["active"] and row["direction"]=="down" else
            "research")
        row["trade_eligible"]=confirm
        row["evidence"]["p_value"]=round(e["p_value"],5)

def btc_changes(bars):
    lookup=dict(bars)
    t=bars[-1][0]
    prices={k:lookup.get(t-k*HOUR) for k in (0,3,6,24)}
    return {str(k)+"h":round(change(prices.get(k),prices[0]),2)
            if change(prices.get(k),prices[0]) is not None else None
            for k in (3,6,24)}

def run():
    now=(int(time.time()*1000)//HOUR)*HOUR
    syms=tickers_and_symbols()[:MAX_COINS]
    btc={"symbol":"BTC_USDT","volume_24h_usdt":0,"spread_pct":0}
    data,errors=parallel_collect([btc]+syms,"60M",HOUR,DAYS,HOUR_DIR,now,5)
    if len(data.get("BTC_USDT",[]))<1600:
        raise ValueError("Insufficient recent BTC history; keeping last valid forecast.")
    btc_history=data["BTC_USDT"];allrows=[]
    for info in syms:
        if info["symbol"] not in data:continue
        try:
            model=compute_one(info,btc_history,data[info["symbol"]],now)
            if model:allrows.append(model)
        except Exception as exc:
            say("MODEL ERROR",info["symbol"],str(exc)[:180])
    bh_adjust(allrows)
    # Only meaningful *current* spot opportunities, others disclosed as research.
    groups={"tested_positive":0,"watch":1,"risk":2,"research":3}
    allrows.sort(key=lambda v:(groups[v["status"]],
                              -v["evidence"]["delta_pp"],-v["evidence"]["n"]))
    summary={
        "version":4,
        "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "data_through":dt.datetime.fromtimestamp((btc_history[-1][0]+HOUR)/1000,
                                dt.timezone.utc).isoformat(timespec="minutes"),
        "btc_change_pct":btc_changes(btc_history),
        "scanned_coins":len(syms),
        "analyzed_coins":len(allrows),
        "history_days":DAYS,
        "trade_candidates":sum(v["trade_eligible"] for v in allrows),
        "watchlist_count":sum(v["status"]=="watch" for v in allrows),
        "market_risks":sum(v["status"]=="risk" for v in allrows),
        "results":allrows,
        "costs":{"fee_each_side_pct":FEE_EACH_SIDE_PCT,
                 "slippage_each_side_pct":SLIP_EACH_SIDE_PCT,
                 "spread":"live per market; one full spread included"},
        "validation":{"train_fraction":.65,"untouched_holdout_fraction":.35,
                      "holdout_nonoverlapping":True,"multiple_tests":"Benjamini-Hochberg across coins",
                      "entry":"at close of latest completed hourly bar; next-execution delay not tested",
                      "not_production_ready":"Entry latency, actual Pionex fees, depth, and paper trading not yet validated"},
        "errors":len(errors)}
    DATA.mkdir(exist_ok=True)
    (DATA/"trading.json").write_text(
        __import__("json").dumps(summary,ensure_ascii=False,separators=(",",":"))+"\n",
        encoding="utf-8")
    # Only publish the result; the already-stored 180d hourly cache is built incrementally.
    try_commit("Update validated Pionex spot BTC lead-lag trade research V4")
    say("FINAL",len(allrows),"models",summary["trade_candidates"],"validated spot entries",
        summary["watchlist_count"],"watch-only")

if __name__=="__main__":
    run()
