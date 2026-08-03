import ASCENT_NAV from './ascent-navgrid.json' with { type: 'json' };
import BIND_NAV from './bind-navgrid.json' with { type: 'json' };
import HAVEN_NAV from './haven-navgrid.json' with { type: 'json' };
import SPLIT_NAV from './split-navgrid.json' with { type: 'json' };
import LOTUS_NAV from './lotus-navgrid.json' with { type: 'json' };
import SUNSET_NAV from './sunset-navgrid.json' with { type: 'json' };
import ICEBOX_NAV from './icebox-navgrid.json' with { type: 'json' };
import { MAPGEO } from './maps.js';

const NAV={Ascent:ASCENT_NAV,Bind:BIND_NAV,Haven:HAVEN_NAV,Split:SPLIT_NAV,Lotus:LOTUS_NAV,Sunset:SUNSET_NAV,Icebox:ICEBOX_NAV};
const CACHE=new Map();

function insidePolygon(x,y,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [xi,yi]=points[i],[xj,yj]=points[j];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}

function orthogonalPoints(points){
  const result=[];
  for(let index=0;index<points.length;index++){const current=points[index],next=points[(index+1)%points.length];result.push(current);if(current[0]!==next[0]&&current[1]!==next[1])result.push([next[0],current[1]]);}
  return result;
}

function areaPolygons(area){
  if(area.polygons?.length)return area.polygons;
  return area.points?.length?[area.points]:[];
}

export function semanticRegionRaster(mapName){
  if(CACHE.has(mapName))return CACHE.get(mapName);
  const nav=NAV[mapName],areas=MAPGEO[mapName]?.annotations?.areas||[];
  if(!nav||!areas.length)return null;
  const orthogonalAreas=areas.map(area=>areaPolygons(area).map(orthogonalPoints));
  const owner=new Int16Array(nav.w*nav.h);owner.fill(-1);
  for(let gy=0;gy<nav.h;gy++)for(let gx=0;gx<nav.w;gx++){
    const index=gy*nav.w+gx;if(nav.cells[index]!=='1')continue;
    const x=(gx+.5)/nav.w*100,y=(gy+.5)/nav.h*100;
    const matches=[];
    orthogonalAreas.forEach((polygons,areaIndex)=>{if(polygons.some(points=>insidePolygon(x,y,points)))matches.push(areaIndex);});
    if(matches.length>1){
      const ids=matches.map(areaIndex=>areas[areaIndex].id).join(', ');
      throw new Error(`[semantic-regions] ${mapName} authored regions overlap at (${x.toFixed(3)}, ${y.toFixed(3)}): ${ids}`);
    }
    owner[index]=matches[0]??-1;
  }
  // Coarse maps may define semantic regions by anchor only. Give every area a
  // unique walkable seed before propagation, without stealing an authored cell.
  areas.forEach((area,areaIndex)=>{
    if(owner.includes(areaIndex))return;
    let best=-1,bestDistance=Infinity;
    for(let index=0;index<owner.length;index++){
      if(nav.cells[index]!=='1'||owner[index]>=0)continue;
      const x=(index%nav.w+.5)/nav.w*100,y=(((index/nav.w)|0)+.5)/nav.h*100;
      const distance=(area.label.x-x)**2+(area.label.y-y)**2;
      if(distance<bestDistance){bestDistance=distance;best=index;}
    }
    if(best>=0)owner[best]=areaIndex;
  });
  // Fill authored axis-aligned extents before graph propagation. Boundaries
  // therefore follow vertical/horizontal map cuts instead of diagonal fronts.
  const bounds=areas.flatMap((area,areaIndex)=>areaPolygons(area).map(points=>({areaIndex,minX:Math.min(...points.map(point=>point[0])),maxX:Math.max(...points.map(point=>point[0])),minY:Math.min(...points.map(point=>point[1])),maxY:Math.max(...points.map(point=>point[1]))})));
  for(let index=0;index<owner.length;index++)if(nav.cells[index]==='1'&&owner[index]<0){const x=(index%nav.w+.5)/nav.w*100,y=(((index/nav.w)|0)+.5)/nav.h*100,candidates=[...new Set(bounds.filter(bound=>x>=bound.minX&&x<=bound.maxX&&y>=bound.minY&&y<=bound.maxY).map(bound=>bound.areaIndex))];owner[index]=candidates.length===1?candidates[0]:-1;}
  // Preserve authored boundaries first, then fill only the unassigned walkable
  // cells through connected floor space. This avoids global Voronoi diagonals.
  const queue=new Int32Array(nav.w*nav.h);let head=0,tail=0;
  for(let index=0;index<owner.length;index++)if(owner[index]>=0)queue[tail++]=index;
  while(head<tail){const index=queue[head++],x=index%nav.w,y=(index/nav.w)|0;for(const next of [x>0?index-1:-1,x<nav.w-1?index+1:-1,y>0?index-nav.w:-1,y<nav.h-1?index+nav.w:-1]){if(next<0||nav.cells[next]!=='1'||owner[next]>=0)continue;owner[next]=owner[index];queue[tail++]=next;}}
  // A disconnected walkable island without a semantic seed must still have a
  // stable identity; use the nearest authored label only as a final fallback.
  for(let index=0;index<owner.length;index++)if(nav.cells[index]==='1'&&owner[index]<0){const x=(index%nav.w+.5)/nav.w*100,y=(((index/nav.w)|0)+.5)/nav.h*100;let best=0,bestDistance=Infinity;areas.forEach((area,areaIndex)=>{const distance=(area.label.x-x)**2+(area.label.y-y)**2;if(distance<bestDistance){bestDistance=distance;best=areaIndex;}});owner[index]=best;}
  const result={w:nav.w,h:nav.h,cells:nav.cells,owner,areas};CACHE.set(mapName,result);return result;
}

export function semanticAreaAt(mapName,x,y){
  const raster=semanticRegionRaster(mapName);if(!raster)return null;
  const gx=Math.max(0,Math.min(raster.w-1,Math.floor(x/100*raster.w))),gy=Math.max(0,Math.min(raster.h-1,Math.floor(y/100*raster.h))),areaIndex=raster.owner[gy*raster.w+gx];
  return areaIndex>=0?raster.areas[areaIndex]:null;
}

export function semanticAreasAt(mapName,x,y){
  const area=semanticAreaAt(mapName,x,y);
  return area?[area]:[];
}
