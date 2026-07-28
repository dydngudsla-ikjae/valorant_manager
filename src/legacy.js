import { autoAgentFor, buildCompChoice, buildCompForStance, draftComp, draftPair, mapSuitFor, matchupRead, stanceSuit } from './core/draft.js';
import { buyLabel, initEcon } from './core/economy.js';
import { counterEdge, playerOVR, teamAxis, teamOVR } from './core/ratings.js';
import { applyRealStats, buildAgentPools, visiblePool } from './core/roster.js';
import { agentMap, applyRoundStats, finalizeRatings, matchMVP, newStat, simOneMap, topKillerOfRound } from './core/round-engine.js';
import { firstUnplayedWeek, makeSchedule, nameById, pickMaps, simRestOfWeek, sortedStandings, teamObj } from './core/season.js';
import { MATCH, ST, bump, setMatch } from './core/state.js';
import { ARCH, MAPDATA, agIcon } from './data/agents.js';
import { MV } from './data/geo/ascent.js';
import { LEAGUES, MAPS, ROLE, displayRole, p, profBand, roleColor, roleFull } from './data/leagues.js';
import { mvBuild, mvPlayRound } from './ui/mapview.js';

export function buildSelect(){
  const tabs=document.getElementById('leagueTabs'); tabs.innerHTML='';
  Object.keys(LEAGUES).forEach((k,i)=>{
    const b=document.createElement('button'); b.className='tab'+(i===0?' on':'');
    b.textContent=LEAGUES[k].name; b.onclick=()=>{document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));b.classList.add('on');renderTeams(k);};
    tabs.appendChild(b);
  });
  renderTeams(Object.keys(LEAGUES)[0]);
}

export function renderTeams(lk){
  const pv=document.getElementById('selectPreview'); if(pv)pv.style.display='none';
  const g=document.getElementById('teamGrid'); g.innerHTML='';
  LEAGUES[lk].teams.forEach((t,idx)=>{
    const ovr=teamOVR(t);
    const c=document.createElement('button'); c.className='pick teamcard';
    c.innerHTML=`<div class="stripe" style="background:${t.color}"></div>
      <div class="ovr">${ovr}<span>OVR</span></div>
      <div class="tname">${t.name}</div>
      <div class="tregion">${LEAGUES[lk].name}</div>
      <div class="mini">
        ${['aim','sense','clutch','util','mental'].map(ax=>{
          const v=Math.round(teamAxis(t,ax));
          return `<div class="m" title="${ax}"><i style="width:${v}%;background:${ax==='aim'?'var(--val)':ax==='util'?'var(--ini)':'var(--def)'}"></i></div>`;
        }).join('')}
      </div>`;
    c.onclick=()=>previewTeam(lk,idx,c);
    g.appendChild(c);
  });
}

