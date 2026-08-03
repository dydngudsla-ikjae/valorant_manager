import { random } from './rng.js';
import { ARMOR_DATA, WEAPON_DATA } from '../data/weapons.js';

// Gameplay-facing combat data. Keep this separate from the spatial engine so
// weapon balance can be tuned without touching movement or round logic.
export const ARMOR=ARMOR_DATA;
export const WEAPON_DAMAGE=WEAPON_DATA;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const distanceBand=distance=>distance<=8?'near':distance<=15?'mid':'far';
const BURST_SIZE={Classic:2,Frenzy:4,Ghost:2,Sheriff:1,Stinger:4,Spectre:4,Bulldog:3,Phantom:3,Vandal:3,Marshal:1,Operator:1,BladeStorm:1};
const BURST_SPREAD={1:0,2:.13,3:.115,4:.1};

export function createVitalState(shieldType='none',shieldValue=null){
  const armor=ARMOR[shieldType]||ARMOR.none;
  return {hp:100,shield:shieldValue??armor.shield,shieldType,regenerationPool:armor.regenerationPool??0};
}

export function applyDamage(target,rawDamage){
  const before={hp:target.hp,shield:target.shield};
  const armor=ARMOR[target.shieldType]||ARMOR.none;
  // Standard shields split each hit between armor and health. Regen Shield is
  // the exception: it absorbs 100% until its active shield is exhausted.
  const intendedAbsorption=target.shield>0?Math.round(rawDamage*armor.absorption):0;
  const absorbed=Math.min(target.shield,intendedAbsorption);
  target.shield-=absorbed;
  const hpDamage=Math.min(target.hp,rawDamage-absorbed);
  target.hp-=hpDamage;
  return {rawDamage,absorbed,hpDamage,before,after:{hp:target.hp,shield:target.shield},lethal:target.hp<=0};
}

export function rollWeaponHit({weapon='Classic',distance=10,headshotRate=.24,firepower=60,ratingEdge=0}={}){
  const profile=WEAPON_DAMAGE[weapon]||WEAPON_DAMAGE.Classic;
  // Source HS% is the share of landed bullets that hit the head. Player skill
  // nudges it only slightly so the observed rate remains the main signal.
  const observed=Number.isFinite(headshotRate)?headshotRate:.24;
  // Preserve the player's observed landed-bullet HS rate. Firepower and form
  // may nudge shot placement, but must not turn a 25% shooter into a 40% one.
  const hsChance=clamp(.25+(observed-.25)*.9+(firepower-60)/1800+ratingEdge/3000,.06,.45);
  const headshot=random()<hsChance;
  const legshot=!headshot&&random()<.12;
  const hitZone=headshot?'head':legshot?'leg':'body';
  const damage=profile[hitZone][distanceBand(distance)];
  return {weapon,hitZone,headshot,damage,cooldown:profile.cadence*(.9+random()*.35),distanceBand:distanceBand(distance)};
}

export function rollWeaponBurst({weapon='Classic',distance=10,headshotRate=.24,firepower=60,ratingEdge=0,accuracy=.5,moving=false}={}){
  const profile=WEAPON_DAMAGE[weapon]||WEAPON_DAMAGE.Classic,count=BURST_SIZE[weapon]||2,spread=BURST_SPREAD[count]??.11,bullets=[];
  for(let index=0;index<count;index++){
    const bulletAccuracy=clamp(accuracy-index*spread-(moving&&index>0?.035:0),.08,.92),hit=random()<bulletAccuracy;
    bullets.push({index,accuracy:+bulletAccuracy.toFixed(3),hit,...(hit?rollWeaponHit({weapon,distance,headshotRate,firepower,ratingEdge}):{})});
  }
  return {weapon,count,bullets,cooldown:profile.cadence*(1+count*.25)*(.92+random()*.18),distanceBand:distanceBand(distance)};
}
