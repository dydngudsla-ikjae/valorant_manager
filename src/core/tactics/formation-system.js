export const ATTACK_FORMATIONS={
  FIVE:{id:'FIVE',label:'5',slots:['main','main','main','main','main'],intent:'fast_commit',engagement:'trade_together',joinCondition:'immediate'},
  ONE_FOUR:{id:'ONE_FOUR',label:'1/4',slots:['main','main','main','main','lurk'],intent:'main_hit_with_lurk',engagement:'main_waits_for_contact',joinCondition:'lurk_call_or_team_loss'},
  ONE_THREE_ONE:{id:'ONE_THREE_ONE',label:'1/3/1',slots:['main','main','main','mid','lurk'],intent:'two_side_information',engagement:'avoid_commit_until_read',joinCondition:'igl_commit_order'},
  TWO_THREE:{id:'TWO_THREE',label:'2/3',slots:['main','main','main','mid','mid'],intent:'split_pressure',engagement:'synchronize_contact',joinCondition:'first_group_contact'},
};

export function formationIdFor(plan={},tacticType){
  if(tacticType==='RUSH'||plan.main===5)return'FIVE';
  if(plan.lurk===1&&plan.main===4)return'ONE_FOUR';
  if(plan.lurk===1&&plan.mid===1&&plan.main===3)return'ONE_THREE_ONE';
  if(plan.mid===2&&plan.main===3)return'TWO_THREE';
  if((plan.lurk||0)>=1)return'ONE_THREE_ONE';
  if((plan.mid||0)>=2)return'TWO_THREE';
  return'ONE_FOUR';
}

export function formationDefinition(id){return ATTACK_FORMATIONS[id]||ATTACK_FORMATIONS.ONE_THREE_ONE;}

export function formationTransition(currentId,order){
  if(['commit_site','join_group','emergency_hit'].includes(order))return'FIVE';
  if(order==='gather_more_information')return'ONE_THREE_ONE';
  if(order==='continue_probe')return currentId;
  return currentId;
}
