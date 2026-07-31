const finite=value=>Number.isFinite(value);
const roundScoreBefore=round=>({home:round.h-(round.winner==='home'?1:0),away:round.a-(round.winner==='away'?1:0)});
const compactEvent=event=>({
  t:finite(event.t)?+event.t.toFixed(2):null,type:event.type,
  killer:event.killer||undefined,source:event.source||undefined,victim:event.victim||undefined,assist:event.assist||undefined,
  amount:event.amount||undefined,rawDamage:event.rawDamage||undefined,absorbed:event.absorbed||undefined,
  remainingHP:event.remainingHP??undefined,remainingShield:event.remainingShield??undefined,
  weapon:event.weapon||undefined,hitZone:event.hitZone||undefined,distanceBand:event.distanceBand||undefined,headshot:event.headshot||undefined,
  focusFire:event.focusFire||undefined,victimExposure:event.victimExposure||undefined,killerExposure:event.killerExposure||undefined,
  exposure:event.exposure||undefined,fromX:finite(event.fromX)?+event.fromX.toFixed(2):undefined,fromY:finite(event.fromY)?+event.fromY.toFixed(2):undefined,
  player:event.player||event.planter||event.defuser||event.by||undefined,
  target:event.target||undefined,distance:finite(event.distance)?+event.distance.toFixed(2):undefined,
  x:finite(event.x)?+event.x.toFixed(2):undefined,y:finite(event.y)?+event.y.toFixed(2):undefined,
});

function inspectRound(round){
  const issues=[],events=round.spatial?.events||[],kills=events.filter(event=>event.type==='kill');
  const dead=new Set();
  for(const event of events){
    if(event.type==='kill'){
      if(dead.has(event.killer))issues.push({code:'kill_after_death',player:event.killer,time:event.t});
      if(dead.has(event.victim))issues.push({code:'duplicate_death',player:event.victim,time:event.t});
      dead.add(event.victim);
    }
    if(finite(event.x)&&finite(event.y)&&(event.x<0||event.x>100||event.y<0||event.y>100))issues.push({code:'event_out_of_bounds',type:event.type,x:event.x,y:event.y});
  }
  for(const unit of round.spatial?.units||[])for(const point of unit.track||[])if(!finite(point.x)||!finite(point.y)||point.x<0||point.x>100||point.y<0||point.y>100){issues.push({code:'track_out_of_bounds',player:unit.name,x:point.x,y:point.y});break;}
  if(round.defuse&&!round.plant)issues.push({code:'defuse_without_plant'});
  if(round.plant&&!events.some(event=>event.type==='plant'))issues.push({code:'plant_event_missing'});
  if(round.defuse&&!events.some(event=>event.type==='defuse'))issues.push({code:'defuse_event_missing'});
  if(kills.length>9)issues.push({code:'too_many_kills',count:kills.length});
  if(!finite(round.spatial?.duration)||round.spatial.duration<=0)issues.push({code:'invalid_duration',value:round.spatial?.duration});
  return issues;
}

