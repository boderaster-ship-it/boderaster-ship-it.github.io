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
next_http_slot = 0.0

def pace_api():
    """Global request pacing: prevents Pionex IP-wide burst/rate limits."""
    global next_http_slot
    with HTTP_LOCK:
        start = time.monotonic()
        remaining = max(0., next_http_slot - start)
        next_http_slot = max(start, next_http_slot) + 0.9
    if remaining:
        time.sleep(remaining)

def say(*a):
    with print_lock:
        print(dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), *a, flush=True)

def fetch(path, params):
    qs = urllib.parse.urlencode(params)
    url = API + path + "?" + qs
    error = None
    for k in range(5):
        pace_api()
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
    # Pionex limits 1M klines to the latest 10,000 bars (~6.9 days).
    # Preserve older cached bars up to 14 days, but never paginate beyond
    # 9,700 bars of market API history in a single run.
    remote_cutoff = max(cutoff, now - 9700 * MIN) if step == MIN else cutoff
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
        try:
            data = fetch("/market/klines", params)
        except RuntimeError as exc:
            if step == MIN and "MARKET_INVALID_TIME" in str(exc) and cache:
                say("Pionex minute API history limit reached; preserving", symbol, len(cache))
                break
            raise
        klines = data.get("klines") or []
        rows = []
        for k in klines:
            t = int(k["time"])
            c = float(k["close"])
            if t + step <= now and c > 0 and t >= remote_cutoff - step:
                rows.append((t, c))
        if not rows: break
        earliest = min(t for t, c in rows)
        for t, c in rows: cache[t] = c
        if earliest <= remote_cutoff: break
        if (oldest is not None and newest is not None
                and oldest <= cutoff + 3*step
                and earliest <= newest + step):
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
    if n < 35: return None
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

