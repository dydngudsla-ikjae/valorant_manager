import { AGENT_KITS } from './agents.js';
import { ABFX } from './weapons.js';

// Balance data is deliberately separate from the round engine. Agent-specific
// exceptions can be added here without teaching the simulator new UI rules.
export const ABILITY_MODEL={
  version:'abilities-v1',
  ultCosts:{DUE:7,INI:8,SEN:7,CON:7},
  typeDefaults:{
    smoke:{cost:150,charges:2,edge:.35,duration:5},wall:{cost:300,charges:1,edge:.45,duration:6},
    flash:{cost:250,charges:2,edge:.50,duration:1},recon:{cost:250,charges:1,edge:.42,duration:2},
    stun:{cost:200,charges:1,edge:.38,duration:2},molly:{cost:250,charges:1,edge:.42,duration:4},
    trap:{cost:200,charges:1,edge:.36,duration:8},heal:{cost:0,charges:1,edge:.28,duration:1},
    move:{cost:150,charges:1,edge:.30,duration:1},buff:{cost:200,charges:1,edge:.32,duration:3},
    ult:{cost:0,charges:1,edge:1.25,duration:6}
  }
};

// Verified live rules for the first role-complete implementation set. Values
// absent here continue to use the generic model until that agent is audited.
export const AGENT_ABILITY_OVERRIDES={
  Jett:{
    Cloudburst:{cost:200,maxCharges:2,type:'smoke',mechanic:'vision_block',edge:.34,duration:2.5},
    Updraft:{cost:150,maxCharges:1,type:'move',mechanic:'vertical_reposition',edge:.28},
    Tailwind:{cost:0,maxCharges:1,type:'move',signature:true,recharge:{type:'kills',count:2},mechanic:'dash_escape',edge:.55},
    'Blade Storm':{ultimate:true,ultCost:8,type:'ult',mechanic:'blade_storm',edge:1.15}
  },
  Sova:{
    'Owl Drone':{cost:400,maxCharges:1,type:'recon',mechanic:'drone_tag',edge:.58},
    'Shock Bolt':{cost:200,maxCharges:2,type:'molly',mechanic:'direct_damage',damage:55,edge:.42},
    'Recon Bolt':{cost:0,maxCharges:1,type:'recon',signature:true,recharge:{type:'cooldown',seconds:50},mechanic:'reveal_scan',edge:.68},
    "Hunter's Fury":{ultimate:true,ultCost:8,type:'ult',mechanic:'wall_piercing_damage',damage:80,edge:1.35}
  },
  Killjoy:{
    Nanoswarm:{cost:200,maxCharges:2,type:'molly',mechanic:'remote_area_damage',damage:45,edge:.48,duration:4},
    Alarmbot:{cost:200,maxCharges:1,type:'trap',mechanic:'vulnerable_trap',edge:.52},
    Turret:{cost:0,maxCharges:1,type:'trap',signature:true,recharge:{type:'destroyed_cooldown',seconds:60},mechanic:'turret_anchor',damage:18,edge:.62},
    Lockdown:{ultimate:true,ultCost:9,type:'ult',mechanic:'detain_zone',edge:1.6,duration:8}
  },
  Omen:{
    'Shrouded Step':{cost:100,maxCharges:2,type:'move',mechanic:'short_teleport',edge:.30},
    Paranoia:{cost:250,maxCharges:1,type:'flash',mechanic:'wall_nearsight',edge:.68,duration:2},
    'Dark Cover':{cost:0,maxCharges:2,type:'smoke',signature:true,recharge:{type:'cooldown',seconds:30},mechanic:'global_smoke',edge:.55,duration:15},
    'From the Shadows':{ultimate:true,ultCost:7,type:'ult',mechanic:'global_teleport',edge:1.05}
  }
};

export function agentAbilityDefinitions(agent,role){
  const kit=AGENT_KITS[agent];if(!kit)return [];
  return kit.ab.map((name,index)=>{
    const override=AGENT_ABILITY_OVERRIDES[agent]?.[name]||{},ultimate=override.ultimate??index===3,type=override.type||(ultimate?'ult':(ABFX[name]||'buff')),base=ABILITY_MODEL.typeDefaults[type];
    // The third regular slot acts as the signature and refreshes every round.
    const signature=index===2;
    return{id:`${agent}:${index}`,agent,name,index,type,ultimate,signature:override.signature??signature,cost:override.cost??(signature||ultimate?0:base.cost),maxCharges:override.maxCharges??base.charges,ultCost:override.ultCost??(ultimate?(ABILITY_MODEL.ultCosts[role]||7):0),edge:override.edge??base.edge,duration:override.duration??base.duration,mechanic:override.mechanic||type,damage:override.damage||0,recharge:override.recharge||null,verified:!!AGENT_ABILITY_OVERRIDES[agent]};
  });
}
