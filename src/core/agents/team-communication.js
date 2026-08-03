import { createIglDecisionState } from './igl-decision-engine.js';

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const cleanPoint=point=>point?{x:+point.x.toFixed(2),y:+point.y.toFixed(2)}:undefined;

const iglScore=unit=>unit.mind.awareness*.4+unit.mind.coordination*.4+unit.mind.composure*.2;
const communicationDelay=unit=>clamp(.15+(100-unit.mind.coordination)/140,.15,.75);

export function createTeamCommunication(units,{targetSite,formation,attackSide=units[0]?.side}={}){
  const sides={};
  for(const side of new Set(units.map(unit=>unit.side))){
    const members=units.filter(unit=>unit.side===side),igl=members.slice().sort((a,b)=>iglScore(b)-iglScore(a))[0];
    sides[side]={
      igl:igl?.name||null,queue:[],sequence:0,knowledge:{site:null,confidence:0,lastUpdate:-99,source:null},orderHistory:[],
      formation:side===attackSide?formation:'DEFENSE_SETUP',formationHistory:[{t:0,formation:side===attackSide?formation:'DEFENSE_SETUP',reason:'initial_tactical_plan',by:igl?.name||null}],iglState:createIglDecisionState({mode:side===attackSide?'OPENING':'HOLD_SETUP',targetSite}),facts:[],proposals:[],decisions:[],orders:Object.fromEntries(members.map(unit=>[unit.name,{type:unit.side===attackSide?'execute_assignment':'hold_assignment',role:unit.role,zone:unit.zone,targetSite,formation:side===attackSide?formation:'DEFENSE_SETUP',status:'active',issuedAt:0,by:igl?.name||null}])),
    };
  }
  return {sides,playerKnowledge:Object.fromEntries(units.map(unit=>[unit.name,{side:unit.side,facts:[],proposals:[]}]))};
}

function enqueue(state,unit,t,kind,payload){
  const side=state.sides[unit.side],message={id:`${unit.side}-${++side.sequence}`,kind,from:unit.name,side:unit.side,createdAt:+t.toFixed(2),deliverAt:+(t+communicationDelay(unit)).toFixed(2),...payload};
  side.queue.push(message);return message;
}

export function reportPlayerFact(state,unit,t,type,{site,point,target,confidence=.6,detail}={}){
  const knowledge=state.playerKnowledge[unit.name],fact={t:+t.toFixed(2),type,site,target,confidence:+confidence.toFixed(2),point:cleanPoint(point),detail};
  knowledge.facts.push(fact);return enqueue(state,unit,t,'fact',{fact});
}

export function proposePlayerAction(state,unit,t,type,{site,reason,requestedAction,waitUntil,confidence=.6,urgency=.5,evidence=[]}={}){
  const proposal={t:+t.toFixed(2),type,site,reason,requestedAction,waitUntil:Number.isFinite(waitUntil)?+waitUntil.toFixed(2):undefined,confidence:+confidence.toFixed(2),urgency:+urgency.toFixed(2),evidence};
  state.playerKnowledge[unit.name].proposals.push(proposal);return enqueue(state,unit,t,'proposal',{proposal});
}

function proposalVerdict(side,message,t,context){
  const proposal=message.proposal,igl=context.unitsByName.get(side.igl),quality=igl?iglScore(igl)/100:.6;
  if(proposal.type==='wait_for_utility'){
    if((proposal.waitUntil??t)-t<=4&&context.timeRemaining>18)return{verdict:'approve',order:'wait_for_utility',until:proposal.waitUntil};
    return{verdict:'reject',order:'continue_plan'};
  }
  if(proposal.type==='continue_probe'){
    if(['GATHER_INFO','WAIT_UTILITY'].includes(side.iglState?.mode))return{verdict:'approve',order:'continue_probe'};
    if(side.iglState?.committed)return{verdict:'recall',order:'join_group'};
    if(context.alliesAlive>=4&&context.timeRemaining>28&&proposal.confidence+quality*.25>=.82)return{verdict:'approve',order:'continue_probe'};
    return{verdict:'recall',order:'join_group'};
  }
  if(proposal.type==='commit_site'){
    if(proposal.confidence*.45+proposal.urgency*.3+quality*.25>=.68)return{verdict:'approve',order:'commit_site'};
    return{verdict:'hold',order:'gather_more_information'};
  }
  if(proposal.type==='follow_rotation_sound'){
    if(context.timeRemaining>22&&context.alliesAlive>=3&&proposal.confidence+quality*.2>=.72)return{verdict:'approve',order:'follow_rotation_sound'};
    return{verdict:'hold',order:'hold_for_team'};
  }
  return{verdict:'hold',order:'maintain_plan'};
}

