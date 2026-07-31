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
  };
}

export function perceiveAgents({units,enemiesOf,lineOfSight,distance,sight,time}){
  const result=new Map();
  for(const unit of units){
    if(!unit.alive)continue;
    const visible=enemiesOf(unit).filter(enemy=>enemy.alive&&distance(unit,enemy)<sight&&lineOfSight(unit,enemy)).map(enemy=>({unit:enemy,distance:distance(unit,enemy)})).sort((a,b)=>a.distance-b.distance);
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

export function decideAgentIntents({units,perceptions,alliesOf,lineOfSight,distance,time,planted}){
  const intents=[];
  for(const unit of units){
    if(!unit.alive)continue;
    const view=perceptions.get(unit);if(!view)continue;
    const visible=view.visible,exposure=visible.length;
    if(!visible.length){unit.mind.intent='move';continue;}
    const target=chooseTarget(unit,visible,alliesOf(unit),lineOfSight,distance);if(!target)continue;
    unit.face=Math.atan2(target.unit.y-unit.y,target.unit.x-unit.x)*180/Math.PI;
    const moving=!!(unit.path&&unit.seg<unit.path.length),outnumbered=exposure>=2;
    const recognizesDanger=random()<clamp(.35+unit.mind.discipline/130,.65,.98);
    if(outnumbered&&!planted&&recognizesDanger){unit.mind.intent='cover';intents.push({type:'cover',actor:unit,exposure});continue;}
    if(time<(unit.nextDuelT||0))continue;
    const firstSeenAt=unit.mind.firstSeenAt?.[target.unit.name];
    unit.mind.firstSeenAt??={};
    if(firstSeenAt==null){unit.mind.firstSeenAt[target.unit.name]=time;continue;}
    const reaction=.12+(100-unit.mind.awareness)/180+(moving?.09:0);
    if(time-firstSeenAt<reaction)continue;
    unit.mind.intent='shoot';
    intents.push({type:'shoot',actor:unit,target:target.unit,distance:target.distance,exposure,moving,discipline:unit.mind.discipline,awareness:unit.mind.awareness,composure:unit.mind.composure});
  }
  return intents;
}
