import { BUYMOD, SIDEMOD, createTeamEconomyState, homeSideAt, planTeamBuy, resetTeamEconomyForRound, settleTeamEconomy } from './economy.js';
import { kitOf, playerAttribute, playerOVR } from './ratings.js';
import { rollForm, teamPower } from './season.js';
import { spatialRound } from './spatial.js';
import { MATCH } from './state.js';
import { p } from '../data/leagues.js';
import { deriveSeed, random, rngSnapshot, withSeed } from './rng.js';
import { experienceModifier, objectiveDuty } from './simulation-model.js';
import { createTacticalState, recordTacticalOutcome } from './tactics/adaptation.js';
import { planRoundTactics } from './tactics/round-planner.js';
import { mapGeo } from '../data/geo/maps.js';
import { createAbilityState, planRoundAbilities, prepareAbilityBuy, resetAbilityInventory, settleAbilityRound } from './ability-system.js';

export function rand5(){return Math.floor(random()*5);}

export function agentMap(cc){const m={};cc.home.agents.forEach(a=>m[a.name]=a.agent);cc.away.agents.forEach(a=>m[a.name]=a.agent);return m;}
// weighted pick by aim + a kit dimension + form

export function pickByKit(team,form,agByName,dim,mult){
  const attr=dim==='en'?'entry':dim==='le'?'firepower':(dim==='in'||dim==='co'||dim==='su')?'tactical':'combatEfficiency';
  const w=team.roster.map(pl=>Math.max(1, playerAttribute(pl,attr)*0.4 + kitOf(agByName[pl.name],pl.role)[dim]*(mult||3) + (form[pl.name]||0)));
  const tot=w.reduce((s,x)=>s+x,0); let r=random()*tot;
  for(let i=0;i<team.roster.length;i++){r-=w[i];if(r<=0)return team.roster[i];}
  return team.roster[0];
}

export function fbSbYScore(team,form,agByName){ // entry duel score of a team's best entry
  const pl=pickByKit(team,form,agByName,'en',3);
  return {pl, score: playerAttribute(pl,'entry')*0.25+playerAttribute(pl,'firepower')*0.2+playerAttribute(pl,'explosiveness')*0.05 + kitOf(agByName[pl.name],pl.role).en*3 + (form[pl.name]||0)};
}

export function applyKills(box,kills){
  kills.forEach(k=>{ if(!box[k.killer])return;
    box[k.killer].k++; box[k.killer].acs+=(k.fb?230:(k.acs??195));
    if(box[k.victim])box[k.victim].d++;
    if(k.assist&&box[k.assist])box[k.assist].a++; });
}

export function applyRoundStats(box,rd){
  const participants=(rd.spatial?.units||[]).map(unit=>unit.name).filter(name=>box[name]);
  const roundStats=Object.fromEntries(participants.map(name=>[name,{k:0,a:0,damage:0,acs:0,survived:false,traded:false}]));
  const deathsBySide={home:0,away:0};
  const tradedVictims=new Set((rd.kills||[]).filter(kill=>kill.traded&&kill.tradeOf).map(kill=>kill.tradeOf));
  for(const unit of rd.spatial?.units||[]){if(roundStats[unit.name])roundStats[unit.name].survived=unit.deathT==null;}
  for(const event of rd.spatial?.events||[]){
    if(!['damage','abilityDamage'].includes(event.type)||event.lethal||!event.source)continue;
    const source=box[event.source],sourceRound=roundStats[event.source],amount=Math.max(0,event.amount||0);
    if(source)source.damage+=amount;if(sourceRound)sourceRound.damage+=amount;
  }
  for(const kill of rd.kills||[]){
    const killer=box[kill.killer],victim=box[kill.victim],assist=kill.assist&&box[kill.assist];
    const killerRound=roundStats[kill.killer],victimRound=roundStats[kill.victim],assistRound=roundStats[kill.assist];
    const victimSide=kill.side==='home'?'away':'home',killNumber=deathsBySide[victimSide]++;
    if(killer){killer.k++;killer.damage+=kill.damage??150;if(kill.traded)killer.tradeKills++;}
    if(killerRound){killerRound.k++;killerRound.damage+=kill.damage??150;killerRound.acs+=Math.max(70,150-killNumber*20);}
    if(victim){victim.d++;victim.damage+=kill.retaliationDamage??0;}
    if(victimRound)victimRound.damage+=kill.retaliationDamage??0;
    if(assist){assist.a++;if(assistRound){assistRound.a++;assistRound.acs+=25;}}
  }
  for(const [name,stat] of Object.entries(roundStats)){
    const b=box[name];b.rounds++;
    b.acs+=stat.damage+stat.acs+Math.max(0,stat.k-1)*50;
    if(stat.survived)b.survivedRounds++;
    if(tradedVictims.has(name)){stat.traded=true;b.tradedRounds++;}
    if(stat.k>0||stat.a>0||stat.survived||stat.traded)b.kastRounds++;
  }
  if(rd.fb){ if(box[rd.fb.killer])box[rd.fb.killer].fb++; if(box[rd.fb.victim])box[rd.fb.victim].fd++; }
  if(rd.clutch&&box[rd.clutch.player])box[rd.clutch.player].cl++;
  if(rd.abilities&&rd.abilities.length){rd.abilities.forEach(ab=>{if(box[ab.player])box[ab.player].util++;});}
  else if(rd.ability&&box[rd.ability.player])box[rd.ability.player].util++;
  if(rd.plant&&rd.planter&&box[rd.planter])box[rd.planter].plant++;
  if(rd.defuse&&rd.defuser&&box[rd.defuser])box[rd.defuser].defuse++;
}

