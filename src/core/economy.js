import { MV } from '../data/geo/ascent.js';
import { SCOST, WCOST, WEAP } from '../data/weapons.js';

export const BUYMOD={pistol:0, full:0, force:-3, eco:-6};

export const SIDEMOD={AGGRO:{atk:2,def:-1},CONTROL:{atk:1,def:1},LOCKDOWN:{atk:-1,def:3},BALANCED:{atk:0,def:0}};

export function decideBuy(credits,isPistol){
  if(isPistol) return 'pistol';
  if(credits>=3900) return 'full';
  if(credits>=2000) return (Math.random()<0.45?'force':'eco');
  return 'eco';
}

export function homeSideAt(r,homeStartAtk){
  // 12-round halves; alternate each round in OT
  let atk;
  if(r<12) atk=homeStartAtk;
  else if(r<24) atk=!homeStartAtk;
  else atk = ((r-24)%2===0)?homeStartAtk:!homeStartAtk;
  return atk?'atk':'def';
}

export function buyLabel(b){return b==='pistol'?'pistol':b==='full'?'full-buy':b==='force'?'force':'eco';}

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
