import { TACTICS_MODEL } from './tactics-model.js';

export function createTacticalState(){return{rounds:[],teams:{home:{attack:[],defense:[]},away:{attack:[],defense:[]}}};}

export function recentRounds(state,count=TACTICS_MODEL.memoryRounds){return state.rounds.slice(-count);}

export function teamMemory(state,key,side){return state.teams[key][side];}

export function attackAdaptation(state,key,siteNames){
  const recent=teamMemory(state,key,'attack').slice(-TACTICS_MODEL.memoryRounds);
  const siteScores=Object.fromEntries(siteNames.map(site=>[site,0]));
  for(const round of recent){
    siteScores[round.site]+=(round.won?-.45:.35);
    if(round.site===recent.at(-1)?.site)siteScores[round.site]-=.18;
  }
  const failedStreak=recent.slice().reverse().findIndex(round=>round.won);
  return{siteScores,failedStreak:failedStreak<0?recent.length:failedStreak,changePressure:Math.min(1,recent.filter(r=>!r.won).length/3)};
}

export function defenseRead(state,defKey,siteNames){
  const enemyKey=defKey==='home'?'away':'home';
  const attacks=teamMemory(state,enemyKey,'attack').slice(-TACTICS_MODEL.memoryRounds);
  const counts=Object.fromEntries(siteNames.map(site=>[site,0]));
  attacks.forEach(round=>{counts[round.site]=(counts[round.site]||0)+1;});
  const ranked=[...siteNames].sort((a,b)=>counts[b]-counts[a]);
  const total=attacks.length||1;
  return{likelySite:ranked[0],confidence:counts[ranked[0]]/total,counts};
}

export function recordTacticalOutcome(state,{round,atkKey,defKey,site,attackTactic,defenseTactic,winner,planted}){
  const attack={round,site,tactic:attackTactic,won:winner===atkKey,planted};
  const defense={round,site,tactic:defenseTactic,won:winner===defKey,planted};
  state.teams[atkKey].attack.push(attack);state.teams[defKey].defense.push(defense);
  state.rounds.push({round,atkKey,defKey,...attack,attackTactic,defenseTactic,winner});
}

