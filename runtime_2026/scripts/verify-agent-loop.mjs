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
let sightings=0,shots=0,simultaneousTicks=0,coverSeeks=0,coverResets=0,siteConcedes=0,defenseSupportStages=0,defenseSupportReleases=0,defenseSupportCancels=0,persistentDamageTicks=0,persistentDamageTotal=0,abilityHazardEscapes=0,turretBursts=0,turretDamage=0,turretDeactivations=0,turretReactivations=0,alarmbotAcquisitions=0,alarmbotMoves=0,alarmbotTriggers=0,vulnerableApplications=0,vulnerableDamageEvents=0,lockdownContests=0,lockdownEscapes=0,lockdownPulses=0,lockdownDetains=0,lockdownDamageEvents=0,lockdownDestroyed=0,paranoiaCasts=0,paranoiaHitsPlanned=0,nearsightApplications=0,shortTeleportStarts=0,shortTeleportCompletes=0,globalTeleportStarts=0,globalTeleportCompletes=0,globalTeleportCancels=0,smokeSightBlocks=0,tradeWindowsCreated=0,tradeSupportedShots=0,focusFireShots=0,decisionEntries=0,reasonedDecisions=0,intelUpdates=0,sharedRotations=0,communicatedFacts=0,playerProposals=0,iglDecisions=0,formationChanges=0,footstepsHeard=0,utilityStatusReports=0,iglStateEvaluations=0,executePlans=0,executeCountdowns=0,executeReleases=0,executePromotions=0,staggeredExecutePlans=0,postPlantPlans=0,retakePlans=0,retakeDefuserReleases=0,protectedDefuseShots=0,equipmentSavePlans=0,contextualAbilityUses=0,abilityHeals=0,utilityAffectedShots=0,restoredAbilityPlans=0,spikeEscapes=0,spikeExplosions=0,defenseInfoActions=0,defenseFallbacks=0;const initialFormations=new Set(),iglModes=new Set(),defenseModes=new Set(),executeTasks=new Set(),abilityPhases=new Set(),turretShotAt=new Map(),turretReactivationAt=new Map();
let breachFlashCasts=0,breachBlindApplications=0,breachConcussCasts=0,breachConcussApplications=0,aftershockCasts=0,aftershockTicks=0,aftershockDamage=0;
let razeExplosiveCasts=0,razeExplosiveImpacts=0,razeExplosiveDamage=0,razeExplosiveEscapes=0;
let boomBotAcquires=0,boomBotMoves=0,boomBotTriggers=0,blastPackBoosts=0,blastPackDetonations=0;
let retakeUtilityWaitStarts=0,retakeUtilityWaitExtensions=0,retakeUtilityResumes=0,retakeUtilityWaitCancels=0,retakeUtilityForces=0;
let disengageFireShots=0,disengageFireHits=0,disengageFireDamage=0;
let viperToxinActivations=0,viperToxinDeactivations=0,toxinDecayEvents=0,toxinRecoveryEvents=0,viperPitActivations=0,viperPitCollapses=0,viperPitGeometryRejects=0;
let trademarkTriggers=0,trademarkDetonations=0,trademarkSlows=0;
let rendezvousTeleports=0;
let chamberWeaponEquips=0,chamberWeaponShots=0,tourSlowZones=0,tourSlows=0;
let fadeHauntScans=0,fadeHauntReveals=0,fadeProwlerMoves=0,fadeProwlerBites=0,fadeProwlerHits=0,fadeSeizes=0,fadeSeizeTargets=0,fadeNightfalls=0,fadeNightfallTargets=0,fadeDecayApplied=0,fadeDecayRecovered=0;
let yoruFakeoutMoves=0,yoruFakeoutFlashes=0,yoruFakeoutBlindTargets=0,yoruBlindsideCasts=0,yoruBlindsideTargets=0,yoruGatecrashMoves=0,yoruGatecrashResolves=0,yoruGatecrashFakes=0,yoruDriftStarts=0,yoruDriftEnds=0;
let neonFastLanes=0,neonRelayCasts=0,neonRelayTargets=0,neonRelayConcusses=0,neonHighGearStarts=0,neonSlideDistance=0,neonOverdriveStarts=0,neonOverdriveEnds=0,neonOverdriveShots=0;
let tejoDrones=0,tejoDronePulses=0,tejoSuppressions=0,tejoSpecialCasts=0,tejoSalvos=0,tejoSalvoImpacts=0,tejoArmageddons=0,tejoArmageddonImpacts=0;
let brimIncendiaries=0,brimIncendiaryDamage=0,brimStims=0,brimStimApplications=0,brimSmokes=0,brimOrbitals=0,brimOrbitalWarnings=0,brimOrbitalDamage=0;
let phoenixCurveballs=0,phoenixCurveballHits=0,phoenixBlazes=0,phoenixHotHands=0,phoenixFireDamage=0,phoenixSelfHeals=0,phoenixRunStarts=0,phoenixRunReturns=0;
let skyeRegrowths=0,skyeHeals=0,skyeTrailblazers=0,skyeTrailMoves=0,skyePounces=0,skyeLights=0,skyeLightHits=0,skyeSeekers=0,skyeSeekerMoves=0,skyeSeekerHits=0;
let kayoFragments=0,kayoFragmentPulses=0,kayoFlashes=0,kayoZeroPlacements=0,kayoZeroPoints=0,kayoSuppressions=0,kayoNullStarts=0,kayoNullPulses=0,kayoDowns=0,kayoRevives=0;
let gekkoMosh=0,gekkoMoshExplosions=0,gekkoWingmen=0,gekkoWingmanMoves=0,gekkoWingmanConcusses=0,gekkoDizzies=0,gekkoDizzyShots=0,gekkoThrashes=0,gekkoThrashMoves=0,gekkoThrashDetonations=0,gekkoReclaims=0,gekkoWingmanPlants=0,gekkoWingmanDefuses=0;
let sageBarriers=0,sageBarrierFortifies=0,sageBarrierBlocks=0,sageBarrierDamage=0,sageSlows=0,sageSlowTargets=0,sageHealingStarts=0,sageHealingTicks=0,sageResurrectionStarts=0,sageResurrections=0;
let cloveMeddles=0,cloveMeddleTargets=0,cloveMeddleRecoveries=0,cloveRuses=0,clovePostDeathRuses=0,clovePickMeUps=0,cloveRevives=0,cloveStabilizations=0,cloveReviveExpiries=0;
let deadlockGravNets=0,deadlockGravTargets=0,deadlockGravRemovals=0,deadlockSensors=0,deadlockSensorTriggers=0,deadlockSensorConcusses=0,deadlockMeshes=0,deadlockMeshBlocks=0,deadlockCaptures=0,deadlockFrees=0,deadlockResolves=0;
let harborStorms=0,harborStormTargets=0,harborTides=0,harborTideCrossings=0,harborCoves=0,harborCoveShields=0,harborCoveDamage=0,harborCoveBreaks=0,harborReckonings=0,harborReckoningHits=0,harborReckoningStops=0;
let isoContingencies=0,isoContingencyAdvances=0,isoUndercuts=0,isoUndercutTargets=0,isoDoubleTapChannels=0,isoDoubleTapActivations=0,isoShieldBreaks=0,isoOrbSpawns=0,isoOrbShots=0,isoContracts=0,isoContractResolves=0;
let reynaLeers=0,reynaLeerTargets=0,reynaSoulOrbs=0,reynaSoulOrbExpires=0,reynaDevours=0,reynaDevourTicks=0,reynaDismisses=0,reynaDismissEnds=0,reynaEmpresses=0,reynaAutomaticDevours=0;
let tripwireUses=0,tripwireTriggers=0,tripwireResolves=0,tripwireConcusses=0;const tripwireDiagnostics=[];
let spycamTags=0,spycamDestroyed=0;
let neuralCasts=0,neuralPulses=0;
let shearTriggers=0,shearBlocked=0,shearExpires=0;
let arcRoseCasts=0,arcRoseHits=0;
let razorvineEntries=0,razorvineDamage=0,razorvineEscapes=0;
let steelGardenCasts=0,steelGardenPulses=0,steelGardenJams=0,steelGardenRestores=0;
let reconPulses=0,reconReveals=0,droneMoves=0,droneTags=0,droneRevealPulses=0,shockLaunches=0,shockDamage=0,furyCasts=0,furyShots=0,furyHits=0;
let astraStarsUsed=0,gravityPulls=0,gravityResolves=0,gravityFragiles=0,novaDetonations=0,novaConcusses=0,nebulaPlacements=0,cosmicDivides=0,cosmicBlocks=0;

