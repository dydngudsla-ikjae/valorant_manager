export const TRADE_MODEL={version:'trade-v2-angle',windowSeconds:2.6,supportRadius:15,crossfireRadius:18,crossfireMinAngle:32,tradeBonus:4.2,crossfireBonus:1.4,isolationPenalty:2.1};

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const aliveMates=(unit,units)=>units.filter(other=>other.alive&&other.side===unit.side&&other!==unit);

export function supportingPlayers(unit,target,units,lineOfSight,radius=TRADE_MODEL.supportRadius){
  return aliveMates(unit,units).filter(mate=>distance(mate,unit)<=radius&&(lineOfSight(mate,target)||lineOfSight(mate,unit)));
}

const angleFrom=(origin,point)=>Math.atan2(point.y-origin.y,point.x-origin.x)*180/Math.PI;
const angleDifference=(a,b)=>{const raw=Math.abs(a-b)%360;return Math.min(raw,360-raw);};

// A nearby teammate looking at the same target is support, but it is only a
// crossfire when the target must answer two meaningfully different angles.
// This keeps stacked teammates and ordinary trade spacing from receiving the
// crossfire label and accuracy bonus.
export function crossfirePlayers(unit,target,units,lineOfSight){
  const unitAngle=angleFrom(target,unit);
  return aliveMates(unit,units).filter(mate=>
    distance(mate,target)<=TRADE_MODEL.crossfireRadius&&
    lineOfSight(mate,target)&&
    angleDifference(unitAngle,angleFrom(target,mate))>=TRADE_MODEL.crossfireMinAngle
  );
}

export function createTradeWindow({loser,winner,time,units,lineOfSight,teamplay=60}){
  const supporters=supportingPlayers(loser,winner,units,lineOfSight);
  if(!supporters.length)return null;
  return{side:loser.side,target:winner.name,victim:loser.name,created:+time.toFixed(2),expires:+(time+TRADE_MODEL.windowSeconds+(teamplay-60)/100).toFixed(2),supporters:supporters.map(unit=>unit.name),consumed:false};
}

export function duelSupportContext({attacker,defender,units,windows,time,lineOfSight}){
  const active=windows.filter(window=>!window.consumed&&window.expires>=time);
  const tradeFor=unit=>active.find(window=>window.side===unit.side&&window.supporters.includes(unit.name)&&window.target===(unit===attacker?defender.name:attacker.name));
  const atkSupport=supportingPlayers(attacker,defender,units,lineOfSight),defSupport=supportingPlayers(defender,attacker,units,lineOfSight),atkCrossfire=crossfirePlayers(attacker,defender,units,lineOfSight),defCrossfire=crossfirePlayers(defender,attacker,units,lineOfSight);
  const atkTrade=tradeFor(attacker),defTrade=tradeFor(defender);
  return{
    attacker:{trade:atkTrade,crossfire:atkCrossfire.length>0,isolated:aliveMates(attacker,units).every(mate=>distance(mate,attacker)>TRADE_MODEL.supportRadius),supporters:atkSupport,crossfirePlayers:atkCrossfire},
    defender:{trade:defTrade,crossfire:defCrossfire.length>0,isolated:aliveMates(defender,units).every(mate=>distance(mate,defender)>TRADE_MODEL.supportRadius),supporters:defSupport,crossfirePlayers:defCrossfire},
  };
}

export function supportModifier(context){
  let value=0;
  if(context.trade)value+=TRADE_MODEL.tradeBonus;
  if(context.crossfire)value+=TRADE_MODEL.crossfireBonus;
  if(context.isolated)value-=TRADE_MODEL.isolationPenalty;
  return value;
}