export function newStat(){return{k:0,d:0,a:0,damage:0,rounds:0,kastRounds:0,survivedRounds:0,tradedRounds:0,tradeKills:0,acs:0,fb:0,fd:0,cl:0,util:0,plant:0,defuse:0};}

export function freshBox(home,away){const b={};[...home.roster,...away.roster].forEach(p=>b[p.name]=newStat());return b;}

export function finalizeRatings(box,totalRounds){
  Object.values(box).forEach(b=>{
    const rounds=Math.max(1,b.rounds||totalRounds);
    b.acsFinal=Math.round(b.acs/rounds);
    b.adr=+(b.damage/rounds).toFixed(1);
    b.kast=+(b.kastRounds/rounds).toFixed(3);
    b.kpr=+(b.k/rounds).toFixed(3);
    b.apr=+(b.a/rounds).toFixed(3);
    b.kd=+(b.d?b.k/b.d:b.k).toFixed(2);
    b.fkfd=+(b.fd?b.fb/b.fd:b.fb).toFixed(2);
    b.fkfdDiff=b.fb-b.fd;
    let r=1+(b.kpr-.70)*.32+(b.adr-140)*.0012+(b.kast-.72)*.35+(b.apr-.30)*.08+(b.fkfdDiff/rounds)*.16+(b.cl/rounds)*.25;
    b.rating=+Math.max(0.30,Math.min(2.0,r)).toFixed(2);
  });
}
// Serializable data lives on this state; avg/effR are derived runtime helpers.
// The state remains in memory for now and advances exactly one round at a time.
export function createMapSimulation(home,away,cc,homeStartAtk){
  const simulationSeed=rngSnapshot();
  const hForm=rollForm(home),aForm=rollForm(away);
  const agBy=agentMap(cc);
  const baseH=teamPower(home,hForm)+cc.home.delta;
  const baseA=teamPower(away,aForm)+cc.away.delta;
  const economy={home:createTeamEconomyState(home),away:createTeamEconomyState(away)};
  const abilityState=createAbilityState(home,away,agBy);
  const tacticalState=createTacticalState(),geo=mapGeo(cc.mapName);
  const avg=(team,key)=>team.roster.reduce((sum,pl)=>sum+playerAttribute(pl,key),0)/team.roster.length;
  const effR=(pl,form,ctx={})=>{
    let value=playerOVR(pl)*0.38+playerAttribute(pl,'firepower')*0.18+playerAttribute(pl,'combatEfficiency')*0.13+playerAttribute(pl,'positioning')*0.09+playerAttribute(pl,'adaptability')*0.06+kitOf(agBy[pl.name],pl.role).le*0.5+(form[pl.name]||0)+(pl.role==='DUE'?2:0);
    if(ctx.opening)value+=playerAttribute(pl,'entry')*0.10+playerAttribute(pl,'explosiveness')*0.08;
    if(ctx.attacking)value+=playerAttribute(pl,'entry')*0.035+playerAttribute(pl,'adaptability')*0.025;
    else value+=playerAttribute(pl,'positioning')*0.045+playerAttribute(pl,'tactical')*0.025;
    if(ctx.clutch)value+=playerAttribute(pl,'clutch')*0.14+playerAttribute(pl,'pressure')*0.10;
    value+=experienceModifier(pl,{agent:agBy[pl.name],map:cc.mapName,opening:ctx.opening,attacking:ctx.attacking});
    return value;
  };
  return{version:'map-state-v2-abilities',simulationSeed,home,away,cc,homeStartAtk,hForm,aForm,agBy,baseH,baseA,economy,abilityState,tacticalState,geo,h:0,a:0,r:0,rounds:[],avg,effR};
}

