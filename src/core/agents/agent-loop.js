import { random } from '../rng.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function createAgentMind(attributes={}){
  const get=key=>attributes[key]??60;
  return {
    discipline:(get('tactical')+get('teamplay')+get('consistency'))/3,
    awareness:(get('positioning')+get('tactical')+get('adaptability'))/3,
    coordination:(get('teamplay')+get('tactical'))/2,
    aggression:(get('entry')+get('explosiveness')+get('pressure'))/3,
    composure:(get('clutch')+get('pressure')+get('consistency'))/3,
    contacts:new Map(),intent:'hold',intentSince:0,
    decisionTimeline:[],lastDecisionKey:null,lastDecisionAt:-99,decisionSeenAt:new Map(),
  };
}

const rounded=value=>Number.isFinite(value)?+value.toFixed(2):undefined;

export function recordAgentDecision(unit,time,intent,reason,context={}){
  if(!unit?.mind)return;
  const target=typeof context.target==='string'?context.target:context.target?.name;
  const destination=context.destination;
  const key=[intent,reason,target||'',context.phase||'',context.exposure??'',context.visibleEnemies??''].join('|');
  // Repeated ticks with the same thought add no diagnostic value. A long-running
  // decision is sampled every five seconds so stalled movement remains visible.
  if(key===unit.mind.lastDecisionKey&&time-unit.mind.lastDecisionAt<5)return;
  // Acquire/recovery/shoot can alternate several times during one duel. Keep
  // the first occurrence in a short window; the shot/damage events carry the
  // granular combat detail without bloating the thought log.
  const seenAt=unit.mind.decisionSeenAt.get(key)??-99;
  if(time-seenAt<3){unit.mind.intent=intent;return;}
  unit.mind.intent=intent;
  unit.mind.intentSince=time;
  unit.mind.lastDecisionKey=key;
  unit.mind.lastDecisionAt=time;
  unit.mind.decisionSeenAt.set(key,time);
  unit.mind.decisionTimeline.push({
    t:rounded(time),intent,reason,target:target||undefined,
    phase:context.phase||undefined,role:unit.role||undefined,zone:unit.zone||undefined,
    position:{x:rounded(unit.x),y:rounded(unit.y)},
    destination:destination?{x:rounded(destination.x),y:rounded(destination.y)}:undefined,
    visibleEnemies:context.visibleEnemies??undefined,exposure:context.exposure??undefined,
    alliesAlive:context.alliesAlive??undefined,enemiesAlive:context.enemiesAlive??undefined,
    siteAnchor:context.siteAnchor??undefined,confirmedAttackers:context.confirmedAttackers??undefined,
    backupEta:Number.isFinite(context.backupEta)?rounded(context.backupEta):undefined,
    nearbySupport:context.nearbySupport??undefined,
    hp:unit.hp,shield:unit.shield,confidence:Number.isFinite(context.confidence)?+context.confidence.toFixed(2):undefined,
  });
}

export function perceiveAgents({units,enemiesOf,lineOfSight,distance,sight,sightFor,time}){
  const result=new Map();
  for(const unit of units){
    if(!unit.alive)continue;
    const vision=sightFor?sightFor(unit,time):sight,visible=enemiesOf(unit).filter(enemy=>enemy.alive&&distance(unit,enemy)<vision&&lineOfSight(unit,enemy)).map(enemy=>({unit:enemy,distance:distance(unit,enemy)})).sort((a,b)=>a.distance-b.distance);
    const newContacts=visible.filter(seen=>time-(unit.mind.contacts.get(seen.unit.name)?.time??-99)>.5);
    for(const seen of visible)unit.mind.contacts.set(seen.unit.name,{time,x:seen.unit.x,y:seen.unit.y});
    result.set(unit,{visible,newContacts});
  }
  return result;
}

function chooseTarget(unit,visible,allies,lineOfSight,distance){
  let best=null,bestScore=Infinity;
  for(const seen of visible){
    const target=seen.unit;
    const friendlyFocus=allies.filter(ally=>ally!==unit&&ally.alive&&distance(ally,target)<18&&lineOfSight(ally,target)).length;
    const health=(target.hp||0)+(target.shield||0);
    const score=seen.distance+health*.025-friendlyFocus*(unit.mind.coordination/70);
    if(score<bestScore){bestScore=score;best=seen;}
  }
  return best;
}

