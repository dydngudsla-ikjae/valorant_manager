export function evaluateRetakeUtilityResponse({planted,targetSide,defenseSide,spikeRemaining,defuseSeconds,currentTime,effectUntil,safetySeconds=3,resumePadding=.25}){
  if(!planted||targetSide!==defenseSide)return{action:'ignore',reason:'not_defensive_retake'};
  const waitUntil=effectUntil+resumePadding,waitSeconds=Math.max(0,waitUntil-currentTime),required=defuseSeconds+waitSeconds+safetySeconds;
  if(spikeRemaining<=required)return{action:'force',reason:'spike_clock',waitUntil,waitSeconds,required};
  return{action:'wait',reason:'enemy_utility_active',waitUntil,waitSeconds,required};
}

export function createRetakeUtilityWaitState(){return{active:false,waitUntil:0,cycles:0};}

export function transitionRetakeUtilityWait(state,input){
  const current=state||createRetakeUtilityWaitState(),response=evaluateRetakeUtilityResponse(input);
  if(response.action==='ignore')return{transition:'ignore',response,state:current};
  if(response.action==='force')return{transition:'force',response,interruptedWait:current.active,state:{...current,active:false,waitUntil:0}};
  const extended=current.active,waitUntil=Math.max(current.waitUntil,response.waitUntil);
  return{transition:extended?'extend':'start',response:{...response,waitUntil},state:{active:true,waitUntil,cycles:current.cycles+(extended?0:1)}};
}

export function advanceRetakeUtilityWait(state,currentTime){
  const current=state||createRetakeUtilityWaitState();
  if(!current.active)return{transition:'idle',state:current};
  if(currentTime+.001<current.waitUntil)return{transition:'hold',state:current};
  return{transition:'resume',waitedUntil:current.waitUntil,state:{...current,active:false,waitUntil:0}};
}

export function cancelRetakeUtilityWait(state){
  const current=state||createRetakeUtilityWaitState();
  return{transition:current.active?'cancel':'idle',waitedUntil:current.waitUntil,state:{...current,active:false,waitUntil:0}};
}
