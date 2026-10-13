"""Regression tests for V5. No external exchange/API calls. Run: python -m unittest ..."""
import math
import random
import tempfile
import unittest
from pathlib import Path
import trading_v5 as v


class NoLookaheadTests(unittest.TestCase):
    def setUp(self):
        self.rng=random.Random(2026)
        n=2600
        r=[self.rng.gauss(0,.35) for _ in range(n)]
        start=1760000000000
        b=[math.log(90000)]
        a=[math.log(20)]
        for t in range(1,n):
            b.append(b[-1]+r[t]/100)
            a.append(a[-1]+(.2*r[t]+1.1*r[t-4]+self.rng.gauss(0,.18))/100
                     if t>=4 else a[-1]+self.rng.gauss(0,.18)/100)
        self.b=[(start+i*v.HOUR,math.exp(b[i])) for i in range(n)]
        self.a=[(start+i*v.HOUR,math.exp(a[i])) for i in range(n)]
        self.info={"symbol":"TEST_USDT","spread_pct":.04,"volume_24h_usdt":2e6}

    def test_future_prices_cannot_change_current_signal(self):
        p=v.training_params([c for _,c in self.b],[c for _,c in self.a],1350,.04)
        btc=[c for _,c in self.b]
        alt=[c for _,c in self.a]
        original=v.signal(btc,alt,1900,4,p)
        for j in range(1901,len(btc)):
            btc[j]*=1.44
            alt[j]*=.61
        modified=v.signal(btc,alt,1900,4,p)
        self.assertEqual(original,modified)

    def test_next_bar_close_is_entry_not_decision_close(self):
        alt=[10.,12.,14.,15.,16.,18.,20.,21.,22.]
        # At decision t=2, entry at t+1=3 (15), exit 3+3=6 (20).
        expected=100*math.log(20/15)-.44
        self.assertAlmostEqual(v.trade_return(alt,2,3,.44),expected,places=10)

    def test_strategy_selection_does_not_read_holdout(self):
        b=[c for _,c in self.b]
        a=[c for _,c in self.a]
        cut=1430
        val=1960
        pars=v.training_params(b,a,cut,.04)
        earlier=v.train_validate(b,a,cut,val,pars)
        self.assertIsNotNone(earlier)
        for i in range(val+1,len(a)):
            a[i]*=12 if i%2 else .2
            b[i]*=4 if i%2 else .5
        later=v.train_validate(b,a,cut,val,pars)
        self.assertEqual(earlier,later)

    def test_bh_corrected_probability_never_smaller_than_raw(self):
        data=[
          {"fdr_p":.001,"historical_pass":False,"market_valid":True,
           "signal_current":False,"test":{"n":40,"avg_net_pct":.3,
              "edge_over_best_baseline_pct":.2}},
          {"fdr_p":.04,"historical_pass":False,"market_valid":True,
           "signal_current":False,"test":{"n":40,"avg_net_pct":.3,
              "edge_over_best_baseline_pct":.2}},
          {"fdr_p":.8,"historical_pass":False,"market_valid":True,
           "signal_current":False,"test":{"n":40,"avg_net_pct":.3,
              "edge_over_best_baseline_pct":.2}},
        ]
        v.fdr_adjust(data)
        for row in data:
            self.assertGreaterEqual(row["fdr_q"]+1e-6,row["fdr_p"])
            self.assertFalse(row["validated"])

    def test_forward_records_not_settled_prematurely(self):
        real=v.DATA
        try:
            with tempfile.TemporaryDirectory() as temp:
                v.DATA=Path(temp)
                t=1760000000000
                btc=[(t+i*v.HOUR,12000+i*2) for i in range(100)]
                price=[(t+i*v.HOUR,20+i*.02) for i in range(100)]
                symbol="TEST_USDT"
                row={"symbol":symbol,"signal_current":True,"market_valid":True,
                     "horizon_hours":6,"lag_hours":4,
                     "status":"watch","assumed_round_trip_cost_pct":.40,
                     "test":{"n":30,"avg_net_pct":.2,
                             "edge_over_best_baseline_pct":.1}}
                first=v.track_forward_shadow([row],{symbol:price},btc)
                self.assertEqual(first["pending"],1)
                self.assertEqual(first["settled"],0)
                # A later run contains the future entry and exit bars.
                t0=btc[-1][0]
                more=[(t0+i*v.HOUR,20+(.02*(100+i))) for i in range(1,9)]
                nextbtc=btc+[(t0+i*v.HOUR,12200+i*2) for i in range(1,9)]
                second=v.track_forward_shadow([],{symbol:price+more},nextbtc)
                self.assertEqual(second["settled"],1)
                self.assertEqual(second["pending"],0)
        finally:
            v.DATA=real

    def test_null_returns_do_not_show_confident_positive_lower_bound(self):
        rng=random.Random(6)
        a=[rng.gauss(0,.5) for _ in range(250)]
        b=[rng.gauss(0,.5) for _ in range(250)]
        self.assertLess(v.bootstrap_uplift_low(a,b,reps=200),.15)
        self.assertGreater(v.bootstrap_uplift_low([.8]*150,[-.1]*150,reps=100),.5)


if __name__=="__main__":
    unittest.main()
