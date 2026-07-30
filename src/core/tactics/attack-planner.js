import { random } from '../rng.js';

function weightedSite(siteNames,scores){
  const weights=siteNames.map(site=>Math.exp(scores[site]||0));let roll=random()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<siteNames.length;i++){roll-=weights[i];if(roll<=0)return siteNames[i];}return siteNames[0];
}

export function buildAttackPlan({selection,siteNames,adaptation}){
  const targetSite=weightedSite(siteNames,adaptation.siteScores);
  const alternatives=siteNames.filter(site=>site!==targetSite);
  const fakeSite=selection.type==='FAKE'?alternatives[Math.floor(random()*alternatives.length)]:null;
  return{...selection,targetSite,fakeSite,formation:{...selection.formation},reason:selection.type==='FAKE'?'recent_failures_or_pattern_break':adaptation.changePressure>.5?'adaptation_pressure':'team_strength'};
}

