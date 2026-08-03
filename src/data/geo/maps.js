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

function createGeo(name,{sites,plantZones={},atkSpawn,defSpawn,mid,routes,chokes,orbs=[],barriers={},annotations={}}){
  const siteNames=Object.keys(sites);
  const spawn=Array.from({length:5},(_,i)=>pt(atkSpawn.x+(i-2)*1.4,atkSpawn.y+(i%2?1.3:-1.3)));
  const routeBarrier=(route,id)=>{const center=route.main[0],next=route.main[1]||route.main[0],dx=next.x-center.x,dy=next.y-center.y,len=Math.max(1,Math.hypot(dx,dy)),px=-dy/len*4,py=dx/len*4;return{id,center:{...center},from:pt(center.x-px,center.y-py),to:pt(center.x+px,center.y+py)};};
  const generated=Object.fromEntries(siteNames.map(site=>[site,routeBarrier(routes[site],site)]));
  const midBarrier={id:'mid',center:{...mid},from:pt(mid.x-4,mid.y),to:pt(mid.x+4,mid.y)};
  const barrierMap={...generated,mid:midBarrier,...barriers};
  const coarseAreas=[
    ...siteNames.flatMap(site=>[
      {id:`${site.toLowerCase()}-site`,ko:`${site} 지점`,en:`${site} Site`,label:{...sites[site]}},
      {id:`${site.toLowerCase()}-main`,ko:`${site} 진입로`,en:`${site} Main`,label:{...(chokes[site]||routes[site]?.main?.at(-2)||sites[site])}},
      {id:`${site.toLowerCase()}-lobby`,ko:`${site} 로비`,en:`${site} Lobby`,label:{...(routes[site]?.main?.[1]||routes[site]?.main?.[0]||atkSpawn)}},
      {id:`${site.toLowerCase()}-link`,ko:`${site} 연결부`,en:`${site} Link`,label:{...(routes[site]?.mid?.at(-2)||mid)}},
    ]),
    {id:'mid',ko:'중앙',en:'Mid',label:{...mid}},
    {id:'atk-spawn',ko:'공격팀 진영 시작 지점',en:'Attacker Spawn',label:{...atkSpawn}},
    {id:'def-spawn',ko:'수비팀 진영 시작 지점',en:'Defender Spawn',label:{...defSpawn}},
  ];
  const resolvedAnnotations={
    barriers:annotations.barriers??Object.values(barrierMap).map(barrier=>({id:`coarse-${barrier.id}`,side:'attack',from:{...barrier.from},to:{...barrier.to}})),
    doors:annotations.doors??[],
    stairs:annotations.stairs??[],
    areas:annotations.areas??coarseAreas,
  };
  return {
    name,assets:MAP_ASSETS[name],siteNames,atkSpawn:spawn,barriers:barrierMap,plantZones,annotations:resolvedAnnotations,orbs:orbs.map((orb,index)=>({id:`${name.toLowerCase()}-orb-${index+1}`,...orb})),
    pts:{defSpawn,botMid:mid},
    site(s){return sites[s]||sites[siteNames[0]];},
    plantZone(s){const c=plantZones[s]||this.site(s);return{x:c.x,y:c.y,w:c.w||8,h:c.h||6};},
    choke(s){return chokes[s]||routes[s]?.main?.at(-2)||this.site(s);},
    route(s,viaMid=false){const r=routes[s]||routes[siteNames[0]];return viaMid?r.mid:r.main;},
    routeMain(s){return this.route(s,false);},
    routeMid(s){return this.route(s,true);},
    siteHolds(s){
      const c=this.site(s),ch=this.choke(s),ds=defSpawn;
      const unit=(to,scale)=>{const dx=to.x-c.x,dy=to.y-c.y,len=Math.max(1,Math.hypot(dx,dy));return{x:dx/len*scale,y:dy/len*scale};};
      const front=unit(ch,5),back=unit(ds,7),perp={x:-front.y*.75,y:front.x*.75};
      return[pt(c.x+front.x,c.y+front.y),pt(c.x+back.x+perp.x,c.y+back.y+perp.y),pt(c.x+back.x-perp.x,c.y+back.y-perp.y)];
    },
    midHolds(){return[pt(mid.x-4,mid.y),pt(mid.x+4,mid.y),pt(mid.x,mid.y-4)];},
    holds(s){return [...this.siteHolds(s),...this.midHolds().slice(0,2)];},
    stagingPoints(s){
      const route=this.routeMain(s),ch=this.choke(s),previous=route.slice(0,-1).sort((a,b)=>Math.hypot(a.x-ch.x,a.y-ch.y)-Math.hypot(b.x-ch.x,b.y-ch.y))[0]||atkSpawn,dx=previous.x-ch.x,dy=previous.y-ch.y,len=Math.max(1,Math.hypot(dx,dy)),back={x:dx/len,y:dy/len},perp={x:-back.y,y:back.x};
      return[0,1,2,3,4].map(index=>pt(ch.x+back.x*(index*1.8)+perp.x*((index%2?1:-1)*(.7+index*.18)),ch.y+back.y*(index*1.8)+perp.y*((index%2?1:-1)*(.7+index*.18))));
    },
    entryPoints(s){return[this.site(s),...this.siteHolds(s)];},
    postPlantPositions(s){const ch=this.choke(s),holds=this.siteHolds(s);return[pt(this.plantZone(s).x+2,this.plantZone(s).y),...holds,pt((ch.x+this.site(s).x)/2,(ch.y+this.site(s).y)/2)];},
    infoPeekPoints(s){const route=this.routeMain(s),ch=this.choke(s),approach=route.slice(0,-1).sort((a,b)=>Math.hypot(a.x-ch.x,a.y-ch.y)-Math.hypot(b.x-ch.x,b.y-ch.y))[0]||ch;return[ch,pt((ch.x+approach.x)/2,(ch.y+approach.y)/2)];},
    barrier(s){return barrierMap[s]||barrierMap[siteNames[0]];},
  };
}