function summarizeRound(round){
  const scoreBefore=roundScoreBefore(round),events=round.spatial?.events||[],kills=events.filter(event=>event.type==='kill');
  const abilityEvents=events.filter(event=>event.type==='ability');
  return {
    n:round.n,seed:round.roundSeed,scoreBefore,scoreAfter:{home:round.h,away:round.a},
    sides:{home:round.hSide,away:round.aSide},winner:round.winner,site:round.site,
    buy:{home:round.buyH,away:round.buyA},credits:{
      home:{before:round.economy?.home?.before,spent:round.economy?.home?.spend,after:round.economy?.home?.after,playersBefore:round.economy?.home?.playerBefore,playersAfter:round.economy?.home?.playerAfter},
      away:{before:round.economy?.away?.before,spent:round.economy?.away?.spend,after:round.economy?.away?.after,playersBefore:round.economy?.away?.playerBefore,playersAfter:round.economy?.away?.playerAfter},
    },
    tactics:{attack:round.tactics?.attack?.type,defense:round.tactics?.defense?.type,targetSite:round.tactics?.attack?.targetSite},
    outcome:{kills:kills.length,headshots:kills.filter(event=>event.headshot).length,firstBlood:round.fb?.killer,plant:!!round.plant,defuse:!!round.defuse,clutch:round.clutch||null,trades:round.tradeSummary?.completed||0,duration:round.spatial?.duration},
    combat:{
      loadouts:round.loadouts,
      damageEvents:events.filter(event=>event.type==='damage').map(compactEvent),
      killEvents:kills.map(compactEvent),
      coverSeeks:events.filter(event=>event.type==='coverSeek').map(compactEvent),
      sightings:events.filter(event=>event.type==='sighting').map(compactEvent),
      missedShots:events.filter(event=>event.type==='shot'&&event.hit===false).length,
      agentProfiles:(round.spatial?.units||[]).map(({name,side,decisionProfile})=>({name,side,...decisionProfile})),
      survivors:(round.spatial?.units||[]).filter(unit=>unit.deathT==null).map(({name,finalHP,finalShield,shieldType,weapon})=>({name,finalHP,finalShield,shieldType,weapon}))
    },
    preparation:round.preparation,
    abilities:{purchases:round.abilityPurchases,uses:abilityEvents.map(({t,player,agentName,name,type,mechanic,ult,decisionSkill,decision,x,y})=>({t:+t.toFixed(2),player,agent:agentName,name,type,mechanic,ultimate:ult,decisionSkill,decision,x,y})),timing:{count:abilityEvents.length,firstUse:abilityEvents.length?+Math.min(...abilityEvents.map(event=>event.t)).toFixed(2):null,openingBurst:abilityEvents.filter(event=>event.t>0&&event.t<3).length},objects:(round.spatial?.abilityObjects||[]).map(({id,owner,ability,mechanic,hp,placedAt,activeAt,expiresAt,destroyedAt,destroyedBy,x,y})=>({id,owner,ability,mechanic,hp,placedAt,activeAt,expiresAt,destroyedAt,destroyedBy,x,y})),ultState:round.abilityState,orbs:round.spatial?.orbCaptures||[],orbMarkers:(round.spatial?.orbMarkers||[])},
    issues:inspectRound(round),
  };
}

function aggregate(rounds){
  const attack={wins:0,rounds:0},sites={},buys={},killCounts={},durations=[],weaponKills={};
  let headshots=0,totalKills=0,armorAbsorbed=0,focusFireKills=0,focusFireShots=0,exposedDeaths=0,coverSeeks=0,sightings=0,missedShots=0,simultaneousKills=0;
  for(const round of rounds){
    const roundEvents=round.spatial?.events||[];
    const atk=round.hSide==='atk'?'home':'away';attack.rounds++;if(round.winner===atk)attack.wins++;
    const site=round.site||'unknown';sites[site]??={rounds:0,attackWins:0};sites[site].rounds++;if(round.winner===atk)sites[site].attackWins++;
    for(const side of ['home','away']){const buy=side==='home'?round.buyH:round.buyA;buys[buy]??={rounds:0,wins:0};buys[buy].rounds++;if(round.winner===side)buys[buy].wins++;}
    for(const kill of round.kills||[])killCounts[kill.killer]=(killCounts[kill.killer]||0)+1;
    for(const event of roundEvents){
      if(event.type==='kill'){const weapon=event.weapon||'unknown';weaponKills[weapon]=(weaponKills[weapon]||0)+1;headshots+=event.headshot?1:0;totalKills++;focusFireKills+=event.focusFire>0?1:0;focusFireShots+=event.focusFire||0;exposedDeaths+=event.victimExposure>=2?1:0;simultaneousKills+=roundEvents.some(other=>other!==event&&other.type==='kill'&&Math.abs(other.t-event.t)<.001)?1:0;}
      if(event.type==='damage')armorAbsorbed+=event.absorbed||0;
      if(event.type==='coverSeek')coverSeeks++;
      if(event.type==='sighting')sightings++;
      if(event.type==='shot'&&event.hit===false)missedShots++;
    }
    if(finite(round.spatial?.duration))durations.push(round.spatial.duration);
  }
  const pct=(wins,total)=>total?+(wins/total*100).toFixed(1):null;
  return {
    rounds:rounds.length,attackWinRate:pct(attack.wins,attack.rounds),
    sites:Object.fromEntries(Object.entries(sites).map(([key,value])=>[key,{...value,attackWinRate:pct(value.attackWins,value.rounds)}])),
    buyResults:Object.fromEntries(Object.entries(buys).map(([key,value])=>[key,{...value,winRate:pct(value.wins,value.rounds)}])),
    topKillers:Object.entries(killCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,kills])=>({name,kills})),
    combat:{weaponKills,headshotKillRate:pct(headshots,totalKills),armorDamageAbsorbed:armorAbsorbed,focusFireKills,focusFireShots,exposedDeaths,coverSeeks,sightings,missedShots,simultaneousKills},
    averageRoundDuration:durations.length?+(durations.reduce((sum,value)=>sum+value,0)/durations.length).toFixed(2):null,
  };
}

