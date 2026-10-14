#!/usr/bin/env python3
"""Incremental Pionex public spot OHLC archive (SQLite day shards + 5m/15m caches).

The Pionex 10,000-candle retention cap is real: older 1M candles cannot be
retrospectively retrieved. SQLite builds forward from the available ~6.9 days.
Only observed prices are stored; gaps are counted, NEVER interpolated.
No account, private API, third-party DB signup, or cloud DB secrets needed.
"""
from __future__ import annotations
import datetime as dt
import gzip
import json
import math
import os
import pathlib
import sqlite3
import sys
import tempfile
import time
from collections import defaultdict

from analysis import (DATA, ROOT, HOUR, MIN, MAX_COINS, fetch, fetch_history,
                      tickers_and_symbols, try_commit, say)

DAY=86_400_000
DB_DIR=DATA/"minute_db"
MID_DIR=DATA/"5m"
QUARTER_DIR=DATA/"15m"
STATE=DATA/"archive-state.json"
PUBLIC=DATA/"archive-status.json"
MINUTE_LIMIT_DAYS=6.7
MINUTE_KEEP_DAYS=120
PAIR_BATCH=85
MEDIUM_BATCH=75
MAX_PAGES_1M=20
MAX_PAGES_MID=20
VERSION=2


def safe_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return default


def iso(ms):
    return dt.datetime.fromtimestamp(ms/1000, dt.timezone.utc).isoformat(timespec="minutes")


def get_pair_list():
    # The shared exchange discovery now considers up to 300 tradable SPOT/USDT
    # coins, including lower-volume instruments. Do not pretend that all have
    # adequate fill depth: trade eligibility is still separately gated.
    ranked=tickers_and_symbols()
    symbols=[{"symbol":"BTC_USDT","volume_24h_usdt":0,"spread_pct":0}]
    symbols.extend(x for x in ranked if x["symbol"]!="BTC_USDT")
    if len(symbols)<20:
        raise RuntimeError("Spot symbol discovery returned fewer than 20 pairs")
    return symbols


def select_pairs(pairs, state, mode, count):
    def age(info):
        meta=state.get("symbols",{}).get(info["symbol"],{}).get(mode,{})
        return int(meta.get("checked_ms",0))
    # Always refresh BTC: required to align all other pairs precisely.
    btc=pairs[0]
    eligible=[x for x in pairs[1:] if x["symbol"]!="BTC_USDT"]
    eligible.sort(key=lambda x:(age(x),-x["volume_24h_usdt"]))
    chosen=[btc]+eligible[:count]
    return chosen


class DailySqlite:
    def __init__(self,tmp):
        self.tmp=pathlib.Path(tmp)
        self.open={}
        self.updated={}
        DB_DIR.mkdir(parents=True,exist_ok=True)

    def db(self,day):
        if day in self.open:
            return self.open[day]
        path=DB_DIR/(day+".sqlite.gz")
        raw=self.tmp/(day+".sqlite")
        if path.exists():
            with gzip.open(path,"rb") as src,open(raw,"wb") as dst:
                while True:
                    data=src.read(1024*1024)
                    if not data:break
                    dst.write(data)
        con=sqlite3.connect(raw)
        con.execute("PRAGMA journal_mode=DELETE")
        con.execute("PRAGMA synchronous=OFF")
        con.execute("PRAGMA temp_store=MEMORY")
        con.execute("""CREATE TABLE IF NOT EXISTS minutes(
            symbol TEXT NOT NULL, ts_ms INTEGER NOT NULL, close REAL NOT NULL,
            PRIMARY KEY(symbol,ts_ms)) WITHOUT ROWID""")
        self.open[day]=con
        self.updated[day]=False
        return con

    def insert(self,symbol,bars):
        partitions=defaultdict(list)
        for t,c in bars:
            day=dt.datetime.fromtimestamp(t/1000,dt.timezone.utc).strftime("%Y-%m-%d")
            partitions[day].append((symbol,t,c))
        new=0
        for day,items in partitions.items():
            con=self.db(day)
            before=con.total_changes
            con.executemany("INSERT OR IGNORE INTO minutes(symbol,ts_ms,close) VALUES(?,?,?)",items)
            diff=con.total_changes-before
            if diff:self.updated[day]=True
            new+=diff
        return new

    def save(self):
        updated=[]
        for day,con in self.open.items():
            con.commit()
            check=con.execute("PRAGMA quick_check").fetchone()[0]
            if check!="ok":raise RuntimeError("SQLite integrity failure for "+day)
            con.close()
            if not self.updated[day]:continue
            raw=self.tmp/(day+".sqlite")
            dest=DB_DIR/(day+".sqlite.gz")
            with open(raw,"rb") as src, gzip.open(dest,"wb",compresslevel=6) as dst:
                while True:
                    chunk=src.read(1024*1024)
                    if not chunk:break
                    dst.write(chunk)
            updated.append(day)
        return updated