export const MAPGEO={
  Ascent:createGeo('Ascent',{
    sites:{A:pt(31,15),B:pt(29,80)},atkSpawn:pt(84,55),defSpawn:pt(44,51),mid:pt(48,48),
    // Extracted from the yellow pixels in the official 2048x2048 tactical PNG.
    plantZones:{A:{x:31.177,y:14.795,w:8.545,h:13.77},B:{x:27.271,y:79.273,w:12.939,h:11.865}},
    routes:{A:{main:[pt(72,43),pt(55,35),pt(40,24),pt(31,15)],mid:[pt(68,53),pt(48,48),pt(39,34),pt(31,15)]},B:{main:[pt(72,67),pt(55,70),pt(39,76),pt(29,80)],mid:[pt(68,53),pt(48,48),pt(38,63),pt(29,80)]}},
    chokes:{A:pt(40,24),B:pt(39,76)},orbs:[{x:48.625,y:24.625,label:'A Main'},{x:38.125,y:74.75,label:'B Main'}],
    // Simulation coordinates remain independent from the tactical-map overlay.
    // displayFrom/displayTo are calibrated against the source PNG and scale with it.
    barriers:{
      A:{id:'A',center:pt(51.125,26.57),from:pt(51.125,25.2),to:pt(51.125,27.94)},
      B:{id:'B',center:pt(52.375,63.56),from:pt(50.75,63.56),to:pt(54,63.56)},
      mid:{id:'mid',center:pt(66.44,35.19),from:pt(63.94,35.19),to:pt(68.94,35.19)},
    },
    annotations:{
      barriers:[
        {id:'atk-b-main',side:'attack',from:pt(51.125,25.2),to:pt(51.125,27.94)},{id:'atk-mid-east',side:'attack',from:pt(63.94,35.19),to:pt(68.94,35.19)},{id:'atk-a-main',side:'attack',from:pt(50.75,63.56),to:pt(54,63.56)},{id:'atk-spawn-east',side:'attack',from:pt(48.375,74.19),to:pt(48.375,77.25)},
        {id:'def-b-back',side:'defense',from:pt(43.125,13),to:pt(43.125,16.5)},{id:'def-b-link',side:'defense',from:pt(42.5,32.2),to:pt(42.5,34.25)},{id:'def-mid',side:'defense',from:pt(43.125,48.19),to:pt(43.125,51.19)},{id:'def-a-link',side:'defense',from:pt(37,64.31),to:pt(37,67.25)},
      ],
      doors:[{id:'a-door',from:pt(38.5,23.7),to:pt(42.5,23.7),button:pt(42,22.8),destructible:true},{id:'market-door',from:pt(27.75,59.69),to:pt(29.9,59.69),button:pt(29.2,70.5),destructible:true}],
      stairs:[{id:'mid-stairs',at:pt(52.55,44.3),w:3.8,h:3.2},{id:'market-stairs',at:pt(25.8,62.2),w:2.2,h:2.5},{id:'b-site-stairs',at:pt(22.5,71.8),w:3.5,h:2.8}],
      areas:[
        {id:'a-site',ko:'A 지점',en:'A Site',label:pt(33,14),polygons:[[[27,8],[42,8],[42,20],[27,20]],[[38.5,20],[42.5,20],[42.5,23.7],[38.5,23.7]]]},
        {id:'a-rafters',ko:'A 서까래',en:'A Rafters',label:pt(25,18),points:[[23,8],[27,8],[27,29],[23,29]]},
        {id:'a-wine',ko:'A 와인',en:'A Wine',label:pt(46,6),points:[[43.125,0],[49,0],[49,12],[43.125,12]]},
        {id:'a-main',ko:'A 메인',en:'A Main',label:pt(47,19),points:[[43.125,12],[51.125,12],[51.125,27.94],[43.125,27.94]]},
        {id:'a-lobby',ko:'A 로비',en:'A Lobby',label:pt(61,23),polygons:[[[51.125,13],[69,13],[69,31.5],[51.125,31.5]],[[82,28],[88,28],[88,35.19],[82,35.19]]]},
        {id:'a-garden',ko:'A 정원',en:'A Garden',label:pt(32,28),points:[[27,23.7],[36.5,23.7],[36.5,29],[31,29],[31,38],[27,38]]},
        {id:'a-link',ko:'A 연결부',en:'A Link',label:pt(40,27),polygons:[[[36.5,23.7],[42.5,23.7],[42.5,31.5],[36.5,31.5]],[[38.5,31.5],[42.5,31.5],[42.5,38],[38.5,38]]]},
        {id:'tree',ko:'중앙 은신처',en:'Tree',label:pt(45,34),points:[[42.5,31.5],[47,31.5],[47,38],[42.5,38]]},
        {id:'mid-top',ko:'중앙 상단부',en:'Mid Top',label:pt(68,37),points:[[63,31.5],[72,31.5],[72,48],[66,48],[66,38],[63,38]]},
        {id:'mid-corridor',ko:'중앙 통로',en:'Mid Corridor',label:pt(54,41),points:[[42.5,38],[66,38],[66,43],[42.5,43]]},
        {id:'mid-courtyard',ko:'중앙 안뜰',en:'Mid Courtyard',label:pt(51,49),points:[[43.125,43],[64,43],[64,55.5],[43.125,55.5]]},
        {id:'mid-bottom',ko:'중앙 하단부',en:'Mid Bottom',label:pt(40,51),points:[[36,43],[43.125,43],[43.125,58],[39,58],[39,56],[36,56]]},
        {id:'mid-pizza',ko:'중앙 피자가게',en:'Mid Pizza',label:pt(33,46),points:[[29,42],[36,42],[36,53],[30,53]]},
        {id:'mid-market',ko:'중앙 시장',en:'Mid Market',label:pt(31,57),points:[[25,53],[36,53],[36,56],[39,56],[39,58],[40,58],[40,59.69],[29.9,59.69],[27.75,59.69],[25,59.69]]},
        {id:'mid-link',ko:'중앙 연결부',en:'Mid Link',label:pt(53,59),points:[[48,55.5],[59,55.5],[59,63.56],[48,63.56]]},
        {id:'b-main',ko:'B 메인',en:'B Main',label:pt(43,75),points:[[38,65],[48,65],[48,84],[42,84],[42,79],[38,79]]},
        {id:'b-lobby',ko:'B 로비',en:'B Lobby',label:pt(56,73),points:[[49,63.56],[64,63.56],[64,82],[49,82]]},
        {id:'b-site',ko:'B 지점',en:'B Site',label:pt(28,76),points:[[20,59.69],[29.9,59.69],[29.9,62],[37,62],[37,67.25],[35,67.25],[35,85.3],[20,85.3]]},
        {id:'b-back',ko:'B 후방',en:'B Back',label:pt(28,89),points:[[22,85.3],[35,85.3],[35,95],[22,95]]},
        {id:'atk-spawn',ko:'공격팀 진영 시작 지점',en:'Attacker Spawn',label:pt(82,56),points:[[88,35.19],[88,52],[96,52],[96,65],[87,65],[87,72],[66,72],[66,56],[72,56],[72,48],[82,48],[82,35.19]]},
        {id:'def-spawn',ko:'수비팀 진영 시작 지점',en:'Defender Spawn',label:pt(12,44),polygons:[[[3,30],[23,30],[23,37],[18,37],[18,55],[19,55],[19,69],[8,69],[8,58],[3,58]],[[15,22],[23,22],[23,30],[15,30]]]},
      ],
    },
  }),
  Bind:createGeo('Bind',{
    sites:{A:pt(72,29),B:pt(29,28)},atkSpawn:pt(59,94),defSpawn:pt(53,8),mid:pt(51,53),
    plantZones:{A:{x:72.5,y:32.75,w:9.5,h:9.5},B:{x:29.25,y:27.875,w:8.5,h:6.75}},
    routes:{A:{main:[pt(72,80),pt(78,57),pt(72,40),pt(72,29)],mid:[pt(56,76),pt(51,53),pt(63,42),pt(72,29)]},B:{main:[pt(45,78),pt(27,63),pt(23,43),pt(29,28)],mid:[pt(53,72),pt(51,53),pt(38,43),pt(29,28)]}},
    chokes:{A:pt(72,40),B:pt(23,43)},orbs:[{x:78,y:56,label:'A Bath'},{x:25,y:59,label:'B Long'}],
  }),
  Haven:createGeo('Haven',{
    sites:{A:pt(38,82),B:pt(39,49),C:pt(38,15)},atkSpawn:pt(91,49),defSpawn:pt(8,35),mid:pt(54,50),
    plantZones:{A:{x:36.5,y:84.625,w:10.5,h:14.75},B:{x:39.5,y:49.875,w:9.5,h:10.25},C:{x:37.625,y:14.25,w:9.75,h:11.5}},
    routes:{A:{main:[pt(78,65),pt(61,72),pt(48,78),pt(38,82)],mid:[pt(73,52),pt(54,50),pt(47,67),pt(38,82)]},B:{main:[pt(74,50),pt(57,50),pt(39,49)],mid:[pt(70,42),pt(54,50),pt(39,49)]},C:{main:[pt(77,33),pt(60,25),pt(47,19),pt(38,15)],mid:[pt(72,47),pt(54,50),pt(46,32),pt(38,15)]}},
    chokes:{A:pt(48,78),B:pt(50,49),C:pt(47,19)},orbs:[{x:59,y:74,label:'A Long'},{x:59,y:24,label:'C Long'}],
  }),
  Split:createGeo('Split',{
    sites:{A:pt(35,82),B:pt(32,10)},atkSpawn:pt(39,95),defSpawn:pt(75,18),mid:pt(52,49),
    plantZones:{A:{x:32.625,y:82.75,w:7.75,h:13.5},B:{x:33.375,y:10,w:18.25,h:10.5}},
    routes:{A:{main:[pt(34,90),pt(27,75),pt(35,82)],mid:[pt(45,82),pt(52,49),pt(42,66),pt(35,82)]},B:{main:[pt(48,82),pt(68,61),pt(61,35),pt(45,20),pt(32,10)],mid:[pt(46,77),pt(52,49),pt(43,31),pt(32,10)]}},
    chokes:{A:pt(27,75),B:pt(45,20)},orbs:[{x:31,y:79,label:'A Main'},{x:48,y:25,label:'B Main'}],
  }),
  Lotus:createGeo('Lotus',{
    sites:{A:pt(91,33),B:pt(50,43),C:pt(9,46)},atkSpawn:pt(50,93),defSpawn:pt(59,7),mid:pt(50,52),
    plantZones:{A:{x:88.125,y:32.25,w:9.25,h:11.5},B:{x:48.5,y:42.125,w:13,h:7.75},C:{x:10.875,y:45.75,w:10.25,h:9.5}},
    routes:{A:{main:[pt(72,76),pt(84,60),pt(91,45),pt(91,33)],mid:[pt(55,72),pt(50,52),pt(69,44),pt(91,33)]},B:{main:[pt(50,74),pt(50,58),pt(50,43)],mid:[pt(57,72),pt(50,52),pt(50,43)]},C:{main:[pt(34,77),pt(17,65),pt(9,46)],mid:[pt(45,72),pt(50,52),pt(28,50),pt(9,46)]}},
    chokes:{A:pt(91,45),B:pt(50,52),C:pt(20,50)},orbs:[{x:81,y:55,label:'A Rubble'},{x:19,y:58,label:'C Mound'}],
  }),
  Sunset:createGeo('Sunset',{
    sites:{A:pt(83,34),B:pt(14,43)},atkSpawn:pt(49,94),defSpawn:pt(50,7),mid:pt(50,50),
    plantZones:{A:{x:82,y:37.5,w:11,h:12.5},B:{x:12.5,y:43,w:15.5,h:11}},
    routes:{A:{main:[pt(68,78),pt(79,59),pt(83,45),pt(83,34)],mid:[pt(55,73),pt(50,50),pt(66,42),pt(83,34)]},B:{main:[pt(31,77),pt(20,62),pt(14,43)],mid:[pt(44,73),pt(50,50),pt(31,45),pt(14,43)]}},
    chokes:{A:pt(83,45),B:pt(25,47)},orbs:[{x:76,y:59,label:'A Main'},{x:25,y:61,label:'B Main'}],
  }),
  Icebox:createGeo('Icebox',{
    sites:{A:pt(74,78),B:pt(62,17)},atkSpawn:pt(8,61),defSpawn:pt(90,50),mid:pt(49,51),
    plantZones:{A:{x:72.875,y:81,w:10.75,h:18.5},B:{x:61.375,y:22,w:13.75,h:12}},
    routes:{A:{main:[pt(25,69),pt(47,74),pt(64,78),pt(74,78)],mid:[pt(28,60),pt(49,51),pt(61,67),pt(74,78)]},B:{main:[pt(23,45),pt(38,29),pt(51,20),pt(62,17)],mid:[pt(28,57),pt(49,51),pt(55,32),pt(62,17)]}},
    chokes:{A:pt(64,78),B:pt(55,32)},orbs:[{x:52,y:75,label:'A Belt'},{x:44,y:29,label:'B Main'}],
  }),
};

export const GEO_ASCENT=MAPGEO.Ascent;
export function mapGeo(name){return MAPGEO[name]||GEO_ASCENT;}
export function mapAssets(name){return mapGeo(name).assets;}
