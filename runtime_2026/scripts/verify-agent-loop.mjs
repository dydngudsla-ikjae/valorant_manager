import assert from 'node:assert/strict';
import { draftPair } from '../../src/core/draft.js';
import { simOneMap } from '../../src/core/round-engine.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { deriveSeed, withSeed } from '../../src/core/rng.js';
import { LEAGUES } from '../../src/data/leagues.js';
import { ROUND_TIMING } from '../../src/core/round-timing.js';
import { WEAPON_DAMAGE } from '../../src/core/combat-model.js';

applyRealStats();
buildAgentPools();
const teams=Object.values(LEAGUES).flatMap(league=>league.teams);
let sightings=0,shots=0,simultaneousTicks=0,coverSeeks=0,coverResets=0,tradeWindowsCreated=0,tradeSupportedShots=0,focusFireShots=0,decisionEntries=0,reasonedDecisions=0,intelUpdates=0,sharedRotations=0,communicatedFacts=0,playerProposals=0,iglDecisions=0,formationChanges=0,footstepsHeard=0,utilityStatusReports=0,iglStateEvaluations=0,executePlans=0,executeCountdowns=0,executeReleases=0,executePromotions=0,staggeredExecutePlans=0,postPlantPlans=0,retakePlans=0,retakeDefuserReleases=0,equipmentSavePlans=0,contextualAbilityUses=0,restoredAbilityPlans=0,spikeEscapes=0,spikeExplosions=0,defenseInfoActions=0,defenseFallbacks=0;const initialFormations=new Set(),iglModes=new Set(),defenseModes=new Set(),executeTasks=new Set(),abilityPhases=new Set();

