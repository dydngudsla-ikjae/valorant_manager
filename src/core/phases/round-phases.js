import { PHASE_MODEL } from './phases-model.js';

const clamp=value=>Math.max(0,Math.min(100,value));

export function currentRoundPhase({contact=false,firstBlood=false,planted=false,retakeStarted=false}={}){
  if(planted)return retakeStarted?'RETAKE':'POST_PLANT';
  if(firstBlood)return'EXECUTE';
  if(contact)return'OPENING';
  return'INFORMATION';
}

export function phaseTacticalEdge(phase,tacticalPlan){
  if(!tacticalPlan)return 0;
  const base=tacticalPlan.edge*(PHASE_MODEL.edgeMultiplier[phase]??1);
  if(phase==='POST_PLANT')return base+(tacticalPlan.attack.quality-60)*.025;
  if(phase==='RETAKE')return base-(tacticalPlan.defense.retake-.5)*1.4;
  return base;
}

export function summarizeRoundPhases({events,duration,winner,atkKey,defKey,tacticalPlan,planted,defused}){
  const kills=events.filter(event=>event.type==='kill');
  const fb=kills[0]||null,plant=events.find(event=>event.type==='plant')||null;
  const firstUtil=events.find(event=>event.type==='util'||event.type==='recon')||null;
  const executeStart=firstUtil?.t??fb?.t??Math.min(2,duration*.2);
  const infoWinner=tacticalPlan?.edge>=0?atkKey:defKey;
  const phases=[];
  phases.push({phase:'INFORMATION',start:0,end:+executeStart.toFixed(2),winner:infoWinner,attackQuality:clamp(tacticalPlan?.attack.quality??60),defenseQuality:clamp(tacticalPlan?.defense.quality??60),reason:firstUtil?'utility_or_recon_advantage':'initial_read'});
  if(fb)phases.push({phase:'OPENING',start:+Math.max(0,fb.t-.5).toFixed(2),end:+fb.t.toFixed(2),winner:fb.side,attackQuality:fb.side===atkKey?70:45,defenseQuality:fb.side===defKey?70:45,reason:fb.isolated?'isolated_player':fb.tradeAttempt?'trade_window':'first_blood'});
  const prePlantKills=kills.filter(kill=>!plant||kill.t<plant.t);
  phases.push({phase:'EXECUTE',start:+executeStart.toFixed(2),end:+(plant?.t??duration).toFixed(2),winner:prePlantKills.filter(k=>k.side===atkKey).length>=prePlantKills.filter(k=>k.side===defKey).length?atkKey:defKey,attackQuality:clamp((tacticalPlan?.attack.quality??60)+(planted?8:-6)),defenseQuality:clamp((tacticalPlan?.defense.quality??60)+(planted?-5:7)),reason:planted?'site_secured':'execute_stopped'});
  if(plant){
    const postKills=kills.filter(kill=>kill.t>=plant.t),atkPost=postKills.filter(k=>k.side===atkKey).length,defPost=postKills.length-atkPost;
    phases.push({phase:'POST_PLANT',start:+plant.t.toFixed(2),end:+duration.toFixed(2),winner,attackQuality:clamp((tacticalPlan?.attack.quality??60)+(winner===atkKey?8:-6)),defenseQuality:clamp((tacticalPlan?.defense.quality??60)+(winner===defKey?8:-6)),reason:defused?'defuse_completed':winner===atkKey?'post_plant_held':'attackers_eliminated'});
    phases.push({phase:'RETAKE',start:+plant.t.toFixed(2),end:+duration.toFixed(2),winner:atkPost>defPost?atkKey:defKey,attackQuality:clamp(55+atkPost*8),defenseQuality:clamp(50+defPost*8+(defused?15:0)),reason:defused?'successful_retake':defPost?'retake_contested':'retake_denied'});
  }
  const trade= kills.find(kill=>kill.traded),turningEvent=trade||events.find(event=>event.type==='defuse')||plant||fb;
  const turningPoint=turningEvent?{type:trade?'TRADE':turningEvent.type.toUpperCase(),time:+turningEvent.t.toFixed(2),player:turningEvent.killer||turningEvent.planter||turningEvent.defuser||null,reason:trade?'immediate_refrag':turningEvent.type}:null;
  return{version:PHASE_MODEL.version,phases,turningPoint};
}

