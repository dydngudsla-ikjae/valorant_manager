import { buyFromCredits, initEcon } from '../core/economy.js';
import { curGeo } from '../core/spatial.js';
import { MATCH } from '../core/state.js';
import { agImg } from '../data/agents.js';
import { ASCENT_BG, MV } from '../data/geo/ascent.js';
import { p } from '../data/leagues.js';
import { ABFX, SKILL_R, TYPEKO, TYPESYM } from '../data/weapons.js';

export function geoSVG(){ return `<svg class="mvmap" viewBox="0 0 100 100" preserveAspectRatio="none">
  <g class="floor">
    <!-- A SITE (right, Generator/Hell/Site Pillar) + Heaven + Hell/Bricks/Wine -->
    <polygon points="74,20 96,20 96,40 78,40 74,32"/>
    <polygon points="78,8 92,8 92,20 78,20"/>
    <polygon points="90,40 98,40 98,52 90,52"/>
    <!-- A Long / A Main / Door / Tree / Arch (right vertical approach) -->
    <polygon points="72,40 84,40 84,72 72,72"/>
    <polygon points="60,42 74,40 74,50 60,52"/>
    <!-- A Lobby / A Alley (spawn to A, lower right) -->
    <polygon points="60,72 82,68 84,84 62,90 56,82"/>
    <!-- MID: D-Spawn/CT -> D Conn -> Courtyard -> Bottom/Pizza -> Top Mid -> spawn -->
    <polygon points="42,10 58,10 58,20 42,20"/>
    <polygon points="44,20 56,20 56,34 44,34"/>
    <polygon points="40,34 60,34 60,50 40,50"/>
    <polygon points="42,50 58,50 58,72 42,72"/>
    <polygon points="44,72 56,72 56,88 44,88"/>
    <!-- Catwalk (mid->A) & Market (mid->B) -->
    <polygon points="56,56 68,50 70,60 58,66"/>
    <polygon points="44,36 34,34 32,44 42,46"/>
    <!-- B SITE (left, Triple/Double/Back Site) + B Stairs/Boathouse -->
    <polygon points="4,20 26,20 26,32 22,40 4,40"/>
    <polygon points="26,22 34,22 34,34 26,34"/>
    <!-- B Main / B Lane / B Orb (left vertical approach) -->
    <polygon points="16,40 28,40 28,66 16,66"/>
    <polygon points="26,42 34,40 34,48 26,50"/>
    <!-- B Lobby / B Alley (spawn to B, lower left) -->
    <polygon points="18,72 40,68 44,82 38,90 16,84"/>
  </g>
  <polygon class="zone site" points="74,20 96,20 96,40 78,40 74,32"/>
  <polygon class="zone site" points="4,20 26,20 26,32 22,40 4,40"/>
  <polygon class="zone spawn atk" points="34,86 66,86 62,98 38,98"/>
  <polygon class="zone spawn def" points="42,8 58,8 58,18 42,18"/>
  <rect class="plant" x="82" y="27" width="7" height="5" rx="1"/>
  <rect class="plant" x="12" y="26" width="7" height="5" rx="1"/>
  <text class="sitebig" x="84" y="33">A</text><text class="sitebig" x="14" y="32">B</text>
  <text class="zlbl" x="85" y="16">A SITE</text><text class="zlbl" x="14" y="16">B SITE</text>
  <text class="zlbl sm" x="78" y="58">A MAIN</text><text class="zlbl sm" x="22" y="56">B MAIN</text>
  <text class="zlbl sm" x="50" y="43">MID</text><text class="zlbl sm" x="50" y="66">BOT MID</text>
  <text class="zlbl sm" x="64" y="59">CAT</text><text class="zlbl sm" x="37" y="41">MKT</text>
  <text class="zlbl sm" x="84" y="14">HVN</text>
  <text class="zlbl sm" x="50" y="14">CT</text><text class="zlbl sm" x="50" y="95">ATK</text>
  <text class="zlbl sm" x="73" y="82">A LOB</text><text class="zlbl sm" x="27" y="82">B LOB</text>
</svg>`; }

