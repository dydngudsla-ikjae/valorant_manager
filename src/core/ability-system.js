import { agentAbilityDefinitions } from '../data/abilities.js';
import { random } from './rng.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const sideMods=()=>({information:0,execute:0,hold:0,sustain:0,mobility:0,damage:0});
const OBJECT_MECHANICS=new Set(['reveal_scan','drone_tag','fade_haunt','fade_prowler','fade_seize','fade_nightfall','yoru_fakeout','yoru_blindside','yoru_gatecrash','yoru_drift','neon_fast_lane','neon_relay_bolt','neon_high_gear','neon_overdrive','turret_anchor','vulnerable_trap','chamber_trademark','rendezvous_anchor','cypher_tripwire','cyber_cage','spycam_recon','vyse_shear','vyse_razorvine','astra_gravity','astra_nova','astra_nebula','cosmic_divide','remote_area_damage','acid_pool','toxin_cloud','toxin_screen','toxin_pit','detain_zone','vision_block','global_smoke','wall_aftershock','wall_flash','line_concuss','rolling_concuss','boom_bot','blast_pack','cluster_grenade','rocket_explosion']);
for(const mechanic of ['tejo_stealth_drone','tejo_special_delivery','tejo_guided_salvo','tejo_armageddon'])OBJECT_MECHANICS.add(mechanic);
for(const mechanic of ['brim_incendiary','brim_stim_beacon','brim_sky_smoke','brim_orbital_strike'])OBJECT_MECHANICS.add(mechanic);
for(const mechanic of ['phoenix_curveball','phoenix_blaze','phoenix_hot_hands','phoenix_run_it_back'])OBJECT_MECHANICS.add(mechanic);
for(const mechanic of ['skye_regrowth','skye_trailblazer','skye_guiding_light','skye_seekers'])OBJECT_MECHANICS.add(mechanic);

export function createAbilityState(home,away,agBy){
  const players={};
  for(const [side,team] of [['home',home],['away',away]])for(const player of team.roster){
    const agent=agBy[player.name],defs=agentAbilityDefinitions(agent,player.role);
    players[player.name]={side,agent,ultPoints:0,signatureProgress:0,astraStars:agent==='Astra'?0:null,abilities:Object.fromEntries(defs.map(def=>[def.id,0]))};
  }
  return{version:'ability-state-v1',players};
}

export function resetAbilityInventory(state,roundIndex){
  if(roundIndex!==0&&roundIndex!==12)return state;
  for(const ps of Object.values(state.players)){for(const id of Object.keys(ps.abilities))ps.abilities[id]=0;if(ps.agent==='Astra')ps.astraStars=0;}
  return state;
}

export function prepareAbilityBuy(state,team,side,agBy,economy,loadouts,buy){
  const purchases=[];
  team.roster.forEach((player,index)=>{
    const ps=state.players[player.name],defs=agentAbilityDefinitions(agBy[player.name],player.role),account=economy.players[index],loadout=loadouts[index];
    if(ps.agent==='Astra'){ps.astraStars=Math.max(ps.astraStars||0,1);const target=buy==='full'?5:['force','semi','pistol'].includes(buy)?2:0;while(ps.astraStars<target&&account.credits>=150){account.credits-=150;loadout.spent+=150;loadout.remaining=account.credits;ps.astraStars++;purchases.push({player:player.name,ability:'Star',cost:150,sharedCharge:true});}return;}
    for(const def of defs){
      if(def.ultimate)continue;
      if(def.signature){
        // Signatures refresh one free charge. Agents such as Omen may buy an
        // additional charge instead of receiving their whole capacity free.
        ps.abilities[def.id]=Math.max(ps.abilities[def.id]||0,Math.min(1,def.maxCharges));
        const target=buy==='full'?def.maxCharges:buy==='force'||buy==='semi'||buy==='pistol'?Math.min(1,def.maxCharges):0;
        const chargeCost=def.extraChargeCost;
        while(chargeCost!=null&&(ps.abilities[def.id]||0)<target&&account.credits>=chargeCost){account.credits-=chargeCost;loadout.spent+=chargeCost;loadout.remaining=account.credits;ps.abilities[def.id]++;purchases.push({player:player.name,ability:def.name,cost:chargeCost,extraCharge:true});}
        continue;
      }
      const target=buy==='full'?def.maxCharges:buy==='force'||buy==='semi'?Math.min(1,def.maxCharges):buy==='pistol'?Math.min(1,def.maxCharges):0;
      while((ps.abilities[def.id]||0)<target&&account.credits>=def.cost){
        account.credits-=def.cost;loadout.spent+=def.cost;loadout.remaining=account.credits;ps.abilities[def.id]++;purchases.push({player:player.name,ability:def.name,cost:def.cost});
      }
    }
  });
  return purchases;
}

