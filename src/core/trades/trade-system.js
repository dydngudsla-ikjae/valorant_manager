export const TRADE_MODEL={version:'trade-v1',windowSeconds:2.6,supportRadius:15,crossfireRadius:18,tradeBonus:4.2,crossfireBonus:1.4,isolationPenalty:2.1};

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const aliveMates=(unit,units)=>units.filter(other=>other.alive&&other.side===unit.side&&other!==unit);

export function supportingPlayers(unit,target,units,lineOfSight,radius=TRADE_MODEL.supportRadius){
  return aliveMates(unit,units).filter(mate=>distance(mate,unit)<=radius&&(lineOfSight(mate,target)||lineOfSight(mate,unit)));
}

export function createTradeWindow({loser,winner,time,units,lineOfSight,teamplay=60}){
  const supporters=supportingPlayers(loser,winner,units,lineOfSight);
  if(!supporters.length)return null;
  return{side:loser.side,target:winner.name,victim:loser.name,created:+time.toFixed(2),expires:+(time+TRADE_MODEL.windowSeconds+(teamplay-60)/100).toFixed(2),supporters:supporters.map(unit=>unit.name),consumed:false};
}

export function duelSupportContext({attacker,defender,units,windows,time,lineOfSight}){
  const active=windows.filter(window=>!window.consumed&&window.expires>=time);
  const tradeFor=unit=>active.find(window=>window.side===unit.side&&window.supporters.includes(unit.name)&&window.target===(unit===attacker?defender.name:attacker.name));
  const atkSupport=supportingPlayers(attacker,defender,units,lineOfSight),defSupport=supportingPlayers(defender,attacker,units,lineOfSight);
  const atkTrade=tradeFor(attacker),defTrade=tradeFor(defender);
  return{
    attacker:{trade:atkTrade,crossfire:atkSupport.length>0,isolated:aliveMates(attacker,units).every(mate=>distance(mate,attacker)>TRADE_MODEL.supportRadius),supporters:atkSupport},
    defender:{trade:defTrade,crossfire:defSupport.length>0,isolated:aliveMates(defender,units).every(mate=>distance(mate,defender)>TRADE_MODEL.supportRadius),supporters:defSupport},
  };
}

export function supportModifier(context){
  let value=0;
  if(context.trade)value+=TRADE_MODEL.tradeBonus;
  if(context.crossfire)value+=TRADE_MODEL.crossfireBonus;
  if(context.isolated)value-=TRADE_MODEL.isolationPenalty;
  return value;
}
