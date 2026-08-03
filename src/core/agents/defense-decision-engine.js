import { random } from '../rng.js';

const rounded=value=>+value.toFixed(2);

export function createDefenseDecisionState(tactic='STANDARD'){
  return{tactic,mode:'HOLD',nextEvaluationAt:0,actionsUsed:0,maxActions:2,assignments:{},timeline:[{t:0,mode:'HOLD',reason:'initial_defense_setup'}]};
}

export function evaluateDefenseInformationAction(state,{t,units,siteNames,contact,planted,knowledge,utilityPlayers=[]}){
  const actions=[];
  for(const assignment of Object.values(state.assignments)){
    const unit=units.find(candidate=>candidate.name===assignment.player);
    if(assignment.status!=='active')continue;
    const abort=contact||planted||(knowledge?.confidence||0)>=.72||!unit?.alive;
    if(abort||t>=assignment.returnAt){assignment.status='returning';actions.push({type:'fallback',player:assignment.player,reason:!unit?.alive?'probe_player_lost':planted?'spike_planted':contact?'enemy_contact':'information_window_expired'});}
  }
  if(actions.length)return actions;
  if(contact||planted||t<state.nextEvaluationAt||state.actionsUsed>=state.maxActions||(knowledge?.confidence||0)>=.55)return actions;

  const counts=new Map();for(const unit of units.filter(unit=>unit.alive))counts.set(unit.zone,(counts.get(unit.zone)||0)+1);
  const eligible=units.filter(unit=>unit.alive&&!Object.values(state.assignments).some(item=>item.status==='active'&&item.player===unit.name)&&(unit.zone==='mid'||!siteNames.includes(unit.zone)||(counts.get(unit.zone)||0)>1)).sort((a,b)=>(b.mind.awareness+b.mind.discipline+b.mind.coordination)-(a.mind.awareness+a.mind.discipline+a.mind.coordination));
  if(!eligible.length){state.nextEvaluationAt=t+5;return actions;}
  const aggression={PASSIVE:.12,RETAKE:.1,STACK:.3,STANDARD:.35,AGGRESSIVE:.9}[state.tactic]??.35;
  if(random()>aggression+.18){state.nextEvaluationAt=t+4;state.timeline.push({t:rounded(t),mode:'HOLD',reason:'risk_exceeds_information_value'});return actions;}

  let mode='INFO_PEEK',players=[eligible[0]];
  const utilityOwner=eligible.find(unit=>utilityPlayers.includes(unit.name));
  if(utilityOwner&&random()<.55){mode='UTILITY_CHECK';players=[utilityOwner];}
  else if(aggression>=.65&&eligible.length>=2){const lead=eligible[0],partner=eligible.find(unit=>unit!==lead&&(unit.zone!==lead.zone||lead.zone==='mid'||(counts.get(lead.zone)||0)>=3));if(partner){mode='CONTROL_PUSH';players=[lead,partner];}}
  const duration=mode==='CONTROL_PUSH'?4.2:mode==='INFO_PEEK'?2.4:1.4;
  for(const unit of players)state.assignments[unit.name]={player:unit.name,mode,status:'active',startedAt:rounded(t),returnAt:rounded(t+duration),zone:unit.zone};
  state.mode=mode;state.actionsUsed++;state.nextEvaluationAt=t+duration+7;state.timeline.push({t:rounded(t),mode,reason:mode==='UTILITY_CHECK'?'safe_utility_information_available':mode==='CONTROL_PUSH'?'aggressive_two_player_control':'low_risk_information_peek',players:players.map(unit=>unit.name),zones:players.map(unit=>unit.zone),returnAt:rounded(t+duration)});
  actions.push({type:'start',mode,players:players.map(unit=>unit.name),reason:state.timeline.at(-1).reason,duration});return actions;
}

export function completeDefenseFallback(state,player,t){const assignment=state.assignments[player];if(!assignment)return;assignment.status='complete';assignment.completedAt=rounded(t);if(!Object.values(state.assignments).some(item=>item.status==='active'||item.status==='returning'))state.mode='HOLD';state.timeline.push({t:rounded(t),mode:'HOLD',reason:'probe_returned_to_anchor',players:[player]});}

export function defenseDecisionSnapshot(state){return JSON.parse(JSON.stringify(state));}
