const OBJECT_RULES={
  // Riot patch notes do not expose the radius; keep it as a model constant.
  reveal_scan:{kind:'recon',hp:20,windup:.4,duration:4,radius:32.5,pulseInterval:1,revealSeconds:1,shootable:true,destructible:true},
  drone_tag:{kind:'drone',hp:100,windup:.6,duration:7,radius:30,moveSpeed:7,tagRange:8,tagPulses:3,pulseInterval:1,revealSeconds:1,shootable:true,destructible:true},
  // Only the 16m pulse radius is public. Lifetime, movement speed and HP stay
  // isolated as simulation constants until Riot exposes stable values.
  tejo_stealth_drone:{kind:'drone',hp:100,windup:.5,duration:6.5,radius:16,moveSpeed:7,revealSeconds:4,suppressSeconds:8,shootable:true,destructible:true},
  brim_incendiary:{kind:'molly',hp:0,windup:.8,duration:7.8,radius:5,damage:60,persistsAfterOwnerDeath:true,destructible:false},
  brim_stim_beacon:{kind:'stim',hp:0,windup:.25,duration:12.25,radius:6,lingerSeconds:4,fireRateMultiplier:1.1,moveMultiplier:1.1,reloadTimeMultiplier:.9,drawTimeMultiplier:.9,spreadRecoveryMultiplier:1.1,destructible:false},
  brim_sky_smoke:{kind:'smoke',hp:0,windup:.75,duration:20,radius:4.15,destructible:false},
  // Damage per second, warning time and radius are explicit model constants.
  brim_orbital_strike:{kind:'orbital',hp:0,windup:2,duration:5,radius:8,damage:80,persistsAfterOwnerDeath:true,destructible:false},
  phoenix_blaze:{kind:'fire_wall',hp:0,windup:.5,duration:8.5,length:30,width:2,damage:30,healPerSecond:12.5,maxSelfHeal:50,persistsAfterOwnerDeath:true,destructible:false},
  phoenix_hot_hands:{kind:'molly',hp:0,windup:.7,duration:4.7,radius:5,damage:60,healPerSecond:12.5,maxSelfHeal:50,persistsAfterOwnerDeath:true,destructible:false},
  skye_trailblazer:{kind:'trailblazer',hp:80,windup:.4,duration:6.4,radius:22.5,moveSpeed:10,leapRange:4,blastRadius:6,damage:30,concussSeconds:4,shootable:true,destructible:true},
  skye_seekers:{kind:'seekers',hp:120,windup:.5,duration:15.5,radius:40,moveSpeed:10,seekerCount:3,triggerRange:3,nearsightSeconds:3,nearsightRange:7,shootable:true,destructible:true},
  kayo_fragment:{kind:'molly',hp:0,windup:1,duration:5,radius:5,damage:60,pulses:4,pulseInterval:1,persistsAfterOwnerDeath:true,destructible:false},
  kayo_zero_point:{kind:'suppression_blade',hp:20,windup:1,duration:2.5,radius:25,suppressSeconds:8,shootable:true,destructible:true},
  gekko_mosh:{kind:'molly',hp:0,windup:.8,duration:4.8,radius:7,damagePerSecond:10,explosionDamage:150,persistsAfterOwnerDeath:true,destructible:false},
  gekko_wingman:{kind:'wingman',hp:60,windup:.25,duration:12.25,radius:24,moveSpeed:8,triggerRange:4,blastRadius:6,concussSeconds:2.5,shootable:true,destructible:true,reclaimable:true,reclaimSeconds:1.5,reclaimCooldown:15},
  gekko_dizzy:{kind:'dizzy',hp:20,windup:.35,duration:1.35,radius:24,moveSpeed:7,shotRange:24,blindSeconds:1,shootable:true,destructible:true,reclaimable:true,reclaimSeconds:1.5,reclaimCooldown:15},
  gekko_thrash:{kind:'thrash',hp:180,windup:.25,duration:6.25,radius:30,moveSpeed:10,leapRange:4,blastRadius:8,detainSeconds:6,shootable:true,destructible:true,reclaimable:true,reclaimSeconds:1.5,reclaimCooldown:15},
  // Segment HP and fortification timing are isolated simulation constants;
  // Riot's current public notes expose cost/range but not the complete wall profile.
  sage_barrier:{kind:'solid_wall',hp:400,windup:.5,duration:30.5,length:10,width:1.5,segments:4,initialHP:400,fortifiedHP:800,fortifySeconds:3.3,shootable:true,destructible:true},
  sage_slow_orb:{kind:'slow',hp:0,windup:.6,duration:7.6,radius:7,moveMultiplier:.5,persistsAfterOwnerDeath:true,destructible:false},
  // Radius, decay amount, smoke radius, and revive timing remain isolated
  // model constants where Riot's public pages describe behavior without values.
  clove_meddle:{kind:'decay',hp:0,windup:.75,duration:5.75,radius:6,decay:90,debuffSeconds:5,destructible:false},
  clove_ruse:{kind:'smoke',hp:0,windup:.75,duration:14.25,radius:4.5,postDeathRange:15,destructible:false},
  // GravNet's 13m total size is live data. Removal timing and movement
  // multiplier are explicit simulation constants until Riot publishes them.
  deadlock_gravnet:{kind:'gravnet',hp:0,windup:.55,duration:6.55,radius:6.5,moveMultiplier:.35,removeSeconds:1.5,destructible:false},
  deadlock_sonic_sensor:{kind:'sound_sensor',hp:20,windup:1,duration:90,detectionRadius:9,triggerDelay:1,concussSeconds:3.5,destructible:true},
  // Mesh blocks agents, not vision or bullets. The radial footprint is a
  // tunable approximation of its centre node and four projected arms.
  deadlock_barrier_mesh:{kind:'mesh_wall',hp:680,windup:.5,duration:30.5,radius:5.5,nodeCount:5,destructible:true},
  deadlock_annihilation:{kind:'nanowire_pulse',hp:0,windup:.5,duration:7.5,radius:30,cocoonHP:600,pullSpeed:7,captureRange:30,destructible:false},
  harbor_storm_surge:{kind:'storm_surge',hp:0,windup:1,duration:5,radius:6,slowSeconds:4,nearsightSeconds:4,moveMultiplier:.5,destructible:false},
  harbor_high_tide:{kind:'water_wall',hp:0,windup:.5,duration:15.5,length:60,width:2,height:8,slowSeconds:.6,moveMultiplier:.5,destructible:false},
  harbor_cove:{kind:'shield_smoke',hp:680,windup:.5,duration:19.75,radius:4.5,shieldHP:680,shielded:false,destructible:true},
  // Wave dimensions and debuff duration are explicit model constants. Live
  // Reckoning can be reactivated to stop its forward travel for seven seconds.
  harbor_reckoning:{kind:'surge_wave',hp:0,windup:.6,duration:7.6,length:40,width:18,moveSpeed:12.5,slowSeconds:4,nearsightSeconds:4,destructible:false},
  // Contingency blocks bullets while preserving vision. Its alternate cast
  // uses half travel speed without changing the wall lifetime.
  iso_contingency:{kind:'moving_bullet_wall',hp:0,windup:.25,duration:5.25,length:7,width:1.2,moveSpeed:7,destructible:false},
  reyna_leer:{kind:'leer_eye',hp:100,windup:.3,duration:2.3,radius:35,nearsightSeconds:.35,nearsightRange:7,shootable:true,destructible:true},
  turret_anchor:{kind:'turret',hp:100,windup:.75,duration:90,radius:40,activationRange:40,reactivationSeconds:2,burstSize:3,burstCooldown:.75,damageBands:{near:8,mid:6,far:4},destructible:true},
  // Riot publishes the 7m detection and 40m owner range, but not every
  // internal movement/explosion value. Keep the modeled values explicit so
  // they can be tuned without changing the spatial loop.
  vulnerable_trap:{kind:'trap',hp:20,windup:2,duration:90,detectionRadius:7,activationRange:40,reactivationSeconds:2,moveSpeed:8.25,triggerRadius:1.6,explosionRadius:3.5,vulnerableSeconds:4,damageMultiplier:2,destructible:true},
  chamber_trademark:{kind:'trap',hp:20,windup:4,duration:90,radius:6,detectionRadius:10,triggerDelay:.9,slowSeconds:4,moveMultiplier:.5,destructible:true},
  rendezvous_anchor:{kind:'anchor',hp:50,windup:0,duration:90,radius:18,equipDelay:.7,cooldownSeconds:30,destructible:true},
  cypher_tripwire:{kind:'trapwire',hp:20,windup:0,duration:90,length:8,triggerWidth:.8,tetherRange:6,triggerDelay:1.5,slowSeconds:2,concussSeconds:3,reactivationSeconds:.5,moveMultiplier:.5,destructible:true},
  cyber_cage:{kind:'smoke',hp:0,windup:.25,duration:7.25,radius:4.5,destructible:false},
  spycam_recon:{kind:'camera',hp:20,windup:.5,duration:90,radius:25,tagCooldown:6,revealSeconds:2,destructible:true},
  vyse_shear:{kind:'wall_trap',hp:20,windup:0,duration:90,detectionRadius:2,wallDuration:7.8,length:8,destructible:true},
  vyse_razorvine:{kind:'molly',hp:0,windup:.5,duration:10,radius:6,moveMultiplier:.5,persistsAfterOwnerDeath:true,destructible:false},
  astra_gravity:{kind:'gravity',hp:0,windup:1.25,duration:3.35,radius:4.75,gravitySeconds:2,fragileSeconds:2.5,moveMultiplier:.45,destructible:false},
  astra_nova:{kind:'nova',hp:0,windup:1,duration:1.1,radius:4.75,concussSeconds:2.5,destructible:false},
  astra_nebula:{kind:'smoke',hp:0,windup:.5,duration:14.75,radius:4.75,destructible:false},
  cosmic_divide:{kind:'cosmic_wall',hp:0,windup:1,duration:22,length:100,width:1,destructible:false},
  fade_haunt:{kind:'recon',hp:1,windup:.4,duration:1.9,radius:30,revealSeconds:1,shootable:true,destructible:true},
  fade_prowler:{kind:'prowler',hp:60,windup:0,duration:2.5,radius:30,moveSpeed:10,biteRange:2,biteDelay:.6,nearsightSeconds:2.75,nearsightRange:7,shootable:true,destructible:true},
  fade_seize:{kind:'seize',hp:0,windup:.8,duration:5.3,radius:6.5,tetherSeconds:4.5,decay:75,destructible:false},
  fade_nightfall:{kind:'nightfall',hp:0,windup:.6,duration:8.6,length:40,width:20,debuffSeconds:8,decay:75,destructible:false},
  yoru_fakeout:{kind:'decoy',hp:150,windup:0,duration:10,moveSpeed:6.75,flashDelay:.8,flashSeconds:2,flashRadius:12,shootable:true,destructible:true},
  yoru_gatecrash:{kind:'teleport_beacon',hp:20,windup:0,duration:20,moveSpeed:8,teleportDelay:.5,shootable:true,destructible:true},
  neon_fast_lane:{kind:'dual_wall',hp:0,windup:.2,duration:6.2,length:30,width:1,wallOffset:3,fullDuration:4,dissolveDuration:2,destructible:false},
  remote_area_damage:{kind:'molly',hp:20,windup:.4,duration:5.4,radius:5.25,destructible:true},
  acid_pool:{kind:'molly',hp:0,windup:.8,duration:6.5,radius:5,persistsAfterOwnerDeath:true,vulnerableSeconds:2,damageMultiplier:2,destructible:false},
  toxin_cloud:{kind:'smoke',hp:0,windup:.5,duration:12,radius:4.5,toxinSource:'Poison Cloud',destructible:false},
  toxin_screen:{kind:'smoke_wall',hp:0,windup:.8,duration:12,length:36,width:2,toxinSource:'Toxic Screen',destructible:false},
  toxin_pit:{kind:'smoke',hp:0,windup:1,duration:999,radius:12,toxinSource:"Viper's Pit",usesFuel:false,destructible:false},
  detain_zone:{kind:'lockdown',hp:200,windup:13.15,chargeSeconds:13,pulseDelay:.15,duration:21.15,radius:32.5,detainSeconds:8,moveMultiplier:.25,destructible:true},
  vision_block:{kind:'smoke',hp:0,windup:.2,duration:2.5,destructible:false},
  // Riot exposes duration but not a stable public radius value. 4.5 map metres
  // is an explicit simulation value and remains isolated here for tuning.
  global_smoke:{kind:'smoke',hp:0,windup:.5,duration:15,radius:4.5,destructible:false},
  boom_bot:{kind:'robot',hp:60,windup:0,duration:5,radius:20,moveSpeed:7,chaseSpeed:12,triggerRadius:5,explosionRadius:5,minimumDamage:30,shootable:true,destructible:false},
  blast_pack:{kind:'satchel',hp:20,windup:1.5,duration:5,explosionRadius:4,minimumDamage:1,objectDamage:600,shootable:true,destructible:false}
};

