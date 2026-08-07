export const VIPER_TOXIN_MODEL={
  version:'viper-toxin-v1',
  maxFuel:100,
  minimumActivationFuel:30,
  singleSourceDrainPerSecond:100/12,
  simultaneousDrainMultiplier:1,
  regenerationPerSecond:100/30,
  reactivationCooldown:5,
  initialDecay:10,
  decayPerSecond:10,
  recoveryDelay:1.5,
  recoveryPerSecond:20,
  nearsightRange:7,
};

export function createViperToxinState(){return{fuel:VIPER_TOXIN_MODEL.maxFuel,lastUpdate:0,activeSources:[],cooldownUntil:{},depletedAt:null};}

export function advanceViperToxin(state,time){
  const next={...state,activeSources:[...state.activeSources],cooldownUntil:{...state.cooldownUntil}},elapsed=Math.max(0,time-next.lastUpdate);if(!elapsed)return next;
  if(next.activeSources.length){next.fuel=Math.max(0,next.fuel-VIPER_TOXIN_MODEL.singleSourceDrainPerSecond*VIPER_TOXIN_MODEL.simultaneousDrainMultiplier*elapsed);if(next.fuel<=0){next.depletedAt=time;for(const source of next.activeSources)next.cooldownUntil[source]=time+VIPER_TOXIN_MODEL.reactivationCooldown;next.activeSources=[];}}
  else next.fuel=Math.min(VIPER_TOXIN_MODEL.maxFuel,next.fuel+VIPER_TOXIN_MODEL.regenerationPerSecond*elapsed);
  next.lastUpdate=time;return next;
}

export function canActivateViperToxin(state,source,time){const current=advanceViperToxin(state,time);return !current.activeSources.includes(source)&&current.fuel>=VIPER_TOXIN_MODEL.minimumActivationFuel&&time>=(current.cooldownUntil[source]||0);}

export function activateViperToxin(state,source,time){const current=advanceViperToxin(state,time);if(!canActivateViperToxin(current,source,time))return{state:current,activated:false};current.activeSources.push(source);return{state:current,activated:true};}

export function deactivateViperToxin(state,source,time){const current=advanceViperToxin(state,time),active=current.activeSources.includes(source);if(!active)return{state:current,deactivated:false};current.activeSources=current.activeSources.filter(value=>value!==source);current.cooldownUntil[source]=time+VIPER_TOXIN_MODEL.reactivationCooldown;return{state:current,deactivated:true};}

export function viperToxinSnapshot(state,time=state.lastUpdate){const current=advanceViperToxin(state,time);return{version:VIPER_TOXIN_MODEL.version,fuel:+current.fuel.toFixed(2),activeSources:[...current.activeSources],cooldownUntil:{...current.cooldownUntil},depletedAt:current.depletedAt};}