def fetch_minute_increment(symbol, now, last_ms):
    """Backfill once up to ~6.7d; later request ONLY missing NEW candles.

    End-time pagination never exceeds 9700 minutes from the exchange's current
    time. The window limit is enforced independently of last saved state.
    """
    earliest_allowed=now-int(MINUTE_LIMIT_DAYS*DAY)
    safe_cut=max(earliest_allowed,(last_ms-2*MIN) if last_ms else earliest_allowed)
    cursor=None
    candle_map={}
    raw_count=0
    for page in range(MAX_PAGES_1M):
        params={"symbol":symbol,"interval":"1M","limit":500}
        if cursor is not None:
            params["endTime"]=cursor
        try:
            d=fetch("/market/klines",params)
        except Exception as exc:
            if "MARKET_INVALID_TIME" in str(exc) and candle_map:
                break
            raise
        rows=d.get("klines") or []
        if not rows:break
        oldest=None
        for row in rows:
            try:
                t=int(row["time"])
                p=float(row["close"])
            except (KeyError,TypeError,ValueError):
                continue
            oldest=t if oldest is None else min(oldest,t)
            if t+MIN<=now and t>=safe_cut and p>0 and math.isfinite(p):
                candle_map[t]=p
        raw_count+=len(rows)
        if oldest is None or oldest<=safe_cut:break
        if cursor is not None and oldest>=cursor:break
        cursor=oldest-1
        if page==19:say("1m page budget reached",symbol)
    return sorted(candle_map.items()),raw_count


def collect_1m(pairs, state, now):
    selected=select_pairs(pairs,state,"1m",PAIR_BATCH)
    state.setdefault("symbols",{})
    errors={}
    saved=0
    with tempfile.TemporaryDirectory(prefix="pionex-minute-sqlite-") as tmp:
        store=DailySqlite(tmp)
        for index,info in enumerate(selected):
            sym=info["symbol"]
            record=state["symbols"].setdefault(sym,{})
            prev=record.get("1m",{})
            last=int(prev.get("last_ms",0))
            try:
                bars,raw=fetch_minute_increment(sym,now,last)
                new=store.insert(sym,bars)
                saved+=new
                if bars:
                    first=min(prev.get("first_ms",bars[0][0]),bars[0][0])
                    last=max(last,bars[-1][0])
                    record["1m"]={
                        "first_ms":first,"last_ms":last,
                        "bars":int(prev.get("bars",0))+new,
                        "checked_ms":now,"last_added":new}
                else:
                    # Don't mark fresh when no valid candle was retrieved.
                    record.setdefault("1m",{})["checked_ms"]=now
                if index%15==0:
                    say("Minute progress",index+1,"/",len(selected),"new",saved)
            except Exception as exc:
                errors[sym]=str(exc)[:170]
                say("Minute error",sym,str(exc)[:150])
        changed_days=store.save()
    say("Minute archive:",len(selected),"markets,",saved,"new rows,",len(changed_days),"day shards")
    return {"checked":len(selected),"added_bars":saved,"changed_days":changed_days,
            "errors":errors}


