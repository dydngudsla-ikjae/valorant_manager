const rounded=value=>+value.toFixed(2);

function latestUtilityFacts(facts=[]){const latest=new Map();for(const fact of facts.filter(entry=>['utility_unavailable','utility_ready','utility_used'].includes(entry.type))){const ability=fact.detail?.ability;if(ability)latest.set(`${fact.from}:${ability}`,fact);}return[...latest.values()];}

export function createExecutePlan({t,site,units,spikeCarrier,choke,reason}){
  const alive=units.filter(unit=>unit.alive),entryOrder=alive.slice().sort((a,b)=>(b.mind.aggression*.55+b.firepower*.25+b.mind.composure*.2)-(a.mind.aggression*.55+a.firepower*.25+a.mind.composure*.2)),carrier=spikeCarrier?.alive?spikeCarrier:null;
  if(carrier){const index=entryOrder.indexOf(carrier);if(index>=0){entryOrder.splice(index,1);entryOrder.push(carrier);}}
  const assignments=entryOrder.map((unit,index)=>({player:unit.name,index,task:unit===carrier?'spike':index===0?'entry':index===1?'second_entry':index===entryOrder.length-1?'flank_watch':'support',status:'assembling',stagingPoint:null,destination:null,releaseAt:null}));
  return{id:`execute-${site}-${rounded(t)}`,site,reason,createdAt:rounded(t),status:'assembling',choke:{x:rounded(choke.x),y:rounded(choke.y)},assembleDeadline:rounded(t+8),executeAt:null,assignments,timeline:[{t:rounded(t),type:'execute_plan_created',site,reason,assignments:assignments.map(({player,task})=>({player,task}))}],spacing:{minimum:1.4,ideal:2.7,maximum:5.5},promotions:0};
}

export function updateExecutePlan(plan,{t,unitsByName,distance,teamFacts=[],contact=false}){
  if(!plan||plan.status==='complete'||plan.status==='cancelled')return[];const actions=[],aliveAssignments=plan.assignments.filter(entry=>unitsByName.get(entry.player)?.alive),ready=aliveAssignments.filter(entry=>distance(unitsByName.get(entry.player),plan.choke)<=7),utility=latestUtilityFacts(teamFacts),waitingUtility=utility.filter(fact=>fact.type==='utility_unavailable'&&(fact.detail?.readyAt??0)>t);
  if(plan.status==='assembling'){
    const enoughReady=ready.length>=Math.min(4,aliveAssignments.length),forced=contact&&ready.length>=Math.min(2,aliveAssignments.length),timedOut=t>=plan.assembleDeadline;
    if((enoughReady&&!waitingUtility.length)||forced||timedOut){plan.status='countdown';plan.executeAt=rounded(t+(forced?0.35:1));const reason=forced?'contact_forced_execute':timedOut?'assembly_timeout':'team_and_utility_ready';plan.timeline.push({t:rounded(t),type:'countdown_started',executeAt:plan.executeAt,reason,ready:ready.map(entry=>entry.player),waitingUtility:waitingUtility.map(fact=>({player:fact.from,ability:fact.detail?.ability,readyAt:fact.detail?.readyAt}))});actions.push({type:'countdown',reason,executeAt:plan.executeAt});}
  }
  if(plan.status==='countdown'&&t>=plan.executeAt){plan.status='executing';plan.timeline.push({t:rounded(t),type:'execute_started',site:plan.site});for(const assignment of aliveAssignments){const roleDelay={entry:0,second_entry:.42,support:.86,spike:1.18,flank_watch:1.45}[assignment.task]??assignment.index*.38;assignment.status='queued';assignment.releaseAt=rounded(t+roleDelay);}}
  if(plan.status==='executing'){
    for(const assignment of aliveAssignments.filter(entry=>entry.status==='queued'&&t>=entry.releaseAt)){assignment.status='executing';plan.timeline.push({t:rounded(t),type:'player_released',player:assignment.player,task:assignment.task,releaseAt:assignment.releaseAt});actions.push({type:'release',assignment});}
    const survivors=plan.assignments.filter(entry=>unitsByName.get(entry.player)?.alive),currentEntry=plan.assignments.find(entry=>entry.task==='entry');if(survivors.length&&currentEntry&&!unitsByName.get(currentEntry.player)?.alive){const promoted=survivors.sort((a,b)=>a.index-b.index)[0];currentEntry.task='eliminated_entry';promoted.task='entry';promoted.index=0;plan.promotions++;plan.timeline.push({t:rounded(t),type:'entry_promoted',player:promoted.player,previousEntry:currentEntry.player});actions.push({type:'promote',assignment:promoted});}
    if(!survivors.length){plan.status='complete';plan.timeline.push({t:rounded(t),type:'execute_complete',reason:'team_eliminated'});}
  }
  return actions;
}

export function executeSpacingDirective(plan,unit,unitsByName,distance){if(!plan||plan.status!=='executing')return null;const own=plan.assignments.find(entry=>entry.player===unit.name);if(!own||own.status==='queued')return own?{move:false,mode:'queued'}:null;const active=plan.assignments.filter(entry=>entry.status==='executing'&&unitsByName.get(entry.player)?.alive).sort((a,b)=>a.index-b.index),index=active.findIndex(entry=>entry.player===unit.name);if(index<=0)return{move:true,mode:'lead'};const predecessor=unitsByName.get(active[index-1].player),gap=distance(unit,predecessor),minimum=own.task==='second_entry'?1.15:plan.spacing.minimum,maximum=own.task==='flank_watch'?7:plan.spacing.maximum;return{move:gap>=minimum,catchUp:gap>maximum,gap:rounded(gap),predecessor:predecessor.name};}

export function executePlanSnapshot(plan){return plan?JSON.parse(JSON.stringify(plan)):null;}
