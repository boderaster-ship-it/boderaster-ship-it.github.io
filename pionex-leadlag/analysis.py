#!/usr/bin/env python3
"""Pionex data collection and conservative BTC-to-altcoin forecast.
Only public market data; no trading credentials; updates confined to pionex-leadlag/data.
14 days 1-minute candles, 90 days 60-minute candles, incremental on subsequent runs.
"""
from __future__ import annotations
import concurrent.futures as cf
import datetime as dt
import gzip
import json
import math
import os
import pathlib
import random
import statistics
import subprocess
import threading
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
DATA = ROOT / "data"
HOUR_DIR = DATA / "hourly"
MIN_DIR = DATA / "minute"
API = "https://api.pionex.com/api/v1"
HOUR = 3600000
MIN = 60000
DAYS_HOURLY = 90
DAYS_MINUTE = 14
MAX_COINS = 60
MIN_VOLUME = 300000
MAX_SPREAD = 0.60
THREADS_HOURLY = 5
THREADS_MINUTE = 5
HORIZONS = (3, 6, 12)
LAGS = tuple(range(2, 25))
STABLE = {"BTC", "WBTC", "USDC", "USDD", "DAI", "FDUSD", "BUSD", "TUSD",
          "USDE", "EUR", "USD1", "PYUSD", "USTC", "EURC", "USDS"}
HTTP_LOCK = threading.Lock()
print_lock = threading.Lock()

def say(*a):
    with print_lock:
        print(dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), *a, flush=True)

def fetch(path, params):
    qs = urllib.parse.urlencode(params)
    url = API + path + "?" + qs
    error = None
    for k in range(5):
        try:
            req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "Pionex-BTC-LeadLag-Research/2"})
            with urllib.request.urlopen(req, timeout=25) as response:
                body = json.load(response)
            if body.get("result") is True and isinstance(body.get("data"), dict):
                return body["data"]
            error = ValueError(str(body.get("code") or body.get("message") or "Pionex rejected request"))
        except (urllib.error.URLError, TimeoutError, OSError, ValueError, json.JSONDecodeError) as exc:
            error = exc
        time.sleep(min(15, 0.6 * (k + 1)**2 + random.uniform(0, .5)))
    raise RuntimeError(str(error))

def load_bars(path):
    if not path.exists(): return []
    try:
        with gzip.open(path, "rt", encoding="utf-8") as f:
            payload = json.load(f)
        return [(int(x[0]), float(x[1])) for x in payload.get("bars", [])]
    except Exception as exc:
        say("READ ERROR", path, str(exc))
        return []

def write_bars(path, bars):
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps({"v": 1, "bars": [[t, round(c, 10)] for t, c in bars]},
                     separators=(",", ":"), ensure_ascii=False).encode()
    with gzip.open(path, "wb", compresslevel=6) as f:
        f.write(raw)

def fetch_history(symbol, interval, step, days, folder, now):
    target = folder / (symbol + ".json.gz")
    cutoff = now - days * 86400000
    present = load_bars(target)
    cache = {t: c for t, c in present if t >= cutoff}
    oldest = min(cache) if cache else None
    newest = max(cache) if cache else None
    if newest is not None and now - newest < step:
        return sorted(cache.items())
    cursor = None
    maxpages = math.ceil(days * 86400000 / step / 500) + 2
    # Always refresh current top 500 candles. Walk backwards until overlap or cutoff.
    for page in range(maxpages):
        params = {"symbol": symbol, "interval": interval, "limit": 500}
        if cursor is not None: params["endTime"] = cursor
        data = fetch("/market/klines", params)
        klines = data.get("klines") or []
        rows = []
        for k in klines:
            t = int(k["time"])
            c = float(k["close"])
            if t + step <= now and c > 0 and t >= cutoff - step:
                rows.append((t, c))
        if not rows: break
        earliest = min(t for t, c in rows)
        for t, c in rows: cache[t] = c
        if earliest <= cutoff: break
        if oldest is not None and earliest <= oldest + step:
            break
        if cursor is not None and earliest >= cursor: break
        cursor = earliest - 1
        if page and page % 15 == 0:
            say("History", symbol, interval, "pages", page + 1)
        time.sleep(0.025)
    result = sorted((t, c) for t, c in cache.items() if t >= cutoff)
    if len(result) >= 30:
        write_bars(target, result)
    return result