export function abFxType(ab){ if(ab.ult)return 'ult'; return ABFX[ab.name] || ({in:'recon',co:'smoke',su:'heal',le:'molly'}[ab.kind]||'recon'); }

export function shieldPips(sh){const n=sh==='heavy'?2:sh==='light'?1:0;
  return Array.from({length:2},(_,i)=>`<i class="shp${i<n?' on':''}"></i>`).join('');}

export function abbr(a){return (a||'').replace('/','').slice(0,2);}

export function mvBuild(home,away,agBy){
  const field=document.getElementById('mvField'); if(!field)return;
  MV.nameIdx={}; MV.dots={}; MV.st={}; MV.agBy=agBy;
  field.style.backgroundImage='url('+ASCENT_BG+')';
  field.style.backgroundSize='100% 100%';
  field.style.backgroundRepeat='no-repeat';
  field.innerHTML='';
  const mk=(side,team)=>team.roster.forEach((pl,i)=>{
    const d=document.createElement('div'); d.className='mvdot '+side;
    const _ag=agBy?agBy[pl.name]:''; const _im=agImg(_ag);
    d.innerHTML=`<span class="lbl">${pl.name}</span>`+(_im?`<img class="dotimg" src="${_im}" alt="${_ag}">`:`<span class="agi">${abbr(_ag)}</span>`);
    field.appendChild(d);
    MV.dots[side+i]=d; MV.nameIdx[pl.name]={side,i}; MV.st[side+i]={x:50,y:50,tx:50,ty:50,dead:false,path:null,seg:0};
  });
  mk('home',home); mk('away',away);
  const lg=document.getElementById('mvLegend');
  if(lg){ const keys=['smoke','molly','flash','recon','wall','trap','ult'];
    lg.innerHTML=`<span class="lg"><span class="lgteam atk"></span>공격 유틸</span>`+
      `<span class="lg"><span class="lgteam def"></span>수비 유틸</span>`+
      keys.map(t=>`<span class="lg"><span class="lgsym">${TYPESYM[t]}</span>${TYPEKO[t]}</span>`).join(''); }
}

export function mvSet(key,x,y,instant){ const s=MV.st[key]; if(!s)return; s.tx=x; s.ty=y; s.path=null; s.anchor={x,y}; s.nextW=0;
  if(instant){s.x=x;s.y=y; const d=MV.dots[key]; if(d){d.style.left=x+'%';d.style.top=y+'%';}} }

export function mvPath(key,wps,speed){ const s=MV.st[key]; if(!s||!wps.length)return; s.path=wps.slice(); s.seg=0; s.speed=speed||17;
  const last=wps[wps.length-1]; s.tx=last.x; s.ty=last.y; }

export function mvStartRAF(){
  if(typeof requestAnimationFrame!=='function')return;
  MV._last=null;
  const step=(ts)=>{ if(MV._last==null)MV._last=ts; const dt=Math.min(0.05,((ts||0)-MV._last)/1000||0.016); MV._last=ts;
    Object.keys(MV.st).forEach(key=>{const s=MV.st[key],d=MV.dots[key]; if(!d)return;
      if(s.path&&s.seg<s.path.length){ const w=s.path[s.seg]; const dx=w.x-s.x,dy=w.y-s.y; const dist=Math.hypot(dx,dy);
        const mv=(s.speed||17)*dt;
        if(dist<=mv){ s.x=w.x; s.y=w.y; s.seg++; if(s.seg>=s.path.length)s.anchor={x:w.x,y:w.y}; } else { s.x+=dx/dist*mv; s.y+=dy/dist*mv; } }
      else { // holding: gentle idle wander around the anchor so dots feel alive (dead dots stay put)
        if(!s.dead){ if(!s.nextW || (ts||0)>s.nextW){ const a=s.anchor||{x:s.x,y:s.y}; s.tx=a.x+(Math.random()*3.4-1.7); s.ty=a.y+(Math.random()*3.4-1.7); s.nextW=(ts||0)+700+Math.random()*900; } }
        s.x+=(s.tx-s.x)*0.08; s.y+=(s.ty-s.y)*0.08; }
      d.style.left=s.x.toFixed(2)+'%'; d.style.top=s.y.toFixed(2)+'%';});
    MV.raf=requestAnimationFrame(step); };
  MV.raf=requestAnimationFrame(step);
}

