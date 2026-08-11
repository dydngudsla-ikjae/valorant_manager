import { draftPair } from './draft.js';
import { applyRoundStats, finalizeRatings, freshBox, simOneMap } from './round-engine.js';
import { deriveSeed, random, withSeed } from './rng.js';
import { PLAYABLE_MAPS } from '../data/leagues.js';

const validBestOf=new Set([1,3,5]);
function pickMaps(count){const pool=[...PLAYABLE_MAPS];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return Array.from({length:count},(_,index)=>pool[index%pool.length]);}

function resolveComposition(compositions,index,home,away,map){
  if(typeof compositions==='function')return compositions({index,home,away,map});
  return compositions?.[index]||draftPair(home,away,map);
}

function resolveStartingSide(option,index){
  if(typeof option==='function')return !!option(index);
  if(Array.isArray(option))return option[index]??null;
  if(typeof option==='boolean')return option;
  return null;
}

export function simulateMatch({
  home,away,seed='vlm-match',bestOf=3,maps=null,compositions=null,homeStartsAttack=null
}){
  if(!home||!away)throw new Error('simulateMatch requires home and away teams');
  if(!validBestOf.has(bestOf))throw new Error('bestOf must be 1, 3, or 5');
  if(home.roster?.length!==5||away.roster?.length!==5)throw new Error('each match lineup must contain exactly five players');
  const mapPool=(maps?.length?maps:withSeed(deriveSeed(seed,'maps'),()=>pickMaps(bestOf))).slice(0,bestOf);
  if(mapPool.length<bestOf)throw new Error(`bestOf ${bestOf} requires ${bestOf} maps`);
  const mapsToWin=Math.floor(bestOf/2)+1;
  const box=freshBox(home,away),mapResults=[];
  let homeMaps=0,awayMaps=0,totalRounds=0,roundDifferential=0;
  for(let index=0;index<mapPool.length&&homeMaps<mapsToWin&&awayMaps<mapsToWin;index++){
    const map=mapPool[index],mapSeed=deriveSeed(seed,'map',index,map);
    const composition=resolveComposition(compositions,index,home,away,map);
    const configuredSide=resolveStartingSide(homeStartsAttack,index);
    const result=withSeed(mapSeed,()=>simOneMap(home,away,composition,configuredSide===null?random()<0.5:configuredSide));
    result.rounds.forEach(round=>applyRoundStats(box,round));
    totalRounds+=result.h+result.a;
    roundDifferential+=result.h-result.a;
    if(result.h>result.a)homeMaps++;else awayMaps++;
    mapResults.push({index,map,seed:mapSeed,homeStartsAttack:result.rounds[0]?.hSide==='atk',homeRounds:result.h,awayRounds:result.a,winner:result.h>result.a?'home':'away',rounds:result.rounds,homeForm:result.hForm,awayForm:result.aForm,composition});
  }
  finalizeRatings(box,totalRounds);
  return {seed,bestOf,mapsToWin,winner:homeMaps>awayMaps?'home':'away',homeMaps,awayMaps,roundDifferential,totalRounds,mapPool,mapResults,box};
}
