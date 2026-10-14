#!/usr/bin/env python3
"""15-minute Pionex BTC -> ALT lag research. Descriptive only; NO trade signals.

Loads only independently persisted 15m candles. Lag is selected on the first
60% of chronological observations. The last 40% is untouched until reporting.
Multiple testing across one selected lag per alt uses Benjamini-Hochberg.
This computes association, never implies profitability or causation.
"""
from __future__ import annotations
import datetime as dt
import json
import math
import statistics
import time
from pathlib import Path

from analysis import DATA, load_bars, try_commit, say

FOLDER=DATA/"15m"
FILE=DATA/"lag15m.json"
STEP=900000
LAGS=(1,2,3,4,6,8,12,16,24,32,40,48,64,80,96)
SAMPLE_STEP=4  # every hour: reduce serial dependence
MIN_PAIRS=12


def pearson(pairs):
    n=len(pairs)
    if n<80:return None
    sx=sy=sxx=syy=sxy=0.
    for x,y in pairs:
        sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y
    xx=n*sxx-sx*sx
    yy=n*syy-sy*sy
    return (n*sxy-sx*sy)/math.sqrt(xx*yy) if xx>1e-12 and yy>1e-12 else None


def returns(bars,grid):
    lookup=dict(bars)
    closes=[lookup.get(t) for t in grid]
    return [(100*math.log(closes[i]/closes[i-1])
             if closes[i] and closes[i-1] and closes[i]>0 and closes[i-1]>0
             else None) for i in range(len(closes))]


def paired(b,a,lag,start,stop):
    pairs=[]
    for t in range(start,stop,SAMPLE_STEP):
        future=t+lag
        if t<1 or future>=len(a):break
        x=b[t];y=a[future]
        if x is not None and y is not None:
            pairs.append((x,y))
    return pairs


def lag_one_autocorr(values):
    return pearson(list(zip(values[:-1],values[1:])))


def one_sided_probability(r,pairs):
    if r is None or len(pairs)<60:return 1.
    n=len(pairs)
    # Effective sample count adjusted by first-order serial dependence.
    rx=lag_one_autocorr([x for x,y in pairs]) or 0.
    ry=lag_one_autocorr([y for x,y in pairs]) or 0.
    product=min(.85,max(-.85,rx*ry))
    effective=max(15.,min(n,n*(1-product)/(1+product)))
    z=max(-15.,min(15.,r*math.sqrt(max(1.,effective-3))/(max(1e-7,1-r*r)**.5)))
    return .5*math.erfc(z/math.sqrt(2)),effective


def analyze(btc,coin,symbol):
    bm=dict(btc);am=dict(coin)
    both=sorted(set(bm).intersection(am))
    if len(both)<2000:return None
    grid=list(range(both[0],both[-1]+STEP,STEP))
    b=returns(btc,grid);a=returns(coin,grid)
    n=len(grid)
    train=int(n*.60)
    mid=train//2
    chosen=None
    for lag in LAGS:
        pa=paired(b,a,lag,96,mid-lag-4)
        pb=paired(b,a,lag,mid,train-lag-4)
        ra=pearson(pa);rb=pearson(pb)
        if ra is None or rb is None or min(len(pa),len(pb))<120:continue
        # Stronger if association stays positive in BOTH training regimes.
        rating=.60*min(ra,rb)+.40*(ra+rb)/2
        if chosen is None or rating>chosen[0]:
            chosen=(rating,lag,ra,rb)
    if chosen is None:return None
    score,lag,ra,rb=chosen
    # Strict chronological embargo leaves lagged future returns untouched.
    out=paired(b,a,lag,train+lag+4,n-lag-1)
    r=pearson(out)
    if r is None or len(out)<170:return None
    p,effective=one_sided_probability(r,out)
    first=out[0][0] if out else 0
    return {
        "symbol":symbol,
        "lag_minutes":lag*15,
        "lag_hours":round(lag*.25,2),
        "train_first_corr":round(ra,4),
        "train_second_corr":round(rb,4),
        "test_corr":round(r,4),
        "test_pairs":len(out),
        "effective_pairs_est":round(effective),
        "p_value":p,
        "first_candle_utc":dt.datetime.fromtimestamp(grid[0]/1000,dt.timezone.utc).isoformat(timespec="minutes"),
        "last_candle_utc":dt.datetime.fromtimestamp(grid[-1]/1000,dt.timezone.utc).isoformat(timespec="minutes"),
        "series_days":round(len(grid)*.25/24,1),
        "training_consistent":ra>.025 and rb>.025,
        "pattern":"BTC past 15m-return correlated with ALT future 15m-return, separated by selected lag"
    }


def fdr(rows):
    ascending=sorted(rows,key=lambda x:x["p_value"])
    nextq=1.
    n=len(rows)
    for i in range(n-1,-1,-1):
        x=ascending[i]
        nextq=min(nextq,n*x["p_value"]/(i+1))
        x["adjusted_q"]=round(nextq,6)
    for item in rows:
        item["validated_association"]=(
            item["training_consistent"] and item["test_corr"]>=.08 and
            item["adjusted_q"]<=.05 and item["test_pairs"]>=250
        )
        item["is_trading_signal"]=False


def run():
    DATA.mkdir(exist_ok=True)
    btc_file=FOLDER/"BTC_USDT.json.gz"
    if not btc_file.exists():
        status={"version":1,"ready":False,"reason":"BTC 15-minute history has not been imported",
                "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                "scanned":0,"analysable":0,"matches":[]}
    else:
        btc=load_bars(btc_file)
        rows=[]
        files=sorted(FOLDER.glob("*_USDT.json.gz"))
        for i,file in enumerate(files):
            if file.stem=="BTC_USDT.json":continue
            try:
                r=analyze(btc,load_bars(file),file.name[:-8])
                if r:rows.append(r)
            except Exception as e:say("15M ANALYSIS ERROR",file.name,str(e)[:130])
        fdr(rows)
        rows.sort(key=lambda x:(x["validated_association"],
                                x["test_corr"],x["test_pairs"]),reverse=True)
        status={"version":1,"ready":len(rows)>=MIN_PAIRS,
                "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                "sample_interval_minutes":15,"training_fraction":.60,
                "untouched_holdout_fraction":.40,
                "lag_choices_minutes":[i*15 for i in LAGS],
                "scanned":len(files)-1,"analysable":len(rows),
                "independently_confirmed_lags":sum(x["validated_association"] for x in rows),
                "matches":rows,
                "warning":"Cross-correlation is not causality, profit probability or a trade entry. Short-term samples are serially correlated; p adjustment is approximate."
                }
    FILE.write_text(json.dumps(status,ensure_ascii=False,separators=(",",":"))+"\n",encoding="utf-8")
    try_commit("Publish Pionex 15-minute independent BTC-to-altcoin lag research")
    say("15M leadlag",status["analysable"],"checked")

if __name__=="__main__":
    run()
