import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'images');
const output=path.join(root,'public','img','combat');
const catalog=JSON.parse(await readFile(path.join(source,'PublicContentCatalog.json'),'utf8'));
const wantedWeapons=new Set(['Classic','Ghost','Sheriff','Frenzy','Stinger','Spectre','Marshal','Bulldog','Vandal','Phantom','Operator']);
const slug=value=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
const localizedName=item=>({en:item.name?.localizedByCulture?.['en-US']||item.name?.defaultText,ko:item.name?.localizedByCulture?.['ko-KR']||item.name?.defaultText});

await mkdir(output,{recursive:true});
const manifest={weapons:{},armors:{},abilities:{}};
for(const item of catalog.weapons){
  const names=localizedName(item);if(!wantedWeapons.has(names.en))continue;
  const file=`weapon-${slug(names.en)}.png`;
  await copyFile(path.join(source,'Weapons',`${item.id}.png`),path.join(output,file));
  manifest.weapons[names.en]={...names,src:`/img/combat/${file}`};
}
for(const item of catalog.armors){
  const names=localizedName(item);const key=names.en.toLowerCase().includes('heavy')?'heavy':names.en.toLowerCase().includes('light')?'light':'none';
  const file=`armor-${key}.png`;
  await copyFile(path.join(source,'Armors',`${item.id}.png`),path.join(output,file));
  manifest.armors[key]={...names,src:`/img/combat/${file}`};
}
const abilitySuffix={ability1:'Ability1',ability2:'Ability2',grenade:'Grenade',ultimate:'Ultimate'};
for(const character of catalog.characters){
  const agent=character.name?.defaultText;if(!agent||!character.abilities)continue;
  manifest.abilities[agent]=[];
  for(const [slot,suffix] of Object.entries(abilitySuffix)){
    const ability=character.abilities[slot];if(!ability)continue;
    const file=`ability-${slug(agent)}-${slot}.png`;
    try{
      await copyFile(path.join(source,'Abilities',`${character.id}_${suffix}.png`),path.join(output,file));
      manifest.abilities[agent].push({slot,name:localizedName(ability),src:`/img/combat/${file}`});
    }catch{ /* Some catalog entries intentionally have no exported icon. */ }
  }
}
await writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Combat assets built: ${Object.keys(manifest.weapons).length} weapons, ${Object.keys(manifest.armors).length} armors, ${Object.values(manifest.abilities).reduce((n,a)=>n+a.length,0)} abilities`);