def tickers_and_symbols():
    allowed = {s.get("symbol") for s in fetch("/common/symbols", {"type": "SPOT"}).get("symbols", [])
               if s.get("type") == "SPOT" and s.get("enable") and s.get("quoteCurrency") == "USDT"}
    bids = {}
    for x in fetch("/market/bookTickers", {"type": "SPOT"}).get("tickers", []):
        try:
            a = float(x.get("askPrice", 0))
            b = float(x.get("bidPrice", 0))
            bids[x["symbol"]] = (200 * (a - b) / (a + b)) if 0 < b <= a else 999.
        except (ValueError, TypeError, ZeroDivisionError): continue
    ranked = []
    for x in fetch("/market/tickers", {"type": "SPOT"}).get("tickers", []):
        symbol = x.get("symbol", "")
        base = symbol.replace("_USDT", "")
        if symbol not in allowed or base in STABLE or base.endswith(("3L","3S","5L","5S")):
            continue
        try: vol = float(x["amount"])
        except (KeyError, TypeError, ValueError): continue
        spread = bids.get(symbol, 999.)
        if vol >= MIN_VOLUME and spread <= MAX_SPREAD:
            ranked.append({"symbol": symbol, "volume_24h_usdt": vol, "spread_pct": round(spread, 4)})
    ranked.sort(key=lambda z: -z["volume_24h_usdt"])
    return ranked[:MAX_COINS]

def closed_series(bars, step, grid):
    lookup = dict(bars)
    return [lookup.get(t) for t in grid]

def ret(p1, p2):
    if p1 is None or p2 is None or p1 <= 0 or p2 <= 0:
        return None
    return 100 * math.log(p2 / p1)

def corr(pairs):
    n = len(pairs)
    if n < 90: return None
    sx = sum(x for x,y in pairs); sy = sum(y for x,y in pairs)
    xx = sum(x*x for x,y in pairs); yy = sum(y*y for x,y in pairs)
    xy = sum(x*y for x,y in pairs)
    den = math.sqrt(max(0.,(n*xx-sx*sx)*(n*yy-sy*sy)))
    return (n*xy-sx*sy)/den if den > 1e-8 else None

def wilson(p,n,z=1.96):
    if not n: return (0., 1.)
    center=(p + z*z/(2*n))/(1+z*z/n)
    margin=z*math.sqrt(p*(1-p)/n+z*z/(4*n*n))/(1+z*z/n)
    return (max(0.,center-margin),min(1.,center+margin))

def percentile(values, pct):
    if not values: return None
    vs=sorted(values);return vs[min(len(vs)-1, int((len(vs)-1)*pct))]

def hour_aligned(btc, coin):
    # Common UTC hourly grid, closed only; no forward filling (avoids fabricated returns).
    b=dict(btc); a=dict(coin)
    if not b or not a:return [],[],[]
    start=max(min(b),min(a)); end=min(max(b),max(a))
    grid=list(range(start,end+1,HOUR))
    return grid,[b.get(t) for t in grid],[a.get(t) for t in grid]

def select_lag(b,a,cut):
    # Training-only lag selection, excluding zero lag and weak / unstable patterns.
    lag_scores={}
    for lag in LAGS:
        pairs=[]
        for t in range(1,max(1,cut-lag-1)):
            x=ret(b[t-1],b[t]);y=ret(a[t+lag-1],a[t+lag])
            if x is not None and y is not None:pairs.append((x,y))
        lag_scores[lag]=corr(pairs)
    ranked=[(v,k) for k,v in lag_scores.items() if v is not None and v>0]
    if not ranked:return None,None
    peak,lag=max(ranked)
    # Lag peak strength must exceed ordinary noise before candidate analysis.
    if peak<0.09:return None,None
    return lag,peak

