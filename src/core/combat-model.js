import { random } from './rng.js';
import { ARMOR_DATA, WEAPON_DATA } from '../data/weapons.js';

// Gameplay-facing combat data. Keep this separate from the spatial engine so
// weapon balance can be tuned without touching movement or round logic.
export const ARMOR=ARMOR_DATA;
export const WEAPON_DAMAGE=WEAPON_DATA;

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const distanceBand=distance=>distance<=8?'near':distance<=15?'mid':'far';

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
  const hsChance=clamp((Number.isFinite(headshotRate)?headshotRate:.24)+(firepower-60)/500+ratingEdge/1000,.06,.55);
  const headshot=random()<hsChance;
  const legshot=!headshot&&random()<.12;
  const hitZone=headshot?'head':legshot?'leg':'body';
  const damage=profile[hitZone][distanceBand(distance)];
  return {weapon,hitZone,headshot,damage,cooldown:profile.cadence*(.9+random()*.35),distanceBand:distanceBand(distance)};
}
