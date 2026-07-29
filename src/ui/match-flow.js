// Action handlers that bridge UI events to the engine (core/) and to the
// imperative broadcast HUD (mapview.js / MapView.jsx's #bScoreH, #bRound,
// #mvBanner, #mapView nodes). Lives in ui/, not core/, because -- like
// mapview.js -- it writes those DOM nodes directly; core/ stays DOM-free.
import { autoAgentFor, buildCompChoice, draftComp, draftPair, mapSuitFor } from '../core/draft.js';
import { buyLabel, initEcon } from '../core/economy.js';
import { counterEdge } from '../core/ratings.js';
import { agentMap, applyRoundStats, finalizeRatings, newStat, simOneMap, topKillerOfRound } from '../core/round-engine.js';
import { firstUnplayedWeek, makeSchedule, pickMaps, simRestOfWeek, sortedStandings, teamObj } from '../core/season.js';
import { MATCH, ST, bump, go, setMatch, toast } from '../core/state.js';
import { MV } from '../data/geo/ascent.js';
import { LEAGUES, MAPS } from '../data/leagues.js';
import { mvBuild, mvPlayRound } from './mapview.js';

/* ============ SEASON SETUP ============ */

export function selectTeam(lk,idx){
  ST.league=lk;
  ST.teams=LEAGUES[lk].teams.map((t,i)=>({...t, id:i}));
  ST.myTeamIdx=idx;
  ST.week=0; ST.seasonOver=false;
  ST.standings={};
  ST.teams.forEach(t=>ST.standings[t.id]={w:0,l:0,mapW:0,mapL:0,rd:0});
  ST.schedule=makeSchedule(ST.teams.length);
  ST.playerViewContext=null;
  go('scHub'); // Header (React) reads ST.teams/myTeamIdx via useStore()
}

/* round-robin (single). circle method */

/* ============ MATCH ENGINE ============
   Bo3. Each map: rounds to 13, win-by-2 OT.
   Round win prob from team "round power" (attack/def context + form). */

export function startNextMatch(){
  const wi=firstUnplayedWeek(); if(wi<0)return;
  const myId=ST.teams[ST.myTeamIdx].id;
  const fx=ST.schedule[wi].find(f=>!f.played&&(f.home===myId||f.away===myId));
  if(!fx){ // my match this week already played -> sim rest, advance
    simRestOfWeek(wi); bump(); toast('Week advanced.'); return;
  }
  openMatch(fx,wi);
}

export const DEV_ASCENT_BO1=true;

export function openMatch(fx,wi){
  const home=teamObj(fx.home), away=teamObj(fx.away);
  const myId=ST.teams[ST.myTeamIdx].id;
  setMatch({fx,wi,home,away,hMaps:0,aMaps:0,mapResults:[],
    mapPool:pickMaps(3), curMap:0, box:{}, running:false, comps:[],
    mapsToWin:2, roundsPlayed:0, feed:[], liveRound:{h:0,a:0},
    playerSide: fx.home===myId?'home':'away'});
  if(DEV_ASCENT_BO1){ MATCH.mapPool=['Ascent']; MATCH.mapsToWin=1; }
  // init box stats
  [...home.roster,...away.roster].forEach(pl=>MATCH.box[pl.name]=newStat());
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
  bump(); // Veto (React) reads MATCH.veto via useStore()
  stepVeto();
}

export function stepVeto(){
  const v=MATCH.veto;
  if(v.step>=v.order.length){ finalizeVeto(); return; }
  const [side]=v.order[v.step];
  if(side!==MATCH.playerSide){ setTimeout(()=>{ aiVetoAct(); }, 550); }        // else: wait for player click
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
  bump();
  stepVeto();
}

export function finalizeVeto(){
  const v=MATCH.veto;
  const decider=v.remaining[0];
  v.acts.push({side:'decider',act:'decider',map:decider});
  MATCH.mapPool=[v.picks[0].map, v.picks[1].map, decider];
  bump();
}

