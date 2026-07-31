import { agentAbilityDefinitions } from '../data/abilities.js';
import { random } from './rng.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const sideMods=()=>({information:0,execute:0,hold:0,sustain:0,mobility:0,damage:0});
const OBJECT_MECHANICS=new Set(['reveal_scan','drone_tag','turret_anchor','vulnerable_trap','remote_area_damage','detain_zone','vision_block','global_smoke']);

export function createAbilityState(home,away,agBy){
  const players={};
  for(const [side,team] of [['home',home],['away',away]])for(const player of team.roster){
    const agent=agBy[player.name],defs=agentAbilityDefinitions(agent,player.role);
    players[player.name]={side,agent,ultPoints:0,signatureProgress:0,abilities:Object.fromEntries(defs.map(def=>[def.id,0]))};
  }
  return{version:'ability-state-v1',players};
}

export function resetAbilityInventory(state,roundIndex){
  if(roundIndex!==0&&roundIndex!==12)return state;
  for(const ps of Object.values(state.players))for(const id of Object.keys(ps.abilities))ps.abilities[id]=0;
  return state;
}

export function prepareAbilityBuy(state,team,side,agBy,economy,loadouts,buy){
  const purchases=[];
  team.roster.forEach((player,index)=>{
    const ps=state.players[player.name],defs=agentAbilityDefinitions(agBy[player.name],player.role),account=economy.players[index],loadout=loadouts[index];
    for(const def of defs){
      if(def.ultimate)continue;
      if(def.signature){ps.abilities[def.id]=def.maxCharges;continue;}
      const target=buy==='full'||buy==='force'?def.maxCharges:buy==='pistol'?Math.min(1,def.maxCharges):0;
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
      const available=def.ultimate?ps.ultPoints>=def.ultCost:(ps.abilities[def.id]||0)>0;
      if(!available||!shouldUse(def,player,side,atkSide,{scorePressure}))continue;
      if(def.ultimate)ps.ultPoints-=def.ultCost;else ps.abilities[def.id]--;
      const phase=side===atkSide?'EXECUTE':'HOLD',reason=def.type==='recon'?'missing_recent_information':def.type==='trap'?'secure_initial_control':def.type==='smoke'?'block_expected_sightline':def.ultimate?'high_round_leverage':'create_combat_advantage';
      const use={player:player.name,agentName:ps.agent,name:def.name,type:def.type,mechanic:def.mechanic,damage:def.damage,duration:def.duration,edge:def.edge,decisionSkill:+decisionSkill(player,def).toFixed(1),decision:{phase,reason,scorePressure},ult:def.ultimate,side,cost:def.cost,remaining:def.ultimate?ps.ultPoints:ps.abilities[def.id],ultCost:def.ultCost};uses.push(use);
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
      if(!def.ultimate)break;
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

export function abilitySnapshot(state){
  return Object.fromEntries(Object.entries(state.players).map(([name,ps])=>[name,{agent:ps.agent,ultPoints:ps.ultPoints,abilities:{...ps.abilities}}]));
}