export function mapSimulationDone(state){return((state.h>=13||state.a>=13)&&Math.abs(state.h-state.a)>=2)||state.r>50;}

function runNextRound(state){
    if(mapSimulationDone(state))return null;
    const {home,away,cc,homeStartAtk,hForm,aForm,agBy,baseH,baseA,economy,abilityState,tacticalState,geo,avg,effR,rounds}=state;
    let {h,a,r}=state;
    const roundSeed=rngSnapshot();
    const hSide=homeSideAt(r,homeStartAtk), aSide=hSide==='atk'?'def':'atk';
    const isPistol=(r===0||r===12);
    resetAbilityInventory(abilityState,r);
    resetTeamEconomyForRound(economy.home,r);resetTeamEconomyForRound(economy.away,r);
    const planH=planTeamBuy(economy.home,home,{isPistol,agents:agBy}),planA=planTeamBuy(economy.away,away,{isPistol,agents:agBy});
    const buyH=planH.buy,buyA=planA.buy;
    const loadouts={home:planH.loadouts,away:planA.loadouts};
    const abilityPurchases={
      home:prepareAbilityBuy(abilityState,home,'home',agBy,economy.home,loadouts.home,planH.buy),
      away:prepareAbilityBuy(abilityState,away,'away',agBy,economy.away,loadouts.away,planA.buy)
    };
    planH.playerAfterBuy=economy.home.players.map(player=>player.credits);planH.afterBuy=Math.round(planH.playerAfterBuy.reduce((s,n)=>s+n,0)/5);planH.spend=planH.before-planH.afterBuy;
    planA.playerAfterBuy=economy.away.players.map(player=>player.credits);planA.afterBuy=Math.round(planA.playerAfterBuy.reduce((s,n)=>s+n,0)/5);planA.spend=planA.before-planA.afterBuy;
    const econH=BUYMOD[buyH]*(1-Math.max(0,avg(home,'combatEfficiency')-60)/160);
    const econA=BUYMOD[buyA]*(1-Math.max(0,avg(away,'combatEfficiency')-60)/160);
    const powH=baseH+SIDEMOD[cc.home.stance][hSide]+econH;
    const powA=baseA+SIDEMOD[cc.away.stance][aSide]+econA;
    // per-duel team bias (home perspective). pistols flatten skill/economy.
    const teamGap=(powH-powA+cc.edge)*(isPistol?0.4:1);
    const atkSide=hSide==='atk'?'home':'away', defSide=atkSide==='home'?'away':'home';
    const atkTeamObj=atkSide==='home'?home:away;
    // recon/util strength from the attacking team's agent kits (initiators find angles; controllers/duelists open sites)
    let sumIn=0,sumUt=0; atkTeamObj.roster.forEach(pl=>{const k=kitOf(agBy[pl.name],pl.role); sumIn+=k.in; sumUt+=(k.co+k.le);});
    const reconStrength=Math.max(0,Math.min(1,(sumIn/atkTeamObj.roster.length)/10+avg(atkTeamObj,'tactical')/220));
    const utilStrength=Math.max(0,Math.min(1,(sumUt/atkTeamObj.roster.length)/15+(avg(atkTeamObj,'tactical')+avg(atkTeamObj,'teamplay'))/440));
    const ratingOf=(pl,key,ctx)=>effR(pl,key==='home'?hForm:aForm,ctx);
    const teamplay={home:avg(home,'teamplay'),away:avg(away,'teamplay')};
    const objective={home:Object.fromEntries(home.roster.map(pl=>[pl.name,objectiveDuty(pl)])),away:Object.fromEntries(away.roster.map(pl=>[pl.name,objectiveDuty(pl)]))};
    const atkBuy=atkSide==='home'?buyH:buyA,defBuy=defSide==='home'?buyH:buyA;
    const atkStance=atkSide==='home'?cc.home.stance:cc.away.stance,defStance=defSide==='home'?cc.home.stance:cc.away.stance;
    const scoreDiff=atkSide==='home'?h-a:a-h;
    const abilityPlan=planRoundAbilities(abilityState,{home,away,agBy,atkSide,scoreDiff});
    const atkPolicy=atkSide==='home'?cc.home.tacticalPolicy:cc.away.tacticalPolicy,defPolicy=defSide==='home'?cc.home.tacticalPolicy:cc.away.tacticalPolicy;
    const tactics=planRoundTactics({state:tacticalState,round:r+1,mapGeo:geo,atkTeam:atkTeamObj,defTeam:defSide==='home'?home:away,atkKey:atkSide,defKey:defSide,atkBuy,defBuy,isPistol,scoreDiff,atkStance,defStance,utilityStrength:utilStrength,atkPolicy,defPolicy});
    const res=spatialRound(home,away,{mapName:cc.mapName,atkTeamKey:atkSide,defTeamKey:defSide,teamGap,ratingOf,reconStrength,utilStrength,teamplay,objective,isPistol,tacticalPlan:tactics,loadouts,abilityPlan});
    const kills=res.kills, fb=res.fb, site=res.site;
    const homeWon = res.winner==='home';
    if(homeWon)h++; else a++;
    const winSide=res.winner;
    const atkTeam=atkSide==='home'?home:away, defTeam=defSide==='home'?home:away;
    let plant=res.planted, defuse=res.defused,
        planter=res.plantEv?res.plantEv.planter:null, defuser=res.defuseEv?res.defuseEv.defuser:null;
    const clutch=res.clutch;
    recordTacticalOutcome(tacticalState,{round:r+1,atkKey:atkSide,defKey:defSide,site,attackTactic:tactics.attack.type,defenseTactic:tactics.defense.type,winner:winSide,planted:plant});
    const atkIsHome=atkSide==='home';
    const settledH=settleTeamEconomy(economy.home,{won:homeWon,planted:plant&&atkIsHome,units:res.units.filter(unit=>unit.side==='home'),loadouts:loadouts.home});
    const settledA=settleTeamEconomy(economy.away,{won:!homeWon,planted:plant&&!atkIsHome,units:res.units.filter(unit=>unit.side==='away'),loadouts:loadouts.away});
    const abilities=res.abilityEvs||abilityPlan.uses;
    const abilitySettlement=settleAbilityRound(abilityState,{kills,planter,orbCaptures:res.orbCaptures});
    const ability=abilities[0]||null;
    const round={n:r+1,roundSeed,hSide,aSide,winner:winSide,buyH,buyA,isPistol,kills,fb,
      economy:{home:{...planH,...settledH},away:{...planA,...settledA}},loadouts,abilityPurchases,abilityState:abilitySettlement.snapshot,
      preparation:{...res.preparation,purchases:{home:{weapons:loadouts.home,abilities:abilityPurchases.home},away:{weapons:loadouts.away,abilities:abilityPurchases.away}},tactics},
      tactics,
      phases:res.phaseSummary,tradeSummary:res.tradeSummary,
      ability,abilities,plant,defuse,planter,defuser,clutch,site,h,a,
      spatial:{units:res.units,events:res.events,duration:res.duration,site:res.site,phases:res.phaseSummary,tradeSummary:res.tradeSummary,orbCaptures:res.orbCaptures,orbMarkers:res.orbMarkers,abilityObjects:res.abilityObjects},
      reconEv:res.reconEv,utilEvs:res.utilEvs};
    rounds.push(round);r++;Object.assign(state,{h,a,r});return round;
}