export function vetoSkip(){ MATCH.mapPool=pickMaps(3); skipMatch(); }
// player drafts this map: opponent commits first (map-optimal), player gets last-pick info

export function startMapDraft(mi){
  MATCH.curMap=mi;
  MATCH.draftSel={stance:null, choice:{}};
  const oppTeam = MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  MATCH.pendingOpp = draftComp(oppTeam, MATCH.mapPool[mi], null);
  bump(); // Draft (React) reads MATCH.curMap/pendingOpp/draftSel via useStore()
  go('scDraft');
}

export function selectStance(mi,s){ MATCH.draftSel.stance=s; bump(); }

export function selectAgent(mi,name,agent){ MATCH.draftSel.choice[name]=agent; bump(); }

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
  go('scMatch');
  paintMap(0,0);
}

export function paintMap(h,a){
  if(!MATCH.comps) MATCH.comps=[];
  // player-drafted maps already have comps set by lockDraft; only auto-draft as a safety net
  if(!MATCH.comps[MATCH.curMap]) MATCH.comps[MATCH.curMap]=draftPair(MATCH.home,MATCH.away,MATCH.mapPool[MATCH.curMap]);
  MATCH.liveRound={h,a};
  bump(); // Match (React) reads MATCH.comps/curMap/running/liveRound/feed via useStore()
}

/* ============ PHASE 3 — ROUND ENGINE (sides · economy · duels) ============
   simOneMap computes the full round-by-round log; the three entry points
   (animated / skip / background) all replay or apply the same result. */

/* ============ TOP-DOWN MAP VIEW ============ */

export function simCurrentMap(speed){
  if(MATCH.running)return;
  speed=speed||'normal';
  MATCH.running=true;
  const home=MATCH.home, away=MATCH.away, cc=MATCH.comps[MATCH.curMap];
  if(MATCH.playerSide) MATCH.homeStartAtk = MATCH.playerSide==='home'; else MATCH.homeStartAtk=true;
  const result=simOneMap(home,away,cc,MATCH.homeStartAtk);
  MATCH.curResult=result;
  MATCH.feed=[];
  document.getElementById('mapView').style.display='block';
  mvBuild(home,away,agentMap(cc));
  initEcon(); MATCH.curEconHist=[];
  paintMap(0,0); // also bumps -- reflects running=true, cleared feed, reset pips
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
      MATCH.feed=[{winner:rd.winner, n:rd.n, winSide, sideTag, teamShort:winTeam.short,
        isPistol:rd.isPistol, loserBuyLbl, fbKiller:rd.fb.killer,
        topKiller: tk?{name:tk.name,k:tk.k}:null,
        ability: rd.ability?{name:rd.ability.name,ult:rd.ability.ult}:null,
        clutch: rd.clutch?{player:rd.clutch.player,vs:rd.clutch.vs}:null,
        defuse:rd.defuse, plant:rd.plant, h:rd.h, a:rd.a}, ...MATCH.feed].slice(0,7);
      MATCH.liveRound={h:rd.h,a:rd.a};
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
      bump(); // Match (React): feed line, pips, round number -- pip "pop" flash is Pips' own effect
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
  MATCH.running=false;
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
  bump(); // Hub (React) reads ST.standings/ST.schedule/ST.seasonOver, Box+Match (React) read MATCH.fx.played, via useStore()
}

export function skipMatch(){
  go('scMatch'); // may be called from the veto or draft screen
  document.getElementById('mapView').style.display='none';
  MATCH.feed=[];
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
  endMatch();
}

export function backToHub(){
  go('scHub');
  if(ST.seasonOver){showChampCheck();}
}

export function showChampCheck(){
  const rows=sortedStandings();
  const my=ST.teams[ST.myTeamIdx];
  const pos=rows.findIndex(t=>t.id===my.id)+1;
  toast(`Regular season done — ${my.name} finished #${pos}. Playoffs coming in the next build.`);
}
