import manifest from '../../public/img/combat/manifest.json';
import { ST } from '../core/state.js';

export const weaponAsset=name=>manifest.weapons[name]?.src||'';
export const armorAsset=shield=>manifest.armors[shield]?.src||'';
export const abilityAssets=agent=>manifest.abilities[agent]||[];
export const weaponLabel=name=>ST.language==='en'?name:(manifest.weapons[name]?.ko||name);
export const localizedAbilityName=ability=>ST.language==='en'?ability.name.en:ability.name.ko;
