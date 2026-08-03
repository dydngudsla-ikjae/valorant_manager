export const ROUND_TIMING=Object.freeze({
  tickSeconds:0.1,
  roundSeconds:100,
  plantSeconds:4,
  spikeSeconds:45,
  defuseSeconds:7,
  defuseHalfSeconds:3.5,
  preparationPlaybackMs:2500,
  roundBreakPlaybackMs:2100,
});

export function roundClockAt(t,plantAt=null){
  if(Number.isFinite(plantAt))return{phase:'post_plant',remaining:Math.max(0,ROUND_TIMING.spikeSeconds-(t-plantAt))};
  return{phase:'live',remaining:Math.max(0,ROUND_TIMING.roundSeconds-t)};
}
