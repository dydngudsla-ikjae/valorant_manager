// Action handlers that bridge UI events to the engine (core/) and to the
// imperative broadcast HUD (mapview.js / MapView.jsx's #bScoreH, #bRound,
// #mvBanner, #mapView nodes). Lives in ui/, not core/, because -- like
// mapview.js -- it writes those DOM nodes directly; core/ stays DOM-free.
import { autoAgentFor, buildCompChoice, buildCompForStance, draftComp, draftPair, mapSuitFor } from '../core/draft.js';
import { buyLabel, initEcon } from '../core/economy.js';
import { counterEdge } from '../core/ratings.js';
import { agentMap, applyRoundStats, createMapSimulation, finalizeRatings, mapSimulationDone, mapSimulationResult, newStat, simOneMap, simulateNextRound, topKillerOfRound } from '../core/round-engine.js';
import { createStandings, firstUnplayedWeek, makeSchedule, pickMaps, recordFixtureResult, simRestOfWeek, sortedStandings, teamObj } from '../core/season.js';
import { MATCH, ST, bump, go, setMatch, toast } from '../core/state.js';
import { MV } from '../data/geo/ascent.js';
import { LEAGUES, PLAYABLE_MAPS } from '../data/leagues.js';
import { selectAutomaticLineup } from '../core/roster.js';
import { deriveSeed, withSeed } from '../core/rng.js';
import { matchFormat, vetoOrder } from '../core/match-format.js';
import { defaultPolicyForStance, normalizeTacticalPolicy } from '../core/tactics/tactical-policy.js';
import { createTimeoutLedger, timeoutAvailability, useTacticalTimeout } from '../core/timeouts.js';
import { createStageCompetition } from '../core/tournament.js';
import { mvBuild, mvPauseRound, mvPlayRound, mvResumeRound, mvSetPlaybackRate, mvSkipRound, mvStepRound, mvUpdateDiagnostics } from './mapview.js';
import { tr } from '../i18n.js';

/* ============ SEASON SETUP ============ */