export function previewTeam(lk,idx,cardEl){
  document.querySelectorAll('#teamGrid .teamcard').forEach(x=>x.classList.remove('sel'));
  if(cardEl)cardEl.classList.add('sel');
  const t=LEAGUES[lk].teams[idx];
  document.getElementById('spRegion').textContent=LEAGUES[lk].name;
  document.getElementById('spName').textContent=t.name;
  document.getElementById('spOvr').textContent=teamOVR(t);
  document.getElementById('spConfirm').onclick=()=>selectTeam(lk,idx);
  const g=document.getElementById('spRoster'); g.innerHTML='';
  const axes=[['aim','Aim'],['sense','Sense'],['clutch','Clutch'],['util','Util'],['mental','Mental']];
  [...t.roster].sort((a,b)=>playerOVR(b)-playerOVR(a)).concat((t.bench||[]).map(b=>Object.assign({_sub:true},b))).forEach(pl=>{
    const disp=displayRole(pl), ovr=playerOVR(pl);
    const card=document.createElement('div'); card.className='pcard'+(pl._sub?' sub':'');
    const profStrip=['DUE','INI','SEN','CON'].map(rr=>{const b=profBand(pl.prof[rr]);
      return `<span class="profseg" title="${ROLE[rr].name} ${pl.prof[rr]}"><i>${rr}</i><em style="background:${b[2]}"></em></span>`;}).join('');
    card.innerHTML=`<div class="prow">
      <div class="rolechip" style="background:${roleColor(pl)}">${disp}</div>
      <div><div class="pn">${pl.name}${pl._sub?' <span class="subtag">SUB</span>':''}</div><div class="pmeta">${roleFull(pl)}</div></div>
      <div class="povr" style="color:${ovr>=90?'var(--gold)':'var(--text)'}">${ovr}</div>
    </div><div class="profrow">${profStrip}</div>`+
    axes.map(([k,lbl])=>{const v=pl[k]; const col=v>=90?'var(--gold)':v>=82?'var(--def)':'var(--ini)';
      return `<div class="stat"><label>${lbl}</label><div class="track"><i style="width:${v}%;background:${col}"></i></div><span class="v">${v}</span></div>`;}).join('')+
    `<div class="poolrow"><span class="poollbl">Agent pool</span>`+
      visiblePool(pl,4).map(x=>`<span class="ag r-${x.role||pl.role}">${agIcon(x.agent,'ag-sm')}${x.agent} <b>${x.mastery}</b></span>`).join('')+`</div>`;
    g.appendChild(card);
  });
  const pv=document.getElementById('selectPreview'); pv.style.display='block';
  pv.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ============ SEASON SETUP ============ */

export function selectTeam(lk,idx){
  ST.league=lk;
  ST.teams=LEAGUES[lk].teams.map((t,i)=>({...t, id:i}));
  ST.myTeamIdx=idx;
  ST.week=0; ST.seasonOver=false;
  ST.standings={};
  ST.teams.forEach(t=>ST.standings[t.id]={w:0,l:0,mapW:0,mapL:0,rd:0});
  ST.schedule=makeSchedule(ST.teams.length);
  // badge
  const bt=ST.teams[idx];
  document.getElementById('teamBadge').style.display='flex';
  document.getElementById('badgeName').textContent=bt.name;
  document.getElementById('badgeDot').style.background=bt.color;
  bump(); // Squad/PlayerDetail (React) read ST.teams/myTeamIdx via useStore()
  renderHub(); go('scHub');
}

/* round-robin (single). circle method */

export function renderHub(){
  const L=LEAGUES[ST.league];
  document.getElementById('hubLeague').textContent=L.name+' · Regular Season';
  document.getElementById('standRegion').textContent=L.name;
  document.getElementById('squadRegion').textContent=L.name+' · My Club';
  const my=ST.teams[ST.myTeamIdx];
  document.getElementById('squadTitle').textContent=my.name;
  renderStandings(); renderSchedule();
  const pb=document.getElementById('playBtn');
  if(ST.seasonOver){pb.textContent='Season Done'; pb.disabled=true;
    document.getElementById('hubTitle').textContent='Season Complete';
  } else {pb.disabled=false; pb.textContent='Play Next';}
}

export function renderStandings(){
  const t=document.getElementById('standTable');
  const rows=sortedStandings();
  t.innerHTML=`<thead><tr><th class="rank">#</th><th>Team</th><th>W-L</th>
    <th class="hide">Maps</th><th class="hide">RD</th><th>OVR</th></tr></thead><tbody>`+
    rows.map((tm,i)=>{
      const s=ST.standings[tm.id]; const mine=tm.id===ST.teams[ST.myTeamIdx].id;
      const q=i<8?`<span class="qbadge">PO</span>`:'';
      return `<tr class="${mine?'me':''}"><td class="rank">${i+1}</td>
        <td class="tn"><span class="dot" style="display:inline-block;background:${tm.color};margin-right:8px;vertical-align:middle"></span>${tm.name}${q}</td>
        <td class="wl"><b>${s.w}</b>-${s.l}</td>
        <td class="hide mono">${s.mapW}-${s.mapL}</td>
        <td class="hide mono">${s.rd>0?'+':''}${s.rd}</td>
        <td class="mono" style="color:var(--gold)">${teamOVR(tm)}</td></tr>`;
    }).join('')+`</tbody>`;
}

export function renderSchedule(){
  const box=document.getElementById('schedList'); box.innerHTML='';
  const myId=ST.teams[ST.myTeamIdx].id;
  const myFix=[];
  ST.schedule.forEach((wk,wi)=>wk.forEach(f=>{if(f.home===myId||f.away===myId)myFix.push({...f,wi});}));
  document.getElementById('fixMeta').textContent=`${myFix.filter(f=>f.played).length}/${myFix.length}`;
  const nextWi=firstUnplayedWeek();
  myFix.forEach(f=>{
    const opp=f.home===myId?f.away:f.home;
    const isNext=!f.played && f.wi===nextWi;
    let resHtml='';
    if(f.played){const r=f.res; const won=(f.home===myId&&r.hMaps>r.aMaps)||(f.away===myId&&r.aMaps>r.hMaps);
      const my=f.home===myId?r.hMaps:r.aMaps, th=f.home===myId?r.aMaps:r.hMaps;
      resHtml=`<span class="res ${won?'w':'l'}">${my}-${th}</span>`;}
    const div=document.createElement('div');
    div.className='fxrow'+(f.played?' done':'')+(isNext?' next':'');
    div.innerHTML=`<span class="wk">W${f.wi+1}</span>
      <span class="teams">vs <b>${nameById(opp)}</b></span>${resHtml||(isNext?'<span class="res" style="color:var(--val)">NEXT</span>':'')}`;
    box.appendChild(div);
  });
}

// Squad grid (#squadGrid) and player detail (#playerRoot) are React now --
// see src/ui/screens/Squad.jsx and PlayerDetail.jsx.

/* ============ MATCH ENGINE ============
   Bo3. Each map: rounds to 13, win-by-2 OT.
   Round win prob from team "round power" (attack/def context + form). */

export function startNextMatch(){
  const wi=firstUnplayedWeek(); if(wi<0)return;
  const myId=ST.teams[ST.myTeamIdx].id;
  const fx=ST.schedule[wi].find(f=>!f.played&&(f.home===myId||f.away===myId));
  if(!fx){ // my match this week already played -> sim rest, advance
    simRestOfWeek(wi); renderHub(); toast('Week advanced.'); return;
  }
  openMatch(fx,wi);
}

export const DEV_ASCENT_BO1=true;

export function openMatch(fx,wi){
  const home=teamObj(fx.home), away=teamObj(fx.away);
  const myId=ST.teams[ST.myTeamIdx].id;
  setMatch({fx,wi,home,away,hMaps:0,aMaps:0,mapResults:[],
    mapPool:pickMaps(3), curMap:0, box:{}, running:false, comps:[],
    mapsToWin:2, roundsPlayed:0,
    playerSide: fx.home===myId?'home':'away'});
  if(DEV_ASCENT_BO1){ MATCH.mapPool=['Ascent']; MATCH.mapsToWin=1; }
  // init box stats
  [...home.roster,...away.roster].forEach(pl=>MATCH.box[pl.name]=newStat());
  // paint match head (used after draft)
  document.getElementById('mVenue').textContent=`${LEAGUES[ST.league].name} · Week ${wi+1} · ${DEV_ASCENT_BO1?'Ascent (Bo1)':'Best of 3'}`;
  document.getElementById('homeName').textContent=home.name;
  document.getElementById('awayName').textContent=away.name;
  const hc=document.getElementById('homeCrest'), ac=document.getElementById('awayCrest');
  hc.textContent=home.short; hc.style.background=home.color; hc.style.fontSize='13px';
  ac.textContent=away.short; ac.style.background=away.color; ac.style.fontSize='13px';
  document.getElementById('homeMaps').textContent='0';
  document.getElementById('awayMaps').textContent='0';
  document.getElementById('rHomeName').textContent=home.short;
  document.getElementById('rAwayName').textContent=away.short;
  document.getElementById('boxWrap').style.display='none';
  document.getElementById('feed').innerHTML='';
  if(DEV_ASCENT_BO1){ startMapDraft(0); return; } // straight to agent draft on Ascent
  startVeto();
}

/* ============ MAP VETO (coach bans/picks) ============ */

export function startVeto(){
  const order = MATCH.playerSide==='home'
    ? [['home','ban'],['away','ban'],['home','pick'],['away','pick'],['home','ban'],['away','ban']]
    : [['away','ban'],['home','ban'],['away','pick'],['home','pick'],['away','ban'],['home','ban']];
  MATCH.veto={remaining:[...MAPS], picks:[], acts:[], order, step:0};
  go('scVeto');
  document.getElementById('vVenue').textContent=`${MATCH.home.short} vs ${MATCH.away.short} · Week ${MATCH.wi+1} · Map Veto`;
  document.getElementById('vetoBtns').innerHTML=`<button class="btn ghost" onclick="vetoSkip()">Auto-veto &amp; skip match</button>`;
  renderVeto(); stepVeto();
}

export function stepVeto(){
  const v=MATCH.veto;
  if(v.step>=v.order.length){ finalizeVeto(); return; }
  const [side]=v.order[v.step];
  if(side===MATCH.playerSide){ renderVeto(); }        // wait for player click
  else { setTimeout(()=>{ aiVetoAct(); }, 550); renderVeto(); }
}

export function aiVetoAct(){
  const v=MATCH.veto; const [side,act]=v.order[v.step];
  const myTeam=ST.teams[ST.myTeamIdx];
  const aiTeam = MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  let map;
  if(act==='ban'){ // deny the player's most comfortable remaining map
    map=[...v.remaining].sort((x,y)=>mapSuitFor(myTeam,y)-mapSuitFor(myTeam,x))[0];
  } else { // pick the map that suits the AI best
    map=[...v.remaining].sort((x,y)=>mapSuitFor(aiTeam,y)-mapSuitFor(aiTeam,x))[0];
  }
  applyVeto(side,act,map);
}

export function playerVeto(map){
  const v=MATCH.veto; if(v.step>=v.order.length)return;
  const [side,act]=v.order[v.step];
  if(side!==MATCH.playerSide) return;               // not your turn
  if(!v.remaining.includes(map)) return;
  applyVeto(side,act,map);
}

export function applyVeto(side,act,map){
  const v=MATCH.veto;
  v.remaining=v.remaining.filter(m=>m!==map);
  v.acts.push({side,act,map});
  if(act==='pick') v.picks.push({side,map});
  v.step++;
  renderVeto(); stepVeto();
}

export function finalizeVeto(){
  const v=MATCH.veto;
  const decider=v.remaining[0];
  v.acts.push({side:'decider',act:'decider',map:decider});
  MATCH.mapPool=[v.picks[0].map, v.picks[1].map, decider];
  renderVeto(true);
  document.getElementById('vetoBtns').innerHTML=
    `<button class="btn" onclick="startMapDraft(0)">To the draft →</button>`;
}

export function renderVeto(done){
  const v=MATCH.veto;
  const myTeam=ST.teams[ST.myTeamIdx];
  let prompt;
  if(done){ prompt='Veto complete — 3 maps set'; }
  else if(v.step<v.order.length){
    const [side,act]=v.order[v.step];
    const mine=side===MATCH.playerSide;
    const who=mine?'Your':(side==='home'?MATCH.home.short:MATCH.away.short)+"'s";
    prompt=`${who} turn — ${act.toUpperCase()} a map`;
  }
  document.getElementById('vPrompt').textContent=prompt;
  const actedBy={}; v.acts.forEach(a=>actedBy[a.map]=a);
  const canClick = !done && v.step<v.order.length && v.order[v.step][0]===MATCH.playerSide;
  const grid=document.getElementById('vetoGrid'); grid.innerHTML='';
  MAPS.forEach(map=>{
    const a=actedBy[map];
    const fav=ARCH[MAPDATA[map].favor].name;
    const suit=mapSuitFor(myTeam,map);
    const tile=document.createElement(canClick&&!a?'button':'div');
    tile.className='vtile'+(a?(' '+a.act):'')+(canClick&&!a?' live':'');
    let tag = a ? (a.act==='pick'?`PICK · ${a.side===MATCH.playerSide?'you':(a.side==='home'?MATCH.home.short:MATCH.away.short)}`
                 : a.act==='ban'?`BAN · ${a.side==='decider'?'':a.side===MATCH.playerSide?'you':(a.side==='home'?MATCH.home.short:MATCH.away.short)}`
                 : 'DECIDER') : `favors ${fav}`;
    tile.innerHTML=`<div class="vmap">${map}</div><div class="vtag">${tag}</div>
      ${!a?`<div class="vsuit">roster fit ${suit>=2?'★★':suit>=1?'★':'·'}</div>`:''}`;
    if(canClick&&!a) tile.onclick=()=>playerVeto(map);
    grid.appendChild(tile);
  });
  // result order strip
  const rs=document.getElementById('vetoResult');
  if(v.picks.length||done){
    const order=[...v.picks.map((p,i)=>({label:`Map ${i+1}`,map:p.map})),
      ...(done?[{label:'Decider',map:MATCH.mapPool[2]}]:[])];
    rs.innerHTML=order.map(o=>`<span class="vres"><b>${o.label}</b> ${o.map}</span>`).join('');
  } else rs.innerHTML='';
}

export function vetoSkip(){ MATCH.mapPool=pickMaps(3); skipMatch(); }
// player drafts this map: opponent commits first (map-optimal), player gets last-pick info

export function startMapDraft(mi){
  MATCH.curMap=mi;
  MATCH.draftSel={stance:null, choice:{}};
  const oppTeam = MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  MATCH.pendingOpp = draftComp(oppTeam, MATCH.mapPool[mi], null);
  renderDraftScreen(mi);
  go('scDraft');
}

export function renderDraftScreen(mi){
  const map=MATCH.mapPool[mi];
  const me=ST.teams[ST.myTeamIdx];
  const oppTeam=MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  const opp=MATCH.pendingOpp;
  const sel=MATCH.draftSel;
  document.getElementById('dVenue').textContent=`${MATCH.home.short} vs ${MATCH.away.short} · Week ${MATCH.wi+1} · Draft`;
  document.getElementById('dMapNo').textContent=`Map ${mi+1}`;
  document.getElementById('dMapName').textContent=`${map} — favors ${ARCH[MAPDATA[map].favor].name} · ${MATCH.hMaps}-${MATCH.aMaps} maps`;
  const hc=document.getElementById('dHomeCrest'),ac=document.getElementById('dAwayCrest');
  hc.textContent=MATCH.home.short;hc.style.background=MATCH.home.color;hc.style.fontSize='13px';
  ac.textContent=MATCH.away.short;ac.style.background=MATCH.away.color;ac.style.fontSize='13px';
  document.getElementById('dHomeName').textContent=MATCH.home.name;
  document.getElementById('dAwayName').textContent=MATCH.away.name;
  // opponent read
  document.getElementById('oppRead').innerHTML=
    `<div class="olbl">${oppTeam.short} locked in</div>
     <div class="ostance">${ARCH[opp.stance].name}</div>
     <div class="oags">${opp.agents.map(a=>`<span class="ag r-${a.role}${a.favored?' fav':''}">${a.agent}</span>`).join('')}</div>`;
  // stance options with live preview vs opponent
  const grid=document.getElementById('stanceGrid'); grid.innerHTML='';
  const previews=['AGGRO','CONTROL','LOCKDOWN','BALANCED'].map(s=>{
    const comp=buildCompForStance(me,map,s);
    const edge=counterEdge(s,opp.stance);
    return {s,comp,edge,projected:+(comp.delta - opp.delta + edge).toFixed(1)};
  });
  const bestProj=Math.max(...previews.map(p=>p.projected));
  previews.forEach(({s,comp,edge,projected})=>{
    const rec=projected===bestProj, chosen=sel.stance===s;
    const suit=stanceSuit(me,s);
    const verdict = edge>0?['good',`Counters ${ARCH[opp.stance].name} +${edge}`]
                  : edge<0?['bad',`Countered ${edge}`]
                  : ['even',`Even read`];
    const card=document.createElement('button'); card.className='stanceopt'+(rec?' rec':'')+(chosen?' chosen':'');
    card.innerHTML=`${rec?'<span class="recflag">Analyst pick</span>':''}
      <div class="sname">${ARCH[s].name}</div>
      <div class="sblurb">${ARCH[s].blurb}</div>
      <div class="verdict ${verdict[0]}">${verdict[1]}</div>
      <div class="fitrow"><span>Fit <b>${suit>=2?'high':suit>=1?'ok':'low'}</b></span>
        <span>Map <b>${MAPDATA[map].favor===s?'favored':'neutral'}</b></span></div>
      <div class="pw ${projected>=0?'pos':'neg'}">${projected>=0?'+':''}${projected}</div>`;
    card.onclick=()=>selectStance(mi,s);
    grid.appendChild(card);
  });
  // comp editor (agent per player) — visible once a stance is chosen
  const lbl=document.getElementById('compEditLbl'), ce=document.getElementById('compEdit');
  if(!sel.stance){ lbl.style.display='none'; ce.innerHTML=''; document.getElementById('draftBtns').innerHTML=
    `<button class="btn" disabled>Pick a game plan first</button>
     <button class="btn ghost" style="width:auto" onclick="skipMatch()">Skip match</button>`; return; }
  lbl.style.display='block';
  const fav=MAPDATA[map].agents;
  ce.innerHTML=me.roster.map(pl=>{
    const chosenAg=sel.choice[pl.name]||autoAgentFor(pl,map);
    return `<div class="pcomp"><div class="pcname"><span class="rolechip sm" style="background:${ROLE[pl.role].c}">${pl.role}</span>${pl.name}</div>
      <div class="agpick">${pl.pool.map(x=>`<button class="agopt r-${pl.role}${x.agent===chosenAg?' on':''}${fav.includes(x.agent)?' fav':''}" onclick="selectAgent(${mi},'${pl.name.replace(/'/g,"\\'")}','${x.agent}')">${x.agent}<b>${x.mastery}</b></button>`).join('')}</div></div>`;
  }).join('');
  // live comp summary + lock
  const choice={}; me.roster.forEach(pl=>choice[pl.name]=sel.choice[pl.name]||autoAgentFor(pl,map));
  const myComp=buildCompChoice(me,map,sel.stance,choice);
  const edge=counterEdge(sel.stance,opp.stance);
  const proj=+(myComp.delta-opp.delta+edge).toFixed(1);
  document.getElementById('draftBtns').innerHTML=
    `<button class="btn" onclick="confirmDraft(${mi})">Lock comp &amp; play · <span style="opacity:.85">avg mastery ${myComp.avgMastery} · map agents ${myComp.favCount}/5 · proj ${proj>=0?'+':''}${proj}</span></button>
     <button class="btn ghost" style="width:auto" onclick="skipMatch()">Skip</button>`;
}