export function mvStopRAF(){ if(MV.raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(MV.raf); MV.raf=null;
  if(MV.timer){clearInterval(MV.timer);MV.timer=null;} }

export function mvRenderAlive(atkAlive,defAlive,atkShort,defShort){
  const el=document.getElementById('mvAlive'); if(!el)return;
  const pips=(n,cls)=>Array.from({length:5},(_,i)=>`<span class="apip ${cls}${i<n?'':' out'}"></span>`).join('');
  el.innerHTML=`<span class="aside"><span class="alabel atk">${atkShort} ATK</span>${pips(atkAlive,'atk')}</span>`+
    `<span class="aside">${pips(defAlive,'def')}<span class="alabel def">${defShort} DEF</span></span>`;
}
// broadcast player cards: agent · HP · weapon · shield · K/D

export function mvRenderCards(which,team,side,loadouts){
  const el=document.getElementById(which==='home'?'cardsHome':'cardsAway'); if(!el)return;
  el.innerHTML=team.roster.map((pl,i)=>{
    const b=MATCH.box[pl.name]||{k:0,d:0}; const lo=loadouts[i]||{weapon:'',shield:'none'};
    const dead=MV.st[which+i]&&MV.st[which+i].dead;
    const shp=(sh=>{const n=sh==='heavy'?2:sh==='light'?1:0;return[0,1].map(j=>`<i class="${j<n?'on':''}"></i>`).join('');})(lo.shield);
    return `<div class="bcard ${which}${dead?' dead':''}">
      <div class="pcag">${(function(a){return agImg(a)?`<img class="pcagimg" src="${agImg(a)}" alt="${a}">`:abbr(a);})(MV.agBy?MV.agBy[pl.name]:'')}</div>
      <div class="pcname" title="${pl.name}">${pl.name}</div>
      <div class="pchp"><i style="width:${dead?0:100}%"></i></div>
      <div class="pcwep">${lo.weapon}</div>
      <div class="pcbot"><span class="pcsh">${shp}</span><span class="pckd">${b.k}/${b.d}</span></div>
      <div class="pccr">${lo.remaining!=null?('₵'+lo.remaining):''}</div>
    </div>`;
  }).join('');
}

export function mvKill(killerName,victimName){
  const kk=MV.nameIdx[killerName], vk=MV.nameIdx[victimName]; const field=document.getElementById('mvField');
  const sa=kk&&MV.st[kk.side+kk.i], sb=vk&&MV.st[vk.side+vk.i];
  // if killer & victim are far apart, pull the victim into the killer's fight (they were never really cross-map)
  if(sa&&sb){ const dist=Math.hypot(sb.x-sa.x, sb.y-sa.y);
    if(dist>18){ sb.path=null; sb.x=sa.x+(Math.random()*10-5); sb.y=sa.y+(Math.random()*8-4); sb.tx=sb.x; sb.ty=sb.y; } }
  if(vk){const key=vk.side+vk.i; const d=MV.dots[key]; if(d)d.classList.add('dead'); if(MV.st[key]){MV.st[key].dead=true;MV.st[key].path=null;}}
  if(kk&&vk&&field&&sa&&sb){
    const dx=sb.x-sa.x,dy=sb.y-sa.y; const len=Math.hypot(dx,dy); const ang=Math.atan2(dy,dx)*180/Math.PI;
    const t=document.createElement('div'); t.className='mvtracer show';
    t.style.left=sa.x+'%'; t.style.top=sa.y+'%'; t.style.width=len+'%'; t.style.transform=`rotate(${ang}deg)`;
    field.appendChild(t); setTimeout(()=>t.remove(),400);
  }
}

export function mvSpike(x,y,defused){
  const field=document.getElementById('mvField'); if(!field)return;
  const s=document.createElement('div'); s.className='mvspike'+(defused?' defused':''); s.textContent=defused?'◈':'✸';
  s.style.left=x+'%'; s.style.top=y+'%'; field.appendChild(s);
  setTimeout(()=>s.classList.add('show'),20);
}

export function mvAbility(ab,rd){
  const k=MV.nameIdx[ab.player]; const field=document.getElementById('mvField'); if(!k||!field)return;
  const s=MV.st[k.side+k.i]; if(!s)return;
  const type=abFxType(ab);
  const atkSide=rd.hSide==='atk'?'home':'away';
  const isAtk=k.side===atkSide;
  const GEO=curGeo();
  const site=GEO.site(rd.site);
  const choke=GEO.choke(rd.site);
  // angle of the approach into the site (choke -> site), used to orient walls/smokes
  const ang=Math.atan2(site.y-choke.y, site.x-choke.x)*180/Math.PI;
  // block-point sits between the site and its choke (where fights actually happen)
  const bp={x:(site.x*0.55+choke.x*0.45), y:(site.y*0.55+choke.y*0.45)};
  let px=s.x, py=s.y;
  if(['smoke','molly','wall','stun','recon','flash'].includes(type)){
    if(isAtk){ px=bp.x+(Math.random()*8-4); py=bp.y+(Math.random()*6-3); }  // attackers deny the defenders' angle
    else { px=site.x+(Math.random()*10-5); py=site.y+(Math.random()*7-3.5); } // defenders play on the site
  }
  const add=(cls,html,ms,x,y)=>{ const e=document.createElement('div'); e.className='fx '+cls+(isAtk?' atk':' def'); e.style.left=(x!=null?x:px)+'%'; e.style.top=(y!=null?y:py)+'%'; const ty=cls.replace('fx-',''); const R=SKILL_R[ty]; if(R&&ty!=='wall'){ e.style.width=(R*2)+'%'; e.style.height=(R*2)+'%'; } e.innerHTML=html||('<span class="fxsym">'+(TYPESYM[ty]||'')+'</span>'); field.appendChild(e); if(ms>=0)setTimeout(()=>e.remove(),ms); return e; };
  const dur = ab.ult?2600:(type==='smoke'||type==='molly'||type==='wall')?2600:900;
  switch(type){
    case 'smoke': add('fx-smoke',null,dur); break;
    case 'molly': add('fx-molly',null,dur); break;
    case 'wall': { const e=add('fx-wall',null,dur); e.style.transform='translate(-50%,-50%) rotate('+(ang+90).toFixed(0)+'deg)'; break; } // wall across the lane
    case 'recon': add('fx-recon',null,1100, site.x, site.y); break; // scans the site
    case 'flash': add('fx-flash',null,650); break;
    case 'stun': add('fx-stun',null,850); break;
    case 'heal': add('fx-heal',null,1000, s.x+(Math.random()*8-4), s.y+(Math.random()*8-4)); break;
    case 'trap': { // traps stay on a defender hold until the round resets (cleared in reset)
      add('fx-trap',null,-1, isAtk? bp.x : choke.x+(Math.random()*8-4), isAtk? bp.y : choke.y+(Math.random()*6-3)); break; }
    case 'move': { const nx=s.x+(site.x-s.x)*0.35, ny=s.y+(site.y-s.y)*0.35; s.path=null; s.tx=nx; s.ty=ny; add('fx-move',null,500,s.x,s.y); break; }
    case 'buff': add('fx-buff',null,900, s.x, s.y); break;
    case 'ult': add('fx-ult',null,dur); break;
    default: add('fx-recon',null,900);
  }
  const lab=document.createElement('div'); lab.className='mvablabel'+(ab.ult?' ult':'')+(' k-'+(ab.kind||'in'));
  lab.style.left=px+'%'; lab.style.top=(py-7)+'%'; lab.textContent=(ab.ult?'★ ':'')+ab.player+': '+ab.name; field.appendChild(lab);
  setTimeout(()=>lab.remove(), 1600);
}

export function fmtClock(sec){const s=Math.max(0,Math.round(sec)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
// animate one round: buy -> movement from spawn -> duels over time -> plant/defuse -> end

export function mvPlayRound(rd,speed,onDone){
  const field=document.getElementById('mvField');
  if(!field){ onDone(); return; }
  mvStopRAF();
  const fast=speed==='fast';
  if(!rd.spatial){ onDone(); return; }
  const atkTeamSide=rd.hSide==='atk'?'home':'away';
  const defTeamSide=atkTeamSide==='home'?'away':'home';
  const atkTeam=atkTeamSide==='home'?MATCH.home:MATCH.away, defTeam=defTeamSide==='home'?MATCH.home:MATCH.away;
  const atkShort=atkTeam.short, defShort=defTeam.short;
  if(!MV.econ) initEcon();
  const loadoutsHome = MATCH.home.roster.map((pl,i)=>buyFromCredits(MV.econ.home[i],pl.role,i));
  const loadoutsAway = MATCH.away.roster.map((pl,i)=>buyFromCredits(MV.econ.away[i],pl.role,i));
  MV.remaining={home:loadoutsHome.map(l=>l.remaining), away:loadoutsAway.map(l=>l.remaining)};
  const wepBy={}; MATCH.home.roster.forEach((pl,i)=>wepBy[pl.name]=loadoutsHome[i].weapon);
  MATCH.away.roster.forEach((pl,i)=>wepBy[pl.name]=loadoutsAway[i].weapon);
  const kf=document.getElementById('killFeed'); if(kf)kf.innerHTML='';
  const refreshPanels=()=>{ mvRenderCards('home',MATCH.home,rd.hSide,loadoutsHome); mvRenderCards('away',MATCH.away,rd.aSide,loadoutsAway); };
  field.classList.remove('fast'); field.querySelectorAll('.mvtracer,.mvspike,.mvpulse,.mvablabel,.fx,.sight,.plantzone').forEach(e=>e.remove());
  Object.values(MV.dots).forEach(d=>{d.classList.remove('dead');d.classList.remove('clutch');});

  // ---- replay directly from recorded per-tick position tracks (exact engine motion) ----
  const sp=rd.spatial; const dur=sp.duration||8;
  const uByKey={}; sp.units.forEach(u=>uByKey[u.side+u.idx]=u);
  const walkers={};
  const cones={};
  Object.keys(MV.st).forEach(key=>{
    const u=uByKey[key]; const track=(u&&u.track&&u.track.length)?u.track:[{t:0,x:MV.st[key].x,y:MV.st[key].y,f:0}];
    walkers[key]={track,deathT:(u?u.deathT:null)};
    MV.st[key].dead=false; mvSet(key,track[0].x,track[0].y,true);
    const cone=document.createElement('div'); cone.className='sight '+(key.indexOf(atkTeamSide)===0?'atk':'def');
    field.appendChild(cone); cones[key]=cone;
  });
  function posAt(w,te){ const tr=w.track; if(tr.length===1)return {x:tr[0].x,y:tr[0].y,f:tr[0].f||0,c:tr[0].c?1:0};
    if(te<=tr[0].t)return {x:tr[0].x,y:tr[0].y,f:tr[0].f||0,c:tr[0].c?1:0}; if(te>=tr[tr.length-1].t){const L=tr[tr.length-1];return {x:L.x,y:L.y,f:L.f||0,c:L.c?1:0};}
    let lo=0,hi=tr.length-1; while(hi-lo>1){const mid=(lo+hi)>>1; if(tr[mid].t<=te)lo=mid; else hi=mid;}
    const a=tr[lo],b=tr[hi],f=(b.t-a.t)?(te-a.t)/(b.t-a.t):0; return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,f:a.f||0,c:a.c?1:0}; }
  // defined spike install zone (rectangular, like the real site plant area)
  const gz=curGeo().plantZone(rd.site);
  const pe0=(sp.events||[]).find(e=>e.type==='plant'||e.type==='plantStart');
  const zone=document.createElement('div'); zone.className='plantzone';
  zone.style.left=(pe0?pe0.x:gz.x)+'%'; zone.style.top=(pe0?pe0.y:gz.y)+'%';
  zone.style.width=gz.w+'%'; zone.style.height=gz.h+'%'; field.appendChild(zone);

  let atkAlive=5,defAlive=5; mvRenderAlive(atkAlive,defAlive,atkShort,defShort); refreshPanels();
  const bcH=document.getElementById('bcH'), bcA=document.getElementById('bcA'), bSpike=document.getElementById('bSpike');
  if(bcH){bcH.textContent=MATCH.home.short; bcH.style.background=MATCH.home.color;}
  if(bcA){bcA.textContent=MATCH.away.short; bcA.style.background=MATCH.away.color;}
  if(bSpike){bSpike.textContent=''; bSpike.className='bspike';}
  const phase=document.getElementById('mvPhase');
  const setPhase=(t,cls)=>{ if(phase){phase.className='mvphase '+(cls||''); phase.textContent=t;} };
  const timerEl=document.getElementById('rTimer');
  setPhase('Buy · 수비 세팅 / 공격 바이','');
  if(timerEl){ timerEl.textContent='0:30'; timerEl.classList.remove('spike'); }
  MV._planted=false; MV._plantAt=0;

  // ---- event queue (kills/plant/defuse/util/recon from log + ability visuals) ----
  const evs=sp.events.slice();
  const abList=rd.abilities&&rd.abilities.length?rd.abilities:(rd.ability?[rd.ability]:[]);
  abList.forEach((ab,i)=>evs.push({t:Math.min(dur-0.1, 1.8 + i*(dur-1.8)/(abList.length+1)), type:'ability', ab}));
  evs.sort((x,y)=>x.t-y.t);
  let ei=0, firstBlood=false;

  function fireEvent(e){
    if(e.type==='kill'){
      mvKill(e.killer,e.victim);
      if(kf){ const kk=MV.nameIdx[e.killer]; if(kk){ const row=document.createElement('div'); row.className='kfrow '+kk.side;
        row.innerHTML=`<b>${e.killer}</b><span class="kfw">${wepBy[e.killer]||''}</span><b>${e.victim}</b>`;
        kf.prepend(row); while(kf.children.length>5)kf.removeChild(kf.lastChild); } }
      const vk=MV.nameIdx[e.victim]; if(vk){ if(vk.side===atkTeamSide)atkAlive=Math.max(0,atkAlive-1); else defAlive=Math.max(0,defAlive-1); }
      mvRenderAlive(atkAlive,defAlive,atkShort,defShort); refreshPanels();
      if(!firstBlood){ firstBlood=true; setPhase('First blood · '+e.killer,''); } else setPhase('교전 · '+atkAlive+'v'+defAlive,'');
      if(rd.clutch){ const ck=MV.nameIdx[rd.clutch.player]; if(ck && MV.st[ck.side+ck.i] && !MV.st[ck.side+ck.i].dead){ const d=MV.dots[ck.side+ck.i]; if(d)d.classList.add('clutch'); } }
    } else if(e.type==='plantStart'){
      setPhase(e.planter+' 설치 중...','atk');
      const el=document.createElement('div'); el.className='fx fx-trap atk'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">◆</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:3600);
    } else if(e.type==='spikeDrop'){
      setPhase('스파이크 낙하 — 위치 노출','def');
      field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove());
      const el=document.createElement('div'); el.className='mvspike show dropped'; el.textContent='✸'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; field.appendChild(el);
    } else if(e.type==='spikePickup'){
      setPhase(e.by+' 스파이크 회수','atk');
      field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove());
    } else if(e.type==='defuseStart'){
      setPhase(e.defuser+' 해체 중...','def');
      const el=document.createElement('div'); el.className='fx fx-recon def'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">◈</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:3600);
    } else if(e.type==='defuseStop'){
      setPhase('해체 중단','atk');
    } else if(e.type==='plant'){
      MV._planted=true; MV._plantAt=Date.now(); field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove()); mvSpike(e.x,e.y,false);
      if(bSpike){bSpike.textContent='◆ SPIKE '+rd.site; bSpike.className='bspike';}
      setPhase('Spike planted · '+rd.site,'atk');
    } else if(e.type==='defuse'){
      mvSpike(e.x,e.y,true); if(bSpike){bSpike.textContent='◈ DEFUSED'; bSpike.className='bspike def';}
      setPhase('Spike defused','def');
    } else if(e.type==='util'){
      const el=document.createElement('div'); el.className='fx fx-'+(e.kind==='flash'?'flash':'smoke')+' atk';
      el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">'+(TYPESYM[e.kind]||'')+'</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:(e.kind==='flash'?700:4600));
      if(e.kind==='smoke') setPhase('진입 연막 — '+e.site+' 초크','atk');
    } else if(e.type==='recon'){
      const el=document.createElement('div'); el.className='fx fx-recon atk';
      el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">'+TYPESYM.recon+'</span>';
      field.appendChild(el); setTimeout(()=>el.remove(), fast?300:1100);
      setPhase('정찰 — 약한 사이트 포착','def');
    } else if(e.type==='ability'){ mvAbility(e.ab,rd); }
  }

  const buyWall=fast?60:1800;
  const moveWall=fast?460:Math.max(5000,Math.min(14000,dur*850));
  const holdWall=fast?60:800;
  let t0=null, plantTe=-1;
  function firePlantClock(){}
  function frame(ts){
    const now=(typeof ts==='number'?ts:0); if(t0==null)t0=now; const el=now-t0;
    let te;
    if(el<buyWall){ te=0; }
    else { te=Math.min(dur,(el-buyWall)/moveWall*dur); if(!firstBlood && el<buyWall+120) setPhase('Execute · '+rd.site+' 진입','atk'); }
    Object.keys(walkers).forEach(key=>{ const s=MV.st[key]; const cone=cones[key];
      if(s.dead){ if(cone)cone.style.display='none'; return; }
      const p=posAt(walkers[key],te);
      s.x=p.x; s.y=p.y; const d=MV.dots[key]; if(d){ d.style.left=s.x.toFixed(2)+'%'; d.style.top=s.y.toFixed(2)+'%'; d.classList.toggle('carry',!!p.c); }
      if(cone){ cone.style.left=s.x.toFixed(2)+'%'; cone.style.top=s.y.toFixed(2)+'%'; cone.style.transform='translate(-50%,-50%) rotate('+(p.f||0)+'deg)'; } });
    while(ei<evs.length && evs[ei].t<=te){ if(evs[ei].type==='plant'&&plantTe<0)plantTe=evs[ei].t; fireEvent(evs[ei]); ei++; }
    if(timerEl && !fast){ if(el<buyWall){ timerEl.classList.remove('spike'); timerEl.textContent=fmtClock(30*(1-el/buyWall)); }
      else if(plantTe>=0){ timerEl.classList.add('spike'); const p=Math.min(1,(te-plantTe)/Math.max(0.1,dur-plantTe)); timerEl.textContent=fmtClock(45*(1-p)); }
      else { timerEl.classList.remove('spike'); timerEl.textContent=fmtClock(100*(1-te/dur)); } }
    if(el < buyWall+moveWall){ MV.raf=requestAnimationFrame(frame); }
    else {
      while(ei<evs.length){ if(evs[ei].type==='plant'&&plantTe<0)plantTe=evs[ei].t; fireEvent(evs[ei]); ei++; }
      setPhase((rd.winner===atkTeamSide?atkShort:defShort)+' win the round', rd.winner===atkTeamSide?'atk':'def');
      if(timerEl&&!fast)timerEl.textContent='0:00'; if(bSpike&&!rd.plant)bSpike.textContent='';
      setTimeout(()=>{ mvStopRAF(); onDone(); }, holdWall);
    }
  }
  MV.raf=requestAnimationFrame(frame);
}

export function mvPlantConverge(){}


/* animated: compute the map, then replay round-by-round on the top-down map */
