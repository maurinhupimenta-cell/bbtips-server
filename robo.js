(()=>{
const PANEL="bbtips-final-robo";
const TIMER="BBTIPS_FINAL_ROBO_TIMER";
const SEEN="BBTIPS_FINAL_ROBO_SEEN";
const API_STORE="BBTIPS_FINAL_API_ROWS_V2";
const HIST_STORE="BBTIPS_FINAL_RESULTADOS_HIST_V1";
const ALERT_STATE_STORE="BBTIPS_FINAL_ALERT_STATE_V1";
const ALERT_LOG_STORE="BBTIPS_FINAL_ALERT_LOG_V1";
const PRED_STORE="BBTIPS_FINAL_PREVISOES_1G_V1";
document.getElementById(PANEL)?.remove();
document.getElementById(PANEL+"-style")?.remove();
clearInterval(window[TIMER]);
["BBTIPS_FINAL_ROBO_TIMER","BBTIPS_API_ALERTAS_TIMER","BBTIPS_INTERCEPTA_API_TIMER","BBTIPS_PRO_TRADER_TIMER","HB_MULTI_TIMER"].forEach(k=>{try{clearInterval(window[k])}catch(e){}});
["bbtips-api-alertas","bbtips-intercepta-api","hb-multi","hb-tips-scanner"].forEach(id=>document.getElementById(id)?.remove());

const CONFIG={market:"over25",tol:0.8,minEV:0,minProb:52,minOddPct:45,minOddSample:8,maxProximos:6,rankHoras:6,intervalMs:10000,windows:[120,240,480,960],ligas:[1,2,3,4,5,6],ligaAuto:true,horas:"Horas3",filtros:"o15,o25,u25,ambs,ambn,o35,u15,u35"};
let PANEL_HOVER=false;
let TOOLTIP_SERIES=[];
let RESULTS_CACHE=[];
let API_ROWS=[];
let LAST_ALERT_SCOPE="";
let LAST_ALERT_TS=0;
const MARKETS=[
  {key:"ambas_sim",name:"Ambas Sim",patterns:[/ambs@?(\d+[,.]\d+)/ig,/ambas\s*sim@?(\d+[,.]\d+)/ig],label:/ambs|ambas\s*sim|ambas\s*marcam/i},
  {key:"ambas_nao",name:"Ambas Nao",patterns:[/ambn@?(\d+[,.]\d+)/ig,/ambas\s*nao@?(\d+[,.]\d+)/ig],label:/ambn|ambas\s*n/i},
  {key:"over15",name:"Over 1.5",patterns:[/o15@?(\d+[,.]\d+)/ig,/over\s*1[,.]?5@?(\d+[,.]\d+)/ig],label:/o15|over\s*1/i},
  {key:"under15",name:"Under 1.5",patterns:[/u15@?(\d+[,.]\d+)/ig,/under\s*1[,.]?5@?(\d+[,.]\d+)/ig],label:/u15|under\s*1/i},
  {key:"over25",name:"Over 2.5",patterns:[/o25@?(\d+[,.]\d+)/ig,/over\s*2[,.]?5@?(\d+[,.]\d+)/ig],label:/o25|over\s*2/i},
  {key:"under25",name:"Under 2.5",patterns:[/u25@?(\d+[,.]\d+)/ig,/under\s*2[,.]?5@?(\d+[,.]\d+)/ig],label:/u25|under\s*2/i},
  {key:"over35",name:"Over 3.5",patterns:[/o35@?(\d+[,.]\d+)/ig,/over\s*3[,.]?5@?(\d+[,.]\d+)/ig],label:/o35|over\s*3/i},
  {key:"under35",name:"Under 3.5",patterns:[/u35@?(\d+[,.]\d+)/ig,/under\s*3[,.]?5@?(\d+[,.]\d+)/ig],label:/u35|under\s*3/i},
  {key:"casa_vence",name:"Casa vence",patterns:[/casa@?(\d+[,.]\d+)/ig,/casa\s*vence@?(\d+[,.]\d+)/ig,/cv@?(\d+[,.]\d+)/ig,/home@?(\d+[,.]\d+)/ig,/mandante@?(\d+[,.]\d+)/ig],label:/casa\s*vence/i},
  {key:"fora_vence",name:"Fora vence",patterns:[/fora@?(\d+[,.]\d+)/ig,/fora\s*vence@?(\d+[,.]\d+)/ig,/fv@?(\d+[,.]\d+)/ig,/away@?(\d+[,.]\d+)/ig,/visitante@?(\d+[,.]\d+)/ig],label:/fora\s*vence/i},
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
function ligaNome(){const l=activeLiga();return l?`Liga ${l}`:"Liga auto"}
function fmtStat(s){return s?`${s.g}/${s.j} ${s.p.toFixed(1)}%`:"sem base"}
function storeGet(key,def){if(window[key]!==undefined)return window[key];try{const v=localStorage.getItem(key);if(v!==null){window[key]=JSON.parse(v);return window[key]}}catch(e){}try{const v=sessionStorage.getItem(key);if(v!==null){window[key]=JSON.parse(v);return window[key]}}catch(e){}window[key]=JSON.parse(def);return window[key]}
function storeSet(key,val){window[key]=val;const txt=JSON.stringify(val);try{localStorage.setItem(key,txt);return true}catch(e){try{sessionStorage.setItem(key,txt);return true}catch(x){return false}}}
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
function minutesUntil(v){
  const hm=parseTime(v);
  if(hm===null)return null;
  const d=new Date(),now=d.getHours()*60+d.getMinutes();
  let diff=hm-now;
  if(diff<-720)diff+=1440;
  return diff;
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
    casa_vence:["casa","casa_vence","cv","home","mandante","time_casa","time_casa_vence","vitoria_casa","vencedor_casa","casa_vencer","home_win","winner_home","1x2_casa","1x2_home","odd_casa","odd_casa_vence","odd_home","odd_home_win","odd_vencedor_casa","odd_casa_vencer","odd_1x2_casa","odd_1","1"],
    fora_vence:["fora","fora_vence","fv","away","visitante","time_fora","time_visitante","time_fora_vence","vitoria_fora","vencedor_fora","fora_vencer","away_win","winner_away","1x2_fora","1x2_away","odd_fora","odd_fora_vence","odd_away","odd_away_win","odd_vencedor_fora","odd_fora_vencer","odd_1x2_fora","odd_2","2"],
    over5:["o5","ge5","e5+","e5","over5","over_5","5+","odd_over_5","odd_ge5","odd_5+"],
    casa5:["casa5","casa_5","c5","tgc5","tcg5","time_gols_casa_5","odd_casa5","odd_casa_5","odd_tgc5"],
    fora5:["fora5","fora_5","f5","tgv5","tvg5","time_gols_fora_5","time_gols_visitante_5","odd_fora5","odd_fora_5","odd_tgv5"]
  };
  return map[m.key]||[];
}
function oddFromObj(odds,m){
  if(!odds||typeof odds!=="object")return null;
  const low={},norm={};
  const normalize=k=>String(k).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"");
  Object.keys(odds).forEach(k=>{
    const v=Number(String(odds[k]).replace(",","."));
    low[String(k).toLowerCase()]=v;
    norm[normalize(k)]=v;
  });
  for(const k of marketAliases(m)){
    const v=low[String(k).toLowerCase()];
    if(Number.isFinite(v)&&v>1)return v;
    const nv=norm[normalize(k)];
    if(Number.isFinite(nv)&&nv>1)return nv;
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
function collectExtraOdds(obj,out={}){
  if(!obj||typeof obj!=="object")return out;
  if(Array.isArray(obj)){
    obj.forEach(it=>collectExtraOdds(it,out));
    return out;
  }
  const k=obj.Nome??obj.nome??obj.Mercado??obj.mercado??obj.Tipo??obj.tipo??obj.Chave??obj.chave??obj.Key??obj.key??obj.Name??obj.name;
  const v=obj.Odd??obj.odd??obj.Valor??obj.valor??obj.Value??obj.value??obj.Cotacao??obj.cotacao;
  if(k!==undefined&&v!==undefined)out[String(k).toLowerCase()]=Number(String(v).replace(",","."));
  ["Odds","odds","Odd","odd","Mercados","mercados","Markets","markets","Cotacoes","cotacoes"].forEach(key=>{
    if(obj[key]!==undefined)collectExtraOdds(obj[key],out);
  });
  return out;
}
function apiScoreFromRow(row){
  const direct=apiScore(row.Resultado||row.resultado||row.Placar||row.placar||row.Score||row.score||row.Result||row.result||row.FT||row.ft||row.Final||row.final||row.FullTime||row.fullTime||row.ResultadoFinal||row.resultadoFinal||row.PlacarFinal||row.placarFinal||"");
  if(direct)return direct;
  const a=row.GolsCasa??row.golsCasa??row.PlacarCasa??row.placarCasa??row.ScoreCasa??row.scoreCasa??row.HomeScore??row.homeScore??row.CasaGols??row.casaGols??row.TimeAGols??row.timeAGols??row.GolsTimeA??row.golsTimeA??row.ResultadoCasa??row.resultadoCasa;
  const b=row.GolsFora??row.golsFora??row.PlacarFora??row.placarFora??row.ScoreFora??row.scoreFora??row.AwayScore??row.awayScore??row.ForaGols??row.foraGols??row.TimeBGols??row.timeBGols??row.GolsTimeB??row.golsTimeB??row.ResultadoFora??row.resultadoFora;
  const na=Number(String(a??"").replace(",",".")),nb=Number(String(b??"").replace(",","."));
  if(Number.isFinite(na)&&Number.isFinite(nb)&&na>=0&&nb>=0&&na<=20&&nb<=20)return {a:na,b:nb,t:na+nb};
  const joined=Object.keys(row||{}).filter(k=>/placar|score|resultado|gols|final|ft/i.test(k)).map(k=>row[k]).join(" | ");
  return apiScore(joined);
}
function apiScore(raw){
  const txt=String(raw??"").replace(/\s+/g," ").trim();
  if(!txt)return null;
  const m=txt.match(/(?:^|\b)(\d{1,2})\s*(?:-|x|X|:|ï¿½)\s*(\d{1,2})(?:\b|$)/);
  if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]);
  if(!Number.isFinite(a)||!Number.isFinite(b))return null;
  if(a>20||b>20)return null;
  return {a,b,t:a+b};
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
      const score=apiScoreFromRow(c);
      const a=c.TimeA||c.timeA||c.Casa||c.casa||c.TimeCasa||"";
      const b=c.TimeB||c.timeB||c.Fora||c.fora||c.TimeFora||"";
      const time=apiTime(c,linha);
      const odds=Object.assign({},parseApiOdds(c),parseApiOdds(c.Odds||c.odds||c.Odd||c.odd||c.Mercados||c.mercados||c.Markets||c.markets),collectExtraOdds(c));
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
}
function loadApiRows(){
  try{API_ROWS=storeGet(API_STORE,"[]")}catch(e){API_ROWS=[]}
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
function activeCasa(){
  const names=["bet365","betano","kiron","sportingbet"];
  let best="",score=-1;
  document.querySelectorAll("button,div,span,a,li").forEach(el=>{
    const txt=esc(el.innerText||"").toLowerCase();
    const name=names.find(n=>txt===n||txt.startsWith(n+" ")||txt.includes(" "+n+" "));
    if(!name)return;
    const r=el.getBoundingClientRect?.();
    if(!r||r.width<30||r.height<12||r.top<0||r.top>120)return;
    const cls=(el.className||"").toString();
    const st=getComputedStyle(el);
    const active=/active|selected|ativo/i.test(cls)?80:0;
    const bright=(st.color||"").match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    const c=bright?Number(bright[1])+Number(bright[2])+Number(bright[3]):0;
    const s=active+c/20+r.width/20;
    if(s>score){score=s;best=name}
  });
  return best||"site";
}
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
  const casa=activeCasa();
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
          games.push({time,name,market:m,odd:odds[0],text:txt,liga,casa,fonte:"dom"});
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
      apiGames.push({time:r.time,name:r.name,market:m,odd,text:txtFromApiRow(r),api:true,liga:r.liga||liga,casa:"api",fonte:"api"});
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
  const liga=activeLiga(),casa=activeCasa();
  const valid=r=>r?.score&&paysMarket(r.score,m)!==null;
  let rows=RESULTS_CACHE.filter(r=>valid(r)&&(!liga||!r.liga||r.liga===liga)&&(!casa||!r.casa||r.casa===casa));
  if(rows.length<Math.min(120,CONFIG.windows[0]||120))rows=RESULTS_CACHE.filter(r=>valid(r)&&(!liga||!r.liga||r.liga===liga));
  if(rows.length<Math.min(120,CONFIG.windows[0]||120))rows=RESULTS_CACHE.filter(valid);
  return rows
    .map(r=>({name:r.name,score:r.score,green:paysMarket(r.score,m),txt:r.txt,liga:r.liga,casa:r.casa,time:r.time}))
    .filter(r=>r.green!==null);
}
function visualCycleHistoryForMarket(m){
  const grid=gridResultCells();
  const base=grid.length>=5?grid.slice().sort((a,b)=>b.idx-a.idx):RESULTS_CACHE;
  return base
    .map(r=>({name:r.name,score:r.score,green:paysMarket(r.score,m),txt:r.txt,time:r.time,idx:r.idx}))
    .filter(r=>r.green!==null);
}
function calcResultWindows(m){
  const hist=resultHistoryForMarket(m);
  return CONFIG.windows.map(w=>{
    const arr=hist.slice(0,w);
    const j=arr.length;
    const g=arr.filter(x=>x.green).length;
    const pctVal=j?g/j*100:null;
    let min=null,max=null,media=null,prev=null,tend=null;
    if(hist.length>=w){
      const vals=[];
      for(let i=0;i<=hist.length-w;i++){
        const sub=hist.slice(i,i+w);
        vals.push(sub.filter(x=>x.green).length/sub.length*100);
      }
      min=Math.min(...vals);
      max=Math.max(...vals);
      media=vals.reduce((a,b)=>a+b,0)/vals.length;
      prev=vals[1]??null;
      tend=Number.isFinite(prev)&&Number.isFinite(pctVal)?pctVal-prev:null;
    }
    const ready=j>=w;
    const fundo30=ready&&pctVal!==null&&pctVal<=30;
    const fundoMin=ready&&min!==null&&pctVal<=min+CONFIG.tol;
    const topo=ready&&max!==null&&pctVal>=max-CONFIG.tol;
    const abaixoEq=ready&&media!==null&&pctVal<=media;
    const viradaFundo=ready&&min!==null&&media!==null&&prev!==null&&prev<=min+CONFIG.tol&&pctVal>prev&&pctVal<=media+CONFIG.tol;
    const estabilizouFundo=ready&&fundoMin&&Number.isFinite(tend)&&tend>=0;
    const confirmadoFundo=!!(viradaFundo||estabilizouFundo);
    const fundoSemConfirmacao=!!(fundoMin&&!confirmadoFundo);
    const caindoTopo=ready&&max!==null&&prev!==null&&prev>=max-CONFIG.tol&&pctVal<prev;
    const fundoRespirando=ready&&fundoMin&&!topo&&Number.isFinite(tend)&&tend>=-CONFIG.tol;
    const reacaoAbaixoEq=ready&&abaixoEq&&!fundoMin&&!topo&&Number.isFinite(tend)&&tend>=CONFIG.tol;
    const alertaOk=!!(confirmadoFundo||fundoRespirando||reacaoAbaixoEq);
    const zona=topo?"TOPO":viradaFundo?"VIRADA FUNDO":estabilizouFundo?"FUNDO ESTAVEL":fundoRespirando?"FUNDO RESPIRANDO":fundoMin?"FUNDO SEM CONFIRMACAO":reacaoAbaixoEq?"REACAO ABAIXO EQ":abaixoEq?"ABAIXO EQ":"ACIMA EQ";
    return {w,j,g,p:pctVal,min,max,media,prev,tend,ready,fundo30,fundoMin,estabilizouFundo,confirmadoFundo,fundoRespirando,reacaoAbaixoEq,alertaOk,fundoSemConfirmacao,topo,abaixoEq,viradaFundo,caindoTopo,zona};
  });
}
function globalFundos(series){
  return calcResultWindows(market()).filter(r=>r.ready&&r.j>=r.w&&r.alertaOk);
}
function visualFundos(series){
  return [];
}
function scoreFromResult(txt){
  const m=String(txt||"").replace(/\s+/g," ").match(/(?:^|\b)(\d{1,2})\s*(?:-|x|X|:|ï¿½)\s*(\d{1,2})(?:\b|$)/);
  if(!m)return null;
  const a=Number(m[1]),b=Number(m[2]);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a>20||b>20)return null;
  return {a,b,t:a+b};
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
  const casa=activeCasa();
  let stored=[];
  try{stored=storeGet(HIST_STORE,"[]").filter(r=>r&&r.score).map((r,i)=>({...r,top:r.top??50000+i,idx:r.idx??i,fonte:r.fonte||"hist"}))}catch(e){stored=[]}
  const apiHist=API_ROWS.filter(r=>r.score&&!r.future&&(!liga||!r.liga||r.liga===liga)).map((r,i)=>({
    txt:txtFromApiRow(r),
    score:r.score,
    name:r.name,
    time:r.time,
    liga:r.liga||liga,
    casa:"api",
    top:-10000+i,
    left:0,
    idx:i,
    api:true
  }));
  const dom=allResultCells();
  dom.forEach(r=>{r.liga=liga;r.casa=casa;r.fonte="dom"});
  const seen=new Set();
  RESULTS_CACHE=[...apiHist,...dom,...stored].filter(r=>{
    const key=`${r.liga||""}|${r.casa||""}|${r.time||""}|${r.name}|${r.score?.a}-${r.score?.b}`;
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).sort((a,b)=>resultAge(a)-resultAge(b)||a.top-b.top||a.idx-b.idx);
  try{localStorage.setItem(HIST_STORE,JSON.stringify(RESULTS_CACHE.slice(0,2000)))}catch(e){try{sessionStorage.setItem(HIST_STORE,JSON.stringify(RESULTS_CACHE.slice(0,600)))}catch(x){}};
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
function virtualAgeFrom(ref,r){
  const hm=parseTime(r.time);
  if(ref===null||hm===null)return 99999+(r.top||0)+(r.idx||0)/1000;
  let age=ref-hm;
  if(age<0)age+=1440;
  return age;
}
function latestVirtualMinute(rows){
  const vals=rows.map(r=>parseTime(r.time)).filter(v=>v!==null);
  if(!vals.length)return null;
  vals.sort((a,b)=>a-b);
  const realNow=new Date().getHours()*60+new Date().getMinutes();
  let best=vals[0],bestAge=99999;
  vals.forEach(v=>{
    let age=realNow-v;
    if(age<0)age+=1440;
    if(age<bestAge){bestAge=age;best=v}
  });
  return best;
}
function recentPaidResults(){
  const out=[],seen=new Set();
  const mkt=activeMarkets()[0]||market();
  const base=gridResultCells().length?gridResultCells():RESULTS_CACHE;
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
    out.push({time:r.time||"",name,score:r.score,odd:odds[0]||null,paid,team,oddBase,prob,ev,scorePull:scoreNextStats(r.score,mkt)});
  });
  return out.slice(0,10);
}
function scoreKey(score){return score?`${score.a}-${score.b}`:"-"}
function orderedResults(){
  return RESULTS_CACHE.filter(r=>r.score).slice().sort((a,b)=>resultAge(b)-resultAge(a)||a.top-b.top||a.idx-b.idx);
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
function avg(nums){return nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null}
function marketCycleStats(m){
  const hist=visualCycleHistoryForMarket(m).slice(0,80);
  if(!hist.length)return null;
  const current=hist[0].green?"GREEN":"RED";
  let streak=0,lastGreen=null,lastRed=null;
  for(let i=0;i<hist.length;i++){
    if((hist[i].green?"GREEN":"RED")===current)streak++;
    else break;
  }
  for(let i=0;i<hist.length;i++){
    if(hist[i].green&&lastGreen===null)lastGreen=i;
    if(!hist[i].green&&lastRed===null)lastRed=i;
  }
  const blocks={GREEN:[],RED:[]};
  let prev=null,count=0;
  hist.slice(0,50).forEach(r=>{
    const s=r.green?"GREEN":"RED";
    if(prev===null){prev=s;count=1;return;}
    if(s===prev){count++;return;}
    blocks[prev].push(count);
    prev=s;count=1;
  });
  if(prev)blocks[prev].push(count);
  const avgGreen=avg(blocks.GREEN),avgRed=avg(blocks.RED);
  const media=current==="RED"?avgRed:avgGreen;
  let fase="inicio de bloco";
  if(media&&streak>=Math.max(2,media*0.8))fase="ponto de virada";
  else if(streak>=3)fase="meio de bloco";
  const pressao=current==="RED"&&avgRed?Math.min(100,streak/Math.max(1,avgRed)*50):current==="RED"?streak*10:0;
  return {current,streak,lastGreen,lastRed,avgGreen,avgRed,fase,pressao,hist:hist.length};
}
function oddBandStats(game,m){
  const band=oddBand(game.odd);
  if(!band)return null;
  const rows=RESULTS_CACHE.filter(r=>{
    const odds=oddsForMarket(r.txt,m);
    return odds.some(o=>oddBand(o)===band);
  }).slice(0,80);
  if(!rows.length)return {band,j:0,g:0,p:null,cold:false};
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  const p=g/rows.length*100;
  return {band,j:rows.length,g,p,cold:rows.length>=5&&p<40};
}
function cycleText(c){
  if(!c)return "Ciclo: sem base";
  const lg=c.lastGreen===null?"sem green":`${c.lastGreen} jogos`;
  const ar=Number.isFinite(c.avgRed)?c.avgRed.toFixed(1):"-";
  const ag=Number.isFinite(c.avgGreen)?c.avgGreen.toFixed(1):"-";
  return `Ciclo: ${c.streak} ${c.current} seguidos | ultimo GREEN ${lg}<br>Media blocos RED ${ar} / GREEN ${ag} | fase ${c.fase} | pressao ${c.pressao.toFixed(0)}`;
}
function oddBandText(o){
  if(!o)return "Odd fixa: sem base";
  const pct=o.p===null?"-":`${o.p.toFixed(1)}%`;
  return `Odd fixa ${esc(o.band)}: ${o.g}/${o.j} ${pct}${o.cold?" ODD FRIA":""}`;
}
function hourOf(v){
  const hm=parseTime(v);
  return hm===null?null:Math.floor(hm/60);
}
function hourStatsForGame(game,m){
  const h=hourOf(game.time);
  if(h===null)return null;
  const rows=RESULTS_CACHE.filter(r=>hourOf(r.time)===h&&paysMarket(r.score,m)!==null).slice(0,120);
  if(!rows.length)return {h,j:0,g:0,p:null,tag:"sem base"};
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  const p=g/rows.length*100;
  const geral=calcResultWindows(m).find(r=>r.w===240)?.p;
  const tag=Number.isFinite(geral)?(p>=geral+8?"HORARIO QUENTE":p<=geral-8?"HORARIO FRIO":"horario neutro"):"";
  return {h,j:rows.length,g,p,tag};
}
function hourStatsText(s){
  if(!s)return "Horario: sem base";
  const hh=String(s.h).padStart(2,"0");
  const pct=s.p===null?"-":`${s.p.toFixed(1)}%`;
  return `Horario ${hh}h: ${s.g}/${s.j} ${pct}${s.tag?` ${s.tag}`:""}`;
}
function ligaStatsText(m){
  const r=calcResultWindows(m).find(x=>x.w===240)||calcResultWindows(m).find(x=>x.ready);
  if(!r||!r.ready)return "Liga atual: sem base";
  const media=resultHistoryForMarket(m).length?resultHistoryForMarket(m).filter(x=>x.green).length/resultHistoryForMarket(m).length*100:null;
  const tag=Number.isFinite(media)?(r.p>=media+5?"LIGA QUENTE":r.p<=media-5?"LIGA FRIA":"liga neutra"):"";
  return `Liga atual: ${r.g}/${r.j} ${r.p.toFixed(1)}%${tag?` ${tag}`:""}`;
}
function pctWindow(hist,n){
  const arr=hist.slice(0,n);
  if(!arr.length)return null;
  return arr.filter(x=>x.green).length/arr.length*100;
}
function marketMoment(m){
  const hist=resultHistoryForMarket(m);
  const p30=pctWindow(hist,30),p60=pctWindow(hist,60),p120=pctWindow(hist,120),p240=pctWindow(hist,240);
  const trend=Number.isFinite(p30)&&Number.isFinite(p120)?p30-p120:null;
  const accel=Number.isFinite(p30)&&Number.isFinite(p60)?p30-p60:null;
  let regime="NEUTRO",threshold=62;
  if(Number.isFinite(trend)&&trend>=8&&Number.isFinite(accel)&&accel>=-3){regime="QUENTE";threshold=56;}
  else if(Number.isFinite(trend)&&trend<=-8){regime="FRIO";threshold=70;}
  else if(Number.isFinite(trend)&&trend>=4){regime="MELHORANDO";threshold=59;}
  else if(Number.isFinite(trend)&&trend<=-4){regime="PIORANDO";threshold=66;}
  return {p30,p60,p120,p240,trend,accel,regime,threshold,hist:hist.length};
}
function adaptiveSignalForGame(g,ctx){
  const moment=marketMoment(g.market);
  const best=ctx.best||{};
  const motivos=[];
  const add=(v,t)=>{s+=v;if(t)motivos.push(t)};
  let s=35;
  if(best.viradaFundo)add(18,"virada do fundo");
  else if(best.estabilizouFundo)add(14,"fundo estabilizado");
  else if(best.fundoSemConfirmacao)add(-10,"fundo sem confirmacao");
  else if(best.abaixoEq)add(8,"abaixo equilibrio");
  if(best.topo)add(-30,"bloqueia topo");
  if(best.caindoTopo)add(-15,"caindo do topo");
  if(Number.isFinite(moment.trend)){
    const ajuste=Math.max(-15,Math.min(15,moment.trend*1.2));
    add(ajuste,ajuste>4?"linha curta melhor":ajuste<-4?"linha curta pior":"");
  }
  if(moment.regime==="QUENTE")add(10,"momento quente");
  if(moment.regime==="MELHORANDO")add(6,"momento melhorando");
  if(moment.regime==="FRIO")add(-14,"momento frio");
  if(moment.regime==="PIORANDO")add(-8,"momento piorando");
  if(ctx.hour?.tag==="HORARIO QUENTE")add(8,"horario quente");
  if(ctx.hour?.tag==="HORARIO FRIO")add(-7,"horario frio");
  if(ctx.band?.cold)add(-12,"odd fria");
  if(ctx.odd&&Number.isFinite(ctx.odd.p)&&Number.isFinite(moment.p120)&&ctx.odd.p>=moment.p120+8)add(7,"faixa odd acima media");
  if(ctx.team&&Number.isFinite(ctx.team.p)&&Number.isFinite(moment.p120)&&ctx.team.p>=moment.p120+8)add(7,"times acima media");
  if(Number.isFinite(ctx.evGale)){
    if(ctx.evGale>10)add(10,"EV gale bom");
    else if(ctx.evGale>0)add(6,"EV gale positivo");
    else if(ctx.evGale<-25)add(-10,"EV gale ruim");
  }
  if(ctx.cycle&&ctx.cycle.current==="RED"&&!best.topo&&(best.confirmadoFundo||best.abaixoEq))add(Math.min(12,ctx.cycle.pressao/8),"pressao com zona boa");
  const gale=oneGaleStats(g.market);
  if(Number.isFinite(gale.p)){
    if(gale.p>=58)add(10,"1 gale forte");
    else if(gale.p>=48)add(5,"1 gale aceitavel");
    else if(gale.p<38)add(-16,"1 gale fraco");
  }
  if(Number.isFinite(gale.avgDist)&&gale.avgDist>3.2)add(-12,"green longe demais");
  if(ctx.coldOdd)add(-10,"odd fria geral");
  s=Math.max(0,Math.min(100,s));
  const threshold=moment.threshold;
  const status=s>=threshold?"IA ENTRAR":s>=threshold-12?"IA OBSERVAR":"IA PASSAR";
  return {score:Math.round(s),threshold,status,moment,gale,motivos:motivos.filter(Boolean).slice(0,5)};
}
function adaptiveText(ai){
  if(!ai)return "IA: sem base";
  return `IA ${ai.score}/${ai.threshold} ${ai.status}${ai.motivos?.length?`<br>Motivos: ${ai.motivos.map(esc).join(" | ")}`:""}`;
}
function scoreModelForGame(game,m){
  const names=teamNames(game.name);
  const oddAtual=Number.isFinite(game.odd)?game.odd:null;
  const band=oddBand(oddAtual);
  const rows=orderedResults();
  const buckets={confronto:[],times:[],odd:[],mercado:[]};
  rows.forEach(r=>{
    const t=String(r.txt||"").toLowerCase();
    const odds=oddsForMarket(r.txt,m);
    const rb=odds.length?oddBand(odds[0]):null;
    if(names.length>=2&&names.every(n=>n&&t.includes(n)))buckets.confronto.push(r);
    if(names.length&&names.some(n=>n&&t.includes(n)))buckets.times.push(r);
    if(band&&rb===band)buckets.odd.push(r);
    buckets.mercado.push(r);
  });
  const sourceKey=buckets.confronto.length>=3?"confronto":buckets.times.length>=8?"times":buckets.odd.length>=8?"odd":buckets.mercado.length>=20?"mercado":"";
  const source=sourceKey==="odd"?"faixa odd":sourceKey;
  const base=sourceKey?buckets[sourceKey]:[];
  if(!base.length)return null;
  const scoreCnt={},marketCnt={},oddWin={};
  base.forEach(r=>{
    const sk=scoreKey(r.score);
    scoreCnt[sk]=(scoreCnt[sk]||0)+1;
    if(paysMarket(r.score,m))marketCnt.green=(marketCnt.green||0)+1;
    const odds=oddsForMarket(r.txt,m);
    if(paysMarket(r.score,m)&&odds.length){const ok=odds[0].toFixed(2);oddWin[ok]=(oddWin[ok]||0)+1;}
  });
  const j=base.length;
  const topScores=Object.entries(scoreCnt).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([k,v])=>`${k} ${v}/${j} ${(v/j*100).toFixed(1)}%`);
  const topOdds=Object.entries(oddWin).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}x`);
  const green=marketCnt.green||0;
  return {source,j,band,topScores,topOdds,marketP:green/j*100};
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
    const paid=paysMarket(n.score,m);
    if(paid&&odds.length){
      const ok=odds[0].toFixed(2);
      oddWin[ok]=(oddWin[ok]||0)+1;
    }
  }
  if(!j)return null;
  const topScores=Object.entries(next).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}/${j} ${(v/j*100).toFixed(1)}%`);
  const topOdds=Object.entries(oddWin).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k} ${v}x`);
  return {score:key,j,topScores,topOdds};
}
function sidePayPct(team,m,side){
  const nm=esc(team).toLowerCase();
  const rows=RESULTS_CACHE.filter(r=>{const p=teamNames(r.name);return side==="casa"?p[0]===nm:p[1]===nm});
  if(rows.length<1)return null;
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  return {g,j:rows.length,p:g/rows.length*100};
}
function teamDetailText(game,m){
  const p=teamNames(game.name);
  if(p.length<2)return "sem base casa/fora";
  const aCasa=sidePayPct(p[0],m,"casa"),aFora=sidePayPct(p[0],m,"fora"),bCasa=sidePayPct(p[1],m,"casa"),bFora=sidePayPct(p[1],m,"fora");
  return `Casa ${esc(p[0])}: casa ${fmtStat(aCasa)} | fora ${fmtStat(aFora)}<br>Fora ${esc(p[1])}: casa ${fmtStat(bCasa)} | fora ${fmtStat(bFora)}`;
}
function teamWindowRank(team,m,hours){
  const nm=esc(team).toLowerCase();
  const rows=RESULTS_CACHE.filter(r=>r.score&&resultAge(r)<=hours*60&&paysMarket(r.score,m)!==null);
  const map={};
  rows.forEach(r=>{
    teamNames(r.name).forEach(t=>{
      if(!t)return;
      if(!map[t])map[t]={team:t,g:0,j:0,p:0};
      map[t].j++;
      if(paysMarket(r.score,m))map[t].g++;
    });
  });
  const list=Object.values(map).filter(x=>x.j>=2).map(x=>({...x,p:x.g/x.j*100})).sort((a,b)=>b.p-a.p||b.j-a.j);
  const idx=list.findIndex(x=>x.team===nm);
  if(idx<0){
    const own=map[nm];
    return own?`${own.g}/${own.j} ${(own.g/own.j*100).toFixed(1)}% sem rank`:"sem base";
  }
  const x=list[idx];
  return `#${idx+1}/${list.length} ${x.g}/${x.j} ${x.p.toFixed(1)}%`;
}
function teamMomentRankText(game,m){
  const p=teamNames(game.name);
  if(p.length<2)return "Ranking 3/6/12h: sem times";
  const line=t=>`${esc(t)}: 3h ${teamWindowRank(t,m,3)} | 6h ${teamWindowRank(t,m,6)} | 12h ${teamWindowRank(t,m,12)}`;
  return `Ranking momento ${esc(m.name)}:<br>${line(p[0])}<br>${line(p[1])}`;
}
function scopedResultRows(m,hours=null){
  const liga=activeLiga(),casa=activeCasa();
  let rows=RESULTS_CACHE.filter(r=>r.score&&paysMarket(r.score,m)!==null&&(!liga||!r.liga||r.liga===liga)&&(!casa||!r.casa||r.casa===casa));
  if(rows.length<30)rows=RESULTS_CACHE.filter(r=>r.score&&paysMarket(r.score,m)!==null&&(!liga||!r.liga||r.liga===liga));
  if(Number.isFinite(hours)){
    const ref=latestVirtualMinute(rows);
    rows=rows.filter(r=>virtualAgeFrom(ref,r)<=hours*60);
  }
  return rows;
}
function selectedRankHours(){
  const h=Number(CONFIG.rankHoras);
  return h===3||h===12?h:6;
}
function rankMinSampleTeam(hours){
  const h=Number(hours);
  if(h===3)return 3;
  if(h===6)return 5;
  return 8;
}
function rankMinSampleOdd(hours){
  const h=Number(hours);
  if(h===3)return 1;
  if(h===6)return 2;
  return 2;
}
function baseTag(j){
  if(j>=10)return "base boa";
  if(j>=5)return "base media";
  return "base fraca";
}
function rankScore(x){
  const p=Number.isFinite(x.p)?x.p:0;
  const base=Math.min(1,x.j/10);
  return x.g*100+p*base;
}
function teamMarketRanking(m,hours,limit=8){
  const map={};
  scopedResultRows(m,hours).forEach(r=>{
    teamNames(r.name).forEach(t=>{
      if(!t)return;
      if(!map[t])map[t]={name:t,g:0,j:0,p:0};
      map[t].j++;
      if(paysMarket(r.score,m))map[t].g++;
    });
  });
  const min=rankMinSampleTeam(hours);
  return Object.values(map)
    .filter(x=>x.j>=min&&x.g>0)
    .map(x=>({...x,p:x.g/x.j*100}))
    .sort((a,b)=>rankScore(b)-rankScore(a)||b.g-a.g||b.j-a.j||b.p-a.p)
    .slice(0,limit);
}
function oddMarketRanking(m,limit=8,hours=null){
  const map={};
  const h=Number(hours);
  const rows=scopedResultRows(m,Number.isFinite(h)?h:null).slice(0,240);
  rows.forEach(r=>{
    const paid=paysMarket(r.score,m);
    oddsForMarket(r.txt,m).forEach(o=>{
      const key=o.toFixed(2);
      if(!map[key])map[key]={odd:key,g:0,j:0,p:0};
      map[key].j++;
      if(paid)map[key].g++;
    });
  });
  const min=rankMinSampleOdd(hours);
  return Object.values(map)
    .filter(x=>x.j>=min)
    .map(x=>({...x,p:x.g/x.j*100}))
    .sort((a,b)=>rankScore(b)-rankScore(a)||b.g-a.g||b.j-a.j||b.p-a.p||Number(a.odd)-Number(b.odd))
    .slice(0,limit);
}
function rankLine(list,type){
  if(!list.length)return "sem base";
  if(type==="team")return list.map((x,i)=>`${i+1}. ${esc(x.name)} ${x.g}/${x.j} ${x.p.toFixed(1)}% ${baseTag(x.j)}`).join(" | ");
  return list.map((x,i)=>`${i+1}. @${esc(x.odd)} ${x.g}/${x.j} ${x.p.toFixed(1)}% ${baseTag(x.j)}`).join(" | ");
}
function marketRankingBox(m){
  const t3=teamMarketRanking(m,3,5),t6=teamMarketRanking(m,6,5),t12=teamMarketRanking(m,12,5);
  const horas=selectedRankHours();
  const odds=oddMarketRanking(m,10,horas);
  const chosen=horas===3?t3:horas===12?t12:t6;
  return `<div class="sig"><b class="ok">Ranking do mercado ${esc(m.name)}</b><br><b>Ranking escolhido ${horas}h:</b> ${rankLine(chosen,"team")}<br>Ranking dos times 3h: ${rankLine(t3,"team")}<br>Ranking dos times 6h: ${rankLine(t6,"team")}<br>Ranking dos times 12h: ${rankLine(t12,"team")}<br>Ranking das odds fixas ${horas}h: ${rankLine(odds,"odd")}</div>`;
}
function gameRankText(game,m){
  const p=teamNames(game.name);
  const horas=selectedRankHours();
  const rank=teamMarketRanking(m,horas,80);
  const place=t=>{
    const i=rank.findIndex(x=>x.name===t);
    return i>=0?`#${i+1} ${rank[i].g}/${rank[i].j} ${rank[i].p.toFixed(1)}%`:`sem rank ${horas}h`;
  };
  const odds=oddMarketRanking(m,80,horas);
  const oddKey=Number(game.odd).toFixed(2);
  const oi=odds.findIndex(x=>x.odd===oddKey);
  const oTxt=oi>=0?`Odd atual #${oi+1} @${odds[oi].odd} ${odds[oi].g}/${odds[oi].j} ${odds[oi].p.toFixed(1)}%`:`Odd atual @${oddKey} sem base ${horas}h`;
  return `${p[0]?`Rank ${horas}h ${esc(p[0])}: ${place(p[0])}<br>`:""}${p[1]?`Rank ${horas}h ${esc(p[1])}: ${place(p[1])}<br>`:""}${oTxt}`;
}
function oneGaleStats(m){
  const hist=resultHistoryForMarket(m).slice(0,260);
  let red=0,total=0,hit=0,distSum=0,distHits=0;
  for(let i=0;i<hist.length;i++){
    if(hist[i].green){red=0;continue;}
    red++;
    const n1=hist[i+1],n2=hist[i+2];
    if(red>=2){
      total++;
      if(n1?.green||n2?.green)hit++;
      for(let d=1;d<=8&&i+d<hist.length;d++){
        if(hist[i+d].green){distSum+=d;distHits++;break;}
      }
    }
  }
  return {total,hit,p:total?hit/total*100:null,avgDist:distHits?distSum/distHits:null};
}
function oneGaleText(s){
  if(!s||!s.total)return "1 gale: sem base";
  const p=Number.isFinite(s.p)?s.p.toFixed(1):"-";
  const d=Number.isFinite(s.avgDist)?s.avgDist.toFixed(1):"-";
  return `1 gale historico: ${s.hit}/${s.total} ${p}% | distancia media green ${d} jogos`;
}
function adaptiveMarketSummary(m){
  const mm=marketMoment(m);
  const gale=oneGaleStats(m);
  const fmt=v=>Number.isFinite(v)?v.toFixed(1):"-";
  return `<div class="sig"><b class="warn">IA do mercado</b> ${esc(m.name)} | Momento ${mm.regime}: 30j ${fmt(mm.p30)} | 60j ${fmt(mm.p60)} | 120j ${fmt(mm.p120)} | tendencia ${fmt(mm.trend)}<br>${oneGaleText(gale)}</div>`;
}
function normKey(v){return esc(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ")}
function predKey(g){return [g.liga||activeLiga()||"",g.casa||activeCasa()||"",g.market?.key||CONFIG.market,g.time||"",normKey(g.name)].join("|")}
function loadPreds(){return storeGet(PRED_STORE,"[]")}
function savePreds(list){storeSet(PRED_STORE,list.slice(-500))}
function strongerStatus(a,b){
  const rank={PASSAR:0,OBSERVAR:1,ENTRAR:2};
  return (rank[a]||0)>=(rank[b]||0)?a:b;
}
function registerPrediction(g){
  const an=g.analysis;
  if(!an||!["ENTRAR","OBSERVAR"].includes(an.status))return;
  const diff=minutesUntil(g.time);
  if(Number.isFinite(diff)&&diff<0)return;
  const list=loadPreds();
  const key=predKey(g);
  let item=list.find(x=>x.key===key&&!x.settled);
  if(!item){
    item={key,liga:g.liga||activeLiga(),casa:g.casa||activeCasa(),market:g.market.key,marketName:g.market.name,time:g.time,name:g.name,odd:g.odd,status:an.status,score:an.score,createdAt:new Date().toISOString(),settled:false};
    list.push(item);
  }else{
    item.status=strongerStatus(item.status,an.status);
    item.score=Math.max(Number(item.score)||0,Number(an.score)||0);
    item.odd=g.odd;
    item.updatedAt=new Date().toISOString();
  }
  savePreds(list);
}
function predictionResultRow(x){
  const xn=normKey(x.name);
  const xt=String(x.time||"");
  let rows=RESULTS_CACHE.filter(r=>r.score&&normKey(r.name)===xn);
  if(x.liga)rows=rows.filter(r=>!r.liga||r.liga===x.liga);
  if(x.casa)rows=rows.filter(r=>!r.casa||r.casa===x.casa||r.casa==="api");
  let exact=rows.find(r=>!xt||!r.time||String(r.time)===xt);
  if(exact)return exact;
  const target=parseTime(x.time);
  if(target!==null){
    rows=rows.map(r=>({r,hm:parseTime(r.time)})).filter(o=>o.hm!==null).sort((a,b)=>Math.abs(a.hm-target)-Math.abs(b.hm-target)).map(o=>o.r);
    if(rows[0]&&Math.abs((parseTime(rows[0].time)??9999)-target)<=3)return rows[0];
  }
  return null;
}
function settlePredictions(m){
  const list=loadPreds();
  let changed=false;
  list.filter(x=>!x.settled&&x.market===m.key).forEach(x=>{
    const row=predictionResultRow(x);
    if(!row)return;
    x.settled=true;
    x.resultAt=new Date().toISOString();
    x.scoreResult=`${row.score.a}-${row.score.b}`;
    x.paid=!!paysMarket(row.score,m);
    changed=true;
  });
  if(changed)savePreds(list);
  return list;
}
function statusPayStats(m){
  const liga=activeLiga(),casa=activeCasa();
  const items=settlePredictions(m).filter(x=>x.settled&&x.market===m.key&&(!liga||!x.liga||x.liga===liga)&&(!casa||!x.casa||x.casa===casa)).slice(-120).reverse();
  const out={ENTRAR:{g:0,j:0,streak:0,last:""},OBSERVAR:{g:0,j:0,streak:0,last:""}};
  items.forEach(x=>{out[x.status].j++;if(x.paid)out[x.status].g++;});
  ["ENTRAR","OBSERVAR"].forEach(st=>{
    for(const x of items.filter(i=>i.status===st)){
      if(x.paid){out[st].last=`pagou ${x.time||"-"} ${x.name} ${x.scoreResult||""}`;break;}
      out[st].streak++;
    }
  });
  return out;
}
function statusStatsBox(){
  const s=statusPayStats(market());
  const row=st=>{const x=s[st],p=x.j?x.g/x.j*100:null;const cls=p===null?"warn":p>=50?"ok":"bad";return `<tr><td>${st}</td><td>${x.g}/${x.j} ${p===null?"-":p.toFixed(1)+"%"}</td><td class="${x.streak?"bad":"ok"}">${x.streak} sem pagar</td><td class="${cls}">${esc(x.last||"sem green recente")}</td></tr>`};
  return `<table><tr><th>Status</th><th>Pagou no mercado aberto</th><th>Sequencia atual</th><th>Ultimo pagamento</th></tr>${row("ENTRAR")}${row("OBSERVAR")}</table>`;
}function scorePullText(stat){
  if(!stat)return "sem base";
  if(stat.source)return `base ${stat.source}${stat.band?` odd ${stat.band}`:""}: ${stat.topScores.join(" | ")}<br>Mercado pagou ${stat.marketP.toFixed(1)}%${stat.topOdds.length?` | Odds: ${stat.topOdds.join(" | ")}`:""}`;
  return `apos ${stat.score}: ${stat.topScores.join(" | ")}${stat.topOdds.length?`<br>Odds que mais pagaram: ${stat.topOdds.join(" | ")}`:""}`;
}function teamNames(name){return String(name||"").split(/\s+x\s+/i).map(x=>esc(x).toLowerCase()).filter(Boolean)}
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
  const target=Number(game.odd).toFixed(2);
  const rows=RESULTS_CACHE.filter(r=>m.patterns.some(re=>{
    re.lastIndex=0;
    let hit=false,mm;
    while((mm=re.exec(r.txt))){
      const odd=Number(String(mm[1]).replace(",","."));
      if(Number.isFinite(odd)&&odd.toFixed(2)===target)hit=true;
    }
    return hit;
  }));
  if(rows.length<3)return null;
  const g=rows.filter(r=>paysMarket(r.score,m)).length;
  return {g,j:rows.length,p:g/rows.length*100};
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
    fundo:r.alertaOk
  }));
  const reads=resultReads;
  const valid=reads.filter(r=>r.ready);
  const best=valid.sort((a,b)=>((a.p??99)-(a.min??0))-((b.p??99)-(b.min??0)))[0]||reads[0];
  const minHits=valid.filter(r=>r.fundo);
  const evs=valid.filter(r=>Number.isFinite(r.ev));
  const bestEv=evs.length?Math.max(...evs.map(r=>r.ev)):null;
  const team=teamPayPct(g,g.market);
  const odd=oddPayPct(g,g.market);
  const cycle=marketCycleStats(g.market);
  const band=oddBandStats(g,g.market);
  const hour=hourStatsForGame(g,g.market);
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
  if(cycle&&cycle.current==="RED"&&cycle.avgRed&&cycle.streak>=cycle.avgRed)score+=10;
  if(cycle&&cycle.current==="GREEN"&&cycle.avgGreen&&cycle.streak>=cycle.avgGreen*1.5)score-=5;
  if(band&&band.cold)score-=10;
  if(hour&&hour.tag==="HORARIO QUENTE")score+=8;
  if(hour&&hour.tag==="HORARIO FRIO")score-=6;
  if(best?.viradaFundo)score+=15;
  if(best?.abaixoEq)score+=5;
  if(best?.topo)score-=30;
  if(best?.caindoTopo)score-=15;
  if(minHits.some(r=>r.w>=480))score+=10;
  const strongBase=(team&&team.p>=50)||(odd&&odd.p>=50)||(!team&&!odd&&prob!==null);
  const coldOdd=(odd&&odd.j>=CONFIG.minOddSample&&odd.p<CONFIG.minOddPct)||(band&&band.cold);
  const valueOk=fairOdd!==null&&g.odd>=fairOdd;
  if(evGale!==null&&evGale>=CONFIG.minEV&&prob!==null&&prob>=CONFIG.minProb&&!coldOdd)score=Math.max(score,70);
  if(score<45&&prob!==null&&prob>=45&&!coldOdd)score=45;
  if(score<45&&evGale!==null&&evGale>-15&&!coldOdd)score=45;
  if(coldOdd)score=Math.min(score,44);
  if(best?.topo)score=Math.min(score,34);
  const status=score>=70?"ENTRAR":score>=45?"OBSERVAR":"PASSAR";
  const motivo=coldOdd?"ODD FRIA":status;
  const ia=adaptiveSignalForGame(g,{best,team,odd,cycle,band,hour,evGale,coldOdd});
  return {reads,best,bestEv,team,odd,cycle,band,hour,ia,prob,fairOdd,ev,evGale,score:Math.round(score),status,motivo,coldOdd,valueOk};
}
function analyze(){
  const games=readGridGames();
  const series=[];
  const signals=[];
  games.forEach(g=>{
    g.analysis=analysisForGame(g,series);
    registerPrediction(g);
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
    const msg=`${tipo} ${s.best.w} | ${s.game.market.name} @${s.game.odd} | ${s.game.time} ${s.game.name} | EV ${Number.isFinite(s.best.ev)?s.best.ev.toFixed(1):"-"}%`;
    if("Notification" in window&&Notification.permission==="granted")new Notification("BBTips sinal",{body:msg});
    else if("Notification" in window&&Notification.permission!=="denied")Notification.requestPermission();
  });
  localStorage.setItem(SEEN,JSON.stringify([...seen].slice(-100)));
}
function notifyFundo(series,games=[]){
  const liga=ligaNome(),m=market(),agora=new Date().toLocaleTimeString();
  const scope=`${liga}|${m.key}`;
  const rows=calcResultWindows(m);
  const futuros=games
    .map(g=>({...g,diff:minutesUntil(g.time)}))
    .filter(g=>Number.isFinite(g.diff)&&g.diff>=1&&g.diff<=10);
  if(!futuros.length){
    let state=storeGet(ALERT_STATE_STORE,"{}");
    state[`${scope}|SEM_FUTURO`]={at:new Date().toISOString()};
    storeSet(ALERT_STATE_STORE,state);
    return;
  }
  const futurosOrdenados=futuros.sort((a,b)=>a.diff-b.diff);
  const proximo=futurosOrdenados[0];
  let state=storeGet(ALERT_STATE_STORE,"{}");
  let log=storeGet(ALERT_LOG_STORE,"[]");
  if(scope!==LAST_ALERT_SCOPE){
    LAST_ALERT_SCOPE=scope;
    rows.forEach(f=>{
      if(!f.ready||f.j<f.w)return;
      const k=`${scope}|${f.w}`;
      state[k]={hit:!!f.alertaOk,p:f.p,armed:false,at:new Date().toISOString(),firstHitAt:f.alertaOk?new Date().toISOString():null};
    });
    storeSet(ALERT_STATE_STORE,state);
    return;
  }
  const fired=[];
  const now=Date.now();
  rows.forEach(f=>{
    if(!f.ready||f.j<f.w)return;
    const hit=!!f.alertaOk;
    const k=`${scope}|${f.w}`;
    const prev=state[k]||{hit:false,armed:true,p:null};
    if(!hit){state[k]={hit:false,p:f.p,armed:true,at:new Date().toISOString()};return;}
    const piorou=prev.hit&&Number.isFinite(f.p)&&Number.isFinite(prev.p)&&f.p<prev.p-CONFIG.tol;
    const firstHitAt=prev.firstHitAt||new Date().toISOString();
    const lastAlert=Date.parse(prev.alertAt||firstHitAt||0)||0;
    const lembrete=false;
    const shouldAlert=(prev.armed&&!prev.hit)||piorou||lembrete;
    state[k]={hit:true,p:f.p,armed:false,at:new Date().toISOString(),firstHitAt,alertAt:shouldAlert?new Date().toISOString():prev.alertAt};
    if(!shouldAlert)return;
    fired.push(f);
  });
  const iaFired=[];
  const iaPick=futurosOrdenados.map(g=>{
    const an=g.analysis||analysisForGame(g,series);
    return {g,an};
  }).filter(x=>{
    const ia=x.an.ia;
    if(!ia||!Number.isFinite(ia.score)||!Number.isFinite(ia.threshold))return false;
    if(x.an.best?.topo)return false;
    if(x.an.coldOdd&&ia.score<ia.threshold+8)return false;
    if(ia.gale&&Number.isFinite(ia.gale.p)&&ia.gale.p<38)return false;
    if(ia.gale&&Number.isFinite(ia.gale.avgDist)&&ia.gale.avgDist>3.5)return false;
    return ia.score>=ia.threshold&&ia.status==="IA ENTRAR";
  }).sort((a,b)=>b.an.ia.score-a.an.ia.score||a.g.diff-b.g.diff)[0];
  if(iaPick){
    const ik=`${scope}|IA|${iaPick.g.time}|${iaPick.g.name}`;
    const prev=state[ik]||{};
    const last=Date.parse(prev.alertAt||0)||0;
    if(now-last>=9*60*1000){
      state[ik]={alertAt:new Date().toISOString(),score:iaPick.an.ia.score,threshold:iaPick.an.ia.threshold};
      iaFired.push(iaPick);
    }
  }
  storeSet(ALERT_STATE_STORE,state);
  if(!fired.length&&!iaFired.length)return;
  if(Date.now()-LAST_ALERT_TS<90000)return;
  LAST_ALERT_TS=Date.now();
  beep();
  const mins=fired;
  const resumoMin=mins.map(f=>`${f.w}: ${f.g}/${f.j} ${f.p.toFixed(1)}% min ${Number.isFinite(f.min)?f.min.toFixed(1):"-"} eq ${Number.isFinite(f.media)?f.media.toFixed(1):"-"} ${f.zona}`).join(" | ");
  const resumoIa=iaFired.map(x=>`IA ${x.an.ia.score}/${x.an.ia.threshold} ${x.g.time} ${x.g.name} @${x.g.odd.toFixed(2)} ${x.an.ia.moment.regime}`).join(" | ");
  const tipo=mins.some(f=>f.viradaFundo)?"VIRADA DO FUNDO":mins.length?"BATEU FUNDO":"IA ADAPTATIVA";
  const alvo=iaFired[0]?.g||proximo;
  const alvoTxt=alvo?`Prox ${alvo.time} ${alvo.name} em ${alvo.diff}m`:"";
  const msg=`${liga} | ${m.name} | ${agora} | ${alvoTxt}${resumoMin?` | ${resumoMin}`:""}${resumoIa?` | ${resumoIa}`:""}`;
  log.push({quando:new Date().toISOString(),hora:agora,liga,mercado:m.name,proximo:alvo?{time:alvo.time,name:alvo.name,diff:alvo.diff,odd:alvo.odd}:null,janelas:mins.map(f=>({janela:f.w,atual:f.p,minima:f.min,equilibrio:f.media,maxima:f.max,zona:f.zona,g:f.g,j:f.j})),ia:iaFired.map(x=>({score:x.an.ia.score,threshold:x.an.ia.threshold,status:x.an.ia.status,motivos:x.an.ia.motivos,game:{time:x.g.time,name:x.g.name,odd:x.g.odd}})),tipo});
  const titulo=tipo==="IA ADAPTATIVA"?"BBTips: IA":"BBTips: minima";
  if("Notification" in window&&Notification.permission==="granted")new Notification(titulo,{body:msg});
  else if("Notification" in window&&Notification.permission!=="denied")Notification.requestPermission();
  storeSet(ALERT_LOG_STORE,log.slice(-50));
}
function gamesTable(games,series){
  if(!games.length)return "<p class='bad'>Nao achei proximos jogos com odd deste mercado. Clique API ou escolha um mercado que aparece nas odds dos proximos jogos.</p>";
  return `${adaptiveMarketSummary(market())}${marketRankingBox(market())}<table><tr><th>Horario</th><th>Jogo</th><th>Mercado</th><th>Odd</th><th>Status</th><th>Probabilidade</th><th>Times/Odd pagante</th><th>Linha 120/240/480/960</th></tr>${games.map(g=>{
    const an=g.analysis||analysisForGame(g,series);
    const reads=an.reads.map(r=>{
      const cls=(r.alertaOk)?"ok":r.topo||r.fundoSemConfirmacao?"bad":r.ready?"warn":"bad";
      const tag=r.viradaFundo?" VIRADA":r.estabilizouFundo?" FUNDO OK":r.fundoRespirando?" RESPIRANDO":r.reacaoAbaixoEq?" REACAO":r.fundoSemConfirmacao?" FUNDO SEM CONF":r.fundo30?" <30":r.topo?" TOPO":"";
      return `<span class="${cls}">${r.w}: ${r.ready?`${r.g}/${r.j} ${r.p.toFixed(1)}% min ${r.min.toFixed(1)} eq ${Number.isFinite(r.media)?r.media.toFixed(1):"-"} max ${Number.isFinite(r.max)?r.max.toFixed(1):"-"} ${r.zona}${tag} EV ${Number.isFinite(r.ev)?r.ev.toFixed(1):"-"}`:`parcial ${r.g}/${r.j} de ${r.w}`}</span>`;
    }).join("<br>");
    const cls=an.status==="ENTRAR"?"ok":an.status==="OBSERVAR"?"warn":"bad";
    const prob=an.prob===null?"-":`${an.prob.toFixed(1)}%`;
    const fair=an.fairOdd===null?"-":an.fairOdd.toFixed(2);
    const ev=an.ev===null?"-":`${an.ev.toFixed(1)}%`;
    const evG=an.evGale===null?"-":`${an.evGale.toFixed(1)}%`;
    const team=an.team?`${an.team.g}/${an.team.j} ${an.team.p.toFixed(1)}%`:"sem base";
    const odd=an.odd?`${an.odd.g}/${an.odd.j} ${an.odd.p.toFixed(1)}%${an.coldOdd?" ODD FRIA":""}`:"sem base";
    const ciclo=cycleText(an.cycle);
    const faixa=oddBandText(an.band);
    const horario=hourStatsText(an.hour);
    const liga=ligaStatsText(g.market);
    const ia=adaptiveText(an.ia);
    const scorePull=scorePullText(scoreModelForGame(g,g.market));
    return `<tr><td>${esc(g.time)}</td><td>${esc(g.name)}</td><td>${esc(g.market.name)}</td><td>${g.odd.toFixed(2)}</td><td class="${cls}">${esc(an.motivo)}<br>Score ${an.score}<br>${ia}</td><td>Prob real ${prob}<br>Odd justa ${fair}<br>EV ${ev}<br>EV gale ${evG}<br>${ciclo}<br>${faixa}<br>${horario}<br>${liga}</td><td>Times geral: ${team}<br>${teamDetailText(g,g.market)}<br>${gameRankText(g,g.market)}<br>Odd: ${odd}<br>Placar puxa: ${scorePull}</td><td>${reads}</td></tr>`;
  }).join("")}</table>`;
}
function signalsBox(signals){
  const fundos=globalFundos([]).filter(f=>f.ready&&f.j>=f.w);
  const cycle=marketCycleStats(market());
  const cicloHtml=cycle?`<div class="sig"><b class="${cycle.current==="RED"&&cycle.pressao>=70?"ok":"warn"}">CICLO ${esc(market().name)}</b> ${cycleText(cycle)}</div>`:"";
  const fundoHtml=fundos.length?fundos.map(f=>`<div class="sig"><b class="ok">BATEU MINIMA ${f.w}</b> ${esc(market().name)} | ${f.g}/${f.j} ${f.p.toFixed(1)}% | minima ${f.min.toFixed(1)}%</div>`).join(""):"";
  if(!signals.length&&!fundoHtml)return `${cicloHtml}<p class='warn'>Sem sinal agora. O som toca quando a linha calculada do mercado bater fundo/minima em 120, 240, 480 ou 960.</p>`;
  return signals.map(s=>{
    const tipo=s.tipo||"FUNDO";
    return `<div class="sig"><b class="ok">${tipo} ${s.best.w}</b> ${esc(s.game.market.name)} @${s.game.odd.toFixed(2)} | ${esc(s.game.time)} ${esc(s.game.name)} | atual ${Number.isFinite(s.best.cur)?s.best.cur.toFixed(1):"-"} min ${Number.isFinite(s.best.min)?s.best.min.toFixed(1):"-"} EV ${Number.isFinite(s.best.ev)?s.best.ev.toFixed(1):"-"}%</div>`;
  }).join("")+cicloHtml+fundoHtml;
}
function trendBox(series){
  const rows=calcResultWindows(market());
  return `<table><tr><th>Periodo</th><th>Porcentagem correta</th><th>Minima historica</th><th>Alerta sonoro</th></tr>${rows.map(r=>{
    const leitura=r.ready?`${r.g}/${r.j} ${r.p.toFixed(1)}%`:`parcial ${r.g}/${r.j} de ${r.w}`;
    const min=r.ready&&r.min!==null?`${r.min.toFixed(1)}%`:"aguardando base";
    const alerta=r.ready?(r.fundoMin?"BATEU MINIMA":"nao"):"sem alerta";
    const cls=r.fundoMin?"ok":r.ready?"warn":"bad";
    return `<tr><td>${r.w}</td><td>${leitura}</td><td>${min}</td><td class="${cls}">${alerta}</td></tr>`;
  }).join("")}</table>`;
}
function resultsCheckTable(){
  const rows=recentPaidResults();
  if(!rows.length)return "<p class='warn'>Ainda nao encontrei resultados passados visiveis para conferir este mercado. Role a grade para baixo/cima e clique Atualizar.</p>";
  return `<table><tr><th>Horario</th><th>Resultado</th><th>Mercado</th><th>Odd</th><th>Pagou?</th><th>Times/Odd pagante</th><th>Placar puxa depois</th><th>Prob/EV estimado</th></tr>${rows.map(r=>{
    const paid=r.paid?"GREEN":"RED";
    const cls=r.paid?"ok":"bad";
    const team=r.team?`${r.team.g}/${r.team.j} ${r.team.p.toFixed(1)}%`:"sem base";
    const odd=r.oddBase?`${r.oddBase.g}/${r.oddBase.j} ${r.oddBase.p.toFixed(1)}%`:"sem base";
    const prob=r.prob===null?"-":`${r.prob.toFixed(1)}%`;
    const ev=r.ev===null?"-":`${r.ev.toFixed(1)}%`;
    return `<tr><td>${esc(r.time||"-")}</td><td>${esc(r.name)}<br>${r.score.a}-${r.score.b}</td><td>${esc(market().name)}</td><td>${r.odd?r.odd.toFixed(2):"-"}</td><td class="${cls}">${paid}</td><td>Times: ${team}<br>Odd: ${odd}</td><td>${scorePullText(r.scorePull)}</td><td>Prob ${prob}<br>EV ${ev}</td></tr>`;
  }).join("")}</table>`;
}
function exportHistory(){
  const data={quando:new Date().toISOString(),casa:activeCasa(),liga:activeLiga(),mercado:market().name,ciclo:marketCycleStats(market()),api:API_ROWS,resultados:RESULTS_CACHE,historico:storeGet(HIST_STORE,"[]"),alertas:storeGet(ALERT_LOG_STORE,"[]"),previsoes:loadPreds(),placares:RESULTS_CACHE.filter(r=>r.score).map(r=>({time:r.time,name:r.name,score:r.score,puxa:scoreNextStats(r.score,market())}))};
  const txt=JSON.stringify(data,null,2);
  try{navigator.clipboard?.writeText(txt)}catch(e){}
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([txt],{type:"application/json"}));
  a.download=`bbtips-historico-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  return data;
}function draw(){
  const bodyOld=P.querySelector(".body");
  const oldScroll=bodyOld?bodyOld.scrollTop:0;
  const oldPageX=window.scrollX,oldPageY=window.scrollY;
  loadApiRows();
  refreshResultsCache();
  const a=analyze();
  notify(a.signals);
  notifyFundo(a.series,a.games);
  const fundos=[...globalFundos(a.series),...visualFundos(a.series)];
  const fundoTxt=fundos.length?` | FUNDO ${fundos.map(f=>`${f.w}:${f.p.toFixed(1)}%`).join(" ")}`:"";
  const ligaAtual=activeLiga();
  const opts=MARKETS.map(m=>`<option value="${m.key}" ${m.key===CONFIG.market?"selected":""}>${m.name}</option>`).join("");
  const rankOpts=[3,6,12].map(h=>`<option value="${h}" ${CONFIG.rankHoras===h?"selected":""}>${h}h</option>`).join("");
  P.innerHTML=`<div class="top"><b>BBTips Robo | ${new Date().toLocaleTimeString()} | Liga ${ligaAtual||"auto"} | Mercado ${esc(market().name)} | API ${API_ROWS.length} | Resultados ${RESULTS_CACHE.length} | Proximos ${a.games.length} | Sinais ${a.signals.length}${fundoTxt}</b>
  <span>Mercado <select id="rb-market">${opts}</select> Rank <select id="rb-rank">${rankOpts}</select> EV+ <input id="rb-ev" value="${CONFIG.minEV}"> Prob <input id="rb-prob" value="${CONFIG.minProb}"> OddFria% <input id="rb-cold" value="${CONFIG.minOddPct}"> Prox <input id="rb-maxprox" value="${CONFIG.maxProximos}"> Tol <input id="rb-tol" value="${CONFIG.tol}">
  <button id="rb-api">API</button><button id="rb-hist">Histï¿½rico</button><button id="rb-scan">Atualizar</button><button id="rb-som">Som</button><button id="rb-min">Minimizar</button><button id="rb-close">Fechar</button></span></div>
  <div class="body">
    <h3>Proximos jogos</h3>${gamesTable(a.games,a.series)}
    <h3>Sinais por minima calculada pelos resultados</h3>${signalsBox(a.signals)}
    <h3>Pagamento do mercado aberto</h3>${statusStatsBox()}
    <h3>Conferencia dos ultimos resultados</h3>${resultsCheckTable()}
    <h3>Linha calculada pelos resultados fechados</h3>${trendBox(a.series)}
  </div>`;
  document.getElementById("rb-market").onchange=e=>{CONFIG.market=e.target.value;draw()};
  document.getElementById("rb-rank").onchange=e=>{CONFIG.rankHoras=Number(e.target.value)||6;draw()};
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
window.BBTipsRobo={analyze,config:CONFIG,exportar:exportHistory,historico:()=>storeGet(HIST_STORE,"[]"),limparAlertas:()=>{delete window[ALERT_STATE_STORE];delete window[ALERT_LOG_STORE];localStorage.removeItem(ALERT_STATE_STORE);localStorage.removeItem(ALERT_LOG_STORE);sessionStorage.removeItem(ALERT_STATE_STORE);sessionStorage.removeItem(ALERT_LOG_STORE)}};
})();