export function buildMatchDiagnosticReport(match,{stage='snapshot',currentRound=null}={}){
  const state=match?.mapSimulation,rounds=state?.rounds||[],roundReports=rounds.map(summarizeRound);
  const issues=roundReports.flatMap(round=>round.issues.map(issue=>({round:round.n,...issue})));
  const score={home:state?.h||0,away:state?.a||0};
  if(rounds.length!==score.home+score.away)issues.push({code:'score_round_count_mismatch',rounds:rounds.length,score});
  const comp=match?.comps?.[match.curMap];
  for(const side of ['home','away']){
    const agents=comp?.[side]?.agents||[],names=agents.map(entry=>entry.agent);
    if(new Set(names).size!==names.length)issues.push({code:'duplicate_agent',side,agents:names});
    if(agents.length!==5)issues.push({code:'invalid_lineup_size',side,count:agents.length});
  }
  return {
    reportVersion:'map-diagnostic-v2-agents',stage,diagnosticMatch:!!match?.diagnostic,
    agentEngine:{tickSeconds:.1,model:'perceive-decide-resolve',simultaneousResolution:true,simulationTimedEffects:true,tracked:['sighting','shot','damage','kill','coverSeek','ability','abilityObjectPlace','abilityObjectDestroy','abilityObjectExpire'],profiles:['discipline','awareness','coordination','aggression','composure']},
    reproduction:{matchSeed:match?.seed,mapSeed:state?.simulationSeed,mapIndex:match?.curMap,map:comp?.mapName||match?.mapPool?.[match?.curMap],homeStartsAttack:state?.homeStartAtk},
    teams:{home:{id:match?.home?.teamId||match?.home?.id,name:match?.home?.name},away:{id:match?.away?.teamId||match?.away?.id,name:match?.away?.name}},
    composition:{home:comp?.home?.agents?.map(({name,agent,role,mastery,roleFit})=>({name,agent,role,mastery,roleFit})),away:comp?.away?.agents?.map(({name,agent,role,mastery,roleFit})=>({name,agent,role,mastery,roleFit}))},
    state:{running:!!match?.running,playback:match?.playback?{speed:match.playback.speed,paused:match.playback.paused,betweenRounds:match.playback.betweenRounds,stopAfterRound:!!match.playback.stopAfterRound}:null,timeoutQueued:match?.timeoutQueued||null,coordinateProbes:match?.coordinateProbes||[],roundsPlayed:rounds.length,score},
    summary:aggregate(rounds),issues,
    currentRound:currentRound?summarizeRound(currentRound):roundReports.at(-1)||null,
    rounds:roundReports,
    box:match?.box||{},
  };
}