export function createAbilityObject(use,index,{sitePoint,chokePoint,attackSide,ownerPoint,ownerFacing=0,targetPoint,placedAt=0,instanceId=null}={}){
  const rule=OBJECT_RULES[use.mechanic];if(!rule)return null;
  const local=['iso_contingency','harbor_high_tide','harbor_reckoning','deadlock_sonic_sensor','deadlock_barrier_mesh','deadlock_annihilation','sage_barrier','gekko_wingman','gekko_dizzy','gekko_thrash','skye_trailblazer','skye_seekers','phoenix_blaze','drone_tag','tejo_stealth_drone','fade_prowler','fade_nightfall','yoru_fakeout','yoru_gatecrash','neon_fast_lane','turret_anchor','vulnerable_trap','chamber_trademark','rendezvous_anchor','cypher_tripwire','spycam_recon','vyse_shear','vyse_razorvine','remote_area_damage','acid_pool','toxin_cloud','toxin_screen','toxin_pit','detain_zone','boom_bot','blast_pack'].includes(use.mechanic);
  const point=['reyna_leer','harbor_storm_surge','harbor_cove','deadlock_gravnet','clove_meddle','clove_ruse','sage_slow_orb','gekko_mosh','kayo_fragment','kayo_zero_point','phoenix_hot_hands','reveal_scan','brim_incendiary','brim_stim_beacon','brim_sky_smoke','brim_orbital_strike','fade_haunt','fade_seize','astra_gravity','astra_nova','astra_nebula','cosmic_divide','remote_area_damage','acid_pool','toxin_cloud','vyse_razorvine'].includes(use.mechanic)&&targetPoint?targetPoint:(local&&ownerPoint?ownerPoint:(use.side===attackSide?chokePoint:sitePoint));
  return{id:`ability-object-${instanceId??index+1}`,owner:use.player,side:use.side,ability:use.name,mechanic:use.mechanic,edge:use.edge||0,damage:use.damage||0,...rule,x:point.x,y:point.y,face:ownerFacing,placedAt,activeAt:placedAt+rule.windup,expiresAt:placedAt+rule.duration,lastDamageAt:placedAt+rule.windup,currentHP:rule.hp,destroyedAt:null,destroyedBy:null};
}

