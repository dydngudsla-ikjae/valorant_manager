import { draftComp, evaluateComposition } from '../../src/core/draft.js';
import { applyRealStats, buildAgentPools } from '../../src/core/roster.js';
import { LEAGUES, MAPS } from '../../src/data/leagues.js';

applyRealStats();buildAgentPools();
const failures=[];let checked=0;
for(const league of Object.values(LEAGUES))for(const team of league.teams)for(const map of MAPS){
  const comp=draftComp(team,map,null),names=comp.agents.map(agent=>agent.agent);checked++;
  if(new Set(names).size!==5)failures.push({team:team.name,map,reason:'duplicate_agent',agents:names});
  if(comp.penalty>0)failures.push({team:team.name,map,reason:'auto_comp_penalty',penalty:comp.penalty,violations:comp.violations});
}
const sample=LEAGUES.AMER.teams[0],good=draftComp(sample,'Ascent',null);
const duplicate=good.agents.map((agent,index)=>({...agent,name:sample.roster[index].name,agent:good.agents[0].agent,role:good.agents[0].role}));
const bad=evaluateComposition(sample,'Ascent',good.stance,duplicate);
const duplicatePenaltyDetected=!bad.valid&&bad.penalty>0&&bad.violations.some(item=>item.code==='duplicate_agent');
console.log(JSON.stringify({checked,failures,duplicatePenaltyDetected,badComposition:{penalty:bad.penalty,violations:bad.violations}},null,2));
if(failures.length||!duplicatePenaltyDetected)process.exitCode=1;
