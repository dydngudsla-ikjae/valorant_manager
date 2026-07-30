export const POLICY_PRESETS={
  BALANCED:{attack:{DEFAULT:3,SPLIT:2},defense:{STANDARD:3},risk:0},
  TEMPO:{attack:{RUSH:5,EXECUTE:3},defense:{AGGRESSIVE:5},risk:1},
  STRUCTURED:{attack:{EXECUTE:5,DEFAULT:3},defense:{PASSIVE:3,RETAKE:5},risk:-1},
  ADAPTIVE:{attack:{FAKE:5,SPLIT:4},defense:{STACK:4,STANDARD:2},risk:0},
};

export const RISK_LEVELS={LOW:-1,NORMAL:0,HIGH:1};
export const ATTACK_POLICY_OPTIONS=['AUTO','DEFAULT','RUSH','SPLIT','EXECUTE','FAKE','CONTACT'];
export const DEFENSE_POLICY_OPTIONS=['AUTO','STANDARD','PASSIVE','AGGRESSIVE','STACK','RETAKE'];

export function defaultTacticalPolicy(preset='BALANCED'){
  return{version:'coach-policy-v1',preset,attackFocus:'AUTO',defenseFocus:'AUTO',risk:'NORMAL'};
}

export function defaultPolicyForStance(stance){
  return defaultTacticalPolicy({AGGRO:'TEMPO',CONTROL:'STRUCTURED',LOCKDOWN:'ADAPTIVE',BALANCED:'BALANCED'}[stance]||'BALANCED');
}

export function normalizeTacticalPolicy(policy,stance='BALANCED'){
  return{...defaultPolicyForStance(stance),...(policy||{})};
}

export function tacticalPolicyBias({policy,side,type,definition,adaptationPressure=0}){
  const normalized=normalizeTacticalPolicy(policy),preset=POLICY_PRESETS[normalized.preset]||POLICY_PRESETS.BALANCED;
  let bias=preset[side]?.[type]||0;
  const focus=side==='attack'?normalized.attackFocus:normalized.defenseFocus;
  if(focus!=='AUTO')bias+=focus===type?9:-1.5;
  const risk=RISK_LEVELS[normalized.risk]??0;
  const riskValue=side==='attack'?(definition.risk??.5):(definition.aggression??.5);
  bias+=(riskValue-.5)*risk*7;
  if(normalized.preset==='ADAPTIVE')bias+=adaptationPressure*(type==='FAKE'||type==='STACK'?4:0);
  return bias;
}

