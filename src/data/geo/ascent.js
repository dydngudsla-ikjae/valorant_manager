import { p } from '../leagues.js';

export const MV={dots:{}, nameIdx:{}, st:{}, raf:null, timer:null};
/* ===== Real map geometry: ASCENT — attacker POV: LEFT = B, RIGHT = A ===== */

export const ASCENT_BG="/img/maps/ascent.png";

export const GEO_ASCENT={
  name:'Ascent',
  // coords are % of the embedded ValoPlant image (B left, A right, ATK bottom, CT top)
  atkSpawn:[{x:30,y:80},{x:34,y:83},{x:38,y:80},{x:31,y:86},{x:37,y:86}],
  pts:{
    // A side (right)
    aLobby:{x:52,y:64}, aLong:{x:55,y:50}, aMain:{x:55,y:40}, aSite:{x:60,y:30}, aLink:{x:48,y:38}, heaven:{x:63,y:26},
    // Mid vertical spine + branches
    topMid:{x:33,y:72}, catwalk:{x:42,y:58}, botMid:{x:32,y:52}, courtyard:{x:35,y:44}, dConn:{x:37,y:22}, defSpawn:{x:37,y:11},
    short:{x:46,y:40}, market:{x:24,y:44},
    // B side (left)
    bLobby:{x:15,y:62}, bMain:{x:14,y:46}, bLane:{x:18,y:38}, bSite:{x:11,y:28}, bLink:{x:22,y:40},
  },
  site(s){ return s==='A'?this.pts.aSite:this.pts.bSite; },
  plantZone(s){ const c=this.site(s); return {x:c.x, y:c.y+1, w:9, h:6}; },
  route(s,viaMid){ const p=this.pts;
    if(s==='A') return viaMid?[p.topMid,p.catwalk,p.short,p.aLink,p.aSite]:[p.aLobby,p.aLong,p.aMain,p.aSite];
    return viaMid?[p.topMid,p.botMid,p.market,p.bLink,p.bSite]:[p.bLobby,p.bMain,p.bLane,p.bSite]; },
  holds(s){ const p=this.pts;
    const A=[{x:62,y:28},{x:57,y:33}], B=[{x:10,y:27},{x:16,y:33}];
    return s==='A' ? [A[0],A[1],p.aLink,p.botMid,B[0]] : [B[0],B[1],p.bLink,p.botMid,A[0]]; },
  choke(s){ const c=this.site(s); return {x:c.x, y:c.y+11}; },
  routeMain(s){ return this.route(s,false); },
  routeMid(s){ return this.route(s,true); },
  siteHolds(s){ return s==='A'?[{x:62,y:28},{x:57,y:33},{x:58,y:25}]:[{x:10,y:27},{x:16,y:33},{x:9,y:31}]; },
  midHolds(){ return [{x:37,y:26},{x:33,y:40},{x:43,y:40}]; },
};

export const MAPGEO={Ascent:GEO_ASCENT};
