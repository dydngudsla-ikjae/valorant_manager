const OBJECT_RULES={
  reveal_scan:{kind:'recon',hp:40,windup:.4,duration:4,destructible:true},
  drone_tag:{kind:'drone',hp:100,windup:.6,duration:7,destructible:true},
  turret_anchor:{kind:'turret',hp:100,windup:.75,duration:90,destructible:true},
  vulnerable_trap:{kind:'trap',hp:20,windup:2,duration:90,destructible:true},
  remote_area_damage:{kind:'molly',hp:20,windup:.4,duration:4.4,destructible:true},
  detain_zone:{kind:'lockdown',hp:200,windup:13,duration:21,destructible:true},
  vision_block:{kind:'smoke',hp:0,windup:.2,duration:2.5,destructible:false},
  global_smoke:{kind:'smoke',hp:0,windup:.5,duration:15,destructible:false}
};

export function createAbilityObject(use,index,{sitePoint,chokePoint,attackSide,ownerPoint,placedAt=0,instanceId=null}={}){
  const rule=OBJECT_RULES[use.mechanic];if(!rule)return null;
  const local=['turret_anchor','vulnerable_trap','remote_area_damage'].includes(use.mechanic);
  const point=local&&ownerPoint?ownerPoint:(use.side===attackSide?chokePoint:sitePoint);
  return{id:`ability-object-${instanceId??index+1}`,owner:use.player,side:use.side,ability:use.name,mechanic:use.mechanic,edge:use.edge||0,...rule,x:point.x,y:point.y,placedAt,activeAt:placedAt+rule.windup,expiresAt:placedAt+rule.duration,currentHP:rule.hp,destroyedAt:null,destroyedBy:null};
}

export function createAbilityObjects(uses,context={}){
  return uses.map((use,index)=>createAbilityObject(use,index,context)).filter(Boolean);
}

export function abilityObjectActive(object,time){return object.destroyedAt==null&&time>=object.activeAt&&time<object.expiresAt;}