for(let index=0;index<7;index++){
  const home=teams[index],away=teams[index+8],mapName=['Ascent','Bind','Haven','Lotus','Sunset','Icebox','Pearl'][index];
  const seed=deriveSeed('agent-loop-verification',mapName);
  const comp=withSeed(deriveSeed(seed,'draft'),()=>draftPair(home,away,mapName));
  if(index===0){const duelist=comp.home.agents.find(entry=>entry.role==='DUE')||comp.home.agents[0];duelist.agent='Yoru';}
  if(index===1){const duelist=comp.home.agents.find(entry=>entry.role==='DUE')||comp.home.agents[0],sentinel=comp.away.agents.find(entry=>entry.role==='SEN')||comp.away.agents[0];duelist.agent='Neon';sentinel.agent='Sage';}
  if(index===2){const initiator=comp.home.agents.find(entry=>entry.role==='INI')||comp.home.agents[1],awayFlex=comp.away.agents.find(entry=>entry.role==='FLEX')||comp.away.agents[4],awayGekko=comp.away.agents.find(entry=>entry!==awayFlex&&entry.role==='SEN')||comp.away.agents.find(entry=>entry!==awayFlex&&entry!==initiator)||comp.away.agents[0],awayController=comp.away.agents.find(entry=>entry!==awayFlex&&entry!==awayGekko&&entry.role==='CON')||comp.away.agents.find(entry=>entry!==awayFlex&&entry!==awayGekko);initiator.agent='Tejo';awayFlex.agent='KAY/O';awayGekko.agent='Gekko';if(awayController)awayController.agent='Clove';}
  if(index===3){const controller=comp.home.agents.find(entry=>entry.role==='CON')||comp.home.agents[2],sentinel=comp.home.agents.find(entry=>entry.role==='SEN')||comp.home.agents[4],awayDuelist=comp.away.agents.find(entry=>entry.role==='DUE')||comp.away.agents[0],awayInitiator=comp.away.agents.find(entry=>entry.role==='INI')||comp.away.agents[1];controller.agent='Brimstone';sentinel.agent='Deadlock';awayDuelist.agent='Phoenix';awayInitiator.agent='Skye';}
  if(index===4){const controller=comp.home.agents.find(entry=>entry.role==='CON')||comp.home.agents[2];controller.agent='Harbor';}
  if(index===5){const duelist=comp.home.agents.find(entry=>entry.role==='DUE')||comp.home.agents[0];duelist.agent='Iso';}
  if(index===6){const duelist=comp.home.agents.find(entry=>entry.role==='DUE')||comp.home.agents[0];duelist.agent='Reyna';}
  const result=withSeed(seed,()=>simOneMap(home,away,comp,index%2===0));
  for(const round of result.rounds){
    turretShotAt.clear();turretReactivationAt.clear();const events=round.spatial.events,dead=new Set();
    restoredAbilityPlans+=(round.restoredAbilities||[]).length;const abilityEvents=events.filter(event=>event.type==='ability');for(const ability of abilityEvents){if(ability.t>0){assert.ok(ability.t>=3,'non-setup utility cannot be dumped at round start');assert.ok(ability.runtimeDecision?.phase&&ability.runtimeDecision?.reason,'live utility use requires a contextual decision');contextualAbilityUses++;abilityPhases.add(ability.runtimeDecision.phase);}}
    const astraUsesByPlayer=new Map();for(const ability of abilityEvents.filter(event=>event.agentName==='Astra'&&event.sharedResource==='astra_star'))astraUsesByPlayer.set(ability.player,(astraUsesByPlayer.get(ability.player)||0)+1);for(const count of astraUsesByPlayer.values())assert.ok(count<=5,'Astra may not consume more than five shared Stars in one round');
    for(const object of round.spatial.abilityObjects||[]){assert.ok(object.activeAt>=object.placedAt&&object.expiresAt>object.activeAt,'ability object lifecycle must be ordered');if(object.destroyedAt!=null)assert.ok(object.destroyedAt>=object.placedAt&&object.destroyedAt<object.expiresAt,`destroyed object must be present: ${JSON.stringify({ability:object.ability,mechanic:object.mechanic,placedAt:object.placedAt,activeAt:object.activeAt,destroyedAt:object.destroyedAt,expiresAt:object.expiresAt,destroyedBy:object.destroyedBy})}`);}
    assert.equal(round.spatial.timing?.roundSeconds,ROUND_TIMING.roundSeconds,'round timing must use the shared clock model');
    const plantEvent=events.find(event=>event.type==='plant'),explodeEvent=events.find(event=>event.type==='spikeExplode'),defuseEvent=events.find(event=>event.type==='defuse');
    if(explodeEvent){assert.ok(plantEvent,'spike cannot explode before planting');assert.ok(Math.abs((explodeEvent.t-plantEvent.t)-ROUND_TIMING.spikeSeconds)<=ROUND_TIMING.tickSeconds+.001,'post-plant explosion clock drifted');}
    if(defuseEvent){assert.ok(events.some(event=>event.type==='defuseStart'),'defuse completion requires a start');assert.ok(defuseEvent.progress>=ROUND_TIMING.defuseSeconds,'defuse completed too early');}
    for(const event of events){
      if(event.type==='kill'){assert.ok(!dead.has(event.victim),`duplicate death: ${event.victim}`);dead.add(event.victim);assert.deepEqual((event.assistDetails||[]).map(detail=>detail.player),event.assists||[],'assist diagnostics must match awarded assists');for(const detail of event.assistDetails||[]){if(detail.type==='damage'){assert.ok(detail.damage>=50&&event.t-detail.lastAt<=10.001,'damage assist must contain 50 recent damage within ten seconds');}else{assert.ok(detail.ability&&event.t<=detail.assistUntil+.001,'utility assist must remain inside its effect and assist-tail window');}}}
      if(event.type==='sighting')sightings++;
      if(event.type==='shot'&&event.bulletsFired!=null)assert.ok(event.bulletsFired>=1&&event.bulletsHit>=0&&event.bulletsHit<=event.bulletsFired,'burst shot must report a valid bullet count');
      if(event.type==='shot'&&event.disengageFire){disengageFireShots++;disengageFireHits+=event.bulletsHit;assert.equal(event.bulletsFired,1,'disengage fire must remain a single covering shot');assert.ok(event.accuracy>=.1&&event.accuracy<=.34,'disengage fire accuracy must remain bounded');}
      if(event.type==='damage'&&event.disengageFire){disengageFireDamage+=event.amount;assert.equal(event.simultaneous,false,'covering fire resolves before movement rather than in the main simultaneous volley');}
      if(event.type==='shot'||event.type==='damage')shots++;
      if(event.type==='coverSeek')coverSeeks++;
      if(event.type==='siteConcede'){siteConcedes++;assert.ok(Number.isFinite(event.x)&&Number.isFinite(event.y)&&event.reason==='anchor_concedes_for_retake','site concessions need a valid retake staging destination');assert.equal(typeof event.siteAnchor,'boolean','site concessions must identify whether the player was an assigned site anchor');assert.ok(event.confirmedAttackers>=2,'site concessions require confirmed multi-player pressure');assert.ok(event.backupEta==null||Number.isFinite(event.backupEta),'site concessions must report a finite backup ETA or no surviving backup');}
      if(event.type==='defenseRotation'){assert.equal(event.assignments?.length,event.players?.length,'rotation diagnostics need one ETA assignment per supporting player');assert.ok(event.assignments.every(assignment=>Number.isFinite(assignment.eta)&&assignment.fromZone),'rotation assignments need origin zones and finite arrival estimates');if(!['spike_planted','teammate_death'].includes(event.source)&&event.confidence<.9)assert.equal(event.supportLimit,1,'sub-confirmed contact may only pull one early defender');}
      if(event.type==='defenseSupportStage'){defenseSupportStages++;assert.ok(event.player&&event.site&&event.waited>=0,'staged support must report its player, site, and travel time');}
      if(event.type==='defenseSupportRelease'){defenseSupportReleases++;assert.ok(event.anchor&&event.reason==='anchor_rallied'&&event.waited>=0,'support release requires a rallied anchor and wait time');}
      if(event.type==='defenseSupportCancel'){defenseSupportCancels++;assert.equal(event.reason,'intel_expired','staged support may only cancel stale contact in this model');}
      if(event.type==='tradeWindow'){tradeWindowsCreated++;assert.ok(event.supporters.length>0&&event.expires>event.t,'trade window requires a nearby supporter and positive duration');}
      if(event.type==='equipmentSavePlan'){equipmentSavePlans++;assert.ok(event.players.length>0&&event.players.every(player=>player.destination&&player.value>=0),'save calls must assign equipment-aware escape routes');}
      if(event.type==='abilityHeal'){abilityHeals++;assert.ok(event.amount>0&&event.remainingHP<=100&&event.remainingHP>event.beforeHP,'healing must restore real HP without exceeding 100');}
      if(event.type==='abilityDamage'&&event.persistent){
        persistentDamageTicks++;persistentDamageTotal+=event.amount;
        assert.ok(['gekko_mosh','remote_area_damage','acid_pool','brim_incendiary','brim_orbital_strike','phoenix_blaze','phoenix_hot_hands'].includes(event.mechanic),'only configured persistent area damage may emit damage ticks');
        assert.ok(event.tickSeconds>0&&event.tickSeconds<=ROUND_TIMING.tickSeconds+.001,`persistent damage tick must follow the shared simulation clock: ${JSON.stringify(event)}`);
        assert.ok(event.rawDamage<=event.damagePerSecond*ROUND_TIMING.tickSeconds*(event.damageMultiplier||1)+.001,`persistent damage may not exceed its configured DPS and debuff multiplier: ${JSON.stringify(event)}`);
      }
      if(event.type==='abilityHazardEscape'){abilityHazardEscapes++;assert.ok(event.player&&Number.isFinite(event.x)&&Number.isFinite(event.y),'hazard escape needs a player and valid destination');}
      if(event.type==='turretBurst'){turretBursts++;turretDamage+=event.amount;assert.equal(event.bullets,3,'Killjoy turret must fire three-round bursts');assert.ok([8,6,4].includes(event.damagePerBullet),'turret damage must use a configured distance band');assert.equal(event.baseDamage,event.bullets*event.damagePerBullet,'turret base damage must equal bullets times band damage');assert.equal(event.rawDamage,event.baseDamage*(event.damageMultiplier||1),'turret damage must apply Vulnerable after its distance band');assert.ok(event.distance<=40,'turret may not acquire targets outside its detection radius');assert.ok(event.aimDelta<=90,'turret may only acquire targets inside its forward 180-degree arc');const prior=turretShotAt.get(event.objectId);if(prior!=null)assert.ok(event.t-prior>=.75-ROUND_TIMING.tickSeconds-.001,'turret bursts must respect the modeled recovery interval');turretShotAt.set(event.objectId,event.t);}
      if(event.type==='abilityObjectDeactivate'&&event.ability==='Turret')turretDeactivations++;
      if(event.type==='abilityObjectReactivationStart'&&event.ability==='Turret')turretReactivationAt.set(event.objectId,event.readyAt);
      if(event.type==='abilityObjectReactivate'&&event.ability==='Turret'){turretReactivations++;assert.ok(event.t>=(turretReactivationAt.get(event.objectId)??event.t)-.001,'turret must finish its two-second reactivation windup');}
      if(event.type==='alarmbotAcquire'){alarmbotAcquisitions++;assert.ok(event.distance<=7.001,'Alarmbot may only acquire targets within its configured detection radius');}
      if(event.type==='alarmbotMove'){alarmbotMoves++;assert.equal(event.speed,8.25,'Alarmbot must use the post-13.00 modeled movement speed');}
      if(event.type==='alarmbotTrigger'){alarmbotTriggers++;assert.ok(event.radius===3.5&&event.target,'Alarmbot trigger must retain its modeled explosion radius and target');}
      if(event.type==='vulnerableApplied'){vulnerableApplications++;const expectedDuration=event.ability==='Snake Bite'?2:event.ability==='Gravity Well'?2.5:4;assert.equal(event.duration,expectedDuration,'Vulnerable duration must match its source ability');assert.equal(event.multiplier,2,'Vulnerable must double subsequent damage');}
      if(event.type==='viperToxinActivate'){viperToxinActivations++;assert.ok(['Poison Cloud','Toxic Screen'].includes(event.source)&&event.fuel>=30&&event.activeSources.includes(event.source),'Viper smoke activation requires a source and sufficient shared fuel');}
      if(event.type==='viperToxinDeactivate'){viperToxinDeactivations++;assert.ok(['uptime_complete','owner_death'].includes(event.reason)&&event.cooldownUntil>=event.t+5-.001,'Viper smoke deactivation requires a five-second cooldown');}
      if(event.type==='toxinDecay'){toxinDecayEvents++;assert.ok(event.amount>0&&event.remainingHP>=1&&event.recoverable>=event.amount,'Toxin decay must be non-lethal and recoverable');if(event.initial)assert.ok(event.requested>=10,'first toxin contact must request ten instant Decay before the one-health floor');}
      if(event.type==='toxinDecayRecovery'){toxinRecoveryEvents++;assert.ok(event.amount>0&&event.amount<=2.001&&event.remaining>=0,'Toxin Decay must recover at no more than 20 health per second');}
      if(event.type==='viperPitActivate'){viperPitActivations++;assert.ok(event.integrity===8&&event.radius===12,'Viper Pit must begin with eight seconds of integrity and its modeled radius');}
      if(event.type==='viperPitCollapse'){viperPitCollapses++;assert.ok(['owner_dead','integrity_depleted'].includes(event.reason)&&(event.reason==='owner_dead'||event.integrity===0),'Viper Pit may only collapse on death or depleted integrity');}
      if(event.type==='viperPitGeometryReject'){viperPitGeometryRejects++;assert.ok(event.directDistance<=event.radius+.001&&(!event.reachable||event.pathDistance>event.radius),'Pit geometry rejection requires a wall-detoured or unreachable point inside the raw circle');}
      if(event.type==='trademarkTrigger'){trademarkTriggers++;assert.ok(event.distance<=10.001&&event.detonateAt-event.t>=.899,'Trademark must detect within ten metres and preserve its warning delay');}
      if(event.type==='trademarkDetonate'){trademarkDetonations++;assert.ok(event.radius===6&&event.affected.length>=0,'Trademark detonation must create its modeled slow field');}
      if(event.type==='slowApplied'&&event.ability==='Trademark'){trademarkSlows++;assert.ok(event.duration===4&&event.moveMultiplier===.5,'Trademark must apply its four-second movement slow');}
      if(event.type==='rendezvousTeleport'){rendezvousTeleports++;assert.ok(event.distance<=18.001&&event.distance>=2.999&&event.equipDelay===.7&&Math.abs((event.cooldownUntil-event.t)-30)<.01,`Rendezvous must teleport from its live radius and enforce equip and cooldown delays: ${JSON.stringify(event)}`);}
      if(event.type==='chamberWeaponEquip'){chamberWeaponEquips++;assert.ok(['Headhunter','TourDeForce'].includes(event.weapon)&&event.ammo>=1,'Chamber weapon equip needs a supported weapon and ammunition');if(event.weapon==='TourDeForce')assert.equal(event.ammo,5,'Tour De Force must equip five rounds');}
      if(event.type==='chamberWeaponShot'){chamberWeaponShots++;assert.ok(event.remainingAmmo>=0,'Chamber ammunition cannot become negative');}
      if(event.type==='tourDeForceSlowZone'){tourSlowZones++;assert.equal(event.radius,6,'Tour De Force kill zone uses the explicit simulator radius');assert.ok(Math.abs(event.expiresAt-event.t-4)<.01,'Tour De Force kill slow must last four seconds');}
      if(event.type==='slowApplied'&&event.ability==='Tour De Force'){tourSlows++;assert.equal(event.moveMultiplier,.5,'Tour De Force slow must use its modeled movement multiplier');}
      if(event.type==='tripwireTrigger'){tripwireTriggers++;assert.ok(event.distanceToWire<=.801&&event.detonateAt-event.t>=1.499,'Trapwire must trigger on its segment and preserve its delay');assert.equal(event.slowSeconds,2,'Trapwire must apply its current slow duration');}
      if(event.type==='ability'&&event.name==='Trapwire')tripwireUses++;
      if(event.type==='tripwireResolve'){tripwireResolves++;assert.ok(event.reactivateAt-event.t>=.499,'Trapwire must preserve its reactivation delay');}
      if(event.type==='concussApplied'&&event.ability==='Trapwire'){tripwireConcusses++;assert.equal(event.duration,3,'Trapwire concuss duration drifted');}
      if(event.type==='tripwireDiagnostic')tripwireDiagnostics.push(event);
      if(event.type==='spycamTag'){spycamTags++;assert.ok(event.distance<=25.001&&event.revealSeconds===2&&event.nextTagAt-event.t>=5.999,'Spycam tag must preserve range, reveal, and dart cooldown');}
      if(event.type==='abilityObjectDestroy'&&event.mechanic==='spycam_recon'){spycamDestroyed++;assert.ok(event.rechargeAt-event.t>=44.999,'destroyed Spycam must start its cooldown');}
      if(event.type==='neuralTheftCast'){neuralCasts++;assert.ok(event.distance<=18.001&&event.pulseDelay===4,'Neural Theft requires a nearby corpse and its second-pulse delay');}
      if(event.type==='neuralTheftPulse'){neuralPulses++;assert.ok([1,2].includes(event.pulse)&&Array.isArray(event.affected),'Neural Theft pulse must identify its sequence and revealed survivors');}
      if(event.type==='shearTrigger'){shearTriggers++;shearBlocked+=event.blocked.length;assert.ok(event.distance<=2.001&&event.wallDuration===7.8&&event.wallActiveUntil-event.t>=7.799,'Shear must isolate only after its trigger and preserve its wall duration');}
      if(event.type==='shearExpire')shearExpires++;
      if(event.type==='arcRoseFlash'){arcRoseCasts++;arcRoseHits+=event.hits.length;assert.ok(event.duration===2.25&&event.maxDistance===25&&event.viewAngle===75,'Arc Rose must preserve its modeled flash geometry');for(const hit of event.hits)assert.ok(hit.distance<=25.001&&hit.lookDelta<=75.001,'Arc Rose may only blind visible enemies looking toward it');}
      if(event.type==='razorvineEnter'){razorvineEntries++;assert.ok(event.radius===6&&event.moveMultiplier===.5,'Razorvine must apply its modeled area and slow');}
      if(event.type==='abilityDamage'&&event.mechanic==='vyse_razorvine'){razorvineDamage+=event.amount;assert.equal(event.movementRequired,true,`Razorvine may only damage a moving target: ${JSON.stringify(event)}`);assert.ok(event.baseDamage<=1.501,'Razorvine tick damage exceeded its DPS model');}
      if(event.type==='abilityHazardEscape'&&event.ability==='Razorvine')razorvineEscapes++;
      if(event.type==='steelGardenCast'){steelGardenCasts++;assert.ok(event.windup===3.4&&event.radius===32&&event.duration===8,'Steel Garden must preserve windup, range, and jam duration');}
      if(event.type==='steelGardenPulse'){steelGardenPulses++;assert.ok(event.radius===32&&Array.isArray(event.affected),'Steel Garden pulse must expose its affected players');}
      if(event.type==='weaponJammed'){steelGardenJams++;assert.equal(event.fallback,'Classic','Steel Garden must temporarily replace a jammed primary with Classic');assert.equal(event.duration,8,'Steel Garden jam duration drifted');assert.ok((WEAPON_DAMAGE[event.weapon]?.cost||0)>=900||event.weapon==='TourDeForce','Steel Garden may only jam a primary-class weapon');}
      if(event.type==='weaponJamEnd'){steelGardenRestores++;assert.ok(event.player&&event.weapon,'Steel Garden must restore the original weapon after the jam');}
      if(event.type==='reconBoltPulse'){reconPulses++;reconReveals+=event.affected.length;assert.ok(event.radius===32.5&&event.revealSeconds===1&&event.pulse>=1,'Recon Bolt pulse rules drifted');}
      if(event.type==='owlDroneMove')droneMoves++;
      if(event.type==='owlDroneTag'){droneTags++;assert.ok(event.distance<=8.001&&event.pulses===3&&event.pulseInterval===1,'Owl Drone tag rules drifted');}
      if(event.type==='owlDroneRevealPulse'){droneRevealPulses++;assert.ok(event.target&&[1,2,3].includes(event.pulse),'Owl Drone dart must reveal the tagged target in three pulses');}
      if(event.type==='shockBoltLaunch'){shockLaunches++;assert.ok(event.flightTime===.8&&event.radius===8&&event.maxDamage===75,'Shock Bolt launch model drifted');}
      if(event.type==='abilityDamage'&&event.mechanic==='shock_bolt'){shockDamage+=event.amount;assert.ok(event.baseDamage>=10&&event.baseDamage<=75,'Shock Bolt radial damage must remain in its falloff band');}
      if(event.type==='huntersFuryCast'){furyCasts++;assert.ok(event.shots===3&&event.damage===80&&event.range===60&&event.width===8,'Hunter’s Fury cast rules drifted');}
      if(event.type==='huntersFuryShot'){furyShots++;furyHits+=event.hits.length;assert.ok([1,2,3].includes(event.shot)&&event.damage===80,'Hunter’s Fury must fire three indexed 80-damage beams');}
      if(event.type==='ability'&&event.agentName==='Astra'&&event.sharedResource==='astra_star'){astraStarsUsed++;assert.ok(event.remaining>=0&&event.remaining<=4,'Astra shared star inventory must remain bounded');}
      if(event.type==='gravityWellPull'){gravityPulls++;assert.ok(event.radius===4.75&&Array.isArray(event.affected),'Gravity Well pull must expose its area and affected players');}
      if(event.type==='gravityWellResolve'){gravityResolves++;gravityFragiles+=event.affected.length;assert.equal(event.fragileSeconds,2.5,'Gravity Well Fragile duration drifted');}
      if(event.type==='novaPulseDetonate'){novaDetonations++;novaConcusses+=event.affected.length;assert.ok(event.startup===1&&event.concussSeconds===2.5&&event.radius===4.75,'Nova Pulse timing or area drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='astra_nebula'){nebulaPlacements++;assert.ok(event.radius===4.75,'Nebula radius drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='cosmic_divide')cosmicDivides++;
      if(event.type==='cosmicDivideBlock'){cosmicBlocks++;assert.ok(event.source&&event.target,'Cosmic Divide must identify the blocked shot');}
      if(event.type==='fadeHauntScan'){fadeHauntScans++;fadeHauntReveals+=event.affected.length;assert.ok(event.radius===30&&event.duration<=1.501,'Haunt scan area or active duration drifted');}
      if(event.type==='fadeProwlerMove')fadeProwlerMoves++;
      if(event.type==='fadeProwlerBite'){fadeProwlerBites++;if(event.landed)fadeProwlerHits++;assert.equal(event.delay,.6,'Prowler bite delay drifted');}
      if(event.type==='fadeSeizeDetonate'){fadeSeizes++;fadeSeizeTargets+=event.affected.length;assert.ok(event.radius===6.5&&event.duration===4.5,'Seize area or tether duration drifted');}
      if(event.type==='fadeNightfallWave'){fadeNightfalls++;fadeNightfallTargets+=event.affected.length;assert.ok(event.width===20&&event.duration===8,'Nightfall width or debuff duration drifted');}
      if(event.type==='fadeDecayApplied'){fadeDecayApplied+=event.amount;assert.ok(event.amount>0&&event.amount<=75&&event.remainingHP>=1,'Fade Decay must remain non-lethal and capped');}
      if(event.type==='fadeDecayRecovered'){fadeDecayRecovered+=event.amount;assert.ok(event.amount>=0&&event.remainingHP<=100,'Fade Decay recovery must respect the health cap');}
      if(event.type==='yoruFakeoutMove')yoruFakeoutMoves++;
      if(event.type==='yoruFakeoutFlash'){yoruFakeoutFlashes++;yoruFakeoutBlindTargets+=event.affected.length;assert.ok(event.delay===.8&&event.duration===2,'Fakeout flash timing drifted');}
      if(event.type==='yoruBlindsideCast'){yoruBlindsideCasts++;yoruBlindsideTargets+=event.hits.length;assert.ok(event.delay===.6&&event.duration===1.5,'Blindside timing drifted');}
      if(event.type==='yoruGatecrashMove')yoruGatecrashMoves++;
      if(event.type==='yoruGatecrashResolve'){yoruGatecrashResolves++;if(event.fake)yoruGatecrashFakes++;assert.equal(event.delay,.5,'Gatecrash teleport delay drifted');}
      if(event.type==='yoruDriftStart'){yoruDriftStarts++;assert.ok(event.duration===10&&event.exitDelay===.8,'Dimensional Drift duration drifted');}
      if(event.type==='yoruDriftEnd'){yoruDriftEnds++;assert.equal(event.exitDelay,.8,'Dimensional Drift exit delay drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='neon_fast_lane'){neonFastLanes++;assert.ok(Math.abs((event.expiresAt-event.activeAt)-6)<.001,'Fast Lane lifecycle drifted');}
      if(event.type==='neonRelayBoltCast'){neonRelayCasts++;neonRelayTargets+=event.hits.length;assert.ok(event.bounces===2&&event.radius===6&&event.duration===2.5,'Relay Bolt geometry drifted');}
      if(event.type==='concussApplied'&&event.ability==='Relay Bolt'){neonRelayConcusses++;assert.equal(event.duration,2.5,'Relay Bolt concuss duration drifted');}
      if(event.type==='neonHighGearStart'){neonHighGearStarts++;neonSlideDistance+=event.slideDistance;assert.ok(event.sprintSeconds===16&&event.fullRechargeSeconds===60&&event.slideDistance<=8.01,'High Gear fuel or slide drifted');}
      if(event.type==='neonOverdriveStart'){neonOverdriveStarts++;assert.ok(event.duration===20&&event.bodyDamage===18&&event.headDamage===54,'Overdrive weapon profile drifted');}
      if(event.type==='neonOverdriveEnd')neonOverdriveEnds++;
      if(event.type==='shot'&&event.weapon==='Overdrive')neonOverdriveShots++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='tejo_stealth_drone'){tejoDrones++;assert.equal(event.radius,16,'Stealth Drone pulse radius drifted');}
      if(event.type==='tejoDronePulse'){tejoDronePulses++;assert.ok(event.radius===16&&event.suppressSeconds===8,'Stealth Drone pulse rules drifted');}
      if(event.type==='suppressedApplied'&&event.ability==='Stealth Drone')tejoSuppressions++;
      if(event.type==='tejoSpecialDeliveryCast'){tejoSpecialCasts++;assert.ok(event.maxDamage===35&&event.minDamage===20&&event.concussSeconds===2.5,'Special Delivery rules drifted');}
      if(event.type==='tejoGuidedSalvoLaunch'){tejoSalvos++;assert.ok(event.targetingRange===45&&event.damage===65&&event.objectDamageMultiplier===.5,'Guided Salvo rules drifted');}
      if(event.type==='tejoExplosiveImpact'&&event.mechanic==='tejo_guided_salvo')tejoSalvoImpacts++;
      if(event.type==='tejoArmageddonCast'){tejoArmageddons++;assert.ok(event.blasts===6&&event.damage===75,'Armageddon wave drifted');}
      if(event.type==='tejoExplosiveImpact'&&event.mechanic==='tejo_armageddon')tejoArmageddonImpacts++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='brim_incendiary')brimIncendiaries++;
      if(event.type==='abilityDamage'&&event.mechanic==='brim_incendiary')brimIncendiaryDamage+=event.amount;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='brim_stim_beacon')brimStims++;
      if(event.type==='brimStimApplied'){brimStimApplications++;assert.ok(event.fireRateMultiplier===1.1&&event.moveMultiplier===1.1,'Stim standardization drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='brim_sky_smoke'){brimSmokes++;assert.equal(event.radius,4.15,'Sky Smoke radius drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='brim_orbital_strike')brimOrbitals++;
      if(event.type==='brimOrbitalWarning')brimOrbitalWarnings++;
      if(event.type==='abilityDamage'&&event.mechanic==='brim_orbital_strike')brimOrbitalDamage+=event.amount;
      if(event.type==='phoenixCurveballCast'){phoenixCurveballs++;phoenixCurveballHits+=event.hits.length;assert.ok(event.delay===.6&&event.duration===1.5,'Curveball timing drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='phoenix_blaze')phoenixBlazes++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='phoenix_hot_hands')phoenixHotHands++;
      if(event.type==='abilityDamage'&&['phoenix_blaze','phoenix_hot_hands'].includes(event.mechanic))phoenixFireDamage+=event.amount;
      if(event.type==='phoenixSelfHeal'){phoenixSelfHeals++;assert.ok(event.target===event.source&&event.totalHealed<=50.001,'Phoenix fire may only heal its owner up to the per-object cap');}
      if(event.type==='phoenixRunItBackStart')phoenixRunStarts++;
      if(event.type==='phoenixRunItBackReturn'){phoenixRunReturns++;assert.ok(['clone_destroyed','duration_expired'].includes(event.reason)&&event.hp===100,'Run It Back must return Phoenix alive to the marker');}
      if(event.type==='skyeRegrowthStart'){skyeRegrowths++;assert.ok(event.pool===100&&event.healPerSecond===20&&event.radius===12,'Regrowth model drifted');}
      if(event.type==='skyeRegrowthHeal'){skyeHeals++;abilityHeals++;assert.ok(event.source!==event.target&&event.amount>0&&event.remainingPool>=0,'Regrowth must heal allies only from a bounded pool');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='skye_trailblazer')skyeTrailblazers++;
      if(event.type==='skyeTrailblazerMove')skyeTrailMoves++;
      if(event.type==='skyeTrailblazerPounce'){skyePounces++;assert.ok(event.damage===30&&event.concussSeconds===4,'Trailblazer pounce drifted');}
      if(event.type==='skyeGuidingLightCast'){skyeLights++;skyeLightHits+=event.hits.length;assert.ok(event.flightLifetime===2&&event.maximumFlash===2.25,'Guiding Light timing drifted');}
      if(event.type==='skyeSeekersRelease'){skyeSeekers++;assert.ok(event.count<=3&&event.hp===120,'Seekers count or health drifted');}
      if(event.type==='skyeSeekerMove')skyeSeekerMoves++;
      if(event.type==='skyeSeekerHit'){skyeSeekerHits++;assert.ok(event.duration===3&&event.visionRange===7,'Seeker Nearsight drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='kayo_fragment')kayoFragments++;
      if(event.type==='kayoFragmentPulse'){kayoFragmentPulses++;assert.ok(event.pulse>=1&&event.pulse<=4&&event.pulses===4&&event.radius===5&&event.maxDamage===60,'FRAG/ment pulse model drifted');}
      if(event.type==='kayoFlashDriveCast'){kayoFlashes++;assert.ok(['underhand','overhand'].includes(event.throwMode)&&event.bounceWindup===.8&&[1.5,2.25].includes(event.duration),'FLASH/drive timing drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='kayo_zero_point')kayoZeroPlacements++;
      if(event.type==='kayoZeroPointPulse'){kayoZeroPoints++;kayoSuppressions+=event.affected.length;assert.ok(event.radius===25&&event.suppressSeconds===8,'ZERO/point suppression model drifted');}
      if(event.type==='kayoNullCmdStart'){kayoNullStarts++;assert.ok(event.duration===12&&event.pulseInterval===3&&event.reviveSeconds===1.5&&event.fireRateMultiplier===1.1,'NULL/cmd state drifted');}
      if(event.type==='kayoNullCmdPulse')kayoNullPulses++;
      if(event.type==='kayoNullCmdDowned')kayoDowns++;
      if(event.type==='kayoNullCmdRevive'){kayoRevives++;assert.equal(event.hp,100,'NULL/cmd ally restart must restore KAY/O at full health');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='gekko_mosh')gekkoMosh++;
      if(event.type==='gekkoMoshExplode'){gekkoMoshExplosions++;assert.ok(event.radius===7&&event.damage===150,'Mosh Pit terminal explosion drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='gekko_wingman'){gekkoWingmen++;assert.equal(event.hp,60,'Wingman health drifted');}
      if(event.type==='gekkoWingmanMove')gekkoWingmanMoves++;
      if(event.type==='gekkoWingmanConcuss'){gekkoWingmanConcusses++;assert.equal(event.duration,2.5,'Wingman concuss duration drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='gekko_dizzy')gekkoDizzies++;
      if(event.type==='gekkoDizzyFire'){gekkoDizzyShots++;assert.ok(event.prefireDelay===.35&&event.blindSeconds===1,'Dizzy targeting timing drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='gekko_thrash'){gekkoThrashes++;assert.equal(event.hp,180,'Thrash health drifted');}
      if(event.type==='gekkoThrashMove')gekkoThrashMoves++;
      if(event.type==='gekkoThrashDetonate'){gekkoThrashDetonations++;assert.equal(event.duration,6,'Thrash detain duration drifted');}
      if(event.type==='gekkoGlobuleReclaim'){gekkoReclaims++;assert.ok(event.channelSeconds===1.5&&event.cooldownSeconds===15,'Gekko reclaim timing drifted');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='sage_barrier'){sageBarriers++;assert.ok(event.hp===400&&event.kind==='solid_wall','Barrier Orb initial object profile drifted');}
      if(event.type==='sageBarrierFortify'){sageBarrierFortifies++;assert.ok(event.maxHP===800&&event.hp<=800&&event.hp>=0&&event.segments===4,'Barrier Orb fortification drifted');}
      if(event.type==='sageBarrierPathBlocked')sageBarrierBlocks++;
      if(event.type==='abilityObjectDamage'&&event.mechanic==='sage_barrier')sageBarrierDamage+=event.amount;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='sage_slow_orb')sageSlows++;
      if(event.type==='sageSlowEnter'){sageSlowTargets++;assert.ok(event.radius===7&&event.moveMultiplier===.5&&event.duration>0&&event.duration<=7.001,'Slow Orb area or duration drifted');}
      if(event.type==='sageHealingStart'){sageHealingStarts++;assert.ok(event.totalHeal===100&&event.duration===5,'Healing Orb total or duration drifted');}
      if(event.type==='sageHealingTick'){sageHealingTicks++;abilityHeals++;assert.ok(event.amount>0&&event.remainingHP<=100&&event.remainingPool>=0,'Healing Orb tick must remain bounded');}
      if(event.type==='sageResurrectionStart'){sageResurrectionStarts++;assert.ok(event.range===12&&event.channelSeconds===3.3,'Resurrection range or channel drifted');}
      if(event.type==='sageResurrectionComplete'){sageResurrections++;dead.delete(event.target);assert.ok(event.hp===100&&event.shield===0,'Resurrection must restore 100 HP without armor');}
      if(event.type==='cloveMeddleDetonate'){cloveMeddles++;cloveMeddleTargets+=event.affected.length;assert.ok(event.radius===6&&event.decay===90&&event.duration===5,'Meddle area, decay, or duration drifted');}
      if(event.type==='cloveMeddleRecovered'){cloveMeddleRecoveries++;assert.ok(event.amount>=0&&event.remainingHP<=100,'Meddle recovery must stay bounded');}
      if(event.type==='abilityObjectPlace'&&event.mechanic==='clove_ruse'){cloveRuses++;if(!dead.has(event.player)){}else clovePostDeathRuses++;assert.ok(event.kind==='smoke'&&Math.abs((event.expiresAt-event.activeAt)-13.5)<.001,'Ruse smoke duration drifted');}
      if(event.type==='clovePickMeUp'){clovePickMeUps++;assert.ok(event.temporaryHealth>=0&&event.maxTotalHealth===150&&event.healthDuration===10&&event.hasteDuration===3,'Pick-Me-Up state drifted');}
      if(event.type==='cloveReviveStart'){cloveRevives++;dead.delete(event.player);assert.ok(event.stabilizeSeconds===12&&event.intangibleSeconds===2&&event.hp===100&&event.shield===0,'Not Dead Yet revive state drifted');}
      if(event.type==='cloveReviveStabilized')cloveStabilizations++;
      if(event.type==='cloveReviveExpire')cloveReviveExpiries++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='deadlock_gravnet')deadlockGravNets++;
      if(event.type==='deadlockGravNetDetonate')deadlockGravTargets+=event.affected.length;
      if(event.type==='deadlockGravNetRemove')deadlockGravRemovals++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='deadlock_sonic_sensor')deadlockSensors++;
      if(event.type==='deadlockSonicSensorTrigger')deadlockSensorTriggers++;
      if(event.type==='deadlockSonicSensorConcuss')deadlockSensorConcusses+=event.affected.length;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='deadlock_barrier_mesh')deadlockMeshes++;
      if(event.type==='deadlockBarrierPathBlocked')deadlockMeshBlocks++;
      if(event.type==='deadlockAnnihilationCapture')deadlockCaptures++;
      if(event.type==='deadlockAnnihilationFreed')deadlockFrees++;
      if(event.type==='deadlockAnnihilationResolve')deadlockResolves++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='harbor_storm_surge')harborStorms++;
      if(event.type==='harborStormSurgeDetonate')harborStormTargets+=event.affected.length;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='harbor_high_tide')harborTides++;
      if(event.type==='harborHighTideCross')harborTideCrossings++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='harbor_cove')harborCoves++;
      if(event.type==='harborCoveShieldActivate')harborCoveShields++;
      if(event.type==='harborCoveShieldDamage')harborCoveDamage+=event.amount;
      if(event.type==='harborCoveShieldBreak')harborCoveBreaks++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='harbor_reckoning')harborReckonings++;
      if(event.type==='harborReckoningHit')harborReckoningHits++;
      if(event.type==='harborReckoningStop')harborReckoningStops++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='iso_contingency')isoContingencies++;
      if(event.type==='isoContingencyAdvance')isoContingencyAdvances++;
      if(event.type==='isoUndercutCast'){isoUndercuts++;isoUndercutTargets+=event.hits.length;}
      if(event.type==='isoDoubleTapChannel')isoDoubleTapChannels++;
      if(event.type==='isoDoubleTapActive')isoDoubleTapActivations++;
      if(event.type==='isoShieldBreak')isoShieldBreaks++;
      if(event.type==='isoEnergyOrbSpawn')isoOrbSpawns++;
      if(event.type==='isoEnergyOrbShot')isoOrbShots++;
      if(event.type==='isoKillContractCapture')isoContracts++;
      if(event.type==='isoKillContractResolve')isoContractResolves++;
      if(event.type==='abilityObjectPlace'&&event.mechanic==='reyna_leer')reynaLeers++;
      if(event.type==='reynaLeerNearsight')reynaLeerTargets++;
      if(event.type==='reynaSoulOrbSpawn')reynaSoulOrbs++;
      if(event.type==='reynaSoulOrbExpire')reynaSoulOrbExpires++;
      if(event.type==='reynaDevourStart'){reynaDevours++;if(event.automatic)reynaAutomaticDevours++;}
      if(event.type==='reynaDevourTick')reynaDevourTicks++;
      if(event.type==='reynaDismiss')reynaDismisses++;
      if(event.type==='reynaDismissEnd')reynaDismissEnds++;
      if(event.type==='reynaEmpressStart')reynaEmpresses++;
      if(event.type==='plant'&&event.byWingman)gekkoWingmanPlants++;
      if(event.type==='defuse'&&event.byWingman)gekkoWingmanDefuses++;
      if((event.type==='damage'||event.type==='abilityDamage')&&event.vulnerable){vulnerableDamageEvents++;assert.equal(event.damageMultiplier,2,'damage during Vulnerable must be doubled');assert.equal(event.rawDamage,event.baseDamage*2,'Vulnerable damage must equal twice base damage');}
      if(event.type==='lockdownContest'){lockdownContests++;assert.ok(event.player&&event.distance<16.001,'only a nearby player with line of sight may contest Lockdown');}
      if(event.type==='lockdownEscape'){lockdownEscapes++;assert.ok(event.player&&Number.isFinite(event.targetX)&&Number.isFinite(event.targetY),'Lockdown escape requires a player and destination');}
      if(event.type==='lockdownPulse'){lockdownPulses++;assert.equal(event.radius,32.5,'Lockdown pulse must use the explicit modeled radius');}
      if(event.type==='detainedApplied'&&event.ability==='Lockdown'){lockdownDetains++;assert.equal(event.duration,8,'Lockdown must detain for about eight seconds');assert.equal(event.moveMultiplier,.25,'detained movement must use the explicit modeled multiplier');assert.ok(event.distance<=32.501,'Lockdown may not detain enemies outside its radius');}
      if(event.type==='abilityObjectDamage'&&event.mechanic==='detain_zone'){lockdownDamageEvents++;assert.ok(event.amount>0&&event.remainingHP>=0&&event.remainingHP<200,'Lockdown object damage must reduce its 200 HP');}
      if(event.type==='abilityObjectDestroy'&&event.mechanic==='detain_zone')lockdownDestroyed++;
      if(event.type==='paranoiaCast'){paranoiaCasts++;paranoiaHitsPlanned+=event.hits.length;assert.equal(event.speed,20,'Paranoia must use its current projectile speed');assert.equal(event.maxDistance,25,'Paranoia may not travel beyond its current maximum distance');assert.ok(event.hits.every(hit=>hit.along<=25&&hit.lateral<=2&&Math.abs((hit.appliesAt-event.t)-hit.along/20)<.011),'Paranoia hit timing must follow projectile travel through walls');}
      if(event.type==='nearsightApplied'){nearsightApplications++;assert.equal(event.duration,event.ability==='Prowler'?2.75:2,'Nearsight must use its ability-specific duration');assert.equal(event.visionRange,7,'Nearsight must reduce perception to the explicit modeled range');}
      if(event.type==='teleportStart'&&event.teleportType==='short'){shortTeleportStarts++;assert.ok(Math.abs((event.completeAt-event.t)-.7)<.001,'Shrouded Step must use its current pre-teleport delay');assert.equal(event.maxDistance,15,'Shrouded Step must retain its explicit modeled range');}
      if(event.type==='teleportStart'&&event.teleportType==='global'){globalTeleportStarts++;assert.ok(Math.abs((event.completeAt-event.t)-4)<.001,'From the Shadows must use its modeled channel duration');}
      if(event.type==='teleportComplete'&&event.teleportType==='short'){shortTeleportCompletes++;assert.ok(event.distance<=15.001,'Shrouded Step may not exceed its modeled range');}
      if(event.type==='teleportComplete'&&event.teleportType==='global')globalTeleportCompletes++;
      if(event.type==='teleportCancel'&&event.teleportType==='global'){globalTeleportCancels++;assert.ok(['destination_destroyed','detained','death','round_ended'].includes(event.reason),'global teleport cancellation needs a physical reason');}
      if(event.type==='smokeSightBlocked'){smokeSightBlocks+=event.pairs;assert.ok(event.pairs>0,'smoke sight diagnostics require at least one blocked pair');}
      if(event.type==='breachFlashCast'){breachFlashCasts++;assert.equal(event.duration,2.25,'Flashpoint must use the current full-flash duration');assert.equal(event.speed,24,'Flashpoint must use its current projectile speed');}
      if(event.type==='blindApplied'&&event.ability==='Flashpoint'){breachBlindApplications++;assert.equal(event.duration,2.25,'Flashpoint blind duration drifted');}
      if(event.type==='breachConcussCast'){breachConcussCasts++;assert.ok(event.width===8||event.width===18,'Breach concuss width must match Fault Line or Rolling Thunder');assert.equal(event.duration,event.mechanic==='rolling_concuss'?4:2.5,'Breach concuss duration drifted');}
      if(event.type==='concussApplied'&&['Fault Line','Rolling Thunder'].includes(event.ability)){breachConcussApplications++;assert.equal(event.duration,event.ability==='Rolling Thunder'?4:2.5,'applied Breach concuss duration drifted');assert.equal(event.moveMultiplier,.7,'concuss must apply its explicit movement penalty');}
      if(event.type==='aftershockCast'){aftershockCasts++;assert.equal(event.ticks,2,'Aftershock must schedule two explosions');assert.equal(event.damagePerTick,80,'Aftershock must deal 80 base damage per explosion');assert.equal(event.interval,.6,'Aftershock explosions must retain their interval');}
      if(event.type==='aftershockTick'){aftershockTicks++;assert.ok(event.tick===1||event.tick===2,'Aftershock tick index must be one or two');assert.equal(event.damage,80,'Aftershock tick damage drifted');}
      if(event.type==='abilityDamage'&&event.mechanic==='wall_aftershock'){aftershockDamage+=event.amount;assert.equal(event.baseDamage,80,'Aftershock player damage must use 80 base damage');}
      if(event.type==='razeExplosiveCast'){razeExplosiveCasts++;assert.ok(event.mechanic==='cluster_grenade'||event.mechanic==='rocket_explosion','Raze explosive cast needs a supported mechanic');assert.ok(event.impactAt>event.t,'Raze explosive damage needs warning and travel time');}
      if(event.type==='razeExplosiveImpact'){razeExplosiveImpacts++;assert.ok([4,5,5.5,5.25,8].includes(event.radius),'Raze explosive radius drifted');}
      if(event.type==='abilityDamage'&&['cluster_grenade','rocket_explosion'].includes(event.mechanic)){razeExplosiveDamage+=event.amount;assert.ok(event.baseDamage>=1&&event.baseDamage<=(event.mechanic==='rocket_explosion'?150:55),'Raze radial damage must remain bounded');}
      if(event.type==='razeExplosiveEscape')razeExplosiveEscapes++;
      if(event.type==='boomBotAcquire')boomBotAcquires++;
      if(event.type==='boomBotMove')boomBotMoves++;
      if(event.type==='boomBotTrigger')boomBotTriggers++;
      if(event.type==='blastPackBoost'){blastPackBoosts++;assert.ok(event.armedAt-event.t>=1.499,'Blast Pack cannot arm early');}
      if(event.type==='blastPackDetonate'){blastPackDetonations++;assert.ok(event.armedFor>=1.499,'Blast Pack cannot damage before fully armed');}
      if(event.type==='retakeUtilityWait'){if(event.extended)retakeUtilityWaitExtensions++;else retakeUtilityWaitStarts++;assert.ok(event.players.length>0&&event.waitUntil>event.t&&event.remaining>0,'retake utility wait needs players, a future release, and spike time');}
      if(event.type==='retakeUtilityResume'){retakeUtilityResumes++;assert.ok(event.players.length>0&&event.t+.001>=event.waitedUntil,'retake may only resume after the utility wait expires');}
      if(event.type==='retakeUtilityWaitCancel'){retakeUtilityWaitCancels++;assert.equal(event.reason,'round_ended','an active retake utility wait may only cancel at round end');}
      if(event.type==='retakeUtilityForce'){retakeUtilityForces++;assert.equal(event.reason,'spike_clock','retake may ignore active utility only under spike-clock pressure');}
      if(event.type==='shot'&&Math.abs(event.utilityCombatEdge||0)>.0001)utilityAffectedShots++;
      if(event.type==='shot'&&(event.defuseProtectors||0)>0){protectedDefuseShots++;assert.ok(event.defuseProtectionEdge<0&&event.defuseProtectionEdge>=-.06,'defuse protection must be bounded and reduce exposed tap accuracy');}
      if((event.type==='shot'||event.type==='damage')&&event.tradeAttempt)tradeSupportedShots++;
      if((event.type==='shot'||event.type==='damage')&&event.focusFire>0)focusFireShots++;
      if(event.type==='damage'){const expected=WEAPON_DAMAGE[event.weapon]?.[event.hitZone]?.[event.distanceBand],baseDamage=event.baseDamage??event.rawDamage;if(event.partialBurst)assert.ok(baseDamage>0&&baseDamage<=expected,'partial burst damage must stay within weapon body damage');else assert.equal(baseDamage,expected,'base weapon damage must match weapon, hit zone, and range');assert.equal(event.rawDamage,baseDamage*(event.damageMultiplier||1),'damage multiplier must be applied after base weapon damage');assert.ok(event.remainingHP>=0&&event.remainingShield>=0,'damage cannot create negative vitality');}
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
      sharedRotations+=unit.decisionTimeline.filter(entry=>['rotate_on_confirmed_contact','rotate_on_multi_contact','rotate_after_teammate_death','spike_planted_confirmed'].includes(entry.reason)).length;
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
assert.ok(siteConcedes>0,'overwhelmed passive or retake anchors must be able to concede space');
assert.ok(defenseSupportStages>0,'confirmed contact rotations must stage outside the site');
assert.ok(persistentDamageTicks===0||abilityHazardEscapes>0,'survivors damaged by persistent hazards must attempt to leave the area');
assert.ok(turretBursts>0,'Killjoy turret must acquire targets and deal real damage');
assert.ok(alarmbotAcquisitions===0||alarmbotMoves>0,'an acquired Killjoy Alarmbot must enter its live patrol lifecycle');
assert.ok(alarmbotTriggers===0||vulnerableApplications>=alarmbotTriggers,'every live Alarmbot trigger must apply Vulnerable to at least its acquired target');
assert.ok(lockdownPulses===0||lockdownEscapes>0||lockdownDetains>0,'an activated Lockdown must force an escape or detain an enemy that remains in range');
assert.ok(paranoiaCasts>0&&paranoiaHitsPlanned>0&&nearsightApplications>0,'Omen Paranoia must travel, hit, and apply real Nearsight');
assert.ok(shortTeleportStarts>0&&shortTeleportCompletes>0,'Shrouded Step must channel and complete a bounded teleport');
assert.ok(globalTeleportStarts===globalTeleportCompletes+globalTeleportCancels,'every From the Shadows channel must complete or cancel');
assert.ok(smokeSightBlocks>0,'Dark Cover must block at least one real sightline');
assert.ok(breachFlashCasts===0||breachBlindApplications>0,'a live Breach Flashpoint cast must blind a target before the round ends');
assert.ok(breachConcussCasts>0&&breachConcussApplications>0,'Breach line abilities must cast and concuss a target');
assert.ok(aftershockCasts>0&&aftershockTicks>0&&aftershockTicks<=aftershockCasts*2,'Aftershock may resolve at most two explosions before round end');
assert.ok(razeExplosiveCasts>0&&razeExplosiveImpacts>0,'Raze explosives must cast and resolve in live rounds');
assert.ok(boomBotMoves>0,`Boom Bot must patrol before being destroyed or expiring (${boomBotAcquires}/${boomBotMoves}/${boomBotTriggers})`);
assert.ok(blastPackBoosts>0&&blastPackDetonations>0,'Blast Pack must create movement and an armed detonation');
assert.ok(disengageFireShots>0&&disengageFireHits>0&&disengageFireDamage>0,'cover-seeking players must produce bounded covering fire in live rounds');
assert.equal(retakeUtilityWaitStarts,retakeUtilityResumes+retakeUtilityWaitCancels,'every coordinated retake utility wait must resume or end with the round');
assert.ok(equipmentSavePlans>0&&iglModes.has('SAVE'),'equipment value must produce actionable save decisions');
assert.ok(abilityHeals>0&&utilityAffectedShots>0,'used utility must produce real healing and bounded combat effects');
assert.ok(viperPitCollapses<=viperPitActivations,'Viper Pit cannot collapse without first activating');
assert.ok(yoruFakeoutMoves>0&&yoruFakeoutFlashes>0&&yoruFakeoutBlindTargets>0,'forced Yoru regression must move, trigger, and blind with Fakeout');
assert.ok(yoruBlindsideCasts>0&&yoruBlindsideTargets>0,'forced Yoru regression must cast and connect Blindside');
assert.ok(yoruGatecrashMoves>0&&yoruGatecrashResolves>0,'forced Yoru regression must move and resolve Gatecrash');
assert.equal(yoruDriftStarts,yoruDriftEnds,'every completed Dimensional Drift in the fixed sample must exit cleanly');
assert.ok(neonFastLanes>0&&neonRelayCasts>0&&neonRelayConcusses>0,'forced Neon regression must place Fast Lane and connect Relay Bolt');
assert.ok(neonHighGearStarts>0&&neonSlideDistance>0,'forced Neon regression must sprint and slide');
assert.ok(neonOverdriveStarts>0,'forced Neon regression must equip Overdrive');
assert.ok(tejoDrones>0&&tejoSpecialCasts>0&&tejoSalvos>0,'forced Tejo regression must use all regular abilities');
assert.ok(tejoSalvoImpacts>0,'forced Tejo regression must resolve Guided Salvo impacts');
assert.ok(brimIncendiaries>0&&brimStims>0&&brimSmokes>0,`forced Brimstone regression must use all regular abilities: incendiary=${brimIncendiaries}, stim=${brimStims}, smoke=${brimSmokes}`);
assert.ok(brimStimApplications>0,'forced Brimstone regression must apply Stim Beacon to allies');
assert.ok(phoenixCurveballs>0&&phoenixHotHands>0,`forced Phoenix regression must use its live flash and fire loop: curveball=${phoenixCurveballs}, blaze=${phoenixBlazes}, hotHands=${phoenixHotHands}`);
assert.ok(phoenixRunReturns<=phoenixRunStarts,'Run It Back cannot return without an activation');
assert.ok(skyeRegrowths>0&&skyeTrailblazers>0&&skyeLights>0,`forced Skye regression must use all regular abilities: regrowth=${skyeRegrowths}, trailblazer=${skyeTrailblazers}, guidingLight=${skyeLights}`);
assert.ok(skyeTrailMoves>0,'Trailblazer must move through the navigation graph');
assert.ok(skyePounces+skyeSeekerHits>0,'Skye controlled creatures must be able to reach at least one live target in the fixed sample');
assert.ok(kayoFragments>0&&kayoFragmentPulses>=kayoFragments&&kayoFlashes>0,`forced KAY/O regression must resolve its sampled regular abilities: frag=${kayoFragments}/${kayoFragmentPulses}, flash=${kayoFlashes}, zero=${kayoZeroPlacements}/${kayoZeroPoints}`);
assert.ok(kayoRevives<=kayoDowns,'NULL/cmd cannot restart KAY/O without a downed event');
assert.ok(gekkoMosh>0&&gekkoMoshExplosions>0&&gekkoWingmen>0&&gekkoWingmanMoves>0&&gekkoDizzies>0&&gekkoDizzyShots>0,`forced Gekko regression must resolve sampled regular abilities: mosh=${gekkoMosh}/${gekkoMoshExplosions}, wingman=${gekkoWingmen}/${gekkoWingmanMoves}, dizzy=${gekkoDizzies}/${gekkoDizzyShots}`);
assert.ok(sageBarriers>0&&sageBarrierFortifies>0&&sageSlows>0&&sageSlowTargets>0,`forced Sage regression must resolve wall and slow: barriers=${sageBarriers}/${sageBarrierFortifies}, slows=${sageSlows}/${sageSlowTargets}`);
assert.ok(sageResurrections<=sageResurrectionStarts,'Resurrection cannot complete without a cast');
assert.ok(cloveMeddles>0&&cloveRuses>0,`forced Clove regression must use Meddle and Ruse: meddles=${cloveMeddles}, ruses=${cloveRuses}`);
assert.ok(cloveStabilizations+cloveReviveExpiries<=cloveRevives,'Not Dead Yet may only stabilize or expire after a revive');
assert.ok(deadlockGravNets>0&&deadlockSensors>0&&deadlockMeshes>0,`forced Deadlock regression must deploy all regular abilities: grav=${deadlockGravNets}, sensors=${deadlockSensors}, meshes=${deadlockMeshes}`);
assert.ok(deadlockSensorConcusses<=deadlockSensorTriggers*10,'Sonic Sensor cannot concuss without first detecting sound');
assert.ok(deadlockFrees+deadlockResolves<=deadlockCaptures,'Annihilation may only free or eliminate a captured target');
console.log(JSON.stringify({deadlock:{gravNets:deadlockGravNets,gravTargets:deadlockGravTargets,gravRemovals:deadlockGravRemovals,sensors:deadlockSensors,sensorTriggers:deadlockSensorTriggers,sensorConcusses:deadlockSensorConcusses,meshes:deadlockMeshes,meshBlocks:deadlockMeshBlocks,captures:deadlockCaptures,frees:deadlockFrees,resolves:deadlockResolves}},null,2));
assert.ok(harborStorms>0&&harborTides>0&&harborCoves>0,`forced Harbor regression must deploy all regular abilities: storm=${harborStorms}, tides=${harborTides}, coves=${harborCoves}`);
assert.ok(harborCoveBreaks<=harborCoveShields,'Cove shield cannot break without activation');
assert.ok(harborReckoningStops<=harborReckonings,'Reckoning cannot stop without a cast');
console.log(JSON.stringify({harbor:{storms:harborStorms,stormTargets:harborStormTargets,tides:harborTides,tideCrossings:harborTideCrossings,coves:harborCoves,coveShields:harborCoveShields,coveDamage:harborCoveDamage,coveBreaks:harborCoveBreaks,reckonings:harborReckonings,reckoningHits:harborReckoningHits,reckoningStops:harborReckoningStops}},null,2));
assert.ok(isoContingencies>0&&isoContingencyAdvances>0&&isoUndercuts>0&&isoDoubleTapChannels>0,`forced Iso regression must execute regular abilities: contingency=${isoContingencies}/${isoContingencyAdvances}, undercut=${isoUndercuts}/${isoUndercutTargets}, doubleTap=${isoDoubleTapChannels}/${isoDoubleTapActivations}`);
assert.ok(isoDoubleTapActivations<=isoDoubleTapChannels+isoContracts,'Double Tap activation requires its channel or Kill Contract auto-buff');
assert.ok(isoOrbShots<=isoOrbSpawns,'Iso cannot shoot an energy orb that did not spawn');
assert.ok(isoContractResolves<=isoContracts,'Kill Contract cannot resolve without a captured opponent');
console.log(JSON.stringify({iso:{contingencies:isoContingencies,contingencyAdvances:isoContingencyAdvances,undercuts:isoUndercuts,undercutTargets:isoUndercutTargets,doubleTapChannels:isoDoubleTapChannels,doubleTapActivations:isoDoubleTapActivations,shieldBreaks:isoShieldBreaks,orbSpawns:isoOrbSpawns,orbShots:isoOrbShots,contracts:isoContracts,contractResolves:isoContractResolves}},null,2));
assert.ok(reynaLeers>0&&reynaSoulOrbs>0,`forced Reyna regression must place Leer and generate Soul Orbs: leer=${reynaLeers}/${reynaLeerTargets}, orbs=${reynaSoulOrbs}`);
assert.ok(reynaDevourTicks>0||reynaDismisses>0,'Reyna must consume at least one live Soul Orb');
assert.ok(reynaDismissEnds<=reynaDismisses,'Dismiss cannot finish without consuming a Soul Orb');
assert.ok(reynaAutomaticDevours<=reynaDevours,'automatic Empress healing must be a real Devour lifecycle');
console.log(JSON.stringify({reyna:{leers:reynaLeers,leerTargets:reynaLeerTargets,soulOrbs:reynaSoulOrbs,soulOrbExpires:reynaSoulOrbExpires,devours:reynaDevours,devourTicks:reynaDevourTicks,dismisses:reynaDismisses,dismissEnds:reynaDismissEnds,empresses:reynaEmpresses,automaticDevours:reynaAutomaticDevours}},null,2));
console.log(JSON.stringify({viperPit:{activations:viperPitActivations,collapses:viperPitCollapses,geometryRejects:viperPitGeometryRejects}},null,2));
console.log(JSON.stringify({trademark:{triggers:trademarkTriggers,detonations:trademarkDetonations,slows:trademarkSlows}},null,2));
console.log(JSON.stringify({rendezvous:{teleports:rendezvousTeleports}},null,2));
console.log(JSON.stringify({chamberWeapons:{equips:chamberWeaponEquips,shots:chamberWeaponShots,tourSlowZones,tourSlows}},null,2));
console.log(JSON.stringify({cypherTripwire:{uses:tripwireUses,triggers:tripwireTriggers,resolves:tripwireResolves,concusses:tripwireConcusses,diagnostics:tripwireDiagnostics.map(event=>({side:event.side,site:event.site,triggered:event.triggered,destroyedBy:event.destroyedBy,closestDistance:event.closestDistance,closestAt:event.closestAt}))}},null,2));
console.log(JSON.stringify({cypherSpycam:{tags:spycamTags,destroyed:spycamDestroyed}},null,2));
console.log(JSON.stringify({kayo:{fragments:kayoFragments,fragmentPulses:kayoFragmentPulses,flashes:kayoFlashes,zeroPlacements:kayoZeroPlacements,zeroPoints:kayoZeroPoints,suppressions:kayoSuppressions,nullStarts:kayoNullStarts,nullPulses:kayoNullPulses,downs:kayoDowns,revives:kayoRevives}},null,2));
console.log(JSON.stringify({gekko:{mosh:gekkoMosh,moshExplosions:gekkoMoshExplosions,wingmen:gekkoWingmen,wingmanMoves:gekkoWingmanMoves,wingmanConcusses:gekkoWingmanConcusses,dizzies:gekkoDizzies,dizzyShots:gekkoDizzyShots,thrashes:gekkoThrashes,thrashMoves:gekkoThrashMoves,thrashDetonations:gekkoThrashDetonations,reclaims:gekkoReclaims,wingmanPlants:gekkoWingmanPlants,wingmanDefuses:gekkoWingmanDefuses}},null,2));
console.log(JSON.stringify({sage:{barriers:sageBarriers,barrierFortifies:sageBarrierFortifies,barrierBlocks:sageBarrierBlocks,barrierDamage:+sageBarrierDamage.toFixed(1),slows:sageSlows,slowTargets:sageSlowTargets,healingStarts:sageHealingStarts,healingTicks:sageHealingTicks,resurrectionStarts:sageResurrectionStarts,resurrections:sageResurrections}},null,2));
console.log(JSON.stringify({clove:{meddles:cloveMeddles,meddleTargets:cloveMeddleTargets,meddleRecoveries:cloveMeddleRecoveries,ruses:cloveRuses,postDeathRuses:clovePostDeathRuses,pickMeUps:clovePickMeUps,revives:cloveRevives,stabilizations:cloveStabilizations,reviveExpiries:cloveReviveExpiries}},null,2));
console.log(JSON.stringify({cypherNeuralTheft:{casts:neuralCasts,pulses:neuralPulses}},null,2));
console.log(JSON.stringify({vyseShear:{triggers:shearTriggers,blocked:shearBlocked,expires:shearExpires}},null,2));
console.log(JSON.stringify({vyseArcRose:{casts:arcRoseCasts,hits:arcRoseHits}},null,2));
console.log(JSON.stringify({vyseRazorvine:{entries:razorvineEntries,damage:+razorvineDamage.toFixed(1),escapes:razorvineEscapes}},null,2));
console.log(JSON.stringify({vyseSteelGarden:{casts:steelGardenCasts,pulses:steelGardenPulses,jams:steelGardenJams,restores:steelGardenRestores}},null,2));
console.log(JSON.stringify({sova:{reconPulses,reconReveals,droneMoves,droneTags,droneRevealPulses,shockLaunches,shockDamage:+shockDamage.toFixed(1),furyCasts,furyShots,furyHits}},null,2));
console.log(JSON.stringify({astra:{starsUsed:astraStarsUsed,gravityPulls,gravityResolves,gravityFragiles,novaDetonations,novaConcusses,nebulaPlacements,cosmicDivides,cosmicBlocks}},null,2));
console.log(JSON.stringify({fade:{hauntScans:fadeHauntScans,hauntReveals:fadeHauntReveals,prowlerMoves:fadeProwlerMoves,prowlerBites:fadeProwlerBites,prowlerHits:fadeProwlerHits,seizes:fadeSeizes,seizeTargets:fadeSeizeTargets,nightfalls:fadeNightfalls,nightfallTargets:fadeNightfallTargets,decayApplied:+fadeDecayApplied.toFixed(1),decayRecovered:+fadeDecayRecovered.toFixed(1)}},null,2));
console.log(JSON.stringify({yoru:{fakeoutMoves:yoruFakeoutMoves,fakeoutFlashes:yoruFakeoutFlashes,fakeoutBlindTargets:yoruFakeoutBlindTargets,blindsideCasts:yoruBlindsideCasts,blindsideTargets:yoruBlindsideTargets,gatecrashMoves:yoruGatecrashMoves,gatecrashResolves:yoruGatecrashResolves,gatecrashFakes:yoruGatecrashFakes,driftStarts:yoruDriftStarts,driftEnds:yoruDriftEnds}},null,2));
console.log(JSON.stringify({neon:{fastLanes:neonFastLanes,relayCasts:neonRelayCasts,relayTargets:neonRelayTargets,relayConcusses:neonRelayConcusses,highGearStarts:neonHighGearStarts,slideDistance:+neonSlideDistance.toFixed(1),overdriveStarts:neonOverdriveStarts,overdriveEnds:neonOverdriveEnds,overdriveShots:neonOverdriveShots}},null,2));
console.log(JSON.stringify({tejo:{drones:tejoDrones,dronePulses:tejoDronePulses,suppressions:tejoSuppressions,specialCasts:tejoSpecialCasts,salvos:tejoSalvos,salvoImpacts:tejoSalvoImpacts,armageddons:tejoArmageddons,armageddonImpacts:tejoArmageddonImpacts}},null,2));
console.log(JSON.stringify({brimstone:{incendiaries:brimIncendiaries,incendiaryDamage:+brimIncendiaryDamage.toFixed(1),stims:brimStims,stimApplications:brimStimApplications,smokes:brimSmokes,orbitals:brimOrbitals,orbitalWarnings:brimOrbitalWarnings,orbitalDamage:+brimOrbitalDamage.toFixed(1)}},null,2));
console.log(JSON.stringify({phoenix:{curveballs:phoenixCurveballs,curveballHits:phoenixCurveballHits,blazes:phoenixBlazes,hotHands:phoenixHotHands,fireDamage:+phoenixFireDamage.toFixed(1),selfHeals:phoenixSelfHeals,runStarts:phoenixRunStarts,runReturns:phoenixRunReturns}},null,2));
console.log(JSON.stringify({skye:{regrowths:skyeRegrowths,heals:skyeHeals,trailblazers:skyeTrailblazers,trailMoves:skyeTrailMoves,pounces:skyePounces,guidingLights:skyeLights,guidingLightHits:skyeLightHits,seekers:skyeSeekers,seekerMoves:skyeSeekerMoves,seekerHits:skyeSeekerHits}},null,2));
console.log(JSON.stringify({maps:4,sightings,shots,simultaneousTicks,coverSeeks,coverResets,siteConcedes,defenseSupportStages,defenseSupportReleases,defenseSupportCancels,persistentDamageTicks,persistentDamageTotal:+persistentDamageTotal.toFixed(1),abilityHazardEscapes,turretBursts,turretDamage:+turretDamage.toFixed(1),turretDeactivations,turretReactivations,alarmbotAcquisitions,alarmbotMoves,alarmbotTriggers,vulnerableApplications,vulnerableDamageEvents,viperToxinActivations,viperToxinDeactivations,toxinDecayEvents,toxinRecoveryEvents,lockdownContests,lockdownEscapes,lockdownPulses,lockdownDetains,lockdownDamageEvents,lockdownDestroyed,paranoiaCasts,paranoiaHitsPlanned,nearsightApplications,shortTeleportStarts,shortTeleportCompletes,globalTeleportStarts,globalTeleportCompletes,globalTeleportCancels,smokeSightBlocks,breachFlashCasts,breachBlindApplications,breachConcussCasts,breachConcussApplications,aftershockCasts,aftershockTicks,aftershockDamage:+aftershockDamage.toFixed(1),razeExplosiveCasts,razeExplosiveImpacts,razeExplosiveDamage:+razeExplosiveDamage.toFixed(1),razeExplosiveEscapes,retakeUtilityWaitStarts,retakeUtilityWaitExtensions,retakeUtilityResumes,retakeUtilityWaitCancels,retakeUtilityForces,tradeWindowsCreated,tradeSupportedShots,focusFireShots,decisionEntries,reasonedDecisions,intelUpdates,sharedRotations,communicatedFacts,playerProposals,iglDecisions,iglStateEvaluations,iglModes:[...iglModes],initialFormations:[...initialFormations],formationChanges,footstepsHeard,utilityStatusReports,executePlans,executeCountdowns,executeReleases,executePromotions,staggeredExecutePlans,executeTasks:[...executeTasks],postPlantPlans,retakePlans,retakeDefuserReleases,protectedDefuseShots,equipmentSavePlans,contextualAbilityUses,abilityHeals,utilityAffectedShots,abilityPhases:[...abilityPhases],restoredAbilityPlans,spikeEscapes,spikeExplosions,defenseInfoActions,defenseFallbacks,defenseModes:[...defenseModes]},null,2));