export function createAbilityObjects(uses,context={}){
  return uses.map((use,index)=>createAbilityObject(use,index,context)).filter(Boolean);
}

export function abilityObjectActive(object,time){return object.destroyedAt==null&&time>=object.activeAt&&time<object.expiresAt;}

const segmentPointDistance=(point,from,to)=>{const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;if(!length2)return Math.hypot(point.x-from.x,point.y-from.y);const ratio=Math.max(0,Math.min(1,((point.x-from.x)*dx+(point.y-from.y)*dy)/length2));return Math.hypot(point.x-(from.x+ratio*dx),point.y-(from.y+ratio*dy));};
const wallSegment=object=>{const angle=(object.face||0)*Math.PI/180;return{from:{x:object.x,y:object.y},to:{x:object.x+Math.cos(angle)*object.length,y:object.y+Math.sin(angle)*object.length}};};
const orientation=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const onSegment=(a,b,p)=>Math.abs(orientation(a,b,p))<1e-9&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);
const intersects=(a,b,c,d)=>{const o1=orientation(a,b,c),o2=orientation(a,b,d),o3=orientation(c,d,a),o4=orientation(c,d,b);if(o1*o2<0&&o3*o4<0)return true;return onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b);};

export function abilityObjectContains(object,point,time){
  if(!abilityObjectActive(object,time))return false;
  if(['smoke_wall','fire_wall','water_wall'].includes(object.kind)){const wall=wallSegment(object);return segmentPointDistance(point,wall.from,wall.to)<=object.width/2;}
  return object.radius!=null&&Math.hypot(point.x-object.x,point.y-object.y)<=object.radius;
}