export function selectStance(mi,s){ MATCH.draftSel.stance=s; renderDraftScreen(mi); }

export function selectAgent(mi,name,agent){ MATCH.draftSel.choice[name]=agent; renderDraftScreen(mi); }

export function confirmDraft(mi){
  const me=ST.teams[ST.myTeamIdx]; const map=MATCH.mapPool[mi];
  const choice={}; me.roster.forEach(pl=>choice[pl.name]=MATCH.draftSel.choice[pl.name]||autoAgentFor(pl,map));
  const myComp=buildCompChoice(me,map,MATCH.draftSel.stance,choice);
  const opp=MATCH.pendingOpp;
  if(MATCH.playerSide==='home'){
    MATCH.comps[mi]={home:myComp, away:opp, edge:counterEdge(myComp.stance,opp.stance), mapName:map};
  } else {
    MATCH.comps[mi]={home:opp, away:myComp, edge:counterEdge(opp.stance,myComp.stance), mapName:map};
  }
  renderMapChips();
  go('scMatch');
  renderMatchButtons('start');
  paintMap(0,0);
}

export function renderMapChips(){
  const box=document.getElementById('mapChips'); box.innerHTML='';
  MATCH.mapPool.forEach((m,i)=>{
    let cls='mapchip';
    if(MATCH.mapResults[i]){cls+= MATCH.mapResults[i].hWon?' w':' l';}
    else if(i===MATCH.curMap && MATCH.running) cls+=' live';
    const c=document.createElement('span'); c.className=cls;
    c.textContent=m+(MATCH.mapResults[i]?` ${MATCH.mapResults[i].h}-${MATCH.mapResults[i].a}`:'');
    box.appendChild(c);
  });
}

