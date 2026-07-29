import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const ROOT=resolve(import.meta.dirname,'..');
const names=['duelist','initiator','sentinel','controller'];
for(const name of names){
  const path=join(ROOT,'public/img/roles',`${name}.png`);
  const input=await readFile(path);
  const icon=await sharp(input).trim({background:{r:0,g:0,b:0,alpha:0}}).resize(26,26,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).extend({top:3,bottom:3,left:3,right:3,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await writeFile(path,icon);
  console.log(`${name}: normalized to 32x32`);
}
