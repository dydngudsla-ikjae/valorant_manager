import { MV } from '../data/geo/ascent.js';
import { SCOST, WCOST, WEAP, WEAPON_DATA } from '../data/weapons.js';
import { random } from './rng.js';
import { ECONOMY_MODEL } from './economy-model.js';

export const BUYMOD={pistol:0,full:0,bonus:-1.25,force:-3,eco:-6};

export const SIDEMOD={AGGRO:{atk:2,def:-1},CONTROL:{atk:1,def:1},LOCKDOWN:{atk:-1,def:3},BALANCED:{atk:0,def:0}};

export function decideBuy(credits,isPistol){
  if(isPistol) return 'pistol';
  if(credits>=ECONOMY_MODEL.thresholds.full) return 'full';
  if(credits>=ECONOMY_MODEL.thresholds.force) return (random()<ECONOMY_MODEL.thresholds.forceChance?'force':'eco');
  return 'eco';
}

export function createEconomyState(credits=ECONOMY_MODEL.startCredits){return {credits,lossStreak:0,lastBuy:'pistol'};}
export function resetEconomyForRound(state,roundIndex){
  if(roundIndex===0||roundIndex===12){state.credits=ECONOMY_MODEL.startCredits;state.lossStreak=0;}
  else if(roundIndex>=24){state.credits=ECONOMY_MODEL.overtimeCredits;state.lossStreak=0;}
  return state;
}
export function planBuy(state,isPistol){
  const before=state.credits,buy=decideBuy(before,isPistol),spend=Math.min(before,ECONOMY_MODEL.buy[buy]);
  state.credits-=spend;state.lastBuy=buy;
  return {buy,before,spend,afterBuy:state.credits};
}
export function settleEconomy(state,{won,planted=false}={}){
  const lossIncome=ECONOMY_MODEL.income.loss[Math.min(state.lossStreak,ECONOMY_MODEL.income.loss.length-1)];
  const income=(won?ECONOMY_MODEL.income.win:lossIncome)+(planted?ECONOMY_MODEL.income.plant:0);
  state.credits=Math.min(ECONOMY_MODEL.creditCap,state.credits+income);
  state.lossStreak=won?0:Math.min(state.lossStreak+1,ECONOMY_MODEL.income.loss.length-1);
  return {income,after:state.credits,lossStreak:state.lossStreak};
}

const avgCredits=players=>Math.round(players.reduce((sum,player)=>sum+player.credits,0)/Math.max(1,players.length));
const attr=(player,key)=>player.attributes?.[key]??player[key]??60;
const armorValue=shield=>shield==='heavy'?50:shield==='light'||shield==='regen'?25:0;
const weaponTier=weapon=>['Operator','Vandal','Phantom'].includes(weapon)?4:['Bulldog','Spectre','Marshal'].includes(weapon)?3:['Stinger','Sheriff'].includes(weapon)?2:['Ghost','Frenzy'].includes(weapon)?1:0;

export function createTeamEconomyState(team,credits=ECONOMY_MODEL.startCredits){
  const players=team.roster.map(player=>({name:player.name,credits,carried:null}));
  return {credits,players,lossStreak:0,lastBuy:'pistol',round:0};
}

export function resetTeamEconomyForRound(state,roundIndex){
  const reset=roundIndex===0||roundIndex===12,ot=roundIndex>=24;
  if(reset||ot){const credits=ot?ECONOMY_MODEL.overtimeCredits:ECONOMY_MODEL.startCredits;state.players.forEach(player=>{player.credits=credits;player.carried=null;});state.lossStreak=0;state.credits=credits;}
  state.round=roundIndex;return state;
}

function teamBuyDecision(state,isPistol){
  if(isPistol)return 'pistol';
  const credits=state.players.map(player=>player.credits+(player.carried?WCOST[player.carried.weapon]||0:0));
  const fullReady=credits.filter(value=>value>=3300).length;
  if(fullReady>=4)return state.players.filter(player=>player.carried&&weaponTier(player.carried.weapon)>=3).length>=3?'bonus':'full';
  const average=credits.reduce((sum,value)=>sum+value,0)/credits.length;
  if(average>=2050&&(state.lossStreak>=2||average>=2700))return 'force';
  return 'eco';
}