export function paintMap(h,a){
  if(!MATCH.comps) MATCH.comps=[];
  // player-drafted maps already have comps set by lockDraft; only auto-draft as a safety net
  if(!MATCH.comps[MATCH.curMap]) MATCH.comps[MATCH.curMap]=draftPair(MATCH.home,MATCH.away,MATCH.mapPool[MATCH.curMap]);
  document.getElementById('curMapName').textContent=MATCH.mapPool[MATCH.curMap]||'—';
  renderDraft();
  buildPips(h,a);
  document.getElementById('rRoundNo').textContent=`Round ${h+a}`;
}

export function renderDraft(){
  const cc=MATCH.comps[MATCH.curMap]; const p=document.getElementById('draftPanel'); if(!cc||!p)return;
  const chips=comp=>comp.agents.map(a=>`<span class="ag r-${a.role}${a.favored?' fav':''}" title="${a.name} · mastery ${a.mastery}${a.favored?' · map pick':''}">${a.agent}</span>`).join('');
  const favor=MAPDATA[cc.mapName]?ARCH[MAPDATA[cc.mapName].favor].name:'';
  p.innerHTML=`
    <div class="drafthd"><span>Draft</span><span class="mapfav">${cc.mapName} favors ${favor}</span></div>
    <div class="draftrow">
      <div class="dside">
        <div class="dstance h">${ARCH[cc.home.stance].name}<em>${ARCH[cc.home.stance].blurb}</em></div>
        <div class="agrow">${chips(cc.home)}</div>
      </div>
      <div class="dsplit">${cc.edge>0?'◀':cc.edge<0?'▶':'='}</div>
      <div class="dside right">
        <div class="dstance a">${ARCH[cc.away.stance].name}<em>${ARCH[cc.away.stance].blurb}</em></div>
        <div class="agrow">${chips(cc.away)}</div>
      </div>
    </div>
    <div class="dread ${cc.edge>0?'h':cc.edge<0?'a':''}">${matchupRead(cc,MATCH.home.short,MATCH.away.short)}${cc.edge!==0?` · +${Math.abs(cc.edge)} round power`:''}</div>`;
}
/* ============ PHASE 3 — ROUND ENGINE (sides · economy · duels) ============
   simOneMap computes the full round-by-round log; the three entry points
   (animated / skip / background) all replay or apply the same result. */