def collect_medium(pairs, state, now, mode):
    selected=select_pairs(pairs,state,mode,MEDIUM_BATCH)
    step=5*MIN if mode=="5m" else 15*MIN
    duration=30 if mode=="5m" else 95
    folder=MID_DIR if mode=="5m" else QUARTER_DIR
    interval="5M" if mode=="5m" else "15M"
    errors={}
    state.setdefault("symbols",{})
    saved=0
    for i,info in enumerate(selected):
        sym=info["symbol"]
        meta=state["symbols"].setdefault(sym,{})
        try:
            bars=fetch_history(sym,interval,step,duration,folder,now)
            if not bars:raise ValueError("No valid candles returned")
            expected=int((bars[-1][0]-bars[0][0])/step)+1
            meta[mode]={
                "first_ms":bars[0][0],"last_ms":bars[-1][0],
                "bars":len(bars),"expected_bars":expected,
                "coverage_pct":round(100*len(bars)/expected,2),
                "checked_ms":now
            }
            saved+=len(bars)
            if i%15==0:say(mode,"progress",i+1,"/",len(selected),"total",saved)
        except Exception as exc:
            errors[sym]=str(exc)[:170]
            say(mode,"error",sym,str(exc)[:150])
    return {"checked":len(selected),"saved_bars":saved,"errors":errors}


def publish_status(pairs, state, mode, report, now, state_path, public_path):
    metas=state.get("symbols",{})
    all_symbols=[x["symbol"] for x in pairs]
    coverage={}
    for interval in ("1m","5m","15m"):
        records=[metas.get(s,{}).get(interval,{}) for s in all_symbols]
        valid=[v for v in records if int(v.get("bars",0))>0]
        fresh=[v for v in valid if now-int(v.get("last_ms",0))<=36*HOUR]
        coverage[interval]={
            "pairs":len(valid),
            "fresh_pairs_36h":len(fresh),
            "oldest_ms":min((int(v["first_ms"]) for v in valid),default=None),
            "newest_ms":max((int(v["last_ms"]) for v in valid),default=None),
            "min_coverage_days":round(min(((v["last_ms"]-v["first_ms"])/DAY for v in valid),default=0),2),
            "median_coverage_days":round(sorted((v["last_ms"]-v["first_ms"])/DAY for v in valid)[len(valid)//2],2) if valid else 0,
            "total_candles":sum(int(v["bars"]) for v in valid),
            "market_coverage_pct":round(100*len(valid)/len(all_symbols),1)
        }
    status={
        "version":VERSION,
        "updated_at":dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "archive_mode":mode,
        "spot_pairs_discovered":len(all_symbols),
        "max_pairs_per_cycle":PAIR_BATCH if mode=="1m" else MEDIUM_BATCH,
        "source_limit_klines":10000,
        "requested_retention_days":MINUTE_KEEP_DAYS,
        "available_history":{"1m":"6.9 days historical API / grows by archiving",
                             "5m":"about 34 days historical API",
                             "15m":"about 104 days historical API"},
        "minute_database_format":"gzipped SQLite daily partitions, close price and UTC minute",
        "coverage":coverage,
        "last_batch":{"mode":mode,"checked":report["checked"],
                      "new_candles":report.get("added_bars",report.get("saved_bars",0)),
                      "errors":len(report["errors"])},
        "partial":len(report["errors"])>0,
        "notes":"Minute history older than Pionex API limit cannot be reconstructed. Coverage is measured from observed records, never padded."
    }
    state["last_run"]=status["updated_at"]
    state["universe"]=all_symbols
    DATA.mkdir(exist_ok=True)
    state_path.write_text(json.dumps(state,separators=(",",":"),ensure_ascii=False)+"\n",encoding="utf-8")
    public_path.write_text(json.dumps(status,separators=(",",":"),ensure_ascii=False)+"\n",encoding="utf-8")
    return status


def run():
    mode=sys.argv[1] if len(sys.argv)>1 else "1m"
    if mode not in ("1m","5m","15m"):raise ValueError("Choose 1m, 5m or 15m")
    now=(int(time.time()*1000)//MIN)*MIN
    pairs=get_pair_list()
    # Each interval owns its own state and public status. Background minute
    # and multimonth workflows can never overwrite each other's cursor.
    state_path=DATA/("archive-state-"+mode+".json")
    public_path=DATA/("archive-"+mode+".json")
    state=safe_json(state_path,{"version":VERSION,"symbols":{}})
    say("ARCHIVE",mode,"Pionex pairs",len(pairs),"at",iso(now))
    if mode=="1m":report=collect_1m(pairs,state,now)
    else:report=collect_medium(pairs,state,now,mode)
    status=publish_status(pairs,state,mode,report,now,state_path,public_path)
    try_commit("Update Pionex persistent "+mode+" OHLC archive + SQLite day shards")
    say("Archive result",status["coverage"],"batch errors",len(report["errors"]))


if __name__=="__main__":
    run()