def score_coin(info, btc, coin, now):
    """Select the only model configuration on training data, then assess one
    future outcome in held-out data. Return the observed result even when
    not statistically convincing, so the dashboard never hides all data.
    """
    grid, b, a = hour_aligned(btc, coin)
    if len(grid) < 1200:
        return None
    cut = int(len(grid) * .70)

    def input_signal(t, offset):
        e = t - offset
        if e < 3 or e >= len(b):
            return None
        return ret(b[e - 3], b[e])

    def output_move(t, horizon):
        if t < 1 or t + horizon >= len(a):
            return None
        return ret(a[t], a[t + horizon])

    def model_corr(lag, horizon, start, stop, jump=3):
        offset = max(0, lag - horizon)
        pairs = []
        for t in range(max(lag + 8, start), min(stop, len(grid) - horizon), jump):
            x = input_signal(t, offset)
            y = output_move(t, horizon)
            if x is not None and y is not None:
                pairs.append((x, y))
        return corr(pairs), len(pairs)

    # No test-period information is used when selecting lag OR horizon.
    fit_cut = max(100, int(cut * .50))
    options = []
    for lag in LAGS:
        for horizon in HORIZONS:
            c1, n1 = model_corr(lag, horizon, 24, fit_cut, horizon)
            c2, n2 = model_corr(lag, horizon, fit_cut, cut - horizon, horizon)
            if c1 is None or c2 is None or n1 < 35 or n2 < 35:
                continue
            # Prefer configurations stable in BOTH halves of the training period.
            effective = .5 * (c1 + c2) + .5 * min(c1, c2)
            options.append((effective, lag, horizon, c1, c2))
    if not options:
        return None
    score, lag, horizon, c1, c2 = max(options)
    offset = max(0, lag - horizon)

    # Use only the newest 30% for all reported sample rates and diagnostics.
    test_corr, test_points = model_corr(lag, horizon, cut + 24,
                                        len(grid) - horizon, horizon)
    current_x = input_signal(len(grid)-1, offset)
    if current_x is None:
        return None

    # BTC trigger magnitude is based on its history, not on altcoin success.
    train_signals = [abs(x) for t in range(lag + 8, cut - horizon, horizon)
                     if (x := input_signal(t, offset)) is not None]
    if len(train_signals) < 60:
        return None
    median_stimulus = percentile(train_signals, .45) or .15
    # Dynamic window: current magnitude determines historically comparable
    # events; this cannot favor a coin after observing its test outcomes.
    min_signal = max(.08, min(median_stimulus, abs(current_x) * .65))
    direction = 1 if current_x >= 0 else -1

    magnitudes = [abs(y) for t in range(lag + 8, cut - horizon, horizon)
                  if (y := output_move(t, horizon)) is not None]
    if len(magnitudes) < 70:
        return None
    # A target fixed using training only (not optimized on the test set).
    target = round(min(3.0, max(.5, percentile(magnitudes, .32) or .5)) * 2) / 2

    observations = []
    for t in range(cut + 24, len(grid) - horizon, horizon):
        x = input_signal(t, offset)
        y = output_move(t, horizon)
        if x is not None and y is not None:
            observations.append((x, y))
    if len(observations) < 35:
        return None

    base_successes = sum(1 for _, y in observations if y * direction >= target)
    baseline = base_successes / len(observations)
    matches = [(x, y) for x, y in observations
               if x * direction >= min_signal]
    n = len(matches)
    successes = sum(1 for x, y in matches if y * direction >= target)
    if n < 12:
        return None

    # Separate event 1: any move in the BTC-implied direction.
    direction_successes = sum(1 for _, y in matches if y * direction > 0)
    direction_base = sum(1 for _, y in observations if y * direction > 0) / len(observations)
    direction_probability = (direction_successes + 2) / (n + 4)
    direction_lower, direction_upper = wilson(direction_successes / n, n)

    # Event 2: the larger absolute target from the TRAINING distribution.
    probability = (successes + 2) / (n + 4)
    lower, upper = wilson(successes / n, n)
    edge = probability - baseline
    direction_edge = direction_probability - direction_base
    train_consistent = c1 > 0 and c2 > 0 and score >= .045
    signal_current = abs(current_x) >= max(.12, median_stimulus * .50)
    confirmed = (train_consistent and test_corr is not None
                 and test_corr >= .08 and direction_probability >= .58
                 and direction_edge >= .10 and direction_lower >= direction_base - .02
                 and n >= 25 and signal_current)
    # Difference in percentages between comparable and unconditional outcomes.
    # Current BTC magnitude and direction are provided as an observed fact.
    outcome = {
        "hours": horizon,
        "direction": "up" if direction > 0 else "down",
        "probability_pct": round(100 * probability),
        "direction_probability_pct": round(100 * direction_probability),
        "direction_baseline_pct": round(100 * direction_base),
        "direction_edge_pp": round(100 * direction_edge),
        "direction_successes": direction_successes,
        "direction_ci_low_pct": round(100 * direction_lower),
        "direction_ci_high_pct": round(100 * direction_upper),
        "median_return_pct": round(statistics.median([y for _, y in matches]), 2),
        "target_pct": target,
        "baseline_pct": round(100 * baseline),
        "edge_pp": round(100 * edge),
        "sample_size": n,
        "successes": successes,
        "all_test_cases": len(observations),
        "ci_low_pct": round(100 * lower),
        "ci_high_pct": round(100 * upper),
        "lag_hours": lag,
        "train_correlation": round(score, 3),
        "test_correlation": round(test_corr, 3) if test_corr is not None else None,
        "btc_signal_pct": round(current_x, 2),
        "stimulus_ended_hours_ago": offset,
        "signal_strong_enough": signal_current,
        "confirmed": confirmed,
        "test_samples": test_points,
    }
    # These are descriptive, not trading recommendation scores.
    relevance = (edge * 100 * .3 + direction_edge * 100 * .7
                 + (test_corr if test_corr is not None else -.2) * 25
                 + min(n, 55) * .075
                 - (0 if train_consistent else 8)
                 - (0 if signal_current else 5))
    status = ("validated" if confirmed else
              "exploratory" if (edge >= .03 or direction_edge >= .05) and test_corr is not None
                               and test_corr > 0 and train_consistent else
              "not_validated")
    return {
        "symbol": info["symbol"],
        "volume_24h_usdt": round(info["volume_24h_usdt"]),
        "spread_pct": info["spread_pct"],
        "lag_hours": lag,
        "best": outcome,
        "status": status,
        "relevance_score": round(relevance, 2),
        "notes": "Historische bedingte Trefferhäufigkeit; kein kalibriertes Zukunftsrisiko."
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
    # The site can be edited while the scheduled job runs.
    # Integrate those unrelated commits without overwriting any files.
    subprocess.run(["git","fetch","origin","main"],check=True)
    subprocess.run(["git","rebase","origin/main"],check=True)
    subprocess.run(["git","push","origin","HEAD:main"],check=True)

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
                if len(errors)<=15: say("FETCH ERROR",interval,sym,str(exc)[:150])
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
    predictions.sort(key=lambda p:(p["status"] == "validated", p["relevance_score"]), reverse=True)
    btc_map=dict(btc);last=max(btc_map)
    def btc_change(hours):
        return ret(btc_map.get(last-hours*HOUR),btc_map.get(last))
    summary={
      "version":3,"generated_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
      "data_through":dt.datetime.fromtimestamp((last+HOUR)/1000,dt.timezone.utc).isoformat(timespec="minutes"),
      "market":"Pionex Spot USDT",
      "btc_change_pct":{"3h":round(btc_change(3),2) if btc_change(3) is not None else None,
                        "6h":round(btc_change(6),2) if btc_change(6) is not None else None,
                        "24h":round(btc_change(24),2) if btc_change(24) is not None else None},
      "scanned_coins":len(coins),"analyzed_coins":len(pairs),
      "hourly_days":DAYS_HOURLY,"minute_days":DAYS_MINUTE,
      "strong_signals":sum(1 for p in predictions if p["status"] == "validated"),
      "exploratory_signals":sum(1 for p in predictions if p["status"] == "exploratory"),
      "diagnosed_coins":len(predictions), "predictions":predictions,
      "minute_cache_coins":sum(1 for sym in hourly if (MIN_DIR/(sym+".json.gz")).exists()),
      "minute_cache_status":"updating",
      "minute_cache_coverage_days":0,
      "errors":len(err),
      "method":"On 90 days hourly data, select BTC lag 2–24h and forecasting horizon 3/6/12h using only the first 70% in two subperiods; evaluate one frozen configuration on the later 30% in non-overlapping horizon samples. Report conditional target-hit frequency, unconditional baseline, Wilson interval and out-of-sample correlation for all analyzable coins. Strict evidence label only when positive validation requirements hold; multiple-comparison and calibration risks remain.",
      "warning":"Wahrscheinlichkeiten = historische Häufigkeiten unter ähnlichen Bedingungen, keine garantierten Vorhersagen. 90-Tage-Überprüfung und Papertrading erforderlich."
    }
    persist_summary(summary)
    try_commit("Update Pionex hourly research and forecast results")
    # Backfill minute-level data once. Subsequent runs need only recent candles.
    minute, minute_errors=parallel_collect(requested,"1M",MIN,DAYS_MINUTE,MIN_DIR,now,THREADS_MINUTE)
    summary["minute_cache_coins"]=len(minute)
    # The initial Pionex backfill cannot exceed ~6.9 days. Further hourly
    # updates grow the archive organically until it spans 14 full days.
    spans = [(max(v[0][0], now - DAYS_MINUTE*86400000), v[-1][0])
             for v in minute.values() if len(v)>1]
    coverage = min(((hi-lo)/86400000 for lo,hi in spans), default=0)
    summary["minute_cache_coverage_days"]=round(coverage,1)
    summary["minute_cache_status"]="ready" if len(minute)>=len(requested)-3 and coverage>=13.5 else "building"
    summary["generated_at"]=dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    summary["minute_errors"]=len(minute_errors)
    persist_summary(summary)
    try_commit("Refresh 14-day Pionex minute candle archive")
    say("DONE",len(predictions),"research signals",len(minute),"minute histories")

if __name__=="__main__":
    main()