export function buildPips(h,a){
  const hp=document.getElementById('pipsHome'), ap=document.getElementById('pipsAway');
  hp.innerHTML=''; ap.innerHTML='';
  const need=Math.max(13,h,a);
  for(let i=0;i<need;i++){const d=document.createElement('div');d.className='pip'+(i<h?' home':'');hp.appendChild(d);}
  for(let i=0;i<need;i++){const d=document.createElement('div');d.className='pip'+(i<a?' away':'');ap.appendChild(d);}
}

/* ============ TOP-DOWN MAP VIEW ============ */

export function simCurrentMap(speed){
  if(MATCH.running)return;
  speed=speed||'normal';
  MATCH.running=true; renderMatchButtons('running'); renderMapChips();
  const home=MATCH.home, away=MATCH.away, cc=MATCH.comps[MATCH.curMap];
  if(MATCH.playerSide) MATCH.homeStartAtk = MATCH.playerSide==='home'; else MATCH.homeStartAtk=true;
  const result=simOneMap(home,away,cc,MATCH.homeStartAtk);
  MATCH.curResult=result;
  const feed=document.getElementById('feed'); feed.innerHTML='';
  document.getElementById('mapView').style.display='block';
  mvBuild(home,away,agentMap(cc));
  initEcon(); MATCH.curEconHist=[];
  paintMap(0,0);
  let idx=0;
  const step=()=>{
    if(idx>=result.rounds.length){ document.getElementById('mvBanner').innerHTML=''; finishMap(result.h,result.a); return; }
    const rd=result.rounds[idx]; idx++;
    if(rd.n===13) initEcon(); // side switch — economy resets at half
    // economy snapshot (pre-buy team credits) for the post-map graph
    if(MV.econ){ MATCH.curEconHist=MATCH.curEconHist||[];
      MATCH.curEconHist.push({n:rd.n, h:MV.econ.home.reduce((s,x)=>s+x,0), a:MV.econ.away.reduce((s,x)=>s+x,0)}); }
    // broadcast center: pre-round score + round number
    const preH=idx>1?result.rounds[idx-2].h:0, preA=idx>1?result.rounds[idx-2].a:0;
    const bsh=document.getElementById('bScoreH'), bsa=document.getElementById('bScoreA'), brd=document.getElementById('bRound');
    if(bsh)bsh.textContent=preH; if(bsa)bsa.textContent=preA; if(brd)brd.textContent='Round '+rd.n;
    // banner: side switch / overtime / normal
    const atkTeam = rd.hSide==='atk'?home:away;
    const bnEl=document.getElementById('mvBanner');
    if(rd.n===13) bnEl.innerHTML=`<span class="switchbanner">⇄ SIDE SWITCH · second half</span>`;
    else if(rd.n>24) bnEl.innerHTML=`<span class="switchbanner">OVERTIME · Round ${rd.n}</span> · <b>${atkTeam.short}</b> attack <b>${rd.site}</b>`;
    else bnEl.innerHTML=`Round ${rd.n} · <b class="atk">${atkTeam.short}</b> <span class="atk">attack</span> hitting <b>${rd.site}</b>${rd.isPistol?' · pistol':''}`;
    mvPlayRound(rd, speed, ()=>{
      applyRoundStats(MATCH.box, rd);
      const winTeam=rd.winner==='home'?home:away;
      const winSide=rd.winner==='home'?rd.hSide:rd.aSide;
      const loserBuyLbl=buyLabel(rd.winner==='home'?rd.buyA:rd.buyH);
      const tk=topKillerOfRound(rd);
      const sideTag=winSide==='atk'?'ATK':'DEF';
      const tags=[];
      if(rd.ability) tags.push(`<span class="abtag${rd.ability.ult?' ult':''}">${rd.ability.name}</span>`);
      if(rd.clutch) tags.push(`<span class="cltag">${rd.clutch.player} 1v${rd.clutch.vs}</span>`);
      if(rd.defuse) tags.push(`<span class="evtag">defuse</span>`); else if(rd.plant) tags.push(`<span class="evtag">plant</span>`);
      const ln=document.createElement('div'); ln.className='ln '+rd.winner;
      ln.innerHTML=`<span style="color:var(--muted)">R${rd.n}</span> <span class="sidetag ${winSide}">${sideTag}</span> `+
        `<span class="k">${winTeam.short}</span>`+
        `${rd.isPistol?' <span style="color:var(--muted)">pistol</span>':` <span style="color:var(--muted)">vs ${loserBuyLbl}</span>`}`+
        ` <span style="color:var(--muted)">· FB ${rd.fb.killer}</span>`+
        `${tk?` · ${tk.name} ${tk.k}k`:''} ${tags.join(' ')}`+
        `<span style="float:right;color:var(--text)">${rd.h} - ${rd.a}</span>`;
      feed.prepend(ln);
      while(feed.children.length>7)feed.removeChild(feed.lastChild);
      buildPips(rd.h,rd.a);
      if(bsh)bsh.textContent=rd.h; if(bsa)bsa.textContent=rd.a;
      // economy: carry remaining + income (win 3000 / loss 1900) + 200/kill + plant bonus
      if(MV.econ&&MV.remaining){
        const atkS=rd.hSide==='atk'?'home':'away';
        const killsBy={home:{},away:{}};
        rd.kills.forEach(k=>{const nk=MV.nameIdx[k.killer]; if(nk)killsBy[nk.side][nk.i]=(killsBy[nk.side][nk.i]||0)+1;});
        ['home','away'].forEach(sd=>{
          const won = (sd==='home')===(rd.winner==='home');
          (sd==='home'?MATCH.home:MATCH.away).roster.forEach((pl,i)=>{
            let add=won?3000:1900;
            if(rd.plant && sd===atkS && !won) add+=600; // planted but lost
            add+=(killsBy[sd][i]||0)*200;
            MV.econ[sd][i]=Math.min(9000,(MV.remaining[sd][i]||0)+add);
          });
        });
      }
      const sel=rd.winner==='home'?document.querySelectorAll('#pipsHome .pip.home'):document.querySelectorAll('#pipsAway .pip.away');
      if(sel.length){const lp=sel[sel.length-1];lp.classList.add('pop');setTimeout(()=>lp.classList.remove('pop'),120);}
      document.getElementById('rRoundNo').textContent=`Round ${rd.h+rd.a}`;
      step();
    });
  };
  setTimeout(step, 220);
}