const attribute=(player,key)=>player.attributes?.[key]??player[key]??60;
const decisionSkill=(player,def)=>{
  if(['recon','smoke','trap'].includes(def.type))return(attribute(player,'tactical')+attribute(player,'positioning')+attribute(player,'teamplay'))/3;
  if(['move','flash'].includes(def.type))return(attribute(player,'entry')+attribute(player,'adaptability')+attribute(player,'explosiveness'))/3;
  return(attribute(player,'firepower')+attribute(player,'tactical')+attribute(player,'combatEfficiency'))/3;
};
const shouldUse=(def,player,side,atkSide,roundContext)=>{
  if(def.ultimate)return roundContext.scorePressure||random()<.20;
  const attack=side===atkSide;
  const skillNudge=(decisionSkill(player,def)-60)/180;
  if(['smoke','wall','flash','recon','stun','molly'].includes(def.type))return random()<clamp((attack?.72:.54)+skillNudge,.2,.94);
  if(def.type==='trap')return random()<clamp((attack?.34:.78)+skillNudge,.2,.94);
  return random()<clamp(.48+skillNudge,.2,.88);
};

export function planRoundAbilities(state,{home,away,agBy,atkSide,scoreDiff=0}){
  const uses=[],modifiers={home:sideMods(),away:sideMods()},scorePressure=Math.abs(scoreDiff)>=4;
  for(const [side,team] of [['home',home],['away',away]])for(const player of team.roster){
    const ps=state.players[player.name],defs=agentAbilityDefinitions(agBy[player.name],player.role);
    for(const def of defs){
      const astraStar=ps.agent==='Astra'&&!def.ultimate,available=def.ultimate?ps.ultPoints>=def.ultCost:astraStar?(ps.astraStars||0)>0:(ps.abilities[def.id]||0)>0;
      if(!available||!shouldUse(def,player,side,atkSide,{scorePressure}))continue;
      const chargesUsed=def.mechanic==='headhunter'?(ps.abilities[def.id]||0):1;
      if(def.ultimate)ps.ultPoints-=def.ultCost;else if(astraStar)ps.astraStars--;else ps.abilities[def.id]-=chargesUsed;
      const phase=side===atkSide?'EXECUTE':'HOLD',reason=def.type==='recon'?'missing_recent_information':def.type==='trap'?'secure_initial_control':def.type==='smoke'?'block_expected_sightline':def.ultimate?'high_round_leverage':'create_combat_advantage';
      const use={player:player.name,agentName:ps.agent,name:def.name,type:def.type,mechanic:def.mechanic,damage:def.damage,duration:def.duration,edge:def.edge,decisionSkill:+decisionSkill(player,def).toFixed(1),decision:{phase,reason,scorePressure},ult:def.ultimate,signature:def.signature,recharge:def.recharge,side,cost:def.cost,chargesUsed,ammo:chargesUsed,remaining:def.ultimate?ps.ultPoints:astraStar?ps.astraStars:ps.abilities[def.id],ultCost:def.ultCost,sharedResource:astraStar?'astra_star':null};uses.push(use);
      const m=modifiers[side],edge=def.edge*(def.ultimate?1:0.65+random()*.35);
      if(OBJECT_MECHANICS.has(def.mechanic)){/* spatial object owns its active window */}
      else if(def.type==='recon')m.information+=edge;
      else if(def.mechanic==='global_smoke'){m.execute+=edge*.65;m.hold+=edge*.45;}
      else if(def.mechanic==='detain_zone'){if(side===atkSide)m.execute+=edge;else m.hold+=edge;}
      else if(['smoke','wall','flash','stun'].includes(def.type))m.execute+=edge;
      else if(['trap','molly'].includes(def.type))m.hold+=edge;
      else if(def.type==='heal')m.sustain+=edge;
      else if(def.type==='move')m.mobility+=edge;
      else m.damage+=edge;
      // Keep the event list readable: normally one regular skill per player.
      if(!def.ultimate&&ps.agent!=='Astra')break;
    }
  }
  return{uses,modifiers};
}