for(let index=0;index<4;index++){
  const home=teams[index],away=teams[index+8],mapName=['Ascent','Bind','Haven','Lotus'][index];
  const seed=deriveSeed('agent-loop-verification',mapName);
  const comp=withSeed(deriveSeed(seed,'draft'),()=>draftPair(home,away,mapName));
  const result=withSeed(seed,()=>simOneMap(home,away,comp,index%2===0));
  for(const round of result.rounds){
    const events=round.spatial.events,dead=new Set();
    restoredAbilityPlans+=(round.restoredAbilities||[]).length;const abilityEvents=events.filter(event=>event.type==='ability');for(const ability of abilityEvents){if(ability.t>0){assert.ok(ability.t>=3,'non-setup utility cannot be dumped at round start');assert.ok(ability.runtimeDecision?.phase&&ability.runtimeDecision?.reason,'live utility use requires a contextual decision');contextualAbilityUses++;abilityPhases.add(ability.runtimeDecision.phase);}}
    for(const object of round.spatial.abilityObjects||[]){assert.ok(object.activeAt>=object.placedAt&&object.expiresAt>object.activeAt,'ability object lifecycle must be ordered');if(object.destroyedAt!=null)assert.ok(object.destroyedAt>=object.activeAt&&object.destroyedAt<object.expiresAt,'destroyed objects must be active when destroyed');}
    assert.equal(round.spatial.timing?.roundSeconds,ROUND_TIMING.roundSeconds,'round timing must use the shared clock model');
    const plantEvent=events.find(event=>event.type==='plant'),explodeEvent=events.find(event=>event.type==='spikeExplode'),defuseEvent=events.find(event=>event.type==='defuse');
    if(explodeEvent){assert.ok(plantEvent,'spike cannot explode before planting');assert.ok(Math.abs((explodeEvent.t-plantEvent.t)-ROUND_TIMING.spikeSeconds)<=ROUND_TIMING.tickSeconds+.001,'post-plant explosion clock drifted');}
    if(defuseEvent){assert.ok(events.some(event=>event.type==='defuseStart'),'defuse completion requires a start');assert.ok(defuseEvent.progress>=ROUND_TIMING.defuseSeconds,'defuse completed too early');}
    for(const event of events){
      if(event.type==='kill'){assert.ok(!dead.has(event.victim),`duplicate death: ${event.victim}`);dead.add(event.victim);}
      if(event.type==='sighting')sightings++;
      if(event.type==='shot'&&event.bulletsFired!=null)assert.ok(event.bulletsFired>=1&&event.bulletsHit>=0&&event.bulletsHit<=event.bulletsFired,'burst shot must report a valid bullet count');
      if(event.type==='shot'||event.type==='damage')shots++;
      if(event.type==='coverSeek')coverSeeks++;
      if(event.type==='tradeWindow'){tradeWindowsCreated++;assert.ok(event.supporters.length>0&&event.expires>event.t,'trade window requires a nearby supporter and positive duration');}
      if(event.type==='equipmentSavePlan'){equipmentSavePlans++;assert.ok(event.players.length>0&&event.players.every(player=>player.destination&&player.value>=0),'save calls must assign equipment-aware escape routes');}
      if((event.type==='shot'||event.type==='damage')&&event.tradeAttempt)tradeSupportedShots++;
      if((event.type==='shot'||event.type==='damage')&&event.focusFire>0)focusFireShots++;
      if(event.type==='damage'){const expected=WEAPON_DAMAGE[event.weapon]?.[event.hitZone]?.[event.distanceBand];if(event.partialBurst)assert.ok(event.rawDamage>0&&event.rawDamage<=expected,'partial burst damage must stay within weapon body damage');else assert.equal(event.rawDamage,expected,'weapon damage must match weapon, hit zone, and range');assert.ok(event.remainingHP>=0&&event.remainingShield>=0,'damage cannot create negative vitality');}
      if(event.type==='executePlan')executePlans++;
      if(event.type==='executeCountdown')executeCountdowns++;
      if(event.type==='executeRelease')executeReleases++;
      if(event.type==='executePromotion')executePromotions++;
      if(event.type==='spikeEscape')spikeEscapes++;
      if(event.type==='spikeExplode'){spikeExplosions++;for(const victim of event.victims||[]){const death=events.find(candidate=>candidate.type==='spikeExplosionDeath'&&candidate.victim===victim);assert.ok(death&&death.distance<=event.radius+.001,'spike victim must be inside the blast radius');}}
      if(event.type==='defenseInformationAction'){defenseInfoActions++;defenseModes.add(event.mode);}
      if(event.type==='defenseInformationFallback')defenseFallbacks++;
      if(event.type==='sound'&&event.kind==='footstep'){footstepsHeard++;assert.equal(event.movement,'run','walking must never emit footsteps');assert.ok(event.distance<=50.001,'running footsteps exceeded the 50m hearing radius');}
    }
    for(const planEvent of events.filter(event=>event.type==='executePlan')){const points=planEvent.assignments.map(entry=>`${entry.stagingPoint?.x},${entry.stagingPoint?.y}`);assert.ok(planEvent.assignments.every(entry=>entry.stagingPoint&&entry.destination),'execute roles require staging and destination points');assert.equal(new Set(points).size,points.length,'execute staging points must be distinct');for(const assignment of planEvent.assignments)executeTasks.add(assignment.task);const releases=events.filter(event=>event.type==='executeRelease'&&event.planId===planEvent.planId);if(new Set(releases.map(event=>event.releaseAt)).size>=2)staggeredExecutePlans++;}
    for(const postPlant of events.filter(event=>event.type==='postPlantPlan')){postPlantPlans++;assert.equal(new Set(postPlant.assignments.map(entry=>entry.player)).size,postPlant.assignments.length,'post-plant assignments must be unique');if(postPlant.assignments.length>=2)assert.ok(new Set(postPlant.assignments.map(entry=>`${entry.destination.x},${entry.destination.y}`)).size>=2,'post-plant players must not all leave for one point');}
    for(const retake of events.filter(event=>event.type==='retakePlan')){retakePlans++;assert.equal(retake.sequence,'clear_stage_then_defuse','retakes must stage the defuser behind the clearers');assert.equal(new Set(retake.assignments.map(entry=>entry.player)).size,retake.assignments.length,'retake assignments must be unique');if(retake.assignments.length>=2)assert.ok(retake.assignments.some(entry=>entry.task==='defuser_stage')&&retake.assignments.some(entry=>entry.task==='retake_clear'),'multi-player retakes need distinct clear and defuse roles');}
    for(const release of events.filter(event=>event.type==='retakeDefuserRelease')){retakeDefuserReleases++;assert.ok(['clock','clearer_progress'].includes(release.reason)&&release.player,'defuser release needs an explicit trigger and player');}
    const byTick=new Map();
    for(const event of events.filter(event=>event.type==='damage')){const key=event.t.toFixed(2);byTick.set(key,(byTick.get(key)||0)+1);}
    simultaneousTicks+=[...byTick.values()].filter(count=>count>1).length;
    assert.equal(round.spatial.units.length,10,'every round must retain ten agent records');
    assert.ok(round.spatial.units.every(unit=>unit.decisionProfile),'decision profiles must be inspectable');
    assert.ok(round.spatial.teamIntel?.home&&round.spatial.teamIntel?.away,'team shared intel must be inspectable');
    assert.ok(round.spatial.teamCommunication?.teams?.home&&round.spatial.teamCommunication?.teams?.away,'player-to-IGL communication must be inspectable');
    if(round.spatial.executeCoordination){const plan=round.spatial.executeCoordination;assert.equal(new Set(plan.assignments.map(entry=>entry.player)).size,plan.assignments.length,'execute assignments must be unique');for(let i=1;i<plan.timeline.length;i++)assert.ok(plan.timeline[i].t>=plan.timeline[i-1].t,'execute timeline must remain ordered');}
    assert.ok(round.spatial.defenseDecision&&Array.isArray(round.spatial.defenseDecision.timeline),'defense information decisions must be inspectable');assert.ok(round.spatial.defenseDecision.actionsUsed<=round.spatial.defenseDecision.maxActions,'defense must not repeatedly push for information');
    for(const team of Object.values(round.spatial.teamCommunication.teams)){assert.ok(team.igl,'every team needs an acting IGL');assert.equal(Object.keys(team.orders).length,5,'IGL must retain one order per player');assert.ok(Array.isArray(team.orderHistory),'IGL orders must retain a timeline');for(let i=1;i<team.orderHistory.length;i++)assert.ok(team.orderHistory[i].issuedAt>=team.orderHistory[i-1].issuedAt,'order history must remain chronological');communicatedFacts+=team.facts.length;utilityStatusReports+=team.facts.filter(fact=>['utility_unavailable','utility_ready','utility_used'].includes(fact.type)).length;playerProposals+=team.proposals.length;iglDecisions+=team.decisions.length;for(const decision of team.iglState?.timeline||[]){iglStateEvaluations++;iglModes.add(decision.mode);assert.ok(decision.reason&&decision.inputs&&Number.isFinite(decision.inputs.equipmentValue)&&Object.keys(decision.candidates||{}).length,'IGL decisions must retain inputs, equipment value, candidate scores, and a reason');}}
    const attackSide=round.hSide==='atk'?'home':'away',attackComms=round.spatial.teamCommunication.teams[attackSide];assert.ok(['FIVE','ONE_FOUR','ONE_THREE_ONE','TWO_THREE'].includes(attackComms.formationHistory[0].formation),'attack must start in a defined formation');initialFormations.add(attackComms.formationHistory[0].formation);formationChanges+=attackComms.formationHistory.length-1;assert.ok(attackComms.formationHistory.length<=3,'formation must not oscillate during one round');assert.ok((attackComms.iglState?.rotations||0)<=1,'IGL must not ping-pong between sites');
    const intelTimeline=Object.values(round.spatial.teamIntel).flatMap(intel=>intel.timeline||[]);intelUpdates+=intelTimeline.length;
    const physicalEvents=events.filter(event=>['sighting','sound','kill','plant'].includes(event.type));
    if(physicalEvents.length&&intelTimeline.length)assert.ok(Math.min(...intelTimeline.map(entry=>entry.t))+.001>=Math.min(...physicalEvents.map(event=>event.t)),'team intel cannot predate physical information');
    assert.ok(round.spatial.units.every(unit=>Array.isArray(unit.decisionTimeline)&&unit.decisionTimeline.length>0),'every agent must retain a decision timeline');
    for(const unit of round.spatial.units){
      decisionEntries+=unit.decisionTimeline.length;
      reasonedDecisions+=unit.decisionTimeline.filter(entry=>entry.intent&&entry.reason&&Number.isFinite(entry.t)&&entry.position).length;
      sharedRotations+=unit.decisionTimeline.filter(entry=>['rotate_on_confirmed_contact','rotate_after_teammate_death','spike_planted_confirmed'].includes(entry.reason)).length;
      coverResets+=unit.decisionTimeline.filter(entry=>entry.reason==='repeek_after_cover_reset').length;
      for(let i=1;i<unit.decisionTimeline.length;i++)assert.ok(unit.decisionTimeline[i].t>=unit.decisionTimeline[i-1].t,`decision timeline must be ordered: ${unit.name}`);
    }
  }
}