export function finishMap(h,a){
  const hWon=h>a;
  MATCH.mapResults[MATCH.curMap]={h,a,hWon,rounds:(MATCH.curResult?MATCH.curResult.rounds:[]),mapName:MATCH.mapPool[MATCH.curMap],econ:(MATCH.curEconHist||[]).slice()};
  MATCH.roundsPlayed=(MATCH.roundsPlayed||0)+(h+a);
  if(hWon)MATCH.hMaps++; else MATCH.aMaps++;
  document.getElementById('homeMaps').textContent=MATCH.hMaps;
  document.getElementById('awayMaps').textContent=MATCH.aMaps;
  document.getElementById('homeMaps').className='s '+(MATCH.hMaps>MATCH.aMaps?'win':'lose');
  document.getElementById('awayMaps').className='s '+(MATCH.aMaps>MATCH.hMaps?'win':'lose');
  MATCH.running=false; renderMapChips();
  const done=MATCH.hMaps===MATCH.mapsToWin||MATCH.aMaps===MATCH.mapsToWin;
  if(done){ endMatch(); }
  else {
    toast(`Map ${MATCH.curMap+1}: ${MATCH.home.short} ${h}-${a} ${MATCH.away.short}`);
    startMapDraft(MATCH.curMap+1); // player drafts the next map
  }
}