export function abilityObjectBlocksSight(object,from,to,time){
  if(!['smoke','shield_smoke','smoke_wall','fire_wall','water_wall','dual_wall','solid_wall'].includes(object?.kind)||!abilityObjectActive(object,time))return false;
  if(object.kind==='solid_wall'){const wall=wallSegment(object);return intersects(from,to,wall.from,wall.to)||segmentPointDistance(wall.from,from,to)<=object.width/2||segmentPointDistance(wall.to,from,to)<=object.width/2;}
  if(object.kind==='dual_wall'){
    const angle=(object.face||0)*Math.PI/180,directionVector={x:Math.cos(angle),y:Math.sin(angle)},normal={x:-Math.sin(angle),y:Math.cos(angle)};
    const dissolveStart=object.activeAt+(object.fullDuration||0),dissolveDuration=Math.max(.001,object.dissolveDuration||0);
    const dissolveProgress=time<=dissolveStart?0:Math.min(1,(time-dissolveStart)/dissolveDuration);
    const startAdvance=object.length*dissolveProgress,remainingLength=Math.max(0,object.length-startAdvance);
    if(remainingLength<=0)return false;
    for(const side of [-1,1]){
      const center={x:object.x+normal.x*object.wallOffset*side+directionVector.x*startAdvance,y:object.y+normal.y*object.wallOffset*side+directionVector.y*startAdvance};
      const wall={from:center,to:{x:center.x+directionVector.x*remainingLength,y:center.y+directionVector.y*remainingLength}};
      if(intersects(from,to,wall.from,wall.to)||segmentPointDistance(wall.from,from,to)<=object.width/2||segmentPointDistance(wall.to,from,to)<=object.width/2)return true;
    }
    return false;
  }
  if(['smoke_wall','fire_wall','water_wall'].includes(object.kind)){const wall=wallSegment(object);return intersects(from,to,wall.from,wall.to)||segmentPointDistance(wall.from,from,to)<=object.width/2||segmentPointDistance(wall.to,from,to)<=object.width/2;}
  const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy;
  const distance=point=>Math.hypot(point.x-object.x,point.y-object.y);
  // Two actors already inside the same smoke can still resolve a close duel;
  // the smoke blocks sightlines entering, leaving or crossing its volume.
  if(distance(from)<=object.radius&&distance(to)<=object.radius)return false;
  const ratio=length2?Math.max(0,Math.min(1,((object.x-from.x)*dx+(object.y-from.y)*dy)/length2)):0;
  return Math.hypot(object.x-(from.x+ratio*dx),object.y-(from.y+ratio*dy))<=object.radius;
}