export function decideAgentIntents({units,perceptions,alliesOf,lineOfSight,distance,time,planted,phase,defenseSide,defenseTactic='STANDARD',defenseAssessment}){
  const intents=[];
  for(const unit of units){
    if(!unit.alive)continue;
    if(unit.isDefusing){recordAgentDecision(unit,time,'objective','continue_spike_defuse',{phase,alliesAlive:alliesOf(unit).length,enemiesAlive:units.filter(other=>other.alive&&other.side!==unit.side).length});continue;}
    const view=perceptions.get(unit);if(!view)continue;
    const visible=view.visible,exposure=visible.length;
    const baseContext={phase,visibleEnemies:visible.length,exposure,alliesAlive:alliesOf(unit).length,enemiesAlive:units.filter(other=>other.alive&&other.side!==unit.side).length};
    if(!visible.length){
      const moving=!!(unit.path&&unit.seg<unit.path.length),destination=moving?unit.path[unit.path.length-1]:unit.hold;
      recordAgentDecision(unit,time,moving?'move':'hold',moving?'follow_tactical_route':'hold_assigned_angle',{...baseContext,destination});
      continue;
    }
    const target=chooseTarget(unit,visible,alliesOf(unit),lineOfSight,distance);if(!target)continue;
    unit.face=Math.atan2(target.unit.y-unit.y,target.unit.x-unit.x)*180/Math.PI;
    const moving=!!(unit.path&&unit.seg<unit.path.length),outnumbered=exposure>=2,teamOutnumbered=baseContext.alliesAlive<baseContext.enemiesAlive,wounded=(unit.hp+unit.shield)<=Math.max(45,(unit.startingVital||100)*.5),committedRetake=planted&&unit.retakeRole==='clear';
    const recognizesDanger=random()<clamp(.35+unit.mind.discipline/130,.65,.98);
    const shouldDisengage=!committedRetake&&recognizesDanger&&(outnumbered||wounded&&teamOutnumbered||wounded&&planted&&unit.side!==target.unit.side);
    if(shouldDisengage){
      const defense=unit.side===defenseSide?defenseAssessment?.(unit,view)||{}:{};
      const confirmedAttackers=Math.max(exposure,defense.confirmedAttackers||0),backupEta=Number.isFinite(defense.backupEta)?defense.backupEta:Infinity,nearbySupport=defense.nearbySupport||0;
      const concedeSite=!planted&&unit.side===defenseSide&&['CONTACT','EXECUTE'].includes(phase)&&outnumbered&&(exposure>=3||['RETAKE','PASSIVE'].includes(defenseTactic)),reason=concedeSite?'anchor_concedes_for_retake':outnumbered?'outnumbered_exposure':teamOutnumbered?'wounded_team_disadvantage':'wounded_postplant_reposition';
      const decisionContext={...baseContext,target:target.unit,confidence:unit.mind.discipline/100,siteAnchor:!!defense.siteAnchor,confirmedAttackers,backupEta,nearbySupport};
      recordAgentDecision(unit,time,concedeSite?'rotate':'cover',reason,decisionContext);intents.push({type:concedeSite?'concede':'cover',actor:unit,target:target.unit,distance:target.distance,moving,exposure,reason,decisionContext});continue;
    }
    if(time<(unit.nextDuelT||0)){recordAgentDecision(unit,time,'hold','weapon_recovery',{...baseContext,target:target.unit});continue;}
    const firstSeenAt=unit.mind.firstSeenAt?.[target.unit.name];
    unit.mind.firstSeenAt??={};
    if(firstSeenAt==null){unit.mind.firstSeenAt[target.unit.name]=time;recordAgentDecision(unit,time,'acquire','new_enemy_contact',{...baseContext,target:target.unit,confidence:unit.mind.awareness/100});continue;}
    const reaction=.12+(100-unit.mind.awareness)/180+(moving?.09:0);
    if(time-firstSeenAt<reaction){recordAgentDecision(unit,time,'acquire','reaction_delay',{...baseContext,target:target.unit,confidence:unit.mind.awareness/100});continue;}
    recordAgentDecision(unit,time,'shoot',outnumbered?'fight_while_exposed':'engage_visible_target',{...baseContext,target:target.unit,confidence:(unit.mind.composure+unit.mind.awareness)/200});
    intents.push({type:'shoot',actor:unit,target:target.unit,distance:target.distance,exposure,moving,discipline:unit.mind.discipline,awareness:unit.mind.awareness,composure:unit.mind.composure});
  }
  return intents;
}
