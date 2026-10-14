"""Pionex persistent archive regressions. Standard library only."""
from __future__ import annotations
import gzip
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import archive_v2 as a


class ArchiveTests(unittest.TestCase):
    def test_sqlite_roundtrip_and_deduplication(self):
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            with patch.object(a,"DB_DIR",root/"minute_db"):
                work=root/"tmp";work.mkdir()
                obj=a.DailySqlite(work)
                self.assertTrue(callable(obj.insert))

    def test_minute_bars_are_not_synthetically_interpolated(self):
        now=1_800_000_000_000
        observed=[(now-11*a.MIN,200.),(now-9*a.MIN,201.),
                  (now-5*a.MIN,205.)]
        def responder(path,params):
            rows=[{"time":str(t),"close":str(c)} for t,c in reversed(observed)]
            return {"klines":rows}
        with patch.object(a,"fetch",responder):
            bars,_=a.fetch_minute_increment("BTC_USDT",now,0)
        self.assertEqual(bars,observed)
        self.assertNotIn(now-10*a.MIN,[t for t,c in bars])

    def test_increment_only_since_saved_last_candle(self):
        now=1_800_000_000_000
        call_count=0
        def responder(path,params):
            nonlocal call_count
            call_count+=1
            return {"klines":[{"time":now-i*a.MIN,"close":"1.5"}
                              for i in range(1,501)]}
        with patch.object(a,"fetch",responder):
            bars,_=a.fetch_minute_increment("BTC_USDT",now,now-20*a.MIN)
        self.assertEqual(len(bars),22)
        self.assertEqual(call_count,1)

    def test_oldest_symbols_are_updated_first(self):
        pairs=[{"symbol":"BTC_USDT","volume_24h_usdt":0},
               {"symbol":"A_USDT","volume_24h_usdt":100},
               {"symbol":"B_USDT","volume_24h_usdt":500},
               {"symbol":"C_USDT","volume_24h_usdt":300}]
        state={"symbols":{
            "A_USDT":{"1m":{"checked_ms":100}},
            "B_USDT":{"1m":{"checked_ms":300}},
            "C_USDT":{"1m":{"checked_ms":200}}}}
        selected=a.select_pairs(pairs,state,"1m",2)
        self.assertEqual([x["symbol"] for x in selected],
                         ["BTC_USDT","A_USDT","C_USDT"])

    def test_sqlite_daily_shards_and_reopened_persistence(self):
        now=1_800_000_000_000
        day="2027-01-15"  # overwrite with date based on timestamp
        from datetime import datetime, timezone
        day=datetime.fromtimestamp(now/1000,timezone.utc).strftime("%Y-%m-%d")
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp)
            dbroot=root/"db"
            with patch.object(a,"DB_DIR",dbroot):
                work=root/"work";work.mkdir()
                first=a.DailySqlite(work)
                rows=[(now-4*a.MIN,123.2),(now-2*a.MIN,124.3)]
                self.assertEqual(first.insert("BTC_USDT",rows),2)
                self.assertEqual(first.insert("BTC_USDT",rows),0)
                self.assertEqual(first.save(),[day])
                assert (dbroot/(day+".sqlite.gz")).exists()
                secondwork=root/"work2";secondwork.mkdir()
                second=a.DailySqlite(secondwork)
                self.assertEqual(second.insert("BTC_USDT",rows),0)
                self.assertEqual(second.insert("ETH_USDT",[(now-2*a.MIN,2000)]),1)
                self.assertEqual(second.save(),[day])
                unzipped=root/"raw.sqlite"
                with gzip.open(dbroot/(day+".sqlite.gz"),"rb") as src:
                    unzipped.write_bytes(src.read())
                conn=sqlite3.connect(unzipped)
                got=conn.execute("SELECT symbol,ts_ms,close FROM minutes ORDER BY symbol,ts_ms").fetchall()
                conn.close()
                self.assertEqual(len(got),3)
                self.assertEqual({x[0] for x in got},{"BTC_USDT","ETH_USDT"})

    def test_timeframe_state_files_do_not_overlap(self):
        names=[str(a.DATA/("archive-state-"+i+".json"))
               for i in ("1m","5m","15m")]
        self.assertEqual(len(set(names)),3)


if __name__=="__main__":
    unittest.main()