export function simulateNextRound(state){
  if(mapSimulationDone(state))return null;
  return withSeed(deriveSeed(state.simulationSeed,'round',state.r),()=>runNextRound(state));
}

export function mapSimulationResult(state){return{h:state.h,a:state.a,rounds:state.rounds,hForm:state.hForm,aForm:state.aForm};}

export function simOneMap(home,away,cc,homeStartAtk){
  const state=createMapSimulation(home,away,cc,homeStartAtk);
  while(!mapSimulationDone(state))simulateNextRound(state);
  return mapSimulationResult(state);
}

export function topKillerOfRound(rd){const c={};rd.kills.forEach(k=>{if(k.side===rd.winner)c[k.killer]=(c[k.killer]||0)+1;});
  let best=null,bk=0;Object.entries(c).forEach(([n,v])=>{if(v>bk){bk=v;best=n;}});return best?{name:best,k:bk}:null;}


export function weightedPlayer(team,form){
  const weights=team.roster.map(pl=>Math.max(1,playerAttribute(pl,'firepower')*0.65+playerAttribute(pl,'combatEfficiency')*0.35 + (form[pl.name]||0) + (pl.role==='DUE'?8:0)));
  const tot=weights.reduce((s,w)=>s+w,0); let r=random()*tot;
  for(let i=0;i<team.roster.length;i++){r-=weights[i];if(r<=0)return team.roster[i];}
  return team.roster[0];
}


export function matchMVP(){let best=null,ba=-1;Object.entries(MATCH.box).forEach(([n,b])=>{if(b.rating>ba){ba=b.rating;best=n;}});return best;}
/* round-by-round timeline (TFM-style inspectable log) */