function preferredRifle(player,index){
  if(player.role==='CON'||player.role==='SEN')return 'Phantom';
  if(player.role==='DUE')return 'Vandal';
  return index%2?'Phantom':'Vandal';
}

function affordableLoadout({player,index,buy,wantsOperator,account}){
  const before=account.credits,carried=account.carried;
  if(carried&&weaponTier(carried.weapon)>=2){
    let shield=carried.shield||'none',shieldValue=carried.shieldValue??armorValue(shield),spent=0;
    if(buy==='full'&&shieldValue<50&&account.credits>=SCOST.heavy){shield='heavy';shieldValue=50;spent=SCOST.heavy;}
    else if(shieldValue<=0&&buy!=='eco'&&account.credits>=SCOST.light){shield='light';shieldValue=25;spent=SCOST.light;}
    account.credits-=spent;account.carried=null;
    return {weapon:carried.weapon,shield,shieldValue,spent,remaining:account.credits,carried:true,before};
  }
  let weapon='Classic',shield='none';
  const budget=account.credits;
  if(buy==='pistol'){
    if(budget>=800&&attr(player,'firepower')>=72)weapon='Sheriff';
    else if(budget>=500&&(index%2===0||player.role==='DUE'))weapon='Ghost';
    if(weapon==='Classic'&&budget>=400)shield='light';
  }else if(buy==='full'||buy==='bonus'){
    if(wantsOperator&&budget>=WCOST.Operator+SCOST.light){weapon='Operator';shield=budget>=WCOST.Operator+SCOST.heavy?'heavy':'light';}
    else if(budget>=WCOST.Vandal+SCOST.heavy){weapon=preferredRifle(player,index);shield='heavy';}
    else if(budget>=WCOST.Vandal+SCOST.light){weapon=preferredRifle(player,index);shield='light';}
    else if(budget>=WCOST.Bulldog+SCOST.light){weapon='Bulldog';shield='light';}
    else if(budget>=WCOST.Spectre+SCOST.light){weapon='Spectre';shield='light';}
  }else if(buy==='force'){
    if(budget>=WCOST.Bulldog+SCOST.light){weapon='Bulldog';shield='light';}
    else if(budget>=WCOST.Spectre+SCOST.light){weapon='Spectre';shield='light';}
    else if(budget>=WCOST.Stinger+SCOST.light){weapon='Stinger';shield='light';}
    else if(budget>=WCOST.Sheriff){weapon='Sheriff';shield=budget>=WCOST.Sheriff+SCOST.light?'light':'none';}
  }else{
    // Eco players keep enough money for a rifle + heavy armor next round.
    const reserve=WCOST.Vandal+SCOST.heavy;
    if(budget-reserve>=WCOST.Ghost)weapon='Ghost';
  }
  let spent=(WCOST[weapon]||0)+(SCOST[shield]||0);
  if(spent>budget){weapon='Classic';shield='none';spent=0;}
  account.credits-=spent;account.carried=null;
  return {weapon,shield,shieldValue:armorValue(shield),spent,remaining:account.credits,carried:false,before};
}

export function planTeamBuy(state,team,{isPistol=false,agents={}}={}){
  const buy=teamBuyDecision(state,isPistol),playerBefore=state.players.map(player=>player.credits);
  const operatorCandidates=team.roster.map((player,index)=>({index,score:attr(player,'firepower')+(agents[player.name]==='Jett'||agents[player.name]==='Chamber'?18:0)})).sort((a,b)=>b.score-a.score);
  const operatorIndex=(buy==='full'&&state.players[operatorCandidates[0].index].credits>=WCOST.Operator+SCOST.light)?operatorCandidates[0].index:-1;
  const loadouts=team.roster.map((player,index)=>affordableLoadout({player,index,buy,wantsOperator:index===operatorIndex,account:state.players[index]}));
  const drops=[];
  if(buy==='full'){
    for(let target=0;target<loadouts.length;target++){
      if(weaponTier(loadouts[target].weapon)>=3)continue;
      const weapon=preferredRifle(team.roster[target],target),cost=WCOST[weapon];
      const donor=state.players.map((account,index)=>({index,credits:account.credits})).filter(item=>item.index!==target&&item.credits>=cost).sort((a,b)=>b.credits-a.credits)[0];
      if(!donor)continue;
      state.players[donor.index].credits-=cost;loadouts[donor.index].spent+=cost;loadouts[donor.index].remaining=state.players[donor.index].credits;
      loadouts[target].weapon=weapon;loadouts[target].receivedFrom=team.roster[donor.index].name;
      drops.push({from:team.roster[donor.index].name,to:team.roster[target].name,weapon,cost});
    }
  }
  const playerAfterBuy=state.players.map(player=>player.credits),before=Math.round(playerBefore.reduce((sum,value)=>sum+value,0)/playerBefore.length),afterBuy=avgCredits(state.players);
  state.credits=afterBuy;state.lastBuy=buy;
  return {buy,before,spend:before-afterBuy,afterBuy,playerBefore,playerAfterBuy,loadouts,drops,operator:operatorIndex>=0?team.roster[operatorIndex].name:null};
}

