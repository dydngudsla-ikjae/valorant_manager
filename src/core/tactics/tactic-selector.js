import { playerAttribute } from '../ratings.js';
import { random } from '../rng.js';
import { ATTACK_TACTICS, DEFENSE_TACTICS, TACTICS_MODEL } from './tactics-model.js';
import { normalizeTacticalPolicy, tacticalPolicyBias } from './tactical-policy.js';

export function teamProfile(team){
  const keys=['firepower','combatEfficiency','entry','positioning','teamplay','tactical','clutch','explosiveness','consistency','adaptability','pressure'];
  const profile=Object.fromEntries(keys.map(key=>[key,team.roster.reduce((sum,player)=>sum+playerAttribute(player,key),0)/team.roster.length]));
  const tendency=key=>team.roster.reduce((sum,player)=>sum+(player.tendencies?.[key]??50),0)/team.roster.length;
  return{...profile,aggression:tendency('aggression'),riskPreference:tendency('riskPreference')};
}

function requirementScore(def,profile){
  return Object.entries(def.requirements).reduce((sum,[key,weight])=>sum+(profile[key]??TACTICS_MODEL.neutralAttribute)*weight,0);
}

function weightedChoice(rows){
  const max=Math.max(...rows.map(row=>row.score));
  const weights=rows.map(row=>Math.exp((row.score-max)/TACTICS_MODEL.selectionTemperature));
  let roll=random()*weights.reduce((sum,value)=>sum+value,0);
  for(let i=0;i<rows.length;i++){roll-=weights[i];if(roll<=0)return rows[i];}
  return rows[0];
}

export function selectAttackTactic({team,buy,isPistol,scoreDiff=0,adaptation,stance='BALANCED',utilityStrength=.5,policy=null}){
  const profile=teamProfile(team),rows=[];
  for(const [name,def] of Object.entries(ATTACK_TACTICS)){
    let score=requirementScore(def,profile);
    if(name==='RUSH')score+=(isPistol?8:0)+(buy==='eco'?7:0)+(profile.aggression-50)*.08;
    if(name==='EXECUTE')score+=utilityStrength*8+(stance==='CONTROL'?4:0);
    if(name==='SPLIT')score+=(stance==='BALANCED'?3:0)+(stance==='CONTROL'?2:0);
    if(name==='FAKE')score+=adaptation.changePressure*7+(profile.adaptability-60)*.08;
    if(name==='CONTACT')score+=(buy==='eco'?4:0)+(profile.riskPreference<50?3:0);
    if(name==='DEFAULT')score+=(adaptation.failedStreak===0?2:0);
    if(scoreDiff<=-5)score+=(name==='RUSH'||name==='EXECUTE'?3:0);
    score+=tacticalPolicyBias({policy:normalizeTacticalPolicy(policy,stance),side:'attack',type:name,definition:def,adaptationPressure:adaptation.changePressure});
    rows.push({name,score,definition:def});
  }
  const selected=weightedChoice(rows),quality=requirementScore(selected.definition,profile)+(random()-.5)*TACTICS_MODEL.executionNoise*2;
  return{type:selected.name,quality:+Math.max(30,Math.min(95,quality)).toFixed(1),risk:selected.definition.risk,pace:selected.definition.pace,formation:{...selected.definition.formation},policy:normalizeTacticalPolicy(policy,stance),scores:Object.fromEntries(rows.map(row=>[row.name,+row.score.toFixed(1)]))};
}

export function selectDefenseTactic({team,buy,isPistol,scoreDiff=0,read,stance='BALANCED',policy=null}){
  const profile=teamProfile(team),rows=[];
  for(const [name,def] of Object.entries(DEFENSE_TACTICS)){
    let score=requirementScore(def,profile);
    if(name==='AGGRESSIVE')score+=(isPistol?4:0)+(buy==='eco'?5:0)+(profile.aggression-50)*.08+(stance==='AGGRO'?4:0);
    if(name==='STACK')score+=read.confidence*10+(buy==='eco'?5:0);
    if(name==='RETAKE')score+=(stance==='CONTROL'||stance==='LOCKDOWN'?4:0)+(profile.teamplay-60)*.08;
    if(name==='PASSIVE')score+=(scoreDiff>=5?4:0)+(profile.riskPreference<50?2:0);
    if(name==='STANDARD')score+=(read.confidence<.45?4:0);
    score+=tacticalPolicyBias({policy:normalizeTacticalPolicy(policy,stance),side:'defense',type:name,definition:def,adaptationPressure:read.confidence});
    rows.push({name,score,definition:def});
  }
  const selected=weightedChoice(rows),quality=requirementScore(selected.definition,profile)+(random()-.5)*TACTICS_MODEL.executionNoise*2;
  return{type:selected.name,quality:+Math.max(30,Math.min(95,quality)).toFixed(1),aggression:selected.definition.aggression,retake:selected.definition.retake,read,policy:normalizeTacticalPolicy(policy,stance),scores:Object.fromEntries(rows.map(row=>[row.name,+row.score.toFixed(1)]))};
}