assert.ok(sightings>0,'agent perception produced no sightings');
assert.ok(shots>0,'agent decisions produced no shots');
assert.ok(simultaneousTicks>0,'combat never resolved multiple shots in one tick');
assert.ok(decisionEntries>0&&reasonedDecisions===decisionEntries,'decision entries must contain inspectable reasons and positions');
assert.ok(intelUpdates>0,'agent teams never shared observed information');
assert.ok(sharedRotations>0,'shared information never changed a rotation');
assert.ok(communicatedFacts>0&&playerProposals>0&&iglDecisions>=playerProposals,'player reports and proposals must reach an IGL decision');
assert.ok(initialFormations.size>=3,'tactical selection must exercise multiple attack formations');assert.ok(formationChanges>0,'IGL decisions never changed a formation');
assert.ok(footstepsHeard>0,'running never produced audible footsteps');assert.ok(utilityStatusReports>0,'players never reported utility readiness');
assert.ok(iglStateEvaluations>0&&iglModes.size>=4,'IGL state machine did not exercise enough distinct decisions');
assert.ok(executePlans>0&&executeCountdowns>0&&executeReleases>=executeCountdowns*2,'execute coordination did not reach coordinated release often enough');
assert.ok(staggeredExecutePlans>0&&executeTasks.has('entry')&&executeTasks.has('second_entry')&&executeTasks.has('spike'),'execute roles must stage separately and enter in waves');
assert.ok(postPlantPlans>0,'successful plants must produce distinct post-plant assignments');
assert.ok(retakePlans>0&&retakeDefuserReleases>0,'retakes must stage and explicitly release a defuser');
assert.ok(contextualAbilityUses>0&&abilityPhases.size>=3,'utility decisions must cover multiple live round contexts');assert.ok(restoredAbilityPlans>0,'planned but unused utility must be restored');
assert.ok(spikeExplosions===0||spikeEscapes>0,'a spike explosion must trigger escape decisions');
assert.ok(defenseInfoActions>0&&defenseFallbacks>0,'defense never performed and completed a proactive information action');
assert.ok(coverSeeks>0&&coverResets>0,'agents must take cover and deliberately reset before re-peeking');assert.ok(tradeWindowsCreated>0&&tradeSupportedShots>0,'trade windows must affect subsequent shots');assert.ok(focusFireShots>0,'multiple shooters must create focus-fire pressure');
assert.ok(equipmentSavePlans>0&&iglModes.has('SAVE'),'equipment value must produce actionable save decisions');
console.log(JSON.stringify({maps:4,sightings,shots,simultaneousTicks,coverSeeks,coverResets,tradeWindowsCreated,tradeSupportedShots,focusFireShots,decisionEntries,reasonedDecisions,intelUpdates,sharedRotations,communicatedFacts,playerProposals,iglDecisions,iglStateEvaluations,iglModes:[...iglModes],initialFormations:[...initialFormations],formationChanges,footstepsHeard,utilityStatusReports,executePlans,executeCountdowns,executeReleases,executePromotions,staggeredExecutePlans,executeTasks:[...executeTasks],postPlantPlans,retakePlans,retakeDefuserReleases,equipmentSavePlans,contextualAbilityUses,abilityPhases:[...abilityPhases],restoredAbilityPlans,spikeEscapes,spikeExplosions,defenseInfoActions,defenseFallbacks,defenseModes:[...defenseModes]},null,2));
