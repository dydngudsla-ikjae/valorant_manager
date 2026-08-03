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

function decisionDiagnostics(units=[]){
  const players=[];
  for(const unit of units){
    const timeline=unit.decisionTimeline||[],warnings=[];
    for(const entry of timeline)if(entry.intent==='shoot'&&(entry.exposure||0)>=2)warnings.push({code:'fight_while_outnumbered',t:entry.t,exposure:entry.exposure,target:entry.target});
    for(let index=3;index<timeline.length;index++){
      const window=timeline.slice(index-3,index+1);
      if(window.at(-1).t-window[0].t<=2&&new Set(window.map(entry=>entry.intent)).size>=3)warnings.push({code:'rapid_intent_switching',from:window[0].t,to:window.at(-1).t,intents:window.map(entry=>entry.intent)});
    }
    for(let index=1;index<timeline.length;index++){
      const before=timeline[index-1],after=timeline[index];
      if(before.intent==='move'&&after.intent==='move'&&after.t-before.t>=4&&before.position&&after.position&&Math.hypot(after.position.x-before.position.x,after.position.y-before.position.y)<.75)warnings.push({code:'stalled_movement',from:before.t,to:after.t,position:after.position});
    }
    players.push({player:unit.name,side:unit.side,entries:timeline.length,warnings,timeline});
  }
  return players;
}

function commandCompliance(round){
  const units=new Map((round.spatial?.units||[]).map(unit=>[unit.name,unit])),warnings=[];
  const moving=new Set(['rotate','execute_assignment','take_mid_control','join_main_group','probe_opposite','follow_rotation_sound','continue_probe','join_group','commit_site']);
  const holding=new Set(['wait_for_utility','hold_for_team','save','hold_assignment','gather_more_information']);
  for(const [side,team] of Object.entries(round.spatial?.teamCommunication?.teams||{}))for(const order of team.orderHistory||[]){
    const unit=units.get(order.player),issued=order.issuedAt;if(!unit||!finite(issued)||unit.deathT!=null&&unit.deathT<=issued)continue;
    const window=(unit.decisionTimeline||[]).filter(entry=>entry.t>=issued-.01&&entry.t<=issued+3),expected=moving.has(order.type)?'move':holding.has(order.type)?'hold':null;if(!expected)continue;
    const complied=expected==='move'?window.some(entry=>['move','rotate','objective','cover'].includes(entry.intent)):window.some(entry=>entry.intent==='hold');
    if(!complied)warnings.push({code:'igl_order_not_reflected_in_action',side,player:order.player,order:order.type,issuedAt:issued,expected,observed:window.map(entry=>({t:entry.t,intent:entry.intent,reason:entry.reason}))});
  }
  return{orders:Object.values(round.spatial?.teamCommunication?.teams||{}).reduce((sum,team)=>sum+(team.orderHistory?.length||0),0),warningCount:warnings.length,warnings};
}

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
  const timing=round.spatial?.timing,plant=events.find(event=>event.type==='plant'),defuse=events.find(event=>event.type==='defuse'),explode=events.find(event=>event.type==='spikeExplode');
  if(plant&&explode&&Math.abs((explode.t-plant.t)-(timing?.spikeSeconds??45))>.11)issues.push({code:'invalid_post_plant_duration',elapsed:+(explode.t-plant.t).toFixed(2),expected:timing?.spikeSeconds??45});
  if(defuse&&events.filter(event=>event.type==='defuseStart').length===0)issues.push({code:'defuse_without_start'});
  issues.push(...commandCompliance(round).warnings);
  return issues;
}