export function endMatch(){
  finalizeRatings(MATCH.box, MATCH.roundsPlayed||1);
  // record result into season
  const fx=MATCH.fx; const r={hMaps:MATCH.hMaps,aMaps:MATCH.aMaps};
  fx.played=true; fx.res=r;
  const H=ST.standings[fx.home], A=ST.standings[fx.away];
  H.mapW+=MATCH.hMaps; H.mapL+=MATCH.aMaps; A.mapW+=MATCH.aMaps; A.mapL+=MATCH.hMaps;
  let rd=0; MATCH.mapResults.forEach(m=>{if(m)rd+=(m.h-m.a);}); H.rd+=rd; A.rd-=rd;
  if(MATCH.hMaps>MATCH.aMaps){H.w++;A.l++;}else{A.w++;H.l++;}
  // sim the rest of this week's other matches
  simRestOfWeek(MATCH.wi, fx);
  showBox();
  renderTimeline();
  renderMatchButtons('end');
}

export let boxSide='home';

export function showBox(){
  document.getElementById('boxWrap').style.display='block';
  const tb=document.getElementById('boxTabs');
  tb.innerHTML=`<button class="${boxSide==='home'?'on':''}" onclick="setBoxSide('home')">${MATCH.home.short}</button>
    <button class="${boxSide==='away'?'on':''}" onclick="setBoxSide('away')">${MATCH.away.short}</button>`;
  renderBox();
}

export function renderBox(){
  document.getElementById('boxTabs').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('on',(i===0)===(boxSide==='home')));
  const team=boxSide==='home'?MATCH.home:MATCH.away;
  const agBy = MATCH.comps[0]? agentMap(MATCH.comps[0]) : {};
  const rows=team.roster.map(pl=>({pl,b:MATCH.box[pl.name]})).sort((x,y)=>y.b.rating-x.b.rating);
  const mvpName=matchMVP();
  const t=document.getElementById('boxTable');
  t.innerHTML=`<thead><tr><th>Player</th><th title="Impact rating">RAT</th><th>ACS</th><th>K</th><th>D</th><th>A</th>
    <th title="First bloods" class="hide">FB</th><th title="First deaths" class="hide">FD</th><th title="Clutches">CL</th><th title="Utility plays" class="hide">UT</th></tr></thead><tbody>`+
    rows.map(({pl,b})=>{
      const ag=agBy[pl.name]||'';
      const ratCls=b.rating>=1.15?'pos':b.rating<0.85?'neg':'';
      return `<tr><td class="pl">${pl.name==mvpName?'<span class="mvpstar">★</span> ':''}${pl.name}<span class="agtag"> ${ag}</span></td>
      <td class="rat ${ratCls}">${b.rating.toFixed(2)}</td>
      <td class="acs">${b.acsFinal}</td><td>${b.k}</td><td>${b.d}</td><td>${b.a}</td>
      <td class="hide">${b.fb}</td><td class="hide">${b.fd}</td><td>${b.cl||0}</td><td class="hide">${b.util||0}</td></tr>`;
    }).join('')+`</tbody>`;
}