def score_coin(info,btc,coin,now):
    grid,b,a=hour_aligned(btc,coin)
    if len(grid)<1100:return None
    cut=int(len(grid)*.70)
    lag,training_corr=select_lag(b,a,cut)
    if lag is None:return None
    pairs=[]
    for t in range(cut+1,len(grid)-lag):
        x=ret(b[t-1],b[t]);y=ret(a[t+lag-1],a[t+lag])
        if x is not None and y is not None:pairs.append((x,y))
    out_corr=corr(pairs)
    if out_corr is None:return None
    forecasts=[]
    for horizon in HORIZONS:
        # BTC stimulus window is delayed by lag-horizon relative to forecast start.
        offset=max(0,lag-horizon)
        def stimulus(t):
            e=t-offset
            if e<3:return None
            return ret(b[e-3],b[e])
        # Determine impulse strength and outcome threshold from training only.
        historical=[abs(x) for t in range(lag+8,cut-horizon,3)
                    if (x:=stimulus(t)) is not None]
        trigger=percentile(historical,.58)
        if trigger is None or trigger<.10:continue
        now_idx=len(grid)-1
        xnow=stimulus(now_idx)
        if xnow is None or abs(xnow)<trigger:continue
        direction=1 if xnow>0 else -1
        if direction<0:
            # The dashboard models declining coins too, but does not recommend shorting.
            direction_label="fallen"
        else:direction_label="steigen"
        # Sampling phase fixed BEFORE examining outcomes; disjoint forward windows.
        end_train=cut-horizon-1; start_test=cut+lag+8
        train_magnitudes=[]
        for t in range(lag+8,end_train,horizon):
            move=ret(a[t],a[t+horizon])
            if move is not None:train_magnitudes.append(abs(move))
        if len(train_magnitudes)<80:continue
        y=percentile(train_magnitudes,.38) or 0.4
        y=round(min(6.0,max(.5,y)) *2)/2
        # To prevent look-ahead, test samples start AFTER the training period.
        samples=[]
        for t in range(start_test,len(grid)-horizon,horizon):
            x=stimulus(t)
            target=ret(a[t],a[t+horizon])
            if x is None or target is None:continue
            samples.append((x,target))
        if len(samples)<38:continue
        relevant=[target for x,target in samples
                  if x*direction>=trigger]
        successes=sum(1 for target in relevant if target*direction>=y)
        n=len(relevant)
        if n<20:continue
        prob=(successes+2)/(n+4)
        lower,upper=wilson(successes/n,n)
        # Unconditional comparison uses same evaluation period but without BTC condition.
        base=sum(1 for x,target in samples if target*direction>=y)/len(samples)
        advantage=prob-base
        # Only show genuine positive out-of-sample evidence, not chosen-after-the-fact lag.
        confirmed=(out_corr>0.07 and training_corr>0.09
                   and prob>=0.60 and advantage>=0.09
                   and lower>base-0.03 and n>=25
                   and info["spread_pct"]<=.45)
        if not confirmed:continue
        # Last BTC signal must not have been fully realized in altcoin already.
        price_now=a[-1]
        if price_now is None:continue
        # 'y' is positive threshold; expected movement is a directional event, not a guaranteed yield.
        forecasts.append({
            "hours":horizon,"direction":"up" if direction>0 else "down",
            "probability_pct":round(100*prob),
            "target_pct":round(y,1),"baseline_pct":round(100*base),
            "edge_pp":round(100*advantage),
            "sample_size":n,"successes":successes,
            "ci_low_pct":round(100*lower),"ci_high_pct":round(100*upper),
            "lag_hours":lag,"train_correlation":round(training_corr,3),
            "test_correlation":round(out_corr,3),
            "btc_signal_pct":round(xnow,2),
            "stimulus_ended_hours_ago":offset,
        })
    if not forecasts:return None
    forecasts.sort(key=lambda z:(z["edge_pp"],z["sample_size"],-z["hours"]),reverse=True)
    return {
        "symbol":info["symbol"],"volume_24h_usdt":round(info["volume_24h_usdt"]),
        "spread_pct":info["spread_pct"],"lag_hours":lag,
        "best":forecasts[0],"alternatives":forecasts[1:],
        "status":"historically_confirmed",
        "notes":"Bedingte historische Trefferquote auf zurückgehaltenen Stunden-Daten; keine sichere Zukunftsprognose."
    }