export function processTeamCommunication(state,t,context){
  const issued=[];
  for(const side of Object.values(state.sides)){
    const ready=side.queue.filter(message=>message.deliverAt<=t);side.queue=side.queue.filter(message=>message.deliverAt>t);
    for(const message of ready){
      if(message.kind==='fact'){
        const fact={...message.fact,from:message.from,receivedAt:+t.toFixed(2)};side.facts.push(fact);
        const tacticalFact=['enemy_sighting','enemy_footsteps','teammate_death','spike_planted'].includes(fact.type),recentSignals=side.facts.filter(entry=>['enemy_sighting','enemy_footsteps'].includes(entry.type)&&entry.site===fact.site&&t-entry.receivedAt<=4),uniqueTargets=new Set(recentSignals.map(entry=>entry.target)).size;
        const confidence=fact.type==='spike_planted'?1:(fact.type==='teammate_death'?0.9:Math.max(fact.confidence,Math.min(0.9,0.45+uniqueTargets*0.18)));
        if(tacticalFact&&fact.site&&(confidence>=side.knowledge.confidence||t-side.knowledge.lastUpdate>3)){side.knowledge={site:fact.site,confidence,lastUpdate:t,source:fact.type};}
      }else{
        const result=proposalVerdict(side,message,t,context),decision={t:+t.toFixed(2),igl:side.igl,from:message.from,proposal:message.proposal.type,site:message.proposal.site,reason:message.proposal.reason,...result};side.proposals.push({...message.proposal,from:message.from,receivedAt:+t.toFixed(2)});side.decisions.push(decision);issued.push({side,decision});
        side.orders[message.from]={type:result.order,site:message.proposal.site,status:'active',issuedAt:+t.toFixed(2),by:side.igl,sourceProposal:message.proposal.type,until:result.until};side.orderHistory.push({player:message.from,...side.orders[message.from]});
      }
    }
  }
  return issued;
}

export function issueIglTeamOrder(state,sideKey,t,type,{site,reason,confidence=1,players=[]}={}){
  const side=state.sides[sideKey],decision={t:+t.toFixed(2),igl:side.igl,type,site,reason,confidence:+confidence.toFixed(2),players};side.decisions.push(decision);
  for(const player of players){side.orders[player]={type,site,status:'active',issuedAt:+t.toFixed(2),by:side.igl,reason};side.orderHistory.push({player,...side.orders[player]});}
  return decision;
}

export function updateIglFormation(state,sideKey,t,formation,{reason,site,assignments={}}={}){
  const side=state.sides[sideKey],changed=side.formation!==formation;side.formation=formation;if(changed)side.formationHistory.push({t:+t.toFixed(2),formation,reason,site,by:side.igl});
  for(const [player,assignment] of Object.entries(assignments)){side.orders[player]={...side.orders[player],...assignment,formation,site,status:'active',issuedAt:+t.toFixed(2),by:side.igl,reason};side.orderHistory.push({player,...side.orders[player]});}
  if(changed)side.decisions.push({t:+t.toFixed(2),igl:side.igl,type:'formation_change',formation,site,reason,players:Object.keys(assignments)});return changed;
}

export function snapshotTeamCommunication(state){
  return {
    players:state.playerKnowledge,
    teams:Object.fromEntries(Object.entries(state.sides).map(([key,side])=>[key,{igl:side.igl,formation:side.formation,formationHistory:side.formationHistory,iglState:side.iglState,knowledge:{...side.knowledge,confidence:+side.knowledge.confidence.toFixed(2),lastUpdate:+side.knowledge.lastUpdate.toFixed(2)},pendingMessages:side.queue.length,facts:side.facts,proposals:side.proposals,decisions:side.decisions,orders:side.orders,orderHistory:side.orderHistory}])),
  };
}