export function renderTimeline(){
  const wrap=document.getElementById('timelineWrap'); if(!wrap)return;
  wrap.style.display='block';
  const mvp=matchMVP(); const mvpStat=MATCH.box[mvp];
  let html=`<div class="tlmvp"><span class="mvplbl">Player of the match</span>
    <span class="mvpname">★ ${mvp}</span>
    <span class="mvpline">${mvpStat.rating.toFixed(2)} rating · ${mvpStat.k}/${mvpStat.d}/${mvpStat.a} · ${mvpStat.fb} FB${mvpStat.cl?` · ${mvpStat.cl} clutch`:''}</span></div>`;
  MATCH.mapResults.forEach((mr,mi)=>{
    if(!mr||!mr.rounds)return;
    html+=`<div class="tlmap"><div class="tlmaphd">${mr.mapName} <b>${mr.h}-${mr.a}</b></div><div class="tlrow">`;
    mr.rounds.forEach(rd=>{
      const winCls=rd.winner;
      const icons=(rd.defuse?'◈':rd.plant?'✸':'')+(rd.clutch?'★':'');
      const title=`R${rd.n} ${(rd.winner==='home'?rd.hSide:rd.aSide).toUpperCase()} ${rd.winner==='home'?MATCH.home.short:MATCH.away.short} win`+
        ` · FB ${rd.fb.killer}`+(rd.ability?` · ${rd.ability.name}`:'')+(rd.plant?(rd.defuse?' · defused':' · planted'):'')+(rd.clutch?` · ${rd.clutch.player} 1v${rd.clutch.vs}`:'');
      html+=`<span class="tlcell ${winCls}${rd.isPistol?' pistol':''}" title="${title}"><span class="tln">${rd.n}</span><span class="tlic">${icons}</span></span>`;
    });
    html+=`</div></div>`;
  });
  // economy graphs per map (credits per round)
  MATCH.mapResults.forEach((mr,mi)=>{
    if(!mr||!mr.econ||!mr.econ.length)return;
    const W=460,H=70,pad=4,max=45000,n=mr.econ.length;
    const xf=i=>pad+(n<=1?0:i*(W-2*pad)/(n-1));
    const yf=v=>H-pad-(v/max)*(H-2*pad);
    const line=(key,col)=>mr.econ.map((e,i)=>`${i?'L':'M'}${xf(i).toFixed(1)},${yf(e[key]).toFixed(1)}`).join(' ');
    html+=`<div class="econgraph"><div class="eghd">${mr.mapName} · team credits by round</div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <path d="${line('h','')}" fill="none" stroke="var(--val)" stroke-width="2"/>
        <path d="${line('a','')}" fill="none" stroke="var(--def)" stroke-width="2"/>
      </svg></div>`;
  });
  wrap.innerHTML=html;
}

/* ---- match buttons ---- */

export function renderMatchButtons(phase){
  const box=document.getElementById('matchBtns'); box.innerHTML='';
  if(phase==='start'){
    box.innerHTML=`<button class="btn" onclick="simCurrentMap('normal')">▶ Watch · ${MATCH.mapPool[MATCH.curMap]}</button>
    <button class="btn ghost" style="width:auto" onclick="simCurrentMap('fast')">⏩ Fast</button>
    <button class="btn ghost" style="width:auto" onclick="skipMatch()">⏭ Skip</button>`;
  } else if(phase==='running'){
    box.innerHTML=`<button class="btn" disabled>Playing…</button>`;
  } else if(phase==='nextmap'){
    box.innerHTML=`<button class="btn" onclick="simCurrentMap()">Sim Map ${MATCH.curMap+1} · ${MATCH.mapPool[MATCH.curMap]}</button>`;
  } else if(phase==='end'){
    const myId=ST.teams[ST.myTeamIdx].id;
    const won=(MATCH.fx.home===myId&&MATCH.hMaps>MATCH.aMaps)||(MATCH.fx.away===myId&&MATCH.aMaps>MATCH.hMaps);
    box.innerHTML=`<button class="btn ${won?'gold':''}" onclick="backToHub()">${won?'Great win — Continue':'Continue'}</button>`;
  }
}

export function skipMatch(){
  go('scMatch'); // may be called from the veto or draft screen
  document.getElementById('boxWrap').style.display='none';
  document.getElementById('mapView').style.display='none';
  document.getElementById('feed').innerHTML='';
  if(!MATCH.comps)MATCH.comps=[];
  const homeStartAtk = MATCH.playerSide ? MATCH.playerSide==='home' : true;
  while(MATCH.hMaps<MATCH.mapsToWin&&MATCH.aMaps<MATCH.mapsToWin){
    const home=MATCH.home,away=MATCH.away;
    if(!MATCH.comps[MATCH.curMap])MATCH.comps[MATCH.curMap]=draftPair(home,away,MATCH.mapPool[MATCH.curMap]);
    const cc=MATCH.comps[MATCH.curMap];
    const result=simOneMap(home,away,cc,homeStartAtk);
    result.rounds.forEach(rd=>applyRoundStats(MATCH.box,rd));
    MATCH.roundsPlayed=(MATCH.roundsPlayed||0)+(result.h+result.a);
    MATCH.mapResults[MATCH.curMap]={h:result.h,a:result.a,hWon:result.h>result.a,rounds:result.rounds,mapName:MATCH.mapPool[MATCH.curMap]};
    if(result.h>result.a)MATCH.hMaps++;else MATCH.aMaps++;
    MATCH.curMap++;
  }
  MATCH.curMap=Math.min(MATCH.curMap,MATCH.mapPool.length-1);
  document.getElementById('homeMaps').textContent=MATCH.hMaps;
  document.getElementById('awayMaps').textContent=MATCH.aMaps;
  document.getElementById('homeMaps').className='s '+(MATCH.hMaps>MATCH.aMaps?'win':'lose');
  document.getElementById('awayMaps').className='s '+(MATCH.aMaps>MATCH.hMaps?'win':'lose');
  renderMapChips();
  endMatch();
}

export function backToHub(){renderHub();go('scHub');
  if(ST.seasonOver){showChampCheck();}
}

export function showChampCheck(){
  const rows=sortedStandings();
  const my=ST.teams[ST.myTeamIdx];
  const pos=rows.findIndex(t=>t.id===my.id)+1;
  toast(`Regular season done — ${my.name} finished #${pos}. Playoffs coming in the next build.`);
}

/* ---- nav + toast ---- */

export function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  if(id==='scHub')renderHub();
  window.scrollTo({top:0,behavior:'smooth'});
}

export let toastTimer=null;

export function toast(msg){const t=document.getElementById('toast');t.innerHTML=msg;t.classList.add('on');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('on'),3200);}

export function setBoxSide(v){ boxSide=v; renderBox(); }