export function settleAbilityRound(state,{kills=[],planter=null,orbCaptures=[]}={}){
  const gained={};
  const add=(name,value)=>{const ps=state.players[name];if(!ps)return;ps.ultPoints=clamp(ps.ultPoints+value,0,12);gained[name]=(gained[name]||0)+value;};
  kills.forEach(kill=>{add(kill.killer,1);if(kill.cause!=='spike')add(kill.victim,1);
    const killer=state.players[kill.killer];if(killer?.agent==='Jett'){killer.signatureProgress++;if(killer.signatureProgress>=2){const dashId='Jett:2';killer.abilities[dashId]=1;killer.signatureProgress=0;}}
  });
  add(planter,1);orbCaptures.forEach(capture=>add(capture.player,1));
  return{gained,snapshot:abilitySnapshot(state)};
}

export function restoreUnusedAbilityPlans(state,{plannedUses=[],usedEvents=[]}={}){
  const used=new Map();for(const event of usedEvents){const key=`${event.player}:${event.name}`;used.set(key,(used.get(key)||0)+1);}
  const shots=new Map();for(const event of usedEvents.filter(event=>event.type==='chamberWeaponShot')){const key=`${event.player}:${event.ability}`;shots.set(key,(shots.get(key)||0)+1);}
  const restored=[];for(const use of plannedUses){const key=`${use.player}:${use.name}`,count=used.get(key)||0,ps=state.players[use.player];if(!ps)continue;
    if(use.mechanic==='headhunter'&&count>0){used.set(key,count-1);const def=agentAbilityDefinitions(ps.agent).find(entry=>entry.name===use.name),spent=Math.min(use.chargesUsed||1,shots.get(key)||0),amount=Math.max(0,(use.chargesUsed||1)-spent);if(def&&amount)ps.abilities[def.id]=Math.min(def.maxCharges,(ps.abilities[def.id]||0)+amount);if(amount)restored.push({player:use.player,ability:use.name,ultimate:false,charges:amount});continue;}
    if(count>0){used.set(key,count-1);continue;}if(use.ult)ps.ultPoints=clamp(ps.ultPoints+(use.ultCost||0),0,12);else if(use.sharedResource==='astra_star')ps.astraStars=Math.min(5,(ps.astraStars||0)+(use.chargesUsed||1));else{const def=agentAbilityDefinitions(ps.agent).find(entry=>entry.name===use.name),id=def?.id,amount=use.chargesUsed||1;if(id)ps.abilities[id]=Math.min(def.maxCharges,(ps.abilities[id]||0)+amount);}restored.push({player:use.player,ability:use.name,ultimate:!!use.ult,charges:use.ult?0:(use.chargesUsed||1)});}
  return restored;
}

export function abilitySnapshot(state){
  return Object.fromEntries(Object.entries(state.players).map(([name,ps])=>[name,{agent:ps.agent,ultPoints:ps.ultPoints,astraStars:ps.astraStars,abilities:{...ps.abilities}}]));
}
