const ASSET_ROOT='/img/maps';

export const MAP_ASSETS={
  Ascent:{id:'ascent',uuid:'7eaecc1b-4337-bbf6-6ab9-04b8f06b3319'},
  Bind:{id:'bind',uuid:'2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba'},
  Haven:{id:'haven',uuid:'2bee0dc9-4ffe-519b-1cbd-7fbe763a6047'},
  Split:{id:'split',uuid:'d960549e-485c-e861-8d71-aa9d1aed12a2'},
  Lotus:{id:'lotus',uuid:'2fe4ed3a-450a-948b-6d6b-e89a78e680a9'},
  Sunset:{id:'sunset',uuid:'92584fbe-486a-b1b2-9faa-39b0f486b498'},
  Icebox:{id:'icebox',uuid:'e2ad5c54-4114-a870-9641-8ea21279579a'},
};

Object.values(MAP_ASSETS).forEach(asset=>{
  asset.tactical=`${ASSET_ROOT}/${asset.id}.png`;
  asset.listView=`${ASSET_ROOT}/${asset.id}-listview.webp`;
  asset.splash=`${ASSET_ROOT}/${asset.id}-splash.webp`;
});

const pt=(x,y)=>({x,y});

function createGeo(name,{sites,atkSpawn,defSpawn,mid,routes,chokes}){
  const siteNames=Object.keys(sites);
  const spawn=Array.from({length:5},(_,i)=>pt(atkSpawn.x+(i-2)*1.4,atkSpawn.y+(i%2?1.3:-1.3)));
  return {
    name,assets:MAP_ASSETS[name],siteNames,atkSpawn:spawn,
    pts:{defSpawn,botMid:mid},
    site(s){return sites[s]||sites[siteNames[0]];},
    plantZone(s){const c=this.site(s);return{x:c.x,y:c.y,w:8,h:6};},
    choke(s){return chokes[s]||routes[s]?.main?.at(-2)||this.site(s);},
    route(s,viaMid=false){const r=routes[s]||routes[siteNames[0]];return viaMid?r.mid:r.main;},
    routeMain(s){return this.route(s,false);},
    routeMid(s){return this.route(s,true);},
    siteHolds(s){const c=this.site(s);return[pt(c.x-3,c.y-2),pt(c.x+3,c.y+2),pt(c.x,c.y-4)];},
    midHolds(){return[pt(mid.x-4,mid.y),pt(mid.x+4,mid.y),pt(mid.x,mid.y-4)];},
    holds(s){return [...this.siteHolds(s),...this.midHolds().slice(0,2)];},
  };
}

export const MAPGEO={
  Ascent:createGeo('Ascent',{
    sites:{A:pt(29,80),B:pt(31,15)},atkSpawn:pt(84,55),defSpawn:pt(44,51),mid:pt(48,48),
    routes:{A:{main:[pt(72,67),pt(55,70),pt(39,76),pt(29,80)],mid:[pt(68,53),pt(48,48),pt(38,63),pt(29,80)]},B:{main:[pt(72,43),pt(55,35),pt(40,24),pt(31,15)],mid:[pt(68,53),pt(48,48),pt(39,34),pt(31,15)]}},
    chokes:{A:pt(39,76),B:pt(40,24)},
  }),
  Bind:createGeo('Bind',{
    sites:{A:pt(72,29),B:pt(29,28)},atkSpawn:pt(59,94),defSpawn:pt(53,8),mid:pt(51,53),
    routes:{A:{main:[pt(72,80),pt(78,57),pt(72,40),pt(72,29)],mid:[pt(56,76),pt(51,53),pt(63,42),pt(72,29)]},B:{main:[pt(45,78),pt(27,63),pt(23,43),pt(29,28)],mid:[pt(53,72),pt(51,53),pt(38,43),pt(29,28)]}},
    chokes:{A:pt(72,40),B:pt(23,43)},
  }),
  Haven:createGeo('Haven',{
    sites:{A:pt(38,82),B:pt(39,49),C:pt(38,15)},atkSpawn:pt(91,49),defSpawn:pt(8,35),mid:pt(54,50),
    routes:{A:{main:[pt(78,65),pt(61,72),pt(48,78),pt(38,82)],mid:[pt(73,52),pt(54,50),pt(47,67),pt(38,82)]},B:{main:[pt(74,50),pt(57,50),pt(39,49)],mid:[pt(70,42),pt(54,50),pt(39,49)]},C:{main:[pt(77,33),pt(60,25),pt(47,19),pt(38,15)],mid:[pt(72,47),pt(54,50),pt(46,32),pt(38,15)]}},
    chokes:{A:pt(48,78),B:pt(50,49),C:pt(47,19)},
  }),
  Split:createGeo('Split',{
    sites:{A:pt(35,82),B:pt(32,10)},atkSpawn:pt(39,95),defSpawn:pt(75,18),mid:pt(52,49),
    routes:{A:{main:[pt(34,90),pt(27,75),pt(35,82)],mid:[pt(45,82),pt(52,49),pt(42,66),pt(35,82)]},B:{main:[pt(48,82),pt(68,61),pt(61,35),pt(45,20),pt(32,10)],mid:[pt(46,77),pt(52,49),pt(43,31),pt(32,10)]}},
    chokes:{A:pt(27,75),B:pt(45,20)},
  }),
  Lotus:createGeo('Lotus',{
    sites:{A:pt(91,33),B:pt(50,43),C:pt(9,46)},atkSpawn:pt(50,93),defSpawn:pt(59,7),mid:pt(50,52),
    routes:{A:{main:[pt(72,76),pt(84,60),pt(91,45),pt(91,33)],mid:[pt(55,72),pt(50,52),pt(69,44),pt(91,33)]},B:{main:[pt(50,74),pt(50,58),pt(50,43)],mid:[pt(57,72),pt(50,52),pt(50,43)]},C:{main:[pt(34,77),pt(17,65),pt(9,46)],mid:[pt(45,72),pt(50,52),pt(28,50),pt(9,46)]}},
    chokes:{A:pt(91,45),B:pt(50,52),C:pt(20,50)},
  }),
  Sunset:createGeo('Sunset',{
    sites:{A:pt(83,34),B:pt(14,43)},atkSpawn:pt(49,94),defSpawn:pt(50,7),mid:pt(50,50),
    routes:{A:{main:[pt(68,78),pt(79,59),pt(83,45),pt(83,34)],mid:[pt(55,73),pt(50,50),pt(66,42),pt(83,34)]},B:{main:[pt(31,77),pt(20,62),pt(14,43)],mid:[pt(44,73),pt(50,50),pt(31,45),pt(14,43)]}},
    chokes:{A:pt(83,45),B:pt(25,47)},
  }),
  Icebox:createGeo('Icebox',{
    sites:{A:pt(74,78),B:pt(62,17)},atkSpawn:pt(8,61),defSpawn:pt(90,50),mid:pt(49,51),
    routes:{A:{main:[pt(25,69),pt(47,74),pt(64,78),pt(74,78)],mid:[pt(28,60),pt(49,51),pt(61,67),pt(74,78)]},B:{main:[pt(23,45),pt(38,29),pt(51,20),pt(62,17)],mid:[pt(28,57),pt(49,51),pt(55,32),pt(62,17)]}},
    chokes:{A:pt(64,78),B:pt(55,32)},
  }),
};

export const GEO_ASCENT=MAPGEO.Ascent;
export function mapGeo(name){return MAPGEO[name]||GEO_ASCENT;}
export function mapAssets(name){return mapGeo(name).assets;}
