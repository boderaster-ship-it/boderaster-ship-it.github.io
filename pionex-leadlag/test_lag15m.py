"""Tests for BTC lead-15m selection with no final-holdout leakage."""
import math
import random
import unittest

from leadlag_15m import STEP, analyze, fdr


class LagScreenTests(unittest.TestCase):
    def make_series(self,lag,seed=8,n=7200,unrelated=False):
        rng=random.Random(seed)
        btc_returns=[rng.gauss(0,.8) for _ in range(n)]
        alt_returns=[(1.15*btc_returns[t-lag] if t>=lag and not unrelated else 0)
                     +rng.gauss(0,.18) for t in range(n)]
        b=[math.log(90000.)]
        a=[math.log(15.)]
        for t in range(1,n):
            b.append(b[-1]+btc_returns[t]/100)
            a.append(a[-1]+alt_returns[t]/100)
        start=1_750_000_000_000
        return [(start+t*STEP,math.exp(b[t])) for t in range(n)],[
               (start+t*STEP,math.exp(a[t])) for t in range(n)]

    def test_recovers_known_positive_lag_on_untouched_holdout(self):
        b,a=self.make_series(8)
        output=analyze(b,a,"LAG_USDT")
        self.assertIsNotNone(output)
        self.assertEqual(output["lag_minutes"],120)
        self.assertGreater(output["test_corr"],.75)
        self.assertGreater(output["test_pairs"],170)
        self.assertFalse(output.get("is_trading_signal",False))

    def test_lag_selection_does_not_use_future_prices(self):
        b,a=self.make_series(12)
        first=analyze(b,a,"LAG_USDT")
        changed=a.copy()
        train=int(len(a)*.60)
        rng=random.Random(12)
        for j in range(train+105,len(a)):
            changed[j]=(changed[j][0],changed[j][1]*math.exp(rng.gauss(0,.03)))
        second=analyze(b,changed,"LAG_USDT")
        self.assertEqual(first["lag_minutes"],second["lag_minutes"])

    def test_bh_q_not_more_optimistic_than_raw(self):
        rows=[
           {"p_value":.003,"train_first_corr":.3,"train_second_corr":.3,
            "training_consistent":True,"test_corr":.20,"test_pairs":300},
           {"p_value":.18,"train_first_corr":.08,"train_second_corr":.08,
            "training_consistent":True,"test_corr":.04,"test_pairs":310}
        ]
        fdr(rows)
        for row in rows:
            self.assertGreaterEqual(row["adjusted_q"]+1e-7,row["p_value"])
            self.assertFalse(row["is_trading_signal"])


if __name__=="__main__":
    unittest.main()