def persist_summary(payload):
    DATA.mkdir(parents=True,exist_ok=True)
    p=DATA/"summary.json"
    p.write_text(json.dumps(payload,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")

def try_commit(message):
    # Avoid modifying anything outside the scanner data directory.
    subprocess.run(["git","add","pionex-leadlag/data"],check=True)
    changes=subprocess.run(["git","diff","--cached","--quiet"],check=False)
    if changes.returncode==0:
        say("No data changes");return
    subprocess.run(["git","config","user.name","github-actions[bot]"],check=True)
    subprocess.run(["git","config","user.email","41898282+github-actions[bot]@users.noreply.github.com"],check=True)
    subprocess.run(["git","commit","-m",message],check=True)
    subprocess.run(["git","push"],check=True)

def parallel_collect(coins, interval, step, days, folder, now, workers):
    output={};errors={}
    def task(item):
        sym=item["symbol"]
        return sym,fetch_history(sym,interval,step,days,folder,now)
    with cf.ThreadPoolExecutor(max_workers=workers) as pool:
        futures={pool.submit(task,i):i["symbol"] for i in coins}
        for n,future in enumerate(cf.as_completed(futures),1):
            sym=futures[future]
            try:
                name,bars=future.result()
                if len(bars)<40:raise ValueError("Too few price bars")
                output[name]=bars
            except Exception as exc:
                errors[sym]=str(exc)[:180]
            if n%10==0 or n==len(futures):
                say(interval, "downloaded",n,"of",len(futures),"valid",len(output),"errors",len(errors))
    return output,errors

def main():
    now=(int(time.time()*1000)//HOUR)*HOUR
    say("START Pionex forecast pipeline", "data timestamp",now)
    coins=tickers_and_symbols()
    assert len(coins)>10, "Not enough valid tradable USDT pairs"
    say("Eligible",len(coins),"USDT spot pairs")
    btc_info={"symbol":"BTC_USDT","volume_24h_usdt":0,"spread_pct":0}
    requested=[btc_info]+coins
    hourly,err=parallel_collect(requested,"60M",HOUR,DAYS_HOURLY,HOUR_DIR,now,THREADS_HOURLY)
    btc=hourly.get("BTC_USDT",[])
    if len(btc)<1100:raise ValueError("BTC hourly history incomplete; previous summary preserved")
    pairs=[c for c in coins if c["symbol"] in hourly]
    predictions=[]
    for info in pairs:
        try:
            p=score_coin(info,btc,hourly[info["symbol"]],now)
            if p:predictions.append(p)
        except Exception as exc:say("EVAL ERROR",info["symbol"],str(exc)[:180])
    predictions.sort(key=lambda p:(p["best"]["edge_pp"],p["best"]["probability_pct"]),reverse=True)
    btc_map=dict(btc);last=max(btc_map)
    def btc_change(hours):
        return ret(btc_map.get(last-hours*HOUR),btc_map.get(last))
    summary={
      "version":2,"generated_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
      "data_through":dt.datetime.fromtimestamp((last+HOUR)/1000,dt.timezone.utc).isoformat(timespec="minutes"),
      "market":"Pionex Spot USDT",
      "btc_change_pct":{"3h":round(btc_change(3),2) if btc_change(3) is not None else None,
                        "6h":round(btc_change(6),2) if btc_change(6) is not None else None,
                        "24h":round(btc_change(24),2) if btc_change(24) is not None else None},
      "scanned_coins":len(coins),"analyzed_coins":len(pairs),
      "hourly_days":DAYS_HOURLY,"minute_days":DAYS_MINUTE,
      "strong_signals":len(predictions),"predictions":predictions[:12],
      "minute_cache_coins":sum(1 for sym in hourly if (MIN_DIR/(sym+".json.gz")).exists()),
      "minute_cache_status":"updating",
      "errors":len(err),
      "method":"Train 70% of 90-day hourly series to select a positive BTC lead of 2–24h; evaluate 3/6/12h event probabilities in later 30%, sampled in non-overlapping horizon blocks. Beta(2,2) smoothing, Wilson intervals; thresholds and lag chosen from train only. Exploratory multiple-comparison risks remain.",
      "warning":"Wahrscheinlichkeiten = historische Häufigkeiten unter ähnlichen Bedingungen, keine garantierten Vorhersagen. 90-Tage-Überprüfung und Papertrading erforderlich."
    }
    persist_summary(summary)
    try_commit("Update Pionex hourly research and forecast results")
    # Backfill minute-level data once. Subsequent runs need only recent candles.
    minute, minute_errors=parallel_collect(requested,"1M",MIN,DAYS_MINUTE,MIN_DIR,now,THREADS_MINUTE)
    summary["minute_cache_coins"]=len(minute)
    summary["minute_cache_status"]="ready" if len(minute)>=len(requested)-3 else "partial"
    summary["generated_at"]=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    summary["minute_errors"]=len(minute_errors)
    persist_summary(summary)
    try_commit("Refresh 14-day Pionex minute candle archive")
    say("DONE",len(predictions),"research signals",len(minute),"minute histories")

if __name__=="__main__":
    main()