export function selectTeam(lk,idx){
  ST.league=lk;
  ST.teams=LEAGUES[lk].teams.map((t,i)=>({...t, id:i}));
  ST.myTeamIdx=idx;
  ST.week=0;ST.seasonOver=false;ST.matchArchive=[];
  ST.competition=createStageCompetition({leagueId:lk,year:2026,qualificationPlaces:8});
  ST.matchBestOf=3;
  ST.standings=createStandings(ST.teams);
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

export function openMatch(fx,wi,bestOf=fx.bestOf||ST.matchBestOf||3){
  const home=teamObj(fx.home), away=teamObj(fx.away);
  selectAutomaticLineup(home);
  selectAutomaticLineup(away);
  const myId=ST.teams[ST.myTeamIdx].id;
  const format=matchFormat(bestOf);
  const seed=deriveSeed(ST.seed,ST.league,'week',wi,'fixture',fx.home,fx.away);
  setMatch({fx,wi,home,away,hMaps:0,aMaps:0,mapResults:[],
    seed,bestOf:format.bestOf,formatLabel:format.label,mapPool:withSeed(deriveSeed(seed,'maps'),()=>pickMaps(format.bestOf)), curMap:0, box:{}, running:false, comps:[],
    mapsToWin:format.mapsToWin, roundsPlayed:0, feed:[], liveRound:{h:0,a:0},
    playerSide: fx.home===myId?'home':'away'});
  // init box stats
  [...home.roster,...away.roster].forEach(pl=>MATCH.box[pl.name]=newStat());
  startVeto();
}

export function openMapLab({homeIndex,awayIndex,map,homeStartsAttack=true,teams=ST.teams}){
  if(homeIndex===awayIndex)throw new Error('Map Lab requires two different teams');
  const home=teams[homeIndex],away=teams[awayIndex];
  selectAutomaticLineup(home);selectAutomaticLineup(away);
  const seed=deriveSeed(ST.seed,'map-lab',home.id,away.id,map,homeStartsAttack?'atk':'def');
  const fx={home:home.id,away:away.id,played:false,diagnostic:true};
  const comp=draftPair(home,away,map);
  setMatch({diagnostic:true,fx,wi:0,home,away,hMaps:0,aMaps:0,mapResults:[],seed,bestOf:1,formatLabel:'MAP LAB',
    mapPool:[map],curMap:0,box:{},running:false,comps:[comp],mapsToWin:1,roundsPlayed:0,feed:[],liveRound:{h:0,a:0},
    playerSide:homeStartsAttack?'home':'away',homeStartAtkConfigured:homeStartsAttack});
  [...home.roster,...away.roster].forEach(pl=>MATCH.box[pl.name]=newStat());
  const mapView=typeof document!=='undefined'?document.getElementById('mapView'):null;
  if(mapView)mapView.style.display='none';
  go('scMatch');
  paintMap(0,0);
}

/* ============ MAP VETO (coach bans/picks) ============ */

export function startVeto(){
  if(PLAYABLE_MAPS.length<2){
    MATCH.mapPool=pickMaps(MATCH.bestOf);
    MATCH.veto={remaining:[...PLAYABLE_MAPS],picks:[],acts:[],order:[],step:0,skippedForValidatedPool:true};
    startMapDraft(0);
    return;
  }
  const order=vetoOrder(MATCH.bestOf,MATCH.playerSide);
  MATCH.veto={remaining:[...PLAYABLE_MAPS], picks:[], acts:[], order, step:0};
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
  MATCH.mapPool=[...v.picks.map(pick=>pick.map),decider];
  bump();
}

export function vetoSkip(){ MATCH.mapPool=withSeed(deriveSeed(MATCH.seed,'skip-maps'),()=>pickMaps(MATCH.bestOf)); skipMatch(); }
// player drafts this map: opponent commits first (map-optimal), player gets last-pick info

export function startMapDraft(mi){
  MATCH.curMap=mi;
  MATCH.mapSimulation=null;
  MATCH.draftSel={stance:null,choice:{},policy:null};
  const oppTeam = MATCH.playerSide==='home'?MATCH.away:MATCH.home;
  MATCH.pendingOpp = draftComp(oppTeam, MATCH.mapPool[mi], null);
  bump(); // Draft (React) reads MATCH.curMap/pendingOpp/draftSel via useStore()
  go('scDraft');
}

function playerMatchSide(){return MATCH.playerSide||'home';}

function scheduleMapStep(delay=0){
  const playback=MATCH.playback;
  if(!playback||playback.paused||!playback.betweenRounds||playback.scheduled)return;
  playback.scheduled=true;
  setTimeout(()=>{
    if(!MATCH?.playback)return;
    MATCH.playback.scheduled=false;
    if(!MATCH.playback.paused&&MATCH.playback.betweenRounds&&MATCH.continueMap)MATCH.continueMap();
  },delay);
}

export function pauseMap(){if(!MATCH?.running||!MATCH.playback)return;MATCH.playback.paused=true;mvPauseRound();bump();}
export function setPlaybackSpeed(rate){if(!MATCH?.running||!MATCH.playback)return;MATCH.playback.speed=Math.max(1,Math.min(4,Number(rate)||1));mvSetPlaybackRate(MATCH.playback.speed);bump();}
export function stepPlaybackTick(){if(!MATCH?.running||!MATCH.playback)return;if(!MATCH.playback.paused)pauseMap();mvStepRound(100);bump();}
export function skipCurrentRound(){if(!MATCH?.running||!MATCH.playback||MATCH.playback.betweenRounds)return;MATCH.playback.paused=false;MATCH.playback.stopAfterRound=true;mvSkipRound();bump();}

export function resumeMap(){
  if(!MATCH?.running||!MATCH.playback)return;
  MATCH.playback.paused=false;MATCH.playback.stopAfterRound=false;mvResumeRound();bump();scheduleMapStep(80);
}

export function playOneRound(){
  if(!MATCH?.running||!MATCH.playback)return;
  if(!MATCH.playback.betweenRounds){
    MATCH.playback.stopAfterRound=true;
    if(MATCH.playback.paused){MATCH.playback.paused=false;mvResumeRound();}
  }else{
    MATCH.playback.paused=true;MATCH.playback.stopAfterRound=false;
    if(MATCH.continueMap){MATCH.playback.betweenRounds=false;MATCH.continueMap();}
  }
  bump();
}

export function openTacticalTimeout(){
  if(!MATCH?.running||!MATCH.playback||MATCH.timeoutEditor)return;
  const side=playerMatchSide(),roundsPlayed=MATCH.mapSimulation?.r||0;
  if(roundsPlayed<1||timeoutAvailability(MATCH.timeouts,side,roundsPlayed).remaining<=0)return;
  if(!MATCH.playback.betweenRounds){
    MATCH.timeoutQueued=MATCH.timeoutQueued?.side===side?null:{side,requestedDuringRound:roundsPlayed};
    bump();return;
  }
  MATCH.playback.paused=true;
  MATCH.timeoutQueued=null;
  MATCH.timeoutEditor={side,draft:{...normalizeTacticalPolicy(MATCH.comps[MATCH.curMap][side].tacticalPolicy,MATCH.comps[MATCH.curMap][side].stance)}};
  bump();
}

function openQueuedTacticalTimeout(){
  const queued=MATCH?.timeoutQueued;if(!queued||MATCH.timeoutEditor)return false;
  const roundsPlayed=MATCH.mapSimulation?.r||0;
  if(timeoutAvailability(MATCH.timeouts,queued.side,roundsPlayed).remaining<=0){MATCH.timeoutQueued=null;return false;}
  MATCH.playback.paused=true;MATCH.playback.stopAfterRound=false;MATCH.timeoutQueued=null;
  const comp=MATCH.comps[MATCH.curMap][queued.side];
  MATCH.timeoutEditor={side:queued.side,queued:true,draft:{...normalizeTacticalPolicy(comp.tacticalPolicy,comp.stance)}};
  return true;
}

export function updateTimeoutPolicy(field,value){
  if(!MATCH?.timeoutEditor)return;
  MATCH.timeoutEditor.draft={...MATCH.timeoutEditor.draft,[field]:value};bump();
}

export function cancelTacticalTimeout(){if(!MATCH?.timeoutEditor)return;MATCH.timeoutEditor=null;bump();}

export function confirmTacticalTimeout(){
  const editor=MATCH?.timeoutEditor;if(!editor)return;
  const roundsPlayed=MATCH.mapSimulation?.r||0,comp=MATCH.comps[MATCH.curMap][editor.side];
  const before=normalizeTacticalPolicy(comp.tacticalPolicy,comp.stance),after=normalizeTacticalPolicy(editor.draft,comp.stance);
  const entry=useTacticalTimeout({ledger:MATCH.timeouts,side:editor.side,roundsPlayed,beforePolicy:before,afterPolicy:after,source:'user'});
  if(!entry){MATCH.timeoutEditor=null;bump();return;}
  comp.tacticalPolicy=after;
  MATCH.timeoutEditor=null;
  MATCH.feed=[{timeout:true,n:roundsPlayed,side:editor.side,teamShort:MATCH[editor.side].short,policy:after.preset},...MATCH.feed].slice(0,7);
  bump();
}

function maybeUseAiTimeout(){
  const state=MATCH.mapSimulation;if(!state||state.r<3)return;
  const side=playerMatchSide()==='home'?'away':'home';
  if(timeoutAvailability(MATCH.timeouts,side,state.r).remaining<=0)return;
  const last=state.rounds.slice(-2);if(last.length<2||last.some(round=>round.winner===side))return;
  const comp=MATCH.comps[MATCH.curMap][side],before=normalizeTacticalPolicy(comp.tacticalPolicy,comp.stance);
  const scoreDiff=side==='home'?state.h-state.a:state.a-state.h;
  const preset=scoreDiff<=-3?'ADAPTIVE':before.preset==='TEMPO'?'STRUCTURED':'TEMPO';
  const after={...before,preset,risk:scoreDiff<=-4?'HIGH':before.risk};
  const entry=useTacticalTimeout({ledger:MATCH.timeouts,side,roundsPlayed:state.r,beforePolicy:before,afterPolicy:after,source:'ai'});
  if(!entry)return;
  comp.tacticalPolicy=after;
  MATCH.feed=[{timeout:true,n:state.r,side,teamShort:MATCH[side].short,policy:after.preset},...MATCH.feed].slice(0,7);
}

export function selectStance(mi,s){MATCH.draftSel.stance=s;MATCH.draftSel.policy=defaultPolicyForStance(s);bump();}

export function selectTacticalPolicy(field,value){
  if(!MATCH.draftSel.policy)MATCH.draftSel.policy=defaultPolicyForStance(MATCH.draftSel.stance||'BALANCED');
  if(field==='preset')MATCH.draftSel.policy={...defaultPolicyForStance(MATCH.draftSel.stance||'BALANCED'),preset:value};
  else MATCH.draftSel.policy={...MATCH.draftSel.policy,[field]:value};
  bump();
}

export function selectAgent(mi,name,agent){ MATCH.draftSel.choice[name]=agent; bump(); }

export function confirmDraft(mi){
  const me=ST.teams[ST.myTeamIdx]; const map=MATCH.mapPool[mi];
  const recommended=buildCompForStance(me,map,MATCH.draftSel.stance);
  const recommendedByPlayer=Object.fromEntries(recommended.agents.map(agent=>[agent.name,agent.agent]));
  const choice={}; me.roster.forEach(pl=>choice[pl.name]=MATCH.draftSel.choice[pl.name]||recommendedByPlayer[pl.name]||autoAgentFor(pl,map));
  const myComp=buildCompChoice(me,map,MATCH.draftSel.stance,choice);
  myComp.tacticalPolicy={...MATCH.draftSel.policy};
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
  speed=speed==='fast'?4:(Number(speed)||1);
  MATCH.running=true;
  const home=MATCH.home, away=MATCH.away, cc=MATCH.comps[MATCH.curMap];
  if(MATCH.playerSide) MATCH.homeStartAtk = MATCH.playerSide==='home'; else MATCH.homeStartAtk=true;
  const mapSeed=deriveSeed(MATCH.seed,'map',MATCH.curMap,MATCH.mapPool[MATCH.curMap]);
  const mapState=withSeed(mapSeed,()=>createMapSimulation(home,away,cc,MATCH.homeStartAtk));
  MATCH.mapSimulation=mapState;
  MATCH.curResult=null;
  MATCH.timeouts=createTimeoutLedger();
  MATCH.timeoutEditor=null;
  MATCH.timeoutQueued=null;
  // The management view defaults to the manager's team radio rather than a
  // neutral broadcast commentary feed.
  MATCH.viewMode='coach';
  // Broadcasts start in one-round mode: play the opening round, then wait for
  // the manager instead of silently running the whole map.
  MATCH.playback={speed,paused:false,betweenRounds:true,scheduled:false,stopAfterRound:true};
  MATCH.feed=[];
  document.getElementById('mapView').style.display='block';
  mvBuild(home,away,agentMap(cc));
  initEcon(); MATCH.curEconHist=[];
  paintMap(0,0); // also bumps -- reflects running=true, cleared feed, reset pips
  const step=()=>{
    MATCH.playback.betweenRounds=false;
    MATCH.continueMap=null;
    if(mapSimulationDone(mapState)){
      const result=mapSimulationResult(mapState);
      result.seed=mapSeed;
      MATCH.curResult=result;
      mvUpdateDiagnostics('map_completed');
      document.getElementById('mvBanner').innerHTML='';
      finishMap(result.h,result.a);
      return;
    }
    const rd=simulateNextRound(mapState);
    mvUpdateDiagnostics('round_generated',rd);
    if(rd.n===13) initEcon(); // side switch — economy resets at half
    if(rd.economy)MV.econ={home:rd.economy.home.playerBefore||Array(5).fill(rd.economy.home.before),away:rd.economy.away.playerBefore||Array(5).fill(rd.economy.away.before)};
    // economy snapshot (pre-buy team credits) for the post-map graph
    if(MV.econ){ MATCH.curEconHist=MATCH.curEconHist||[];
      MATCH.curEconHist.push({n:rd.n, h:MV.econ.home.reduce((s,x)=>s+x,0), a:MV.econ.away.reduce((s,x)=>s+x,0)}); }
    // broadcast center: pre-round score + round number
    const preH=rd.h-(rd.winner==='home'?1:0), preA=rd.a-(rd.winner==='away'?1:0);
    const bsh=document.getElementById('bScoreH'), bsa=document.getElementById('bScoreA'), brd=document.getElementById('bRound');
    if(bsh)bsh.textContent=preH;if(bsa)bsa.textContent=preA;if(brd)brd.textContent=tr('라운드 ','Round ')+rd.n;
    // banner: only exceptional state changes; normal round/side data lives in the top HUD.
    const bnEl=document.getElementById('mvBanner');
    if(rd.n===13)bnEl.innerHTML=`<span class="switchbanner">⇄ ${tr('진영 전환 · 후반전','SIDE SWITCH · SECOND HALF')}</span>`;
    else if(rd.n>24)bnEl.innerHTML=`<span class="switchbanner">${tr('연장','OVERTIME')}</span>`;
    else bnEl.innerHTML='';
    mvPlayRound(rd,MATCH.playback.speed,()=>{
      applyRoundStats(MATCH.box, rd);
      mvUpdateDiagnostics('round_completed',rd);
      const winTeam=rd.winner==='home'?home:away;
      const winSide=rd.winner==='home'?rd.hSide:rd.aSide;
      const loserBuyLbl=buyLabel(rd.winner==='home'?rd.buyA:rd.buyH);
      const tk=topKillerOfRound(rd);
      const sideTag=winSide==='atk'?'ATK':'DEF';
      MATCH.feed=[{winner:rd.winner, n:rd.n, winSide, sideTag, teamShort:winTeam.short,
        isPistol:rd.isPistol, loserBuyLbl, fbKiller:rd.fb.killer,
        myTactic:(MATCH.playerSide==='home'?rd.hSide:rd.aSide)==='atk'?rd.tactics?.attack?.type:rd.tactics?.defense?.type,
        myRole:(MATCH.playerSide==='home'?rd.hSide:rd.aSide),targetSite:(MATCH.playerSide==='home'?rd.hSide:rd.aSide)==='atk'?rd.tactics?.attack?.targetSite:null,
        trades:rd.tradeSummary?.completed||0,turningPoint:rd.phases?.turningPoint?.type||null,
        topKiller: tk?{name:tk.name,k:tk.k}:null,
        ability: rd.ability?{name:rd.ability.name,ult:rd.ability.ult}:null,
        clutch: rd.clutch?{player:rd.clutch.player,vs:rd.clutch.vs}:null,
        defuse:rd.defuse, plant:rd.plant, h:rd.h, a:rd.a}, ...MATCH.feed].slice(0,7);
      MATCH.liveRound={h:rd.h,a:rd.a};
      if(bsh)bsh.textContent=rd.h; if(bsa)bsa.textContent=rd.a;
      if(rd.economy)MV.econ={home:rd.economy.home.playerAfter||Array(5).fill(rd.economy.home.after),away:rd.economy.away.playerAfter||Array(5).fill(rd.economy.away.after)};
      MATCH.playback.betweenRounds=true;
      if(MATCH.playback.stopAfterRound){MATCH.playback.paused=true;MATCH.playback.stopAfterRound=false;}
      MATCH.continueMap=step;
      openQueuedTacticalTimeout();
      maybeUseAiTimeout();
      bump(); // Match (React): feed line, pips, round number -- pip "pop" flash is Pips' own effect
      scheduleMapStep(220);
    });
  };
  MATCH.continueMap=step;
  // The first round starts synchronously after the viewer DOM is built. Delayed
  // scheduling is only needed between completed rounds; using it here can leave
  // the match stuck forever at map_initialized if the initial UI lifecycle
  // invalidates that callback.
  step();
}

export function finishMap(h,a){
  const hWon=h>a;
  MATCH.mapResults[MATCH.curMap]={h,a,hWon,rounds:(MATCH.curResult?MATCH.curResult.rounds:[]),mapName:MATCH.mapPool[MATCH.curMap],econ:(MATCH.curEconHist||[]).slice(),timeouts:(MATCH.timeouts?.log||[]).slice()};
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
  if(MATCH.diagnostic){MATCH.fx.played=true;bump();return;}
  // record result into season
  const fx=MATCH.fx;
  let rd=0;MATCH.mapResults.forEach(m=>{if(m)rd+=(m.h-m.a);});
  recordFixtureResult(fx,{hMaps:MATCH.hMaps,aMaps:MATCH.aMaps,roundDifferential:rd,box:MATCH.box,mapResults:MATCH.mapResults,seed:MATCH.seed});
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
    const mapSeed=deriveSeed(MATCH.seed,'map',MATCH.curMap,MATCH.mapPool[MATCH.curMap]);
    const result=withSeed(mapSeed,()=>simOneMap(home,away,cc,homeStartAtk));
    result.seed=mapSeed;
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
