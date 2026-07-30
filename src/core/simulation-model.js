// Central tuning surface for role/agent/map experience and behavioral tendencies.
// Keep these coefficients data-only so balancing does not require rewriting the engine.
export const EXPERIENCE_MODEL={
  version:'experience-v1',
  neutral:{role:10,agent:10,map:60,tendency:50},
  weights:{role:0.25,agent:0.45,map:0.08,agentSpecialization:0.02,roleFlexibility:0.04},
  tendency:{openingEntrySuccess:0.04,openingEntryFrequency:0.02,attackAggression:0.015,attackRisk:0.01,defenseRiskPenalty:0.015}
};

export const COMPOSITION_MODEL={
  version:'composition-v1',candidateLimitPerPlayer:6,
  weights:{mastery:1.3,mapFavored:0.6,kitTotal:0.8,roleFit:0.18,stanceKit:0.22},
  penalties:{duplicateAgent:30,missingController:8,missingInitiator:7,missingDuelist:4,missingSentinel:3}
};

const norm=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const tendency=(player,key)=>player.tendencies?.[key]??EXPERIENCE_MODEL.neutral.tendency;

export function experienceModifier(player,{agent,map,opening=false,attacking=false}={}){
  const M=EXPERIENCE_MODEL,agentRecord=(player.pool||[]).find(entry=>norm(entry.agent)===norm(agent));
  const agentRole=agentRecord?.role||player.role;
  const role=(player.prof?.[agentRole]??M.neutral.role)-M.neutral.role;
  const agentMastery=(agentRecord?.mastery??M.neutral.agent)-M.neutral.agent;
  const agentReliability=agentRecord?.reliability??0.5;
  const mapRecord=player.mapMastery?.[norm(map)];
  const mapValue=(mapRecord?.value??M.neutral.map)-M.neutral.map;
  const mapReliability=mapRecord?.reliability??0;
  let total=role*M.weights.role+agentMastery*M.weights.agent*(0.5+0.5*agentReliability)+mapValue*M.weights.map*mapReliability;
  total+=(tendency(player,'agentSpecialization')-M.neutral.tendency)*M.weights.agentSpecialization;
  if(agentRole!==player.role)total+=(tendency(player,'roleFlexibility')-M.neutral.tendency)*M.weights.roleFlexibility;
  if(opening){total+=(tendency(player,'entrySuccess')-50)*M.tendency.openingEntrySuccess+(tendency(player,'entryFrequency')-50)*M.tendency.openingEntryFrequency;}
  if(attacking)total+=(tendency(player,'aggression')-50)*M.tendency.attackAggression+(tendency(player,'riskPreference')-50)*M.tendency.attackRisk;
  else total-=(tendency(player,'riskPreference')-50)*M.tendency.defenseRiskPenalty;
  return total;
}

export function objectiveDuty(player){return tendency(player,'objectiveDuty');}
