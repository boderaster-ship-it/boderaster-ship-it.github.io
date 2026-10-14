"use strict";
/* Zero-dependency UI regression checks; run with Node 20+. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const match=html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match,"Embedded scanner script must exist");
const src=match[1];
new vm.Script(src); // syntax check before any API request

class Element {
  constructor(tag){
    this.tag=tag;
    this._text="";
    this.children=[];
    this.handlers={};
    this.disabled=false;
    this.className="";
    this.style={};
    this.classList={
      add:x=>{this.className+=" "+x},
      remove:x=>{this.className=this.className.split(" ").filter(c=>c!==x).join(" ")}
    };
  }
  set textContent(x){this._text=String(x);this.children=[]}
  get textContent(){return this._text+this.children.map(x=>x?.textContent||"").join("")}
  replaceChildren(...children){this._text="";this.children=[...children]}
  append(...children){this.children.push(...children)}
  addEventListener(k,fn){this.handlers[k]=fn}
}

const HOUR=3600000;
function fakeData(n=2){
 const now=new Date().toISOString();
 return {
  version:5, generated_at:now, data_through:now, period_days:180,
  analyzed_coins:n, btc_change_pct:{"3h":1.2,"6h":2,"24h":3},
  shadow_forward:{settled:0,pending:2,profitable:0},
  results:Array.from({length:n},(_,i)=>({
   symbol:(i===0?"ALPHA":"BETA")+"_USDT",
   signal_params:{btc_trigger_pct:.4,btc_beta:1}, market_valid:true,
   validated:false,status:"watch",signal_current:true,
   lag_hours:6,horizon_hours:3,target_net_pct:.75,assumed_round_trip_cost_pct:.4,
   btc_signal_pct:1.2,coin_since_signal_pct:0,
   test:{n:40,avg_net_pct:.3,edge_over_best_baseline_pct:.18,
     net_profit_prob_pct:59.5,profit_ci_pct:[43.2,72.1],
     loss_risk_pct:21.2,drawdown_pct:8.9,profit_factor:1.3,
     net_lower90_pct:-.3,edge_lower90_pct:-.2,
     median_net_pct:.1,net_p10_pct:-1.7,net_p90_pct:2.1,
     hit_prob_pct:31.3}
  }))
 };
}
function makeEnvironment({failCoin=null}={}){
 const registry=new Map();
 const document={
  getElementById:id=>{
   if(!registry.has(id))registry.set(id,new Element(id));
   return registry.get(id);
  },
  createElement:tag=>new Element(tag)
 };
 let requests=0;
 const lastStart=Math.floor(Date.now()/HOUR)*HOUR-HOUR;
 const bars=alt=>Array.from({length:52},(_,i)=>({
   time:lastStart-i*HOUR,
   close:alt?100:100*Math.exp(-i*.012)
 }));
 const data=fakeData();
 const fetch=async url=>{
  const u=String(url);
  if(u.includes("/data/v5.json"))return{ok:true,json:async()=>data};
  requests++;
  if(failCoin&&u.includes(failCoin))return{ok:false,status:503};
  const raw=JSON.stringify({
    result:true,data:{klines:bars(!u.includes("BTC_USDT"))}
  });
  return{ok:true,text:async()=>u.includes("r.jina.ai")?
    "Title: Pionex\nMarkdown Content:\n"+raw:raw};
 };
 class AbortControllerMock{
  constructor(){this.signal={aborted:false}}
  abort(){this.signal.aborted=true}
 }
 const sandbox={
  document,fetch,
  Date,Math,Number,String,Array,Map,Set,JSON,Promise,Error,RegExp,
  Uint8Array,TextDecoder,atob,
  AbortController:AbortControllerMock,
  setTimeout:(fn,ms)=>{if(ms<1000)fn();return 1},
  clearTimeout:()=>{}
 };
 vm.runInNewContext(src,sandbox,{timeout:6000});
 return {registry,get:id=>registry.get(id),requests:()=>requests};
}
async function flush(){for(let i=0;i<30;i++)await Promise.resolve()}
function deepFind(root,predicate){
 if(!root)return[];
 return [ ...(predicate(root)?[root]:[]),...root.children.flatMap(n=>deepFind(n,predicate)) ];
}
(async()=>{
 const partial=makeEnvironment({failCoin:"BETA_USDT"});
 await flush();
 await partial.get("reload").handlers.click();
 await flush();
 assert.match(partial.get("verdict").textContent,/PRÜFUNG UNVOLLSTÄNDIG/);
 assert.match(partial.get("notice").textContent,/1 von 2/);
 assert.match(partial.get("explanation").textContent,/keine vollständige Handelsentscheidung/);
 assert.match(partial.get("opportunities").textContent,/kein|Keine/i);
 console.log("PASS incomplete feed blocks trading verdict");

 const complete=makeEnvironment();
 await flush();
 await complete.get("reload").handlers.click();
 await flush();
 assert.match(complete.get("notice").textContent,/2 von 2/);
 assert.doesNotMatch(complete.get("verdict").textContent,/UNVOLLSTÄNDIG/);
 assert.equal(complete.get("reload").disabled,false);
 const cards=deepFind(complete.get("watchlist"),x=>x.className.includes("card"));
 assert.ok(cards.length>=1,"Expected watch-only cards");
 assert.ok(deepFind(cards[0],x=>x.className==="scenarios").length,"Historical outcome scenarios missing");
 assert.match(cards[0].textContent,/59,5 %/,"Historical profit rate should be unsigned");
 assert.doesNotMatch(cards[0].textContent,/\+59,5 %/,"Profit chance is not a return");
 assert.match(cards[0].textContent,/-1,70 %/,"10th-percentile downside scenario absent");
 console.log("PASS full refresh and intuitive net-risk scenarios");
})().catch(e=>{console.error(e);process.exitCode=1});