export function abilityObjectBlocksProjectile(object,from,to,time){
  if(!['cosmic_wall','solid_wall','shield_smoke','moving_bullet_wall'].includes(object?.kind)||!abilityObjectActive(object,time))return false;
  if(object.kind==='shield_smoke'){if(!object.shielded||object.currentHP<=0)return false;const dx=to.x-from.x,dy=to.y-from.y,length2=dx*dx+dy*dy,ratio=length2?Math.max(0,Math.min(1,((object.x-from.x)*dx+(object.y-from.y)*dy)/length2)):0;return Math.hypot(object.x-(from.x+ratio*dx),object.y-(from.y+ratio*dy))<=object.radius;}
  if(object.kind==='solid_wall'){const wall=wallSegment(object);return intersects(from,to,wall.from,wall.to)||segmentPointDistance(wall.from,from,to)<=object.width/2||segmentPointDistance(wall.to,from,to)<=object.width/2;}
  const angle=(object.face||0)*Math.PI/180,half=object.length/2,wall={from:{x:object.x-Math.cos(angle)*half,y:object.y-Math.sin(angle)*half},to:{x:object.x+Math.cos(angle)*half,y:object.y+Math.sin(angle)*half}};return intersects(from,to,wall.from,wall.to);
}

export function damageAbilityObject(object,amount,time,source=null){
  if(!object?.destructible||object.destroyedAt!=null||time>=object.expiresAt||amount<=0)return{applied:0,destroyed:false,remainingHP:object?.currentHP??0};
  const applied=Math.min(object.currentHP,amount);object.currentHP=Math.max(0,object.currentHP-applied);
  if(object.currentHP<=0){object.destroyedAt=time;object.destroyedBy=source;}
  return{applied,destroyed:object.destroyedAt!=null,remainingHP:object.currentHP};
}
