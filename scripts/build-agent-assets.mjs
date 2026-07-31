import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root=path.resolve(import.meta.dirname,'..');
const source=path.join(root,'images');
const output=path.join(root,'public','img','agents');
const catalog=JSON.parse(await readFile(path.join(source,'PublicContentCatalog.json'),'utf8'));
const slug=value=>value.toLowerCase().replace(/\//g,'').replace(/[^a-z0-9]/g,'');

await mkdir(output,{recursive:true});
let written=0;
for(const character of catalog.characters||[]){
  const name=character.name?.defaultText;
  if(!name||!character.id)continue;
  const input=path.join(source,'Characters',`${character.id}.png`);
  const destination=path.join(output,`${slug(name)}.png`);
  try{
    await sharp(input).resize(256,256,{fit:'cover'}).png({compressionLevel:9,adaptiveFiltering:true}).toFile(destination);
    written++;
  }catch{ /* Catalog can contain entries without an exported portrait. */ }
}
console.log(`Agent assets built: ${written} high-resolution icons`);
