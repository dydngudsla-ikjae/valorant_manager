const clamp=(value,min=0,max=100)=>Math.max(min,Math.min(max,value));
const rounded=value=>+value.toFixed(2);

function recentFacts(team,t,types,window=6){return team.facts.filter(fact=>types.includes(fact.type)&&t-fact.receivedAt<=window);}
function siteSignalCounts(team,t,sites){const counts=Object.fromEntries(sites.map(site=>[site,0]));for(const fact of recentFacts(team,t,['enemy_sighting','enemy_footsteps','teammate_death'],6))if(fact.site in counts)counts[fact.site]++;return counts;}
function utilityState(team,t){const facts=recentFacts(team,t,['utility_unavailable','utility_ready','utility_used'],12),latest=new Map();for(const fact of facts){const ability=fact.detail?.ability;if(ability)latest.set(`${fact.from}:${ability}`,fact);}const values=[...latest.values()];return{ready:values.filter(fact=>fact.type==='utility_ready').length,waiting:values.filter(fact=>fact.type==='utility_unavailable'&&(fact.detail?.readyAt??0)>t).length,used:values.filter(fact=>fact.type==='utility_used').length};}

export function createIglDecisionState({mode='OPENING',targetSite,sites=[]}={}){return{mode,targetSite,sites,committed:false,rotations:0,lastRotationAt:-99,lastDecisionAt:0,lastEvaluationAt:-99,sequence:0,timeline:[]};}

export function evaluateIglDecision(team,t,context){
  const state=team.iglState;if(!state||t-state.lastEvaluationAt<.95)return null;state.lastEvaluationAt=t;
  const {attack,sites,currentSite,timeRemaining,alliesAlive,enemiesAlive,planted,formation,equipmentValue=0}=context,signals=siteSignalCounts(team,t,sites),utility=utilityState(team,t),currentSignals=signals[currentSite]||0,alternative=sites.filter(site=>site!==currentSite).sort((a,b)=>(signals[a]||0)-(signals[b]||0))[0]||currentSite,alternativeSignals=signals[alternative]||0,numbers=alliesAlive-enemiesAlive;
  const scores={};
  if(attack&&planted){
    scores.POST_PLANT_HOLD=100;
  }else if(attack){
    scores.GATHER_INFO=clamp(58-currentSignals*11+(timeRemaining>38?14:-12)+(formation==='ONE_THREE_ONE'?8:0));
    scores.WAIT_UTILITY=clamp(utility.waiting*20+(timeRemaining>28?34:8)-currentSignals*4);
    scores.COMMIT_SITE=clamp(32+currentSignals*4+utility.ready*9+utility.used*5+numbers*5+(timeRemaining<28?32:0)+(formation==='FIVE'?10:0));
    scores.ROTATE_SITE=clamp(currentSignals*17-alternativeSignals*11+(timeRemaining>32?24:-18)+(formation==='FIVE'?-18:4));
    scores.REGROUP=clamp((5-alliesAlive)*18+(numbers<0?18:0)+(formation!=='FIVE'?8:0));
    if(state.committed){scores.GATHER_INFO=0;scores.WAIT_UTILITY=0;}
    if(state.rotations>=1||t-state.lastRotationAt<15)scores.ROTATE_SITE=0;
  }else{
    scores.HOLD_SETUP=clamp(60-(team.knowledge.confidence||0)*35+(timeRemaining>45?12:0));
    scores.REINFORCE=clamp((team.knowledge.confidence||0)*72+(team.knowledge.source==='teammate_death'?18:0));
    scores.RETAKE=planted?clamp(64+numbers*13+(timeRemaining>18?20:timeRemaining>10?4:-24)+utility.ready*4):0;
    const saveDeficit=enemiesAlive-alliesAlive,saveEligible=planted&&(saveDeficit>=4||(saveDeficit>=3&&timeRemaining<20)||(saveDeficit>=2&&timeRemaining<12)||(saveDeficit>=1&&timeRemaining<7));
    scores.SAVE=saveEligible?clamp(saveDeficit*24+(timeRemaining<13?38:0)+Math.max(0,equipmentValue-2200)/55):0;
  }
  let [mode,score]=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  if(mode==='ROTATE_SITE'&&alternative===currentSite)mode='GATHER_INFO';
  const targetSite=mode==='ROTATE_SITE'?alternative:(attack?currentSite:(team.knowledge.site||currentSite));
  if(state.mode===mode&&state.targetSite===targetSite)return null;
  const urgent=planted||timeRemaining<18||alliesAlive<=2;if(!urgent&&t-state.lastDecisionAt<4)return null;
  const reason=mode==='GATHER_INFO'?'insufficient_confirmed_information':mode==='WAIT_UTILITY'?'key_utility_not_ready':mode==='COMMIT_SITE'?'execute_window_available':mode==='ROTATE_SITE'?'current_site_heavily_defended':mode==='REGROUP'?'team_losses_require_regroup':mode==='POST_PLANT_HOLD'?'protect_planted_spike':mode==='REINFORCE'?'confirmed_pressure_or_teammate_loss':mode==='RETAKE'?'spike_planted':mode==='SAVE'?'retake_cost_too_high':'maintain_defensive_structure';
  const decision={id:`igl-${++state.sequence}`,t:rounded(t),mode,targetSite,score:rounded(score),reason,inputs:{timeRemaining:rounded(timeRemaining),alliesAlive,enemiesAlive,numbers,currentSite,equipmentValue:rounded(equipmentValue),signals,utility,formation,sharedKnowledge:{site:team.knowledge.site,confidence:rounded(team.knowledge.confidence||0),source:team.knowledge.source}},candidates:Object.fromEntries(Object.entries(scores).map(([key,value])=>[key,rounded(value)]))};
  state.mode=mode;state.targetSite=targetSite;state.lastDecisionAt=t;if(['COMMIT_SITE','ROTATE_SITE','REGROUP'].includes(mode))state.committed=true;if(mode==='ROTATE_SITE'){state.rotations++;state.lastRotationAt=t;}state.timeline.push(decision);return decision;
}
