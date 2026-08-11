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
    'Owl Drone':{verified:true,cost:400,maxCharges:1,type:'recon',mechanic:'drone_tag',edge:.58},
    'Shock Bolt':{verified:true,cost:150,maxCharges:2,type:'molly',mechanic:'shock_bolt',damage:75,edge:.42},
    'Recon Bolt':{verified:true,cost:0,maxCharges:1,type:'recon',signature:true,recharge:{type:'cooldown',seconds:60},mechanic:'reveal_scan',edge:.68},
    "Hunter's Fury":{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'hunters_fury',damage:80,edge:1.35}
  },
  Killjoy:{
    Nanoswarm:{cost:200,maxCharges:2,type:'molly',mechanic:'remote_area_damage',damage:45,edge:.48,duration:5},
    Alarmbot:{cost:200,maxCharges:1,type:'trap',mechanic:'vulnerable_trap',edge:.52},
    Turret:{cost:0,maxCharges:1,type:'trap',signature:true,recharge:{type:'destroyed_cooldown',seconds:60},mechanic:'turret_anchor',damage:18,edge:.62},
    Lockdown:{ultimate:true,ultCost:9,type:'ult',mechanic:'detain_zone',edge:1.6,duration:8}
  },
  Omen:{
    'Shrouded Step':{cost:100,maxCharges:2,type:'move',mechanic:'short_teleport',edge:.30},
    Paranoia:{cost:250,maxCharges:1,type:'flash',mechanic:'wall_nearsight',edge:.68,duration:2},
    'Dark Cover':{cost:0,extraChargeCost:150,maxCharges:2,type:'smoke',signature:true,recharge:{type:'cooldown',seconds:40},mechanic:'global_smoke',edge:.55,duration:15},
    'From the Shadows':{ultimate:true,ultCost:7,type:'ult',mechanic:'global_teleport',edge:1.05}
  },
  Breach:{
    Aftershock:{cost:200,maxCharges:1,type:'molly',mechanic:'wall_aftershock',damage:80,edge:.62,duration:.6},
    Flashpoint:{cost:250,maxCharges:2,type:'flash',mechanic:'wall_flash',edge:.68,duration:2.25},
    'Fault Line':{cost:0,maxCharges:1,type:'stun',signature:true,recharge:{type:'cooldown',seconds:50},mechanic:'line_concuss',edge:.72,duration:2.5},
    'Rolling Thunder':{ultimate:true,ultCost:8,type:'ult',mechanic:'rolling_concuss',edge:1.35,duration:4}
  },
  Raze:{
    'Boom Bot':{verified:true,cost:300,maxCharges:1,type:'recon',mechanic:'boom_bot',damage:80,edge:.58,duration:5},
    'Blast Pack':{verified:true,cost:200,maxCharges:2,type:'move',mechanic:'blast_pack',damage:50,edge:.48,duration:1.5},
    'Paint Shells':{verified:true,cost:0,maxCharges:1,type:'molly',signature:true,recharge:{type:'kills',count:2},mechanic:'cluster_grenade',damage:55,edge:.78},
    Showstopper:{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'rocket_explosion',damage:150,edge:1.45}
  },
  Viper:{
    // The pool deals 12.5 base DPS. Its own Vulnerable doubles applied
    // damage to 25 DPS while the target remains affected.
    'Snake Bite':{verified:true,cost:300,maxCharges:1,type:'molly',mechanic:'acid_pool',damage:12.5,edge:.58,duration:6.5},
    'Poison Cloud':{verified:true,cost:200,maxCharges:1,type:'smoke',mechanic:'toxin_cloud',edge:.58,duration:12},
    'Toxic Screen':{verified:true,cost:0,maxCharges:1,type:'wall',signature:true,mechanic:'toxin_screen',edge:.72,duration:12},
    "Viper's Pit":{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'toxin_pit',edge:1.55,duration:999}
  },
  Chamber:{
    Trademark:{verified:true,cost:200,maxCharges:1,type:'trap',mechanic:'chamber_trademark',edge:.54,duration:4},
    Headhunter:{verified:true,cost:100,maxCharges:8,type:'buff',mechanic:'headhunter',edge:.68},
    Rendezvous:{verified:true,cost:0,maxCharges:1,type:'move',signature:true,recharge:{type:'cooldown',seconds:30},mechanic:'rendezvous_anchor',edge:.72},
    'Tour De Force':{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'tour_de_force',edge:1.45,duration:4}
  },
  Cypher:{
    Trapwire:{verified:true,cost:200,maxCharges:2,type:'trap',mechanic:'cypher_tripwire',edge:.62},
    'Cyber Cage':{verified:true,cost:100,maxCharges:2,type:'smoke',mechanic:'cyber_cage',edge:.58,duration:7.25},
    Spycam:{verified:true,cost:0,maxCharges:1,type:'recon',signature:true,recharge:{type:'destroyed_cooldown',seconds:45},mechanic:'spycam_recon',edge:.72},
    'Neural Theft':{verified:true,ultimate:true,ultCost:6,type:'ult',mechanic:'neural_theft',edge:1.35}
  },
  Vyse:{
    Shear:{verified:true,cost:200,maxCharges:1,type:'trap',mechanic:'vyse_shear',edge:.68,duration:7.8},
    'Arc Rose':{verified:true,cost:0,maxCharges:1,type:'flash',signature:true,recharge:{type:'cooldown',seconds:20},mechanic:'vyse_arc_rose',edge:.72,duration:2.25},
    Razorvine:{verified:true,cost:150,maxCharges:2,type:'molly',mechanic:'vyse_razorvine',damage:15,edge:.62,duration:10},
    'Steel Garden':{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'steel_garden',edge:1.5,duration:8}
  },
  Astra:{
    'Gravity Well':{verified:true,cost:150,maxCharges:5,signature:false,type:'stun',mechanic:'astra_gravity',edge:.62,duration:2,recharge:{type:'cooldown',seconds:60}},
    'Nova Pulse':{verified:true,cost:150,maxCharges:5,signature:false,type:'stun',mechanic:'astra_nova',edge:.58,duration:2.5,recharge:{type:'cooldown',seconds:60}},
    Nebula:{verified:true,cost:150,maxCharges:5,signature:false,type:'smoke',mechanic:'astra_nebula',edge:.72,duration:14.25,recharge:{type:'cooldown',seconds:35}},
    'Astral Form':{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'cosmic_divide',edge:1.5,duration:21}
  },
  Fade:{
    Prowler:{verified:true,cost:250,maxCharges:2,type:'recon',mechanic:'fade_prowler',edge:.62,duration:2.5},
    Seize:{verified:true,cost:200,maxCharges:1,type:'stun',mechanic:'fade_seize',edge:.58,duration:4.5},
    Haunt:{verified:true,cost:0,maxCharges:1,type:'recon',signature:true,recharge:{type:'cooldown',seconds:60},mechanic:'fade_haunt',edge:.72,duration:1.5},
    Nightfall:{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'fade_nightfall',edge:1.45,duration:8}
  },
  Yoru:{
    Fakeout:{verified:true,cost:200,maxCharges:1,type:'flash',mechanic:'yoru_fakeout',edge:.58,duration:2},
    Blindside:{verified:true,cost:250,maxCharges:1,type:'flash',mechanic:'yoru_blindside',edge:.64,duration:1.5},
    Gatecrash:{verified:true,cost:0,maxCharges:1,type:'move',signature:true,recharge:{type:'kills',count:2},mechanic:'yoru_gatecrash',edge:.76,duration:20},
    'Dimensional Drift':{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'yoru_drift',edge:1.35,duration:10}
  },
  Neon:{
    'Fast Lane':{verified:true,cost:300,maxCharges:1,type:'wall',mechanic:'neon_fast_lane',edge:.64,duration:4},
    'Relay Bolt':{verified:true,cost:200,maxCharges:1,type:'stun',mechanic:'neon_relay_bolt',edge:.68,duration:2.5},
    'High Gear':{verified:true,cost:0,extraChargeCost:150,maxCharges:2,type:'move',signature:true,recharge:{type:'kills',count:2},mechanic:'neon_high_gear',edge:.74,duration:16},
    Overdrive:{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'neon_overdrive',edge:1.4,duration:20}
  },
  Tejo:{
    'Stealth Drone':{verified:true,cost:400,maxCharges:1,type:'recon',mechanic:'tejo_stealth_drone',edge:.68,duration:6},
    'Special Delivery':{verified:true,cost:200,maxCharges:1,type:'stun',mechanic:'tejo_special_delivery',damage:35,edge:.62,duration:2.5},
    'Guided Salvo':{verified:true,cost:0,extraChargeCost:150,maxCharges:2,type:'molly',signature:true,mechanic:'tejo_guided_salvo',damage:65,edge:.78},
    Armageddon:{verified:true,ultimate:true,ultCost:9,type:'ult',mechanic:'tejo_armageddon',damage:75,edge:1.5,duration:4}
  },
  Brimstone:{
    Incendiary:{verified:true,cost:250,maxCharges:1,type:'molly',mechanic:'brim_incendiary',damage:60,edge:.64,duration:7},
    'Stim Beacon':{verified:true,cost:100,maxCharges:1,type:'buff',mechanic:'brim_stim_beacon',edge:.54,duration:12},
    'Sky Smoke':{verified:true,cost:100,maxCharges:3,type:'smoke',signature:true,mechanic:'brim_sky_smoke',edge:.72,duration:19.25},
    'Orbital Strike':{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'brim_orbital_strike',damage:80,edge:1.5,duration:3}
  },
  Phoenix:{
    Curveball:{verified:true,cost:0,extraChargeCost:250,maxCharges:2,type:'flash',signature:true,recharge:{type:'kills',count:2},mechanic:'phoenix_curveball',edge:.64,duration:1.5},
    Blaze:{verified:true,cost:150,maxCharges:1,type:'wall',signature:false,mechanic:'phoenix_blaze',damage:30,edge:.58,duration:8},
    'Hot Hands':{verified:true,cost:200,maxCharges:1,type:'molly',signature:false,mechanic:'phoenix_hot_hands',damage:60,edge:.68,duration:4},
    'Run It Back':{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'phoenix_run_it_back',edge:1.4,duration:10}
  },
  Skye:{
    Regrowth:{verified:true,cost:200,maxCharges:1,type:'heal',mechanic:'skye_regrowth',edge:.58,duration:5},
    Trailblazer:{verified:true,cost:250,maxCharges:1,type:'recon',mechanic:'skye_trailblazer',damage:30,edge:.66,duration:6},
    'Guiding Light':{verified:true,cost:0,extraChargeCost:250,maxCharges:2,type:'flash',signature:true,recharge:{type:'cooldown',seconds:50},mechanic:'skye_guiding_light',edge:.72,duration:2.25},
    Seekers:{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'skye_seekers',edge:1.4,duration:15}
  },
  'KAY/O':{
    'FRAG/ment':{verified:true,cost:200,maxCharges:1,type:'molly',mechanic:'kayo_fragment',damage:60,edge:.64,duration:4},
    'FLASH/drive':{verified:true,cost:250,maxCharges:2,type:'flash',mechanic:'kayo_flash_drive',edge:.68,duration:2.25},
    'ZERO/point':{verified:true,cost:0,maxCharges:1,type:'recon',signature:true,recharge:{type:'cooldown',seconds:50},mechanic:'kayo_zero_point',edge:.76,duration:8},
    'NULL/cmd':{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'kayo_null_cmd',edge:1.45,duration:12}
  },
  Gekko:{
    'Mosh Pit':{verified:true,cost:250,maxCharges:1,type:'molly',mechanic:'gekko_mosh',damage:150,edge:.68,duration:4},
    Wingman:{verified:true,cost:300,maxCharges:1,type:'recon',mechanic:'gekko_wingman',edge:.72,duration:6},
    Dizzy:{verified:true,cost:0,maxCharges:1,type:'flash',signature:true,mechanic:'gekko_dizzy',edge:.74,duration:1},
    Thrash:{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'gekko_thrash',edge:1.45,duration:6}
  },
  Sage:{
    'Barrier Orb':{verified:true,cost:400,maxCharges:1,type:'wall',mechanic:'sage_barrier',edge:.78,duration:30},
    'Slow Orb':{verified:true,cost:200,maxCharges:2,type:'molly',mechanic:'sage_slow_orb',edge:.64,duration:7},
    'Healing Orb':{verified:true,cost:0,maxCharges:1,type:'heal',signature:true,recharge:{type:'cooldown',seconds:45},mechanic:'sage_healing_orb',edge:.72,duration:5},
    Resurrection:{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'sage_resurrection',edge:1.55,duration:3.3}
  },
  Clove:{
    'Pick-me-up':{verified:true,cost:200,maxCharges:1,type:'heal',mechanic:'clove_pick_me_up',edge:.7,duration:10},
    Meddle:{verified:true,cost:250,maxCharges:1,type:'molly',mechanic:'clove_meddle',edge:.68,duration:5},
    Ruse:{verified:true,cost:0,extraChargeCost:150,maxCharges:2,type:'smoke',signature:true,recharge:{type:'cooldown',seconds:40},mechanic:'clove_ruse',edge:.74,duration:13.5},
    'Not Dead Yet':{verified:true,ultimate:true,ultCost:8,type:'ult',mechanic:'clove_not_dead_yet',edge:1.5,duration:12}
  },
  Deadlock:{
    GravNet:{verified:true,cost:0,maxCharges:1,type:'stun',signature:true,recharge:{type:'cooldown',seconds:50},mechanic:'deadlock_gravnet',edge:.72,duration:6},
    'Sonic Sensor':{verified:true,cost:200,maxCharges:2,type:'trap',mechanic:'deadlock_sonic_sensor',edge:.64,duration:90},
    'Barrier Mesh':{verified:true,cost:400,maxCharges:1,type:'wall',signature:false,mechanic:'deadlock_barrier_mesh',edge:.78,duration:30},
    Annihilation:{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'deadlock_annihilation',edge:1.5,duration:7}
  },
  Harbor:{
    'Storm Surge':{verified:true,cost:200,maxCharges:1,type:'stun',mechanic:'harbor_storm_surge',edge:.68,duration:4},
    'High Tide':{verified:true,cost:300,maxCharges:1,type:'wall',signature:false,mechanic:'harbor_high_tide',edge:.78,duration:15},
    Cove:{verified:true,cost:0,maxCharges:1,type:'smoke',signature:true,recharge:{type:'cooldown',seconds:30},mechanic:'harbor_cove',edge:.76,duration:19.25},
    Reckoning:{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'harbor_reckoning',edge:1.5,duration:7}
  },
  Iso:{
    Contingency:{verified:true,cost:200,maxCharges:1,type:'wall',mechanic:'iso_contingency',edge:.72,duration:5},
    Undercut:{verified:true,cost:300,maxCharges:1,type:'stun',mechanic:'iso_undercut',edge:.72,duration:4},
    'Double Tap':{verified:true,cost:0,maxCharges:1,type:'buff',signature:true,mechanic:'iso_double_tap',edge:.82,duration:12},
    'Kill Contract':{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'iso_kill_contract',edge:1.55,duration:15}
  },
  Reyna:{
    Leer:{verified:true,cost:250,maxCharges:2,type:'flash',mechanic:'reyna_leer',edge:.7,duration:2},
    Devour:{verified:true,cost:200,maxCharges:2,type:'heal',signature:false,mechanic:'reyna_devour',edge:.68,duration:2},
    Dismiss:{verified:true,cost:200,maxCharges:2,type:'move',signature:false,mechanic:'reyna_dismiss',edge:.76,duration:1.5},
    Empress:{verified:true,ultimate:true,ultCost:7,type:'ult',mechanic:'reyna_empress',edge:1.5,duration:999}
  }
};

export function agentAbilityDefinitions(agent,role){
  const kit=AGENT_KITS[agent];if(!kit)return [];
  return kit.ab.map((name,index)=>{
    const override=AGENT_ABILITY_OVERRIDES[agent]?.[name]||{},ultimate=override.ultimate??index===3,type=override.type||(ultimate?'ult':(ABFX[name]||'buff')),base=ABILITY_MODEL.typeDefaults[type];
    // The third regular slot acts as the signature and refreshes every round.
    const signature=index===2;
    return{id:`${agent}:${index}`,agent,name,index,type,ultimate,signature:override.signature??signature,cost:override.cost??(signature||ultimate?0:base.cost),extraChargeCost:override.extraChargeCost??null,maxCharges:override.maxCharges??base.charges,ultCost:override.ultCost??(ultimate?(ABILITY_MODEL.ultCosts[role]||7):0),edge:override.edge??base.edge,duration:override.duration??base.duration,mechanic:override.mechanic||type,damage:override.damage||0,recharge:override.recharge||null,verified:override.verified??Object.hasOwn(AGENT_ABILITY_OVERRIDES[agent]||{},name)};
  });
}