export function settleTeamEconomy(state,{won,planted=false,units=[],loadouts=[]}={}){
  const lossIncome=ECONOMY_MODEL.income.loss[Math.min(state.lossStreak,ECONOMY_MODEL.income.loss.length-1)],income=(won?ECONOMY_MODEL.income.win:lossIncome)+(planted?ECONOMY_MODEL.income.plant:0);
  state.players.forEach((account,index)=>{
    const unit=units.find(item=>item.idx===index),loadout=loadouts[index];
    account.credits=Math.min(ECONOMY_MODEL.creditCap,account.credits+income);
    const carriedWeapon=unit?.weapon==='BladeStorm'?loadout?.weapon:(unit?.weapon||loadout?.weapon);
    account.carried=unit?.deathT==null&&loadout?{weapon:carriedWeapon,shield:unit.shieldType||loadout.shield,shieldValue:unit.finalShield??loadout.shieldValue??armorValue(loadout.shield)}:null;
  });
  state.lossStreak=won?0:Math.min(state.lossStreak+1,ECONOMY_MODEL.income.loss.length-1);state.credits=avgCredits(state.players);
  return {income,after:state.credits,playerAfter:state.players.map(player=>player.credits),lossStreak:state.lossStreak,carried:state.players.map(player=>player.carried)};
}

export function homeSideAt(r,homeStartAtk){
  // 12-round halves; alternate each round in OT
  let atk;
  if(r<12) atk=homeStartAtk;
  else if(r<24) atk=!homeStartAtk;
  else atk = ((r-24)%2===0)?homeStartAtk:!homeStartAtk;
  return atk?'atk':'def';
}

export function buyLabel(b){return b==='pistol'?'pistol':b==='full'?'full-buy':b==='bonus'?'bonus':b==='force'?'force':'eco';}

export function loadoutFor(buy,i,role){
  let weapon,shield;
  if(buy==='pistol'){weapon=WEAP.pistol[i]; shield='light';}
  else if(buy==='eco'){weapon=WEAP.eco[i]; shield=(i%2?'none':'light');}
  else if(buy==='force'){weapon=WEAP.force[i]; shield='light';}
  else {weapon=(role==='SEN'&&i===2)?'Operator':WEAP.full[i]; shield='heavy';}
  return {weapon,shield};
}

export function buyFromCredits(cr,role,i){
  let weapon,shield;
  if(cr>=4900){ weapon=(role==='SEN'&&i===2)?'Operator':(i%2?'Phantom':'Vandal'); shield='heavy'; }
  else if(cr>=3900){ weapon=(i%2?'Phantom':'Vandal'); shield='heavy'; }
  else if(cr>=2400){ weapon= cr>=2900?'Spectre':'Bulldog'; shield='light'; }
  else if(cr>=1200){ weapon='Spectre'; shield='light'; }
  else if(cr>=800){ weapon='Sheriff'; shield= cr>=1200?'light':'none'; }
  else { weapon= cr>=500?'Ghost':'Classic'; shield='none'; }
  let spent=(WCOST[weapon]||0)+SCOST[shield];
  if(spent>cr){ // downgrade to affordable
    shield='none'; weapon= cr>=800?'Sheriff':(cr>=500?'Ghost':'Classic'); spent=WCOST[weapon]||0;
  }
  return {weapon,shield,spent,remaining:Math.max(0,cr-spent)};
}

export function initEcon(){ MV.econ={home:[800,800,800,800,800], away:[800,800,800,800,800]}; }
// map each real Valorant ability to an effect type for the viewer