function summarizeRound(round){
  const scoreBefore=roundScoreBefore(round),events=round.spatial?.events||[],kills=events.filter(event=>event.type==='kill');
  const abilityEvents=events.filter(event=>event.type==='ability');
  const decisions=decisionDiagnostics(round.spatial?.units||[]);
  const compliance=commandCompliance(round);
  return {
    n:round.n,seed:round.roundSeed,scoreBefore,scoreAfter:{home:round.h,away:round.a},
    sides:{home:round.hSide,away:round.aSide},winner:round.winner,site:round.site,
    buy:{home:round.buyH,away:round.buyA},credits:{
      home:{before:round.economy?.home?.before,spent:round.economy?.home?.spend,afterBuy:round.economy?.home?.afterBuy,afterIncome:round.economy?.home?.after,playersBefore:round.economy?.home?.playerBefore,playersAfterBuy:round.economy?.home?.playerAfterBuy,playersAfterIncome:round.economy?.home?.playerAfter,drops:round.economy?.home?.drops,carried:round.economy?.home?.carried},
      away:{before:round.economy?.away?.before,spent:round.economy?.away?.spend,afterBuy:round.economy?.away?.afterBuy,afterIncome:round.economy?.away?.after,playersBefore:round.economy?.away?.playerBefore,playersAfterBuy:round.economy?.away?.playerAfterBuy,playersAfterIncome:round.economy?.away?.playerAfter,drops:round.economy?.away?.drops,carried:round.economy?.away?.carried},
    },
    tactics:{attack:round.tactics?.attack?.type,defense:round.tactics?.defense?.type,targetSite:round.tactics?.attack?.targetSite},
    outcome:{kills:kills.length,headshots:kills.filter(event=>event.headshot).length,firstBlood:round.fb?.killer,plant:!!round.plant,defuse:!!round.defuse,clutch:round.clutch||null,trades:round.tradeSummary?.completed||0,duration:round.spatial?.duration},
    combat:{
      loadouts:round.loadouts,
      damageEvents:events.filter(event=>event.type==='damage').map(compactEvent),
      killEvents:kills.map(compactEvent),
      coverSeeks:events.filter(event=>event.type==='coverSeek').map(compactEvent),
      equipmentSavePlans:events.filter(event=>event.type==='equipmentSavePlan'),
      sightings:events.filter(event=>event.type==='sighting').map(compactEvent),
      missedShots:events.filter(event=>event.type==='shot'&&event.hit===false).length,
      agentProfiles:(round.spatial?.units||[]).map(({name,side,decisionProfile})=>({name,side,...decisionProfile})),
      decisionTimeline:{format:'per-player intent changes; repeated thoughts sampled every 5 seconds',players:decisions,warningCount:decisions.reduce((sum,player)=>sum+player.warnings.length,0)},
      commandCompliance:compliance,
      survivors:(round.spatial?.units||[]).filter(unit=>unit.deathT==null).map(({name,finalHP,finalShield,shieldType,weapon})=>({name,finalHP,finalShield,shieldType,weapon}))
    },
    preparation:round.preparation,
    timing:round.spatial?.timing||null,
    spike:{escapes:events.filter(event=>event.type==='spikeEscape').map(({t,player,side,remaining,reason,x,y,targetX,targetY})=>({t:+t.toFixed(2),player,side,remaining,reason,from:{x,y},to:{x:targetX,y:targetY}})),explosion:(()=>{const event=events.find(item=>item.type==='spikeExplode');return event?{t:+event.t.toFixed(2),x:event.x,y:event.y,radius:event.radius,victims:event.victims}:null;})()},
    retakePlan:round.spatial?.retakePlan||null,
    defenseDecision:round.spatial?.defenseDecision||null,
    teamIntel:round.spatial?.teamIntel||null,
    teamCommunication:round.spatial?.teamCommunication||null,
    executeCoordination:round.spatial?.executeCoordination||null,
    audio:{model:{walk:'silent',run:{hearingRadius:50,wallOcclusion:false,directionTrackedBySemanticArea:true}},footsteps:events.filter(event=>event.type==='sound'&&event.kind==='footstep').map(({t,listener,side,sourceId,movement,receding,approaching,direction,area,distance,x,y})=>({t:+t.toFixed(2),listener,side,sourceId,movement,receding,approaching,direction,area,distance,x:+x.toFixed(2),y:+y.toFixed(2)}))},
    defenseRotations:events.filter(event=>event.type==='defenseRotation').map(({t,site,source,confidence,players,anchors})=>({t:+t.toFixed(2),site,source,confidence,players,anchors})),
    abilities:{purchases:round.abilityPurchases,restoredUnusedPlans:round.restoredAbilities||[],uses:abilityEvents.map(({t,player,agentName,name,type,mechanic,ult,decisionSkill,decision,runtimeDecision,x,y})=>({t:+t.toFixed(2),player,agent:agentName,name,type,mechanic,ultimate:ult,decisionSkill,plannedDecision:decision,runtimeDecision,x,y})),timing:{count:abilityEvents.length,firstUse:abilityEvents.length?+Math.min(...abilityEvents.map(event=>event.t)).toFixed(2):null,openingBurst:abilityEvents.filter(event=>event.t>0&&event.t<3).length},objects:(round.spatial?.abilityObjects||[]).map(({id,owner,ability,mechanic,hp,placedAt,activeAt,expiresAt,destroyedAt,destroyedBy,x,y})=>({id,owner,ability,mechanic,hp,placedAt,activeAt,expiresAt,destroyedAt,destroyedBy,x,y})),ultState:round.abilityState,orbs:round.spatial?.orbCaptures||[],orbMarkers:(round.spatial?.orbMarkers||[])},
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
    reportVersion:'map-diagnostic-v3-decisions',stage,diagnosticMatch:!!match?.diagnostic,
    agentEngine:{tickSeconds:.1,model:'perceive-decide-resolve',simultaneousResolution:true,simulationTimedEffects:true,locomotionControlledByIntent:true,teamSharedIntel:true,communicationModel:'playerKnowledge -> delayed report/proposal -> IGL verdict -> player order',iglDecisionModel:{intervalSeconds:1,minimumOrderHoldSeconds:4,maxSiteRotations:1,attackModes:['GATHER_INFO','WAIT_UTILITY','COMMIT_SITE','ROTATE_SITE','REGROUP','POST_PLANT_HOLD'],defenseModes:['HOLD_SETUP','REINFORCE','RETAKE','SAVE']},executeModel:{phases:['assembling','countdown','executing'],minimumReadyPlayers:4,assemblyTimeoutSeconds:8,countdownSeconds:1,entrySpacing:{minimum:1.4,ideal:2.7,maximum:5.5},entryRoleInheritance:true},combatModel:{simultaneousShots:true,coverReset:true,weaponRangeDamage:true,playerHeadshotRate:true,focusFire:true,tradeWindowSeconds:2.6,teamworkAdjustedTradeWindow:true,crossfireAndIsolationModifiers:true},movementAudio:{runSpeed:5.4,walkSpeed:3.2,runHearingRadius:50,walkSilent:true,wallOcclusion:false},attackFormations:['FIVE','ONE_FOUR','ONE_THREE_ONE','TWO_THREE'],proposalVerdicts:['approve','reject','recall','hold'],movingIntents:['move','cover','rotate','objective'],tracked:['decisionTimeline','teamIntel','teamCommunication.iglState.timeline','teamCommunication.formationHistory','teamCommunication.orders','executeCoordination.timeline','audio.footsteps','track.intent','track.movementMode','sighting','shot','damage','kill','coverSeek','tradeWindow','ability','abilityObjectPlace','abilityObjectDestroy','abilityObjectExpire'],profiles:['discipline','awareness','coordination','aggression','composure'],decisionReasons:['follow_tactical_route','hold_assigned_angle','new_enemy_contact','reaction_delay','weapon_recovery','outnumbered_exposure','safer_position_found','no_safer_cover','repeek_after_cover_reset','engage_visible_target','fight_while_exposed','rotate_on_confirmed_contact','rotate_after_teammate_death','spike_planted_confirmed','igl_approved_utility_wait','igl_approved_sound_probe','igl_held_sound_probe','assemble_for_execute','execute_entry_release','entry_role_inherited','join_thinning_main_group','retrieve_dropped_spike','plant_spike']},
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
