(()=>{
const PANEL="bbtips-final-robo";
const TIMER="BBTIPS_FINAL_ROBO_TIMER";
const SEEN="BBTIPS_FINAL_ROBO_SEEN";
const API_STORE="BBTIPS_FINAL_API_ROWS_V2";
const HIST_STORE="BBTIPS_FINAL_RESULTADOS_HIST_V1";
const AGENTE_LOCAL_URL="http://127.0.0.1:8765/ingest";
let AGENTE_LOCAL_TS=0;
let LAST_HIST_SAVE_TS=0;
document.getElementById(PANEL)?.remove();
document.getElementById(PANEL+"-style")?.remove();
clearInterval(window[TIMER]);
["BBTIPS_FINAL_ROBO_TIMER","BBTIPS_API_ALERTAS_TIMER","BBTIPS_INTERCEPTA_API_TIMER","BBTIPS_PRO_TRADER_TIMER","HB_MULTI_TIMER"].forEach(k=>{try{clearInterval(window[k])}catch(e){}});
["bbtips-api-alertas","bbtips-intercepta-api","hb-multi","hb-tips-scanner"].forEach(id=>document.getElementById(id)?.remove());

const CONFIG={market:"over25",tol:0.8,minEV:0,minProb:52,minOddPct:45,minOddSample:8,maxProximos:6,intervalMs:10000,windows:[120,240,480,960],ligas:[1,2,3,4,5,6],ligaAuto:true,horas:"Horas3",filtros:"o15,o25,u25,ambs,ambn,o35,u15,u35,ge5,tgv5,tgc5"};
let PANEL_HOVER=false;
let TOOLTIP_SERIES=[];
let RESULTS_CACHE=[];
let API_ROWS=[];
const MARKETS=[
  {key:"ambas_sim",name:"Ambas Sim",patterns:[/ambs@?(\d+[,.]\d+)/ig,/ambas\s*sim@?(\d+[,.]\d+)/ig],label:/ambs|ambas\s*sim|ambas\s*marcam/i},
  {key:"ambas_nao",name:"Ambas Nao",patterns:[/ambn@?(\d+[,.]\d+)/ig,/ambas\s*nao@?(\d+[,.]\d+)/ig],label:/ambn|ambas\s*n/i},
  {key:"over15",name:"Over 1.5",patterns:[/o15@?(\d+[,.]\d+)/ig,/over\s*1[,.]?5@?(\d+[,.]\d+)/ig],label:/o15|over\s*1/i},
  {key:"under15",name:"Under 1.5",patterns:[/u15@?(\d+[,.]\d+)/ig,/under\s*1[,.]?5@?(\d+[,.]\d+)/ig],label:/u15|under\s*1/i},
  {key:"over25",name:"Over 2.5",patterns:[/o25@?(\d+[,.]\d+)/ig,/over\s*2[,.]?5@?(\d+[,.]\d+)/ig],label:/o25|over\s*2/i},
  {key:"under25",name:"Under 2.5",patterns:[/u25@?(\d+[,.]\d+)/ig,/under\s*2[,.]?5@?(\d+[,.]\d+)/ig],label:/u25|under\s*2/i},
  {key:"over35",name:"Over 3.5",patterns:[/o35@?(\d+[,.]\d+)/ig,/over\s*3[,.]?5@?(\d+[,.]\d+)/ig],label:/o35|over\s*3/i},
  {key:"under35",name:"Under 3.5",patterns:[/u35@?(\d+[,.]\d+)/ig,/under\s*3[,.]?5@?(\d+[,.]\d+)/ig],label:/u35|under\s*3/i},
  {key:"casa_vence",name:"Casa vence",patterns:[/casa@?(\d+[,.]\d+)/ig,/casa\s*vence@?(\d+[,.]\d+)/ig,/cv@?(\d+[,.]\d+)/ig],label:/casa\s*vence/i},
  {key:"fora_vence",name:"Fora vence",patterns:[/fora@?(\d+[,.]\d+)/ig,/fora\s*vence@?(\d+[,.]\d+)/ig,/fv@?(\d+[,.]\d+)/ig],label:/fora\s*vence/i},
  {key:"over5",name:"Over 5+",patterns:[/o5@?(\d+[,.]\d+)/ig,/ge5@?(\d+[,.]\d+)/ig,/e5\+?@?(\d+[,.]\d+)/ig,/5\+@?(\d+[,.]\d+)/ig,/over\s*5\+?@?(\d+[,.]\d+)/ig],label:/5\+|ge5|over\s*5/i},
  {key:"casa5",name:"Casa 5+",patterns:[/casa\s*5@?(\d+[,.]\d+)/ig,/c5@?(\d+[,.]\d+)/ig,/tgc5@?(\d+[,.]\d+)/ig,/tcg5@?(\d+[,.]\d+)/ig],label:/casa\s*5|tgc5/i},
  {key:"fora5",name:"Fora 5+",patterns:[/fora\s*5@?(\d+[,.]\d+)/ig,/f5@?(\d+[,.]\d+)/ig,/tgv5@?(\d+[,.]\d+)/ig,/tvg5@?(\d+[,.]\d+)/ig],label:/fora\s*5|tgv5/i}
];

const css=document.createElement("style");
css.id=PANEL+"-style";
css.textContent=`
#${PANEL}{position:fixed;left:6px;right:6px;bottom:6px;z-index:999999;background:#101820;color:#eaf7ff;border:1px solid #29d7ff;border-radius:6px;font:12px Arial;box-shadow:0 8px 24px #0009}
#${PANEL}.min .body{display:none}
#${PANEL} .top{display:flex;gap:8px;align-items:center;justify-content:space-between;background:#162331;padding:7px;flex-wrap:wrap}
#${PANEL} .body{max-height:58vh;overflow:auto;padding:8px}
#${PANEL} button,#${PANEL} input,#${PANEL} select{background:#0b7189;color:white;border:1px solid #46e3ff;border-radius:4px;padding:5px 8px;margin:2px}
#${PANEL} input,#${PANEL} select{background:#06131d}
#${PANEL} input{width:54px}
#${PANEL} h3{color:#ffd166;margin:8px 0 4px;font-size:18px}
#${PANEL} table{width:100%;border-collapse:collapse;margin:8px 0}
#${PANEL} th,#${PANEL} td{border:1px solid #314657;padding:4px;vertical-align:top}
#${PANEL} th{background:#1b2b38;color:#9ee7ff}
#${PANEL} .ok{color:#40ff7b;font-weight:bold}.warn{color:#ffd166;font-weight:bold}.bad{color:#ff6b6b;font-weight:bold}
#${PANEL} .sig{border:1px solid #314657;border-left:4px solid #40ff7b;border-radius:5px;background:#0b141d;padding:8px;margin:7px 0}
`;
document.head.appendChild(css);
const P=document.createElement("div");
P.id=PANEL;
document.body.appendChild(P);
P.addEventListener("mouseenter",()=>PANEL_HOVER=true);
P.addEventListener("mouseleave",()=>PANEL_HOVER=false);
hookApi();
loadApiRows();

function esc(v){return String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])).replace(/\s+/g," ").trim()}
function market(){return MARKETS.find(m=>m.key===CONFIG.market)||MARKETS[0]}
function activeMarkets(){return MARKETS.filter(m=>m.key===CONFIG.market)}
function beep(){
  try{
    const ctx=new AudioContext(),master=ctx.createGain();
    master.connect(ctx.destination);master.gain.value=0.12;
    for(let t=0;t<5;t++){
      [0,0.22].forEach(off=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.frequency.value=880;o.type="sine";o.connect(g);g.connect(master);
        const s=ctx.currentTime+t+off;
        g.gain.setValueAtTime(0,s);g.gain.linearRampToValueAtTime(1,s+0.02);g.gain.linearRampToValueAtTime(0,s+0.16);
        o.start(s);o.stop(s+0.18);
      });
    }
    setTimeout(()=>ctx.close(),5300);
  }catch(e){}
}
function parseTime(v){
  const m=String(v||"").trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if(!m)return null;
  const h=Number(m[1]),mi=Number(m[2]);
  return h>=0&&h<24&&mi>=0&&mi<60?h*60+mi:null;
}
function isFuture(v){
  const hm=parseTime(v);
  if(hm===null)return true;
  const d=new Date(),now=d.getHours()*60+d.getMinutes();
  let diff=hm-now;
  if(diff<-720)diff+=1440;
  return diff>=0&&diff<=720;
}
function oddsForMarket(txt,m){
  const out=[];
  m.patterns.forEach(re=>{
    re.lastIndex=0;
    let r;
    while((r=re.exec(txt)))out.push(Number(String(r[1]).replace(",",".")));
  });
  return out.filter(n=>Number.isFinite(n)&&n>1);
}
function marketAliases(m){
  const map={
    ambas_sim:["ambs","ambas_sim","odd_ambas_sim"],
    ambas_nao:["ambn","ambas_nao","odd_ambas_nao"],
    over15:["o15","over15","over_15","odd_over_1.5"],
    under15:["u15","under15","under_15","odd_under_1.5"],
    over25:["o25","over25","over_25","odd_over_2.5"],
    under25:["u25","under25","under_25","odd_under_2.5"],
    over35:["o35","over35","over_35","odd_over_3.5"],
    under35:["u35","under35","under_35","odd_under_3.5"],
    casa_vence:["casa","casa_vence","cv"],
    fora_vence:["fora","fora_vence","fv"],
    over5:["o5","ge5","e5+","e5","over5","over_5","5+","odd_over_5","odd_ge5","odd_5+"],
    casa5:["casa5","casa_5","c5","tgc5","tcg5","time_gols_casa_5","odd_casa5","odd_casa_5","odd_tgc5"],
    fora5:["fora5","fora_5","f5","tgv5","tvg5","time_gols_fora_5","time_gols_visitante_5","odd_fora5","odd_fora_5","odd_tgv5"]
  };
  return map[m.key]||[];
}
function oddFromObj(odds,m){
  if(!odds||typeof odds!=="object")return null;
  const low={};
  Object.keys(odds).forEach(k=>low[String(k).toLowerCase()]=Number(String(odds[k]).replace(",",".")));
  for(const k of marketAliases(m)){
    const v=low[String(k).toLowerCase()];
    if(Number.isFinite(v)&&v>1)return v;
  }
  return null;
}
function txtFromApiRow(r){
  const odds=MARKETS.map(m=>{
    const v=oddFromObj(r.odds,m);
    return v?`${marketAliases(m)[0]}@${v}`:"";
  }).filter(Boolean).join("\n");
  return `${r.name||""}\n${r.score?`${r.score.a}-${r.score.b}`:""}\n${odds}`;
}
function hasResult(txt){
  const clean=String(txt||"");
  const lines=clean.split(/\n/).map(x=>x.trim()).filter(Boolean);
  if(/\bOUT\b/i.test(clean))return true;
  if(lines.slice(1,4).some(l=>/^\d+\s*[-x]\s*\d+$/.test(l)))return true;
  return false;
}
function gameName(txt){
  const line=String(txt||"").split(/\n/).map(esc).find(x=>/\s+x\s+/i.test(x))||String(txt||"");
  const parts=line.split(/\s+x\s+/i);
  if(parts.length>=2){
    const a=esc(parts[0]).slice(-45);
    const b=esc(parts.slice(1).join(" x ")).replace(/\s+(o25|o35|u25|ambs|ambn|o5|5\+).*/i,"").slice(0,45);
    return `${a} x ${b}`;
  }
  return esc(line).slice(0,90);
}
function parseApiOdds(raw){
  if(!raw)return{};
  if(typeof raw==="object")return raw;
  try{return JSON.parse(raw)}catch(e){}
  const out={};
  String(raw).split(/[;,|\n]/).forEach(p=>{
    const m=p.match(/([a-zA-Z0-9_.+]+)\s*@\s*(\d+(?:[,.]\d+)?)/);
    if(m)out[m[1].toLowerCase()]=Number(m[2].replace(",","."));
  });
  return out;
}
function apiScore(raw){
  const m=String(raw||"").match(/(\d+)\s*[-x]\s*(\d+)/i);
  if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]);
  return Number.isFinite(a)&&Number.isFinite(b)?{a,b,t:a+b}:null;
}
function apiTime(row,line){
  const h=row.Horario??row.horario??row.Hora??row.hora??line?.Horario??line?.horario??"";
  const min=row.Minuto??row.minuto;
  if(String(h).match(/^\d{1,2}[.:]\d{2}$/))return String(h).replace(":",".");
  if(h!==""&&min!==undefined)return `${Number(h)}.${String(min).padStart(2,"0")}`;
  return String(h||"");
}
function flattenApi(json,url){
  const out=[];
  const liga=ligaFromUrl(url);
  const linhas=Array.isArray(json?.Linhas)?json.Linhas:Array.isArray(json?.linhas)?json.linhas:Array.isArray(json)?json:[];
  linhas.forEach((linha,li)=>{
    const cols=Array.isArray(linha.Colunas)?linha.Colunas:Array.isArray(linha.colunas)?linha.colunas:Array.isArray(linha.Jogos)?linha.Jogos:[linha];
    cols.forEach((c,ci)=>{
      if(!c||typeof c!=="object")return;
      const score=apiScore(c.Resultado||c.resultado||c.Placar||c.placar||"");
      const a=c.TimeA||c.timeA||c.Casa||c.casa||c.TimeCasa||"";
      const b=c.TimeB||c.timeB||c.Fora||c.fora||c.TimeFora||"";
      const time=apiTime(c,linha);
      const odds=parseApiOdds(c.Odds||c.odds||c.Odd||c.odd);
      const future=/futuro=true/i.test(url)||Boolean(c.Futuro||c.futuro||(!score&&time));
      if(!a&&!b&&!time)return;
      out.push({
        key:[url,time,a,b,score?`${score.a}-${score.b}`:""].join("|"),
        liga,
        time,
        name:esc(`${a} x ${b}`),
        score,
        odds,
        future,
        api:url,
        idx:li*100+ci
      });
    });
  });
  return out;
}
function saveApiRows(rows){
  if(!rows.length)return;
  const by={};
  try{JSON.parse(localStorage.getItem(API_STORE)||"[]").forEach(r=>by[r.key]=r)}catch(e){}
  rows.forEach(r=>by[r.key]=r);
  API_ROWS=Object.values(by).slice(-5000);
  localStorage.setItem(API_STORE,JSON.stringify(API_ROWS));
  sendAgenteLocal(rows);
}
function sendAgenteLocal(rows){
  const now=Date.now();
  if(!rows.length||now-AGENTE_LOCAL_TS<60000)return;
  AGENTE_LOCAL_TS=now;
  try{
    window.postMessage({type:"BBTIPS_AGENT_ROWS",source:"bbtips_extension",sentAt:now,rows:rows.slice(-250)},"*");
  }catch(e){}

}
function sendResultadosAgenteLocal(){
  try{
    if(!Array.isArray(RESULTS_CACHE)||!RESULTS_CACHE.length)return;
    const rows=RESULTS_CACHE.filter(r=>r&&r.score&&r.name).slice(-800).map(r=>({
      key:["result-cache",r.time||"",r.name||"",`${r.score.a}-${r.score.b}`].join("|"),
      liga:ligaFromUrl(r.api||"")||activeLiga()||null,
      time:String(r.time||""),
      name:String(r.name||""),
      score:r.score,
      odds:{},
      future:false,
      api:"result-cache"
    }));
    sendAgenteLocal(rows);
  }catch(e){}
}
function loadApiRows(){
  try{API_ROWS=JSON.parse(localStorage.getItem(API_STORE)||"[]")}catch(e){API_ROWS=[]}
}
function rowScoreText(r){return r?.score?`${r.score.a}-${r.score.b}`:""}
function resultKey(r){
  return [
    r.api?"api":"dom",
    r.liga||"",
    String(r.time||""),
    String(r.name||"").toLowerCase(),
    rowScoreText(r),
    String(r.txt||"").replace(/\s+/g," ").slice(-180)
  ].join("|");
}
function loadStoredResults(){
  try{
    const rows=JSON.parse(localStorage.getItem(HIST_STORE)||"[]");
    return Array.isArray(rows)?rows.filter(r=>r&&r.score&&r.name):[];
  }catch(e){return []}
}
function saveStoredResults(rows){
  const now=Date.now();
  if(now-LAST_HIST_SAVE_TS<30000)return;
  LAST_HIST_SAVE_TS=now;
  try{localStorage.setItem(HIST_STORE,JSON.stringify(rows.slice(0,2500)))}catch(e){}
}
function processApiText(url,text){
  if(!/futebolvirtual|Linhas|Colunas|TimeA|TimeB|Odds|Resultado/i.test(String(url)+" "+String(text).slice(0,500)))return;
  try{saveApiRows(flattenApi(JSON.parse(text),url))}catch(e){}
}
function hookApi(){
  if(!window.__BBTIPS_FINAL_API_HOOK&&window.fetch){
    window.__BBTIPS_FINAL_API_HOOK=true;
    const orig=window.fetch;
    window.fetch=async function(...args){
      const url=String(args[0]?.url||args[0]||"");
      const res=await orig.apply(this,args);
      try{res.clone().text().then(t=>processApiText(url,t)).catch(()=>{})}catch(e){}
      return res;
    };
  }
  if(!window.__BBTIPS_FINAL_XHR_HOOK&&window.XMLHttpRequest){
    window.__BBTIPS_FINAL_XHR_HOOK=true;
    const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open=function(method,url,...rest){this.__bbtips_url=String(url||"");return open.call(this,method,url,...rest)};
    XMLHttpRequest.prototype.send=function(...args){
      this.addEventListener("load",()=>{try{processApiText(this.__bbtips_url||"",this.responseText||"")}catch(e){}});
      return send.apply(this,args);
    };
  }
}
function ligaFromUrl(url){
  try{
    const v=new URL(url,location.href).searchParams.get("liga");
    return v?Number(v):null;
  }catch(e){return null}
}
function activeLiga(){
  if(!CONFIG.ligaAuto)return null;
  const names={express:6,copa:1,euro:2,super:3,premier:4,split:5};
  let best=null,bestScore=-1;
  document.querySelectorAll("button,div,span,a,li").forEach(el=>{
    const txt=esc(el.innerText||"").toLowerCase();
    if(!names[txt])return;
    const r=el.getBoundingClientRect?.();
    if(!r||r.width<30||r.height<15||r.top<0||r.top>innerHeight)return;
    const st=getComputedStyle(el);
    const bg=st.backgroundColor||"";
    const m=bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    const rgb=m?{r:Number(m[1]),g:Number(m[2]),b:Number(m[3])}:null;
    const blue=rgb?rgb.b-rgb.r+rgb.b-rgb.g:0;
    const active=(el.className||"").toString().match(/active|selected|ativo/i)?100:0;
    const score=blue+r.width/10+active;
    if(score>bestScore){bestScore=score;best=names[txt]}
  });
  return best;
}
function ligaNome(){const l=activeLiga();return l?`Liga ${l}`:"Liga auto"}
function apiUrl(liga,futuro){
  return `https://api.thtips.com.br/api/futebolvirtual?liga=${liga}&futuro=${futuro?"true":"false"}&Horas=${CONFIG.horas}&tipoOdd=&dadosAlteracao=&filtros=${encodeURIComponent(CONFIG.filtros)}&confrontos=false&hrsConfrontos=240`;
}
async function carregarApiDireto(){
  const erros=[];
  for(const liga of CONFIG.ligas){
    for(const futuro of [false,true]){
      const url=apiUrl(liga,futuro);
      try{
        const r=await fetch(url,{credentials:"include",cache:"no-store"});
        const txt=await r.text();
        processApiText(url,txt);
        if(!r.ok)erros.push(`${liga} ${futuro?"futuro":"hist"} ${r.status}`);
      }catch(e){erros.push(`${liga} ${futuro?"futuro":"hist"} falhou`)}
    }
  }
  loadApiRows();
  refreshResultsCache();
  draw();
  return erros;
}
function upcomingSetFromPage(){
  const set=new Set();
  document.querySelectorAll("tr").forEach(tr=>{
    const cells=[...tr.children].map(c=>esc(c.innerText||""));
    if(cells.length<2)return;
    if(/^\d{1,2}[.:]\d{2}$/.test(cells[0])&&/\s+x\s+/i.test(cells[1]))set.add(cells[0].replace(":","."));
  });
  return set;
}
function readGridGames(){
  const games=[],apiGames=[],seen=new Set(),upcoming=upcomingSetFromPage();
  const liga=activeLiga();
  document.querySelectorAll("table").forEach(table=>{
    const rows=[...table.querySelectorAll("tr")];
    const minuteByCol={};
    rows.forEach(tr=>{
      const cells=[...tr.children];
      const first=esc(cells[0]?.innerText||"").toLowerCase();
      if(first==="h"||first==="horario"||first==="hora"){
        cells.forEach((c,i)=>{
          const n=Number(esc(c.innerText));
          if(Number.isInteger(n)&&n>=0&&n<60)minuteByCol[i]=n;
        });
      }
    });
    rows.forEach(tr=>{
      const cells=[...tr.children];
      const hour=Number(esc(cells[0]?.innerText||""));
      if(!Number.isInteger(hour)||hour<0||hour>23)return;
      cells.forEach((cell,i)=>{
        if(i===0||minuteByCol[i]===undefined)return;
        const txt=cell.innerText||"";
        if(!/\s+x\s+/i.test(txt))return;
        const time=`${hour}.${String(minuteByCol[i]).padStart(2,"0")}`;
        if(upcoming.size&& !upcoming.has(time))return;
        if(!isFuture(time))return;
        if(hasResult(txt))return;
        const name=gameName(txt);
        activeMarkets().forEach(m=>{
          const odds=oddsForMarket(txt,m);
          if(!odds.length)return;
          const key=`${time}|${name}|${m.key}|${odds[0]}`;
          if(seen.has(key))return;
          seen.add(key);
          games.push({time,name,market:m,odd:odds[0],text:txt});
        });
      });
    });
  });
  if(games.length)return games.sort((a,b)=>(parseTime(a.time)??9999)-(parseTime(b.time)??9999)).slice(0,CONFIG.maxProximos);
  API_ROWS.filter(r=>r.future&&!r.score&&(!liga||!r.liga||r.liga===liga)).forEach(r=>{
    if(upcoming.size&&r.time&&!upcoming.has(String(r.time).replace(":",".")))return;
    if(r.time&&!isFuture(r.time))return;
    activeMarkets().forEach(m=>{
      const odd=oddFromObj(r.odds,m);
      if(!odd)return;
      const key=`${r.time}|${r.name}|${m.key}|${odd}`;
      if(seen.has(key))return;
      seen.add(key);
      apiGames.push({time:r.time,name:r.name,market:m,odd,text:txtFromApiRow(r),api:true});
    });
  });
  return apiGames.sort((a,b)=>(parseTime(a.time)??9999)-(parseTime(b.time)??9999)).slice(0,CONFIG.maxProximos);
}
function numericArray(v){
  if(!Array.isArray(v)||v.length<25)return null;
  const vals=v.map(x=>{
    if(typeof x==="number")return x;
    if(x&&typeof x==="object")return Number(x.y??x.value??x.valor??x.pct??x.percentual??x[1]);
    return Number(x);
  }).filter(n=>Number.isFinite(n)&&n>=0&&n<=100);
  return vals.length>=25?vals:null;
}
function addSeries(out,path,data){
  const vals=numericArray(data);
  if(vals)out.push({path,vals:vals.slice(-1200)});
}
function scanObj(obj,path,depth,out,seen){
  if(!obj||depth>4||seen.has(obj))return;
  if(typeof obj==="object")seen.add(obj);
  const arr=numericArray(obj);
  if(arr){out.push({path,vals:arr.slice(-1200)});return}
  if(typeof obj!=="object")return;
  Object.keys(obj).slice(0,80).forEach(k=>{
    if(depth>1&&!/trend|tend|graf|chart|serie|data|merc|over|under|amb|macd|rsi|hist|linha|sinal/i.test(k))return;
    try{scanObj(obj[k],`${path}.${k}`,depth+1,out,seen)}catch(e){}
  });
}
function scanChartLibraries(out){
  try{
    if(window.Chart){
      document.querySelectorAll("canvas").forEach((cv,i)=>{
        let ch=null;
        try{ch=window.Chart.getChart?window.Chart.getChart(cv):null}catch(e){}
        if(!ch&&cv.chart)ch=cv.chart;
        (ch?.data?.datasets||[]).forEach((d,j)=>addSeries(out,`Chart.${i}.${d.label||j}`,d.data));
      });
    }
  }catch(e){}
  try{
    if(window.echarts){
      document.querySelectorAll("div,canvas").forEach((el,i)=>{
        let inst=null;
        try{inst=window.echarts.getInstanceByDom(el)}catch(e){}
        (inst?.getOption?.().series||[]).forEach((s,j)=>addSeries(out,`ECharts.${i}.${s.name||j}`,s.data));
      });
    }
  }catch(e){}
  try{
    const inst=window.Apex?._chartInstances;
    if(inst)Object.values(inst).forEach((it,i)=>{
      const series=it?.chart?.w?.config?.series||it?.w?.config?.series||it?.series||[];
      series.forEach((s,j)=>addSeries(out,`Apex.${i}.${s.name||j}`,s.data||s));
    });
  }catch(e){}
  try{
    if(window.Highcharts?.charts){
      window.Highcharts.charts.filter(Boolean).forEach((ch,i)=>(ch.series||[]).forEach((s,j)=>addSeries(out,`Highcharts.${i}.${s.name||j}`,s.yData||s.data)));
    }
  }catch(e){}
  try{
    document.querySelectorAll(".js-plotly-plot").forEach((el,i)=>(el.data||[]).forEach((s,j)=>addSeries(out,`Plotly.${i}.${s.name||j}`,s.y||s.data)));
  }catch(e){}
}
function canvasLineSeries(){
  const out=[];
  document.querySelectorAll("canvas").forEach((cv,idx)=>{
    const r=cv.getBoundingClientRect();
    if(r.width<500||r.height<180)return;
    let ctx;
    try{ctx=cv.getContext("2d",{willReadFrequently:true})}catch(e){return}
    if(!ctx)return;
    let img;
    try{img=ctx.getImageData(0,0,cv.width,cv.height)}catch(e){return}
    const data=img.data,w=cv.width,h=cv.height;
    const pts=[];
    const step=Math.max(1,Math.floor(w/260));
    for(let x=0;x<w;x+=step){
      let best=null,bestScore=0;
      for(let y=0;y<h;y++){
        const p=(y*w+x)*4,rr=data[p],gg=data[p+1],bb=data[p+2],aa=data[p+3];
        if(aa<180)continue;
        const white=rr>180&&gg>180&&bb>180;
        const green=gg>150&&rr<120&&bb<140;
        const red=rr>170&&gg<100&&bb<100;
        if(!white&&!green&&!red)continue;
        const score=(white?3:1)+(255-y/h);
        if(score>bestScore){bestScore=score;best=y}
      }
      if(best!==null)pts.push({x,y:best});
    }
    if(pts.length<40)return;
    const ys=pts.map(p=>p.y);
    const minY=Math.min(...ys),maxY=Math.max(...ys);
    if(maxY-minY<30)return;
    const vals=pts.map(p=>100-(p.y-minY)/(maxY-minY)*100).filter(n=>Number.isFinite(n));
    if(vals.length>=40)out.push({path:`canvas.linha-grafica.${idx}`,vals:vals.slice(-1200)});
  });
  return out;
}
function trendSeries(){
  const out=[],seen=new WeakSet();
  scanChartLibraries(out);
  canvasLineSeries().forEach(s=>out.push(s));
  if(TOOLTIP_SERIES.length>=20)out.unshift({path:"tooltip.real-do-site",vals:TOOLTIP_SERIES.slice(-1200)});
  Object.keys(window).forEach(k=>{
    if(!/trend|tend|graf|chart|serie|data|merc|fut|bola|json|apex|echart|high/i.test(k))return;
    try{scanObj(window[k],"window."+k,0,out,seen)}catch(e){}
  });
  scanVisualGraph(out);
  return out.map(s=>{
    const cur=s.vals.at(-1),min=Math.min(...s.vals),max=Math.max(...s.vals);
    const score=(/trend|tend|graf|chart|serie|linha/i.test(s.path)?45:0)+(/sinal|macd|histograma|rsi/i.test(s.path)?20:0)+(s.vals.length>=120?20:0)+(max-min>12?20:0);
    return {...s,cur,min,max,score};
  }).filter(s=>s.max-s.min>=8).sort((a,b)=>b.score-a.score||b.vals.length-a.vals.length).slice(0,8);
}
function tooltipMarketRegex(){
  const n=market().name
    .replace("Ambas Sim","Ambas Marcam")
    .replace("Ambas Nao","Ambas Nao")
    .replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  return new RegExp(`${n}\\s*:?\\s*(-?\\d+(?:[,.]\\d+)?)`,"i");
}
function readTooltipText(){
  const texts=[];
  document.querySelectorAll("div,span").forEach(el=>{
    const r=el.getBoundingClientRect?.();
    if(!r||r.width<20||r.height<10||r.width>420||r.height>240)return;
    const t=esc(el.innerText||el.textContent||"");
    if(/RSI|MACD|Sinal|Histograma|Marcam|Over|Under|Ambas/i.test(t))texts.push(t);
  });
  return texts.join(" | ");
}
function captureTooltipSeries(){
  const cvs=[...document.querySelectorAll("canvas")].filter(cv=>{
    const r=cv.getBoundingClientRect();
    return r.width>500&&r.height>180;
  });
  const cv=cvs[0];
  if(!cv)return;
  const r=cv.getBoundingClientRect();
  const re=tooltipMarketRegex();
  const vals=[];
  for(let i=0;i<90;i++){
    const x=r.left+8+(r.width-16)*i/89;
    const y=r.top+r.height*0.45;
    cv.dispatchEvent(new MouseEvent("mousemove",{bubbles:true,cancelable:true,clientX:x,clientY:y}));
    const txt=readTooltipText();
    const m=txt.match(re);
    if(m){
      const v=Number(String(m[1]).replace(",","."));
      if(Number.isFinite(v)&&v>=0&&v<=100)vals.push(v);
    }
  }
  if(vals.length>=15)TOOLTIP_SERIES=vals;
}
function scanVisualGraph(out){
  const nums=[];
  document.querySelectorAll("svg text, canvas + *, div, span").forEach(el=>{
    const txt=esc(el.textContent||"");
    if(!/^\d{1,2}$/.test(txt))return;
    const n=Number(txt);
    if(n<0||n>100)return;
    const r=el.getBoundingClientRect?.();
    if(!r||r.width>80||r.height>40)return;
    nums.push({n,x:r.left,y:r.top});
  });
  const ys=nums.map(p=>p.y).sort((a,b)=>a-b);
  if(nums.length<25)return;
  const midY=ys[Math.floor(ys.length/2)];
  const graphNums=nums
    .filter(p=>Math.abs(p.y-midY)<260)
    .sort((a,b)=>a.x-b.x||a.y-b.y)
    .map(p=>p.n);
  if(graphNums.length>=25)out.push({path:"visual.numeros-linha-grafica",vals:graphNums.slice(-1200)});
}
function lineRead(series,odd){
  const s=series[0];
  if(!s)return [];
  return CONFIG.windows.map(w=>{
    const vals=s.vals.slice(-w);
    const ready=vals.length>=Math.min(w,30);
    const cur=vals.at(-1),min=Math.min(...vals),max=Math.max(...vals);
    const fundo=ready&&cur<=min+CONFIG.tol;
    const fundo30=ready&&cur<=30;
    const ev=Number.isFinite(odd)?(cur/100*odd-1)*100:null;
    const distMin=ready?cur-min:null;
    return {w,ready,cur,min,max,fundo,fundo30,ev,distMin};
  });
}
function resultHistoryForMarket(m){
  return RESULTS_CACHE
    .map(r=>({name:r.name,score:r.score,green:paysMarket(r.score,m),txt:r.txt}))
    .filter(r=>r.green!==null);
}
function calcResultWindows(m){
  const hist=resultHistoryForMarket(m);
  return CONFIG.windows.map(w=>{
    const arr=hist.slice(0,w);
    const j=arr.length;
    const g=arr.filter(x=>x.green).length;
    const pctVal=j?g/j*100:null;
    let min=null;
    if(hist.length>=w){
      const vals=[];
      for(let i=0;i<=hist.length-w;i++){
        const sub=hist.slice(i,i+w);
        vals.push(sub.filter(x=>x.green).length/sub.length*100);
      }
      min=Math.min(...vals);
    }
    const ready=j>=w;
    const fundo30=ready&&pctVal!==null&&pctVal<=30;
    const fundoMin=ready&&min!==null&&pctVal<=min+CONFIG.tol;
    return {w,j,g,p:pctVal,min,ready,fundo30,fundoMin};
  });
}
function globalFundos(series){
  return calcResultWindows(market()).filter(r=>r.ready&&r.j>=r.w&&(r.fundo30||r.fundoMin));
}
function visualFundos(series){
  return [];
}
function pctGreen(arr){
  if(!arr.length)return null;
  return arr.filter(x=>x.green).length/arr.length*100;
}
function emaValues(values,win){
  if(!values.length)return [];
  const a=2/(win+1),out=[values[0]];
  for(let i=1;i<values.length;i++)out.push(a*values[i]+(1-a)*out[out.length-1]);
  return out;
}
function linearSlope(values){
  if(values.length<2)return 0;
  const n=values.length,mx=(n-1)/2,my=values.reduce((a,b)=>a+b,0)/n;
  let num=0,den=0;
  for(let i=0;i<n;i++){num+=(i-mx)*(values[i]-my);den+=(i-mx)*(i-mx)}
  return den?num/den:0;
}
function rollingPctLine(values,win){
  const out=[];
  for(let i=0;i<values.length;i++){
    const s=values.slice(Math.max(0,i-win+1),i+1);
    out.push(s.reduce((a,b)=>a+b,0)/s.length*100);
  }
  return out;
}
function trendMoment(hist){
  const chron=hist.slice(0,Math.min(120,hist.length)).reverse().map(x=>x.green?1:0);
  if(chron.length<60)return null;
  const fast=emaValues(chron,12),slow=emaValues(chron,26);
  const macd=chron.map((_,i)=>fast[i]-slow[i]);
  const sig=emaValues(macd,9);
  const histo=macd.map((v,i)=>v-sig[i]);
  const line=rollingPctLine(chron,10);
  const last=histo.length-1;
  return {
    macd:macd[last],signal:sig[last],hist:histo[last],prevHist:histo[last-1]??histo[last],
    histDelta:histo[last]-(histo[last-1]??histo[last]),
    slope8:linearSlope(line.slice(-8)),slope20:linearSlope(line.slice(-20)),slope40:linearSlope(line.slice(-40))
  };
}
function trendUpSignals(){
  const hist=resultHistoryForMarket(market());
  if(hist.length<60)return [];
  const recent15=hist.slice(0,15),recent30=hist.slice(0,30),prev30=hist.slice(30,60);
  const base120=hist.slice(0,Math.min(120,hist.length));
  const p15=pctGreen(recent15),p30=pctGreen(recent30),pPrev=pctGreen(prev30),pBase=pctGreen(base120);
  if([p15,p30,pPrev,pBase].some(v=>!Number.isFinite(v)))return [];
  const g15=recent15.filter(x=>x.green).length,g30=recent30.filter(x=>x.green).length;
  const m=trendMoment(hist);
  if(!m)return [];

  const taxaSubiu=p15>=p30-1&&p30>=pPrev+6&&p30>=pBase+3&&g15>=1&&g30>=2;
  const fundoVirando=p15>=pBase+8&&p15>=pPrev+8&&g15>=2;
  const momentoConfirma=m.hist>0&&m.histDelta>0&&m.macd>m.signal&&m.slope8>0&&m.slope20>=0;
  const subidaEsgotada=(p30>=pBase+3||p30>=pPrev+6)&&(m.hist<=0||m.histDelta<0||m.macd<m.signal||m.slope8<=0);

  if(subidaEsgotada)return [];
  if(!(taxaSubiu||fundoVirando)||!momentoConfirma)return [];
  return [{
    tipo:fundoVirando?"VIRADA DE FUNDO CONFIRMADA":"SUBIDA CONFIRMADA",
    p15,p30,pPrev,pBase,g15,g30,j:hist.length,
    tendencia:p30-pPrev,base:pBase,
    macd:m.macd,signal:m.signal,hist:m.hist,histDelta:m.histDelta,slope8:m.slope8,slope20:m.slope20
  }];
}
function trendUpBox(){
  const sinais=trendUpSignals();
  if(!sinais.length)return "";
  return sinais.map(s=>`<div class="sig"><b class="ok">${s.tipo}</b> ${esc(market().name)} | 15j ${s.p15.toFixed(1)}% | 30j ${s.g30}/30 ${s.p30.toFixed(1)}% | antes ${s.pPrev.toFixed(1)}% | base ${s.pBase.toFixed(1)}% | MACD ${s.macd.toFixed(3)}/${s.signal.toFixed(3)} | hist ${s.hist.toFixed(3)} subindo</div>`).join("");
}
function scoreFromResult(txt){
  const m=String(txt||"").match(/(\d+)\s*[-x]\s*(\d+)/);
  if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]);
  return Number.isFinite(a)&&Number.isFinite(b)?{a,b,t:a+b}:null;
}
function paysMarket(score,m){
  if(!score)return null;
  if(m.key==="ambas_sim")return score.a>0&&score.b>0;
  if(m.key==="ambas_nao")return score.a===0||score.b===0;
  if(m.key==="over15")return score.t>=2;
  if(m.key==="under15")return score.t<=1;
  if(m.key==="over25")return score.t>=3;
  if(m.key==="under25")return score.t<=2;
  if(m.key==="over35")return score.t>=4;
  if(m.key==="under35")return score.t<=3;
  if(m.key==="casa_vence")return score.a>score.b;
  if(m.key==="fora_vence")return score.b>score.a;
  if(m.key==="over5")return score.t>=5;
  if(m.key==="casa5")return score.a>=5;
  if(m.key==="fora5")return score.b>=5;
  return null;
}
function cellRgb(el){
  const c=getComputedStyle(el).backgroundColor||"";
  const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return m?{r:Number(m[1]),g:Number(m[2]),b:Number(m[3])}:null;
}
function isClosedResultCell(el){
  const rgb=cellRgb(el);
  if(!rgb)return false;
  const isBlue=rgb.b>rgb.r+25&&rgb.b>rgb.g+25;
  const isGray=Math.abs(rgb.r-rgb.g)<18&&Math.abs(rgb.g-rgb.b)<18;
  const isGreen=rgb.g>90&&rgb.g>rgb.r+20&&rgb.g>=rgb.b;
  const isRed=rgb.r>140&&rgb.r>rgb.g+30&&rgb.r>rgb.b+30;
  return (isGreen||isRed)&&!isBlue&&!isGray;
}
function allResultCells(){
  const out=gridResultCells();
  if(out.length){
    const seen=new Set();
    return out.filter(r=>{
      const key=`${r.time}|${r.name}|${r.score.a}-${r.score.b}|${String(r.txt||"").slice(-80)}`;
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    }).sort((a,b)=>resultAge(a)-resultAge(b)||a.top-b.top||a.left-b.left||a.idx-b.idx);
  }
  let idx=0;
  document.querySelectorAll("td").forEach(el=>{
    if(!isClosedResultCell(el))return;
    const txt=el.innerText||"";
    if(!/\s+x\s+/i.test(txt))return;
    const sc=scoreFromResult(txt);
    if(sc){
      const r=el.getBoundingClientRect?.();
      out.push({txt,score:sc,name:gameName(txt),time:"",top:r?r.top:0,left:r?r.left:0,idx:idx++});
    }
  });
  const seen=new Set();
  return out.filter(r=>{
    const key=`${r.time}|${r.name}|${r.score.a}-${r.score.b}`;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>resultAge(a)-resultAge(b)||a.top-b.top||a.left-b.left||a.idx-b.idx);
}
function gridResultCells(){
  const out=[];
  document.querySelectorAll("table").forEach(table=>{
    const rows=[...table.querySelectorAll("tr")];
    const minuteByCol={};
    rows.forEach(tr=>{
      const cells=[...tr.children];
      const first=esc(cells[0]?.innerText||"").toLowerCase();
      if(first==="h"||first==="horario"||first==="hora"){
        cells.forEach((c,i)=>{
          const n=Number(esc(c.innerText));
          if(Number.isInteger(n)&&n>=0&&n<60)minuteByCol[i]=n;
        });
      }
    });
    rows.forEach(tr=>{
      const cells=[...tr.children];
      const hour=Number(esc(cells[0]?.innerText||""));
      if(!Number.isInteger(hour)||hour<0||hour>23)return;
      cells.forEach((cell,i)=>{
        if(i===0||minuteByCol[i]===undefined)return;
        if(!isClosedResultCell(cell))return;
        const txt=cell.innerText||"";
        if(!/\s+x\s+/i.test(txt))return;
        const sc=scoreFromResult(txt);
        if(!sc)return;
        const r=cell.getBoundingClientRect?.();
        const time=`${hour}.${String(minuteByCol[i]).padStart(2,"0")}`;
        out.push({txt,score:sc,name:gameName(txt),time,top:r?r.top:0,left:r?r.left:0,idx:out.length,domGrid:true});
      });
    });
  });
  return out;
}
function refreshResultsCache(){
  const liga=activeLiga();
  const apiHist=API_ROWS.filter(r=>r.score&&!r.future&&(!liga||!r.liga||r.liga===liga)).map((r,i)=>({
    txt:txtFromApiRow(r),
    score:r.score,
    name:r.name,
    time:r.time,
    liga:r.liga||liga||null,
    top:-10000+i,
    left:0,
    idx:i,
    api:true
  }));
  const dom=allResultCells().map(r=>({...r,liga:liga||r.liga||null}));
  const stored=loadStoredResults().filter(r=>!liga||!r.liga||r.liga===liga);
  const seen=new Set();
  RESULTS_CACHE=[...apiHist,...dom,...stored].filter(r=>{
    const key=resultKey(r);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>resultAge(a)-resultAge(b)||a.top-b.top||a.idx-b.idx);
  saveStoredResults(RESULTS_CACHE);
  return RESULTS_CACHE;
}
function resultAge(r){
  const hm=parseTime(r.time);
  if(hm===null)return 99999+(r.top||0)+(r.idx||0)/1000;
  const d=new Date(),now=d.getHours()*60+d.getMinutes();
  let age=now-hm;
  if(age<0)age+=1440;
  return age;
}
function recentPaidResults(){
  const out=[],seen=new Set();
  const mkt=activeMarkets()[0]||market();
  const grid=gridResultCells();
  const base=grid.length?grid:RESULTS_CACHE;
  base.slice().sort((a,b)=>resultAge(a)-resultAge(b)||a.top-b.top||a.idx-b.idx).forEach(r=>{
    const odds=oddsForMarket(r.txt,mkt);
    if(!odds.length&&out.length>=10)return;
    const name=gameName(r.txt);
    const key=(r.time||"")+"|"+name+"|"+r.score.a+"-"+r.score.b+"|"+(odds[0]||"");
    if(seen.has(key))return;
    seen.add(key);
    const paid=paysMarket(r.score,mkt);
    const team=teamPayPct({name},mkt);
    const oddBase=odds.length?oddPayPct({name,odd:odds[0]},mkt):null;
    const parts=[team?.p,oddBase?.p].filter(Number.isFinite);
    const prob=parts.length?parts.reduce((a,b)=>a+b,0)/parts.length:null;
    const ev=prob===null||!odds.length?null:(prob/100*odds[0]-1)*100;
    out.push({time:r.time||"",name,score:r.score,odd:odds[0]||null,paid,team,oddBase,prob,ev});
  });
  return out.slice(0,10);
}
function teamNames(name){return String(name||"").split(/\s+x\s+/i).map(x=>esc(x).toLowerCase()).filter(Boolean)}
function teamPayPct(game,m){
  const names=teamNames(game.name);
  if(!names.length)return null;
  const rows=RESULTS_CACHE.filter(r=>{
    const t=r.txt.toLowerCase();
    return names.some(n=>n&&t.includes(n));
  });
  if(rows.length<3)return null;
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  return {g,j:rows.length,p:g/rows.length*100};
}
function oddPayPct(game,m){
  const target=game.odd;
  const rows=RESULTS_CACHE.filter(r=>m.patterns.some(re=>{
    re.lastIndex=0;
    let hit=false,mm;
    while((mm=re.exec(r.txt))){
      const odd=Number(String(mm[1]).replace(",","."));
      if(Math.abs(odd-target)<=0.05)hit=true;
    }
    return hit;
  }));
  if(rows.length<3)return null;
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  return {g,j:rows.length,p:g/rows.length*100};
}
function scoreKey(score){return score?`${score.a}-${score.b}`:"-"}
function orderedResults(){
  return RESULTS_CACHE.filter(r=>r.score).slice().sort((a,b)=>resultAge(b)-resultAge(a)||a.top-b.top||a.idx-b.idx);
}
function marketCycleStats(m){
  const hist=resultHistoryForMarket(m).slice(0,80);
  if(!hist.length)return null;
  const cur=hist[0].green?"GREEN":"RED";
  let streak=0,lastGreen=null;
  for(let i=0;i<hist.length;i++){
    if((hist[i].green?"GREEN":"RED")===cur)streak++;else break;
  }
  for(let i=0;i<hist.length;i++){if(hist[i].green){lastGreen=i;break;}}
  const blocks={GREEN:[],RED:[]};
  let last=hist[0].green?"GREEN":"RED",n=0;
  hist.forEach(x=>{
    const s=x.green?"GREEN":"RED";
    if(s===last)n++;else{blocks[last].push(n);last=s;n=1;}
  });
  blocks[last].push(n);
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
  const avgRed=avg(blocks.RED),avgGreen=avg(blocks.GREEN);
  const fase=cur==="RED"&&avgRed&&streak>=avgRed?"ponto de virada":cur==="RED"?"inicio/meio":"bloco green";
  const pressao=cur==="RED"&&avgRed?Math.min(100,streak/avgRed*50):0;
  return {cur,streak,lastGreen,avgRed,avgGreen,fase,pressao};
}
function cycleText(c){
  if(!c)return "Ciclo: sem base";
  const lg=c.lastGreen===null?"sem green":`${c.lastGreen} jogos`;
  return `Ciclo: ${c.streak} ${c.cur} seguidos | ultimo GREEN ${lg}<br>Media blocos RED ${Number.isFinite(c.avgRed)?c.avgRed.toFixed(1):"-"} / GREEN ${Number.isFinite(c.avgGreen)?c.avgGreen.toFixed(1):"-"} | fase ${c.fase} | pressao ${c.pressao.toFixed(0)}`;
}
function exactOddStats(game,m){
  const key=Number(game.odd).toFixed(2);
  const rows=RESULTS_CACHE.filter(r=>oddsForMarket(r.txt,m).some(o=>Number(o).toFixed(2)===key));
  if(!rows.length)return {key,g:0,j:0,p:null,cold:false};
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  const p=g/rows.length*100;
  return {key,g,j:rows.length,p,cold:rows.length>=CONFIG.minOddSample&&p<CONFIG.minOddPct};
}
function exactOddText(s){
  if(!s||!s.j)return "Odd fixa: sem base";
  return `Odd fixa ${s.key}: ${s.g}/${s.j} ${s.p.toFixed(1)}%${s.cold?" ODD FRIA":""}`;
}
function hourOf(v){const hm=parseTime(v);return hm===null?null:Math.floor(hm/60)}
function hourStatsForGame(game,m){
  const h=hourOf(game.time);
  if(h===null)return null;
  const rows=RESULTS_CACHE.filter(r=>hourOf(r.time)===h&&paysMarket(r.score,m)!==null).slice(0,120);
  if(!rows.length)return {h,j:0,g:0,p:null,tag:"sem base"};
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  const p=g/rows.length*100;
  return {h,j:rows.length,g,p,tag:p>=55?"horario quente":p<=40?"horario frio":"horario neutro"};
}
function hourStatsText(s){return s?`Horario ${String(s.h).padStart(2,"0")}h: ${s.g}/${s.j} ${s.p===null?"-":s.p.toFixed(1)+"%"} ${s.tag}`:"Horario: sem base"}
function ligaStatsText(m){
  const rows=resultHistoryForMarket(m).slice(0,240);
  if(!rows.length)return "Liga atual: sem base";
  const g=rows.filter(r=>r.green).length,p=g/rows.length*100;
  return `Liga atual: ${g}/${rows.length} ${p.toFixed(1)}% ${p>=55?"liga quente":p<=40?"liga fria":"liga neutra"}`;
}
function sidePayPct(team,m,side){
  const nm=esc(team).toLowerCase();
  const rows=RESULTS_CACHE.filter(r=>{const p=teamNames(r.name);return side==="casa"?p[0]===nm:p[1]===nm});
  if(rows.length<1)return null;
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  return {g,j:rows.length,p:g/rows.length*100};
}
function fmtStat(s){return s?`${s.g}/${s.j} ${s.p.toFixed(1)}%`:"sem base"}
function rankRowsForHours(m,hours){
  const maxAge=hours*60;
  return RESULTS_CACHE.filter(r=>r.score&&paysMarket(r.score,m)!==null&&resultAge(r)<=maxAge);
}
function teamRankPos(team,m,hours){
  const map={};
  rankRowsForHours(m,hours).forEach(r=>{
    teamNames(r.name).forEach(t=>{
      if(!t)return;
      if(!map[t])map[t]={name:t,g:0,j:0,p:0};
      map[t].j++;
      if(paysMarket(r.score,m))map[t].g++;
    });
  });
  const list=Object.values(map).filter(x=>x.j>=2).map(x=>({...x,p:x.g/x.j*100})).sort((a,b)=>b.g-a.g||b.p-a.p||b.j-a.j);
  const i=list.findIndex(x=>x.name===team);
  return i>=0?`#${i+1} ${list[i].g}/${list[i].j} ${list[i].p.toFixed(1)}%`:`sem rank ${hours}h`;
}
function rankQuality(j){return j>=10?"base boa":j>=4?"base media":"base fraca"}
function topTeamRankText(m,hours,limit=5){
  const map={};
  rankRowsForHours(m,hours).forEach(r=>{
    teamNames(r.name).forEach(t=>{
      if(!t)return;
      if(!map[t])map[t]={name:t,g:0,j:0,p:0};
      map[t].j++;
      if(paysMarket(r.score,m))map[t].g++;
    });
  });
  const list=Object.values(map)
    .filter(x=>x.j>=1)
    .map(x=>({...x,p:x.g/x.j*100}))
    .sort((a,b)=>b.p-a.p||b.g-a.g||b.j-a.j||a.name.localeCompare(b.name))
    .slice(0,limit);
  if(!list.length)return `Ranking dos times ${hours}h: sem base`;
  return `Ranking dos times ${hours}h: `+list.map((x,i)=>`${i+1}. ${esc(x.name)} ${x.g}/${x.j} ${x.p.toFixed(1)}% ${rankQuality(x.j)}`).join(" | ");
}
function topOddRankText(m,hours,limit=8){
  const map={};
  rankRowsForHours(m,hours).forEach(r=>{
    const paid=paysMarket(r.score,m);
    oddsForMarket(r.txt,m).forEach(o=>{
      const k=o.toFixed(2);
      if(!map[k])map[k]={odd:k,g:0,j:0,p:0};
      map[k].j++;
      if(paid)map[k].g++;
    });
  });
  const list=Object.values(map)
    .filter(x=>x.j>=1)
    .map(x=>({...x,p:x.g/x.j*100}))
    .sort((a,b)=>b.p-a.p||b.g-a.g||b.j-a.j||Number(a.odd)-Number(b.odd))
    .slice(0,limit);
  if(!list.length)return `Ranking das odds fixas ${hours}h: sem base`;
  return `Ranking das odds fixas ${hours}h: `+list.map((x,i)=>`${i+1}. @${x.odd} ${x.g}/${x.j} ${x.p.toFixed(1)}% ${rankQuality(x.j)}`).join(" | ");
}
function marketRankingBox(){
  const m=market();
  return `<div class="sig"><b class="ok">Ranking do mercado ${esc(m.name)}</b><br>${topTeamRankText(m,3)}<br>${topTeamRankText(m,6)}<br>${topOddRankText(m,3)}<br>${topOddRankText(m,6)}</div>`;
}
function teamDetailText(game,m){
  const p=teamNames(game.name);
  if(p.length<2)return "sem base casa/fora";
  const aCasa=sidePayPct(p[0],m,"casa"),aFora=sidePayPct(p[0],m,"fora"),bCasa=sidePayPct(p[1],m,"casa"),bFora=sidePayPct(p[1],m,"fora");
  return `Casa ${esc(p[0])}: casa ${fmtStat(aCasa)} | fora ${fmtStat(aFora)}<br>Fora ${esc(p[1])}: casa ${fmtStat(bCasa)} | fora ${fmtStat(bFora)}<br>Rank 3h ${esc(p[0])}: ${teamRankPos(p[0],m,3)}<br>Rank 3h ${esc(p[1])}: ${teamRankPos(p[1],m,3)}<br>Rank 6h ${esc(p[0])}: ${teamRankPos(p[0],m,6)}<br>Rank 6h ${esc(p[1])}: ${teamRankPos(p[1],m,6)}`;
}
function scoreNextStats(score,m){
  const key=scoreKey(score);
  if(key==="-")return null;
  const rows=orderedResults();
  const next={},oddWin={};
  let j=0;
  for(let i=0;i<rows.length-1;i++){
    if(scoreKey(rows[i].score)!==key)continue;
    const n=rows[i+1];
    if(!n?.score)continue;
    j++;
    const nk=scoreKey(n.score);
    next[nk]=(next[nk]||0)+1;
    const odds=oddsForMarket(n.txt,m);
    if(paysMarket(n.score,m)&&odds.length){
      const ok=odds[0].toFixed(2);
      oddWin[ok]=(oddWin[ok]||0)+1;
    }
  }
  if(!j)return null;
  const topScores=Object.entries(next).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k} ${v}/${j} ${(v/j*100).toFixed(1)}%`);
  const topOdds=Object.entries(oddWin).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}x`);
  return {score:key,j,topScores,topOdds};
}
function oddBand(v){
  if(!Number.isFinite(v))return null;
  if(v<1.5)return "<1.50";
  if(v<1.8)return "1.50-1.79";
  if(v<2.2)return "1.80-2.19";
  if(v<3)return "2.20-2.99";
  if(v<5)return "3.00-4.99";
  if(v<10)return "5.00-9.99";
  return "10+";
}
function scoreModelForGame(game,m){
  const names=teamNames(game.name);
  const band=oddBand(game.odd);
  const rows=orderedResults().filter(r=>{
    const p=teamNames(r.name);
    const hasTeam=names.some(n=>p.includes(n));
    const odds=oddsForMarket(r.txt,m);
    const sameBand=band&&odds.some(o=>oddBand(o)===band);
    return hasTeam||sameBand;
  }).slice(0,80);
  if(!rows.length)return null;
  const scoreCnt={},oddWin={};
  let green=0;
  rows.forEach(r=>{
    const sk=scoreKey(r.score);
    scoreCnt[sk]=(scoreCnt[sk]||0)+1;
    if(paysMarket(r.score,m)){
      green++;
      oddsForMarket(r.txt,m).forEach(o=>{
        const ok=o.toFixed(2);
        oddWin[ok]=(oddWin[ok]||0)+1;
      });
    }
  });
  const topScores=Object.entries(scoreCnt).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k} ${v}/${rows.length} ${(v/rows.length*100).toFixed(1)}%`);
  const topOdds=Object.entries(oddWin).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}x`);
  return {label:`base times odd ${band||"-"}`,j:rows.length,topScores,topOdds,marketP:green/rows.length*100};
}
function scorePullText(stat){
  if(!stat)return "Placar puxa: sem base";
  if(stat.label)return `Placar puxa: ${stat.label}: ${stat.topScores.join(" | ")}<br>Mercado pagou ${stat.marketP.toFixed(1)}%${stat.topOdds.length?` | Odds: ${stat.topOdds.join(" | ")}`:""}`;
  return `Placar puxa apos ${stat.score}: ${stat.topScores.join(" | ")}${stat.topOdds.length?`<br>Odds: ${stat.topOdds.join(" | ")}`:""}`;
}
function statusPayStats(m){
  const items=[];
  RESULTS_CACHE.filter(r=>r.score).slice()
    .sort((a,b)=>resultAge(a)-resultAge(b)||a.top-b.top||a.idx-b.idx)
    .slice(0,300)
    .forEach(r=>{
      const odds=oddsForMarket(r.txt,m);
      if(!odds.length)return;
      const g={time:r.time,name:r.name,market:m,odd:odds[0],text:r.txt};
      const an=analysisForGame(g,[]);
      if(an.status!=="ENTRAR"&&an.status!=="OBSERVAR")return;
      items.push({status:an.status,paid:paysMarket(r.score,m),odd:odds[0],time:r.time,name:r.name,score:r.score});
    });
  const out={ENTRAR:{g:0,j:0,streak:0,last:""},OBSERVAR:{g:0,j:0,streak:0,last:""}};
  items.forEach(x=>{
    out[x.status].j++;
    if(x.paid)out[x.status].g++;
  });
  ["ENTRAR","OBSERVAR"].forEach(st=>{
    for(const x of items.filter(i=>i.status===st)){
      if(x.paid){
        out[st].last=`pagou ${x.time||"-"} ${x.name} ${x.score.a}-${x.score.b}`;
        break;
      }
      out[st].streak++;
    }
  });
  return out;
}
function statusStatsBox(){
  const s=statusPayStats(market());
  const row=st=>{
    const x=s[st],p=x.j?x.g/x.j*100:null;
    const cls=p===null?"warn":p>=50?"ok":"bad";
    return `<tr><td>${st}</td><td>${x.g}/${x.j} ${p===null?"-":p.toFixed(1)+"%"}</td><td class="${x.streak?"bad":"ok"}">${x.streak} sem pagar</td><td class="${cls}">${esc(x.last||"sem green recente")}</td></tr>`;
  };
  return `<table><tr><th>Status</th><th>Pagou no mercado aberto</th><th>Sequencia atual</th><th>Ultimo pagamento</th></tr>${row("ENTRAR")}${row("OBSERVAR")}</table>`;
}
function weightedProb(graphP,team,odd){
  const parts=[];
  if(Number.isFinite(graphP))parts.push({v:graphP,w:5});
  if(team&&Number.isFinite(team.p))parts.push({v:team.p,w:3});
  if(odd&&Number.isFinite(odd.p))parts.push({v:odd.p,w:2});
  if(!parts.length)return null;
  const sw=parts.reduce((a,b)=>a+b.w,0);
  return parts.reduce((a,b)=>a+b.v*b.w,0)/sw;
}
function analysisForGame(g,series){
  const resultReads=calcResultWindows(g.market).map(r=>({
    ...r,
    cur:r.p,
    ev:r.p===null?null:(r.p/100*g.odd-1)*100,
    fundo:r.fundo30||r.fundoMin
  }));
  const reads=resultReads;
  const valid=reads.filter(r=>r.ready);
  const best=valid.sort((a,b)=>((a.p??99)-(a.min??0))-((b.p??99)-(b.min??0)))[0]||reads[0];
  const minHits=valid.filter(r=>r.fundo);
  const evs=valid.filter(r=>Number.isFinite(r.ev));
  const bestEv=evs.length?Math.max(...evs.map(r=>r.ev)):null;
  const team=teamPayPct(g,g.market);
  const odd=oddPayPct(g,g.market);
  const graphP=best?.ready?best.p:null;
  const prob=weightedProb(graphP,team,odd);
  const fairOdd=prob?100/prob:null;
  const ev=prob===null?null:(prob-CONFIG.minProb);
  const p=prob===null?null:prob/100;
  const evGale=p===null?null:(p*(g.odd-1)+(1-p)*(p*(g.odd-2)+(1-p)*(-2)))*100;
  let score=0;
  if(best?.fundo)score+=35;
  if(ev!==null&&ev>0)score+=20;
  if(evGale!==null&&evGale>0)score+=20;
  if(team)score+=Math.max(0,Math.min(20,(team.p-50)/2));
  if(odd)score+=Math.max(0,Math.min(20,(odd.p-50)/2));
  if(minHits.some(r=>r.w>=480))score+=10;
  const strongBase=(team&&team.p>=50)||(odd&&odd.p>=50)||(!team&&!odd&&prob!==null);
  const coldOdd=odd&&odd.j>=CONFIG.minOddSample&&odd.p<CONFIG.minOddPct;
  const valueOk=fairOdd!==null&&g.odd>=fairOdd;
  if(evGale!==null&&evGale>=CONFIG.minEV&&prob!==null&&prob>=CONFIG.minProb&&!coldOdd)score=Math.max(score,70);
  if(score<45&&prob!==null&&prob>=45&&!coldOdd)score=45;
  if(score<45&&evGale!==null&&evGale>-15&&!coldOdd)score=45;
  if(coldOdd)score=Math.min(score,44);
  const status=score>=70?"ENTRAR":score>=45?"OBSERVAR":"PASSAR";
  const motivo=coldOdd?"ODD FRIA":status;
  return {reads,best,bestEv,team,odd,prob,fairOdd,ev,evGale,score:Math.round(score),status,motivo,coldOdd,valueOk};
}
function analyze(){
  const games=readGridGames();
  const series=[];
  const signals=[];
  games.forEach(g=>{
    g.analysis=analysisForGame(g,series);
    const hits=g.analysis.reads.filter(r=>r.ready&&r.fundo&&(r.fundo30||r.fundoMin)&&Number.isFinite(r.ev));
    const podeSinal=g.analysis.prob!==null&&g.analysis.prob>=CONFIG.minProb&&g.analysis.evGale!==null&&g.analysis.evGale>=CONFIG.minEV&&!g.analysis.coldOdd;
    if(hits.length&&podeSinal){
      signals.push({game:g,hits,best:hits.sort((a,b)=>b.w-a.w||b.ev-a.ev)[0]});
    }
  });
  return {games,series,signals};
}
function notify(signals){
  let old=[];try{old=JSON.parse(localStorage.getItem(SEEN)||"[]")}catch(e){}
  const seen=new Set(old);
  signals.slice(0,5).forEach(s=>{
    const k=`${s.game.market.key}|${s.game.time}|${s.game.name}|${s.best.w}|${Math.round(s.best.cur)}`;
    if(seen.has(k))return;
    seen.add(k);beep();
    const tipo=s.tipo||"FUNDO";
    const msg=`${ligaNome()} | ${tipo} ${s.best.w} | ${s.game.market.name} @${s.game.odd} | ${s.game.time} ${s.game.name} | EV ${Number.isFinite(s.best.ev)?s.best.ev.toFixed(1):"-"}%`;
    if("Notification" in window&&Notification.permission==="granted")new Notification("BBTips sinal",{body:msg});
    else if("Notification" in window&&Notification.permission!=="denied")Notification.requestPermission();
  });
  localStorage.setItem(SEEN,JSON.stringify([...seen].slice(-100)));
}
function notifyFundo(series){
  const fundos=[...globalFundos(series),...visualFundos(series)];
  if(!fundos.length)return;
  let old=[];try{old=JSON.parse(localStorage.getItem(SEEN+"_FUNDO")||"[]")}catch(e){}
  const seen=new Set(old);
  fundos.forEach(f=>{
    if(!f.ready||f.j<f.w)return;
    const k=`${CONFIG.market}|${f.w}|${Math.round(f.p)}`;
    if(seen.has(k))return;
    seen.add(k);
    beep();
    const base=`${f.g}/${f.j} ${f.p.toFixed(1)}% | minima ${f.min.toFixed(1)}%`;
    const msg=`${ligaNome()} | BATEU A MINIMA ${f.w} jogos | ${market().name} | ${base}`;
    if("Notification" in window&&Notification.permission==="granted")new Notification("BBTips: bateu a minima",{body:msg});
    else if("Notification" in window&&Notification.permission!=="denied")Notification.requestPermission();
  });
  localStorage.setItem(SEEN+"_FUNDO",JSON.stringify([...seen].slice(-100)));
}
function notifyTrendUp(){
  const sinais=trendUpSignals();
  if(!sinais.length)return;
  let old=[];try{old=JSON.parse(localStorage.getItem(SEEN+"_TRENDUP")||"[]")}catch(e){}
  const seen=new Set(old);
  sinais.forEach(s=>{
    const bucket=Math.floor(s.p30/3)*3;
    const k=`${activeLiga()||"auto"}|${CONFIG.market}|${s.tipo}|${bucket}|${Math.round(s.pPrev)}`;
    if(seen.has(k))return;
    seen.add(k);
    beep();
    const msg=`${ligaNome()} | ${market().name} | 15j ${s.p15.toFixed(1)}% | 30j ${s.g30}/30 ${s.p30.toFixed(1)}% | antes ${s.pPrev.toFixed(1)}% | base ${s.pBase.toFixed(1)}% | MACD ${s.macd.toFixed(3)}/${s.signal.toFixed(3)} | hist ${s.hist.toFixed(3)} subindo`;
    if("Notification" in window&&Notification.permission==="granted")new Notification(`BBTips: ${s.tipo}`,{body:msg});
    else if("Notification" in window&&Notification.permission!=="denied")Notification.requestPermission();
  });
  localStorage.setItem(SEEN+"_TRENDUP",JSON.stringify([...seen].slice(-100)));
}
function gamesTable(games,series){
  if(!games.length)return "<p class='bad'>Nao achei proximos jogos com odd deste mercado. Clique API ou escolha um mercado que aparece nas odds dos proximos jogos.</p>";
  return `<table><tr><th>Horario</th><th>Jogo</th><th>Mercado</th><th>Odd</th><th>Status</th><th>Probabilidade</th><th>Times/Odd pagante</th><th>Linha 120/240/480/960</th></tr>${games.map(g=>{
    const an=g.analysis||analysisForGame(g,series);
    const reads=an.reads.map(r=>{
      const cls=(r.fundo30||r.fundoMin)?"ok":r.ready?"warn":"bad";
      const tag=r.fundo30?" <30":r.fundoMin?" MINIMA":"";
      return `<span class="${cls}">${r.w}: ${r.ready?`${r.g}/${r.j} ${r.p.toFixed(1)}% min ${r.min.toFixed(1)}${tag} EV ${Number.isFinite(r.ev)?r.ev.toFixed(1):"-"}`:`parcial ${r.g}/${r.j} de ${r.w}`}</span>`;
    }).join("<br>");
    const cls=an.status==="ENTRAR"?"ok":an.status==="OBSERVAR"?"warn":"bad";
    const prob=an.prob===null?"-":`${an.prob.toFixed(1)}%`;
    const fair=an.fairOdd===null?"-":an.fairOdd.toFixed(2);
    const ev=an.ev===null?"-":`${an.ev.toFixed(1)}%`;
    const evG=an.evGale===null?"-":`${an.evGale.toFixed(1)}%`;
    const team=an.team?`${an.team.g}/${an.team.j} ${an.team.p.toFixed(1)}%`:"sem base";
    const odd=an.odd?`${an.odd.g}/${an.odd.j} ${an.odd.p.toFixed(1)}%${an.coldOdd?" ODD FRIA":""}`:"sem base";
    const ciclo=cycleText(marketCycleStats(g.market));
    const oddFixa=exactOddText(exactOddStats(g,g.market));
    const horario=hourStatsText(hourStatsForGame(g,g.market));
    const liga=ligaStatsText(g.market);
    const detalhe=teamDetailText(g,g.market);
    const placar=scorePullText(scoreModelForGame(g,g.market));
    return `<tr><td>${esc(g.time)}</td><td>${esc(g.name)}</td><td>${esc(g.market.name)}</td><td>${g.odd.toFixed(2)}</td><td class="${cls}">${esc(an.motivo)}<br>Score ${an.score}</td><td>Prob real ${prob}<br>Odd justa ${fair}<br>EV ${ev}<br>EV gale ${evG}<br>${ciclo}<br>${oddFixa}<br>${horario}<br>${liga}</td><td>Times geral: ${team}<br>${detalhe}<br>Odd atual @${g.odd.toFixed(2)} ${odd}<br>${placar}</td><td>${reads}</td></tr>`;
  }).join("")}</table>`;
}
function signalsBox(signals){
  const fundos=globalFundos([]).filter(f=>f.ready&&f.j>=f.w);
  const fundoHtml=fundos.length?fundos.map(f=>`<div class="sig"><b class="ok">BATEU MINIMA ${f.w}</b> ${esc(market().name)} | ${f.g}/${f.j} ${f.p.toFixed(1)}% | minima ${f.min.toFixed(1)}%</div>`).join(""):"";
  if(!signals.length&&!fundoHtml)return "<p class='warn'>Sem sinal agora. O som toca quando a linha calculada do mercado bater fundo/minima em 120, 240, 480 ou 960.</p>";
  return signals.map(s=>{
    const tipo=s.tipo||"FUNDO";
    return `<div class="sig"><b class="ok">${tipo} ${s.best.w}</b> ${esc(s.game.market.name)} @${s.game.odd.toFixed(2)} | ${esc(s.game.time)} ${esc(s.game.name)} | atual ${Number.isFinite(s.best.cur)?s.best.cur.toFixed(1):"-"} min ${Number.isFinite(s.best.min)?s.best.min.toFixed(1):"-"} EV ${Number.isFinite(s.best.ev)?s.best.ev.toFixed(1):"-"}%</div>`;
  }).join("")+fundoHtml;
}
function trendBox(series){
  const rows=calcResultWindows(market());
  return `<table><tr><th>Periodo</th><th>Porcentagem correta</th><th>Minima historica</th><th>Alerta sonoro</th></tr>${rows.map(r=>{
    const leitura=r.ready?`${r.g}/${r.j} ${r.p.toFixed(1)}%`:`parcial ${r.g}/${r.j} de ${r.w}`;
    const min=r.ready&&r.min!==null?`${r.min.toFixed(1)}%`:"aguardando base";
    const alerta=r.ready?(r.fundo30?"BATEU 30%":r.fundoMin?"BATEU MINIMA":"nao"):"sem alerta";
    const cls=r.fundo30||r.fundoMin?"ok":r.ready?"warn":"bad";
    return `<tr><td>${r.w}</td><td>${leitura}</td><td>${min}</td><td class="${cls}">${alerta}</td></tr>`;
  }).join("")}</table>`;
}
function resultsCheckTable(){
  const rows=recentPaidResults();
  if(!rows.length)return "<p class='warn'>Ainda nao encontrei resultados passados visiveis para conferir este mercado. Role a grade para baixo/cima e clique Atualizar.</p>";
  return `<table><tr><th>Horario</th><th>Resultado</th><th>Mercado</th><th>Odd</th><th>Pagou?</th><th>Times/Odd pagante</th><th>Prob/EV estimado</th></tr>${rows.map(r=>{
    const paid=r.paid?"GREEN":"RED";
    const cls=r.paid?"ok":"bad";
    const team=r.team?`${r.team.g}/${r.team.j} ${r.team.p.toFixed(1)}%`:"sem base";
    const odd=r.oddBase?`${r.oddBase.g}/${r.oddBase.j} ${r.oddBase.p.toFixed(1)}%`:"sem base";
    const prob=r.prob===null?"-":`${r.prob.toFixed(1)}%`;
    const ev=r.ev===null?"-":`${r.ev.toFixed(1)}%`;
    return `<tr><td>${esc(r.time||"-")}</td><td>${esc(r.name)}<br>${r.score.a}-${r.score.b}</td><td>${esc(market().name)}</td><td>${r.odd?r.odd.toFixed(2):"-"}</td><td class="${cls}">${paid}</td><td>Times: ${team}<br>Odd: ${odd}</td><td>Prob ${prob}<br>EV ${ev}</td></tr>`;
  }).join("")}</table>`;
}
function exportHistory(){
  let sinais=[],minima=[],subida=[];
  try{sinais=JSON.parse(localStorage.getItem(SEEN)||"[]")}catch(e){}
  try{minima=JSON.parse(localStorage.getItem(SEEN+"_FUNDO")||"[]")}catch(e){}
  try{subida=JSON.parse(localStorage.getItem(SEEN+"_TRENDUP")||"[]")}catch(e){}
  const data={
    quando:new Date().toISOString(),
    liga:activeLiga(),
    mercado:market().name,
    api:API_ROWS,
    resultados:RESULTS_CACHE,
    historico:loadStoredResults(),
    alertas:{sinais,minima,subida}
  };
  const txt=JSON.stringify(data,null,2);
  try{navigator.clipboard?.writeText(txt)}catch(e){}
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"}));
  a.download=`bbtips-historico-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  return data;
}
function draw(){
  const bodyOld=P.querySelector(".body");
  const oldScroll=bodyOld?bodyOld.scrollTop:0;
  const oldPageX=window.scrollX,oldPageY=window.scrollY;
  loadApiRows();
  refreshResultsCache();
  sendResultadosAgenteLocal();
  const a=analyze();
  notify(a.signals);
  notifyFundo(a.series);
  notifyTrendUp();
  const fundos=[...globalFundos(a.series),...visualFundos(a.series)];
  const fundoTxt=fundos.length?` | FUNDO ${fundos.map(f=>`${f.w}:${f.p.toFixed(1)}%`).join(" ")}`:"";
  const ligaAtual=activeLiga();
  const opts=MARKETS.map(m=>`<option value="${m.key}" ${m.key===CONFIG.market?"selected":""}>${m.name}</option>`).join("");
  P.innerHTML=`<div class="top"><b>BBTips Robo | ${new Date().toLocaleTimeString()} | Liga ${ligaAtual||"auto"} | Mercado ${esc(market().name)} | API ${API_ROWS.length} | Resultados ${RESULTS_CACHE.length} | Proximos ${a.games.length} | Sinais ${a.signals.length}${fundoTxt}</b>
  <span>Mercado <select id="rb-market">${opts}</select> EV+ <input id="rb-ev" value="${CONFIG.minEV}"> Prob <input id="rb-prob" value="${CONFIG.minProb}"> OddFria% <input id="rb-cold" value="${CONFIG.minOddPct}"> Prox <input id="rb-maxprox" value="${CONFIG.maxProximos}"> Tol <input id="rb-tol" value="${CONFIG.tol}">
  <button id="rb-api">API</button><button id="rb-hist">Historico</button><button id="rb-scan">Atualizar</button><button id="rb-som">Som</button><button id="rb-min">Minimizar</button><button id="rb-close">Fechar</button></span></div>
  <div class="body">
    <h3>Proximos jogos</h3>${trendUpBox()}${marketRankingBox()}${gamesTable(a.games,a.series)}
    <h3>Sinais por minima calculada pelos resultados</h3>${signalsBox(a.signals)}
    <h3>Pagamento do mercado aberto</h3>${statusStatsBox()}
    <h3>Conferencia dos ultimos resultados</h3>${resultsCheckTable()}
    <h3>Linha calculada pelos resultados fechados</h3>${trendBox(a.series)}
  </div>`;
  document.getElementById("rb-market").onchange=e=>{CONFIG.market=e.target.value;draw()};
  document.getElementById("rb-ev").onchange=e=>{CONFIG.minEV=Number(e.target.value)||0;draw()};
  document.getElementById("rb-prob").onchange=e=>{CONFIG.minProb=Number(e.target.value)||52;draw()};
  document.getElementById("rb-cold").onchange=e=>{CONFIG.minOddPct=Number(e.target.value)||45;draw()};
  document.getElementById("rb-maxprox").onchange=e=>{CONFIG.maxProximos=Number(e.target.value)||6;draw()};
  document.getElementById("rb-tol").onchange=e=>{CONFIG.tol=Number(e.target.value)||0.8;draw()};
  document.getElementById("rb-api").onclick=()=>carregarApiDireto();
  document.getElementById("rb-hist").onclick=()=>exportHistory();
  document.getElementById("rb-scan").onclick=draw;
  document.getElementById("rb-som").onclick=beep;
  document.getElementById("rb-min").onclick=()=>P.classList.toggle("min");
  document.getElementById("rb-close").onclick=()=>{clearInterval(window[TIMER]);P.remove()};
  const bodyNew=P.querySelector(".body");
  if(bodyNew)bodyNew.scrollTop=oldScroll;
  window.scrollTo(oldPageX,oldPageY);
}
draw();
window[TIMER]=setInterval(draw,CONFIG.intervalMs);
window.BBTipsRobo={analyze,config:CONFIG,exportar:exportHistory,historico:loadStoredResults};
})();





