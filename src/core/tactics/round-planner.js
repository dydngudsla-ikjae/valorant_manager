import { TACTICS_MODEL } from './tactics-model.js';
import { attackAdaptation, defenseRead } from './adaptation.js';
import { selectAttackTactic, selectDefenseTactic } from './tactic-selector.js';
import { buildAttackPlan } from './attack-planner.js';
import { buildDefensePlan } from './defense-planner.js';

export function planRoundTactics({state,round,mapGeo,atkTeam,defTeam,atkKey,defKey,atkBuy,defBuy,isPistol,scoreDiff,atkStance,defStance,utilityStrength,atkPolicy,defPolicy}){
  const adaptation=attackAdaptation(state,atkKey,mapGeo.siteNames),read=defenseRead(state,defKey,mapGeo.siteNames);
  const attack=buildAttackPlan({selection:selectAttackTactic({team:atkTeam,buy:atkBuy,isPistol,scoreDiff,adaptation,stance:atkStance,utilityStrength,policy:atkPolicy}),siteNames:mapGeo.siteNames,adaptation});
  const defense=buildDefensePlan({selection:selectDefenseTactic({team:defTeam,buy:defBuy,isPistol,scoreDiff:-scoreDiff,read,stance:defStance,policy:defPolicy}),siteNames:mapGeo.siteNames});
  const edge=+(Math.max(-5,Math.min(5,(attack.quality-defense.quality)*TACTICS_MODEL.edgeScale))).toFixed(2);
  return{version:TACTICS_MODEL.version,round,attack,defense,edge,matchup:{attackQuality:attack.quality,defenseQuality:defense.quality}};
}
