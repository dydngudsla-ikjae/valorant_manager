import { buyFromCredits, initEcon } from '../core/economy.js';
import { curGeo } from '../core/spatial.js';
import { MATCH } from '../core/state.js';
import { agImg } from '../data/agents.js';
import { MV } from '../data/geo/ascent.js';
import { mapAssets } from '../data/geo/maps.js';
import { p } from '../data/leagues.js';
import { abilityAssets, abilityNameLabel, armorAsset, localizedAbilityName, weaponAsset, weaponLabel } from '../data/combat-assets.js';
import { teamLogo } from '../data/team-logos.js';
import { playerImage } from '../data/player-images.js';
import { agentLabel, mapLabel, tacticLabel, tr } from '../i18n.js';
import { agentAbilityDefinitions } from '../data/abilities.js';
import { ABFX, SKILL_R, TYPEKO, TYPESYM } from '../data/weapons.js';
import { buildMatchDiagnosticReport } from './match-diagnostics.js';

const mvContentField=()=>MV.cameraLayer||document.getElementById('mvField');

export function mvUpdateDiagnostics(stage='snapshot',currentRound=null){
  if(!MATCH?.diagnostic)return;
  const output=document.getElementById('diagnosticOutput'),count=document.getElementById('diagnosticIssueCount');
  if(!output)return;
  try{
    const report=buildMatchDiagnosticReport(MATCH,{stage,currentRound});
    output.textContent=JSON.stringify(report,null,2);
    if(count){const total=report.issues.length;count.textContent=`${total} issue${total===1?'':'s'}`;count.className=total?'hasissues':'clean';}
  }catch(error){
    // Diagnostics are observability only; they must never stop the match loop.
    output.textContent=JSON.stringify({reportVersion:'map-diagnostic-v2-agents',stage,diagnosticFailure:{name:error?.name,message:error?.message,stack:error?.stack}},null,2);
    if(count){count.textContent='diagnostic error';count.className='hasissues';}
    console.error('Map diagnostics failed without stopping playback',error);
  }
}

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
  const viewport=document.getElementById('mvField'); if(!viewport)return;
  viewport.innerHTML='';
  const field=document.createElement('div');field.className='mvcamera';viewport.appendChild(field);MV.cameraLayer=field;
  MV.nameIdx={}; MV.dots={}; MV.st={}; MV.agBy=agBy; MV.hpBy={};MV.camera={x:50,y:50,zoom:1};MV.duelFocus=null;MV.duelCandidate=null;
  field.style.transform='translate(0%,0%) scale(1)';
  const mapName=(MATCH.mapPool&&MATCH.mapPool[MATCH.curMap])||'Ascent';
  const series=document.getElementById('bSeries');if(series){series.innerHTML=MATCH.mapPool.map((map,index)=>{const isCurrent=index===MATCH.curMap,pick=MATCH.veto?.picks?.find(item=>item.map===map),team=pick?(pick.side==='home'?MATCH.home:MATCH.away):(MATCH.diagnostic&&isCurrent?MATCH.home:null),logo=teamLogo(team?.teamId||team?.id,team?.name),result=MATCH.mapResults[index];return `<span class="${isCurrent?'current':''}${result?' complete':''}">${mapLabel(map)}${logo?`<img src="${logo}" alt="${team.short}">`:'<b>◇</b>'}${result?`<em>${result.h}-${result.a}</em>`:''}</span>`;}).join('<i>›</i>');}
  field.style.backgroundImage='url('+mapAssets(mapName).tactical+')';
  field.dataset.map=mapName.toLowerCase();
  field.style.backgroundSize='contain';
  field.style.backgroundPosition='center';
  field.style.backgroundRepeat='no-repeat';
  if(MATCH.diagnostic)field.addEventListener('click',event=>{
    const rect=field.getBoundingClientRect();
    const x=Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100));
    const y=Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100));
    if(MATCH.coordinateProbes?.[0]?.map!==mapName)MATCH.coordinateProbes=[];
    const probe={map:mapName,index:(MATCH.coordinateProbes?.length||0)+1,x:Number(x.toFixed(2)),y:Number(y.toFixed(2))};
    MATCH.coordinateProbes=[...(MATCH.coordinateProbes||[]),probe].slice(-12);
    const marker=document.createElement('span');marker.className='mvcoordreadout';marker.style.left=x+'%';marker.style.top=y+'%';marker.textContent=`#${probe.index} ${probe.x}, ${probe.y}`;field.appendChild(marker);
    mvUpdateDiagnostics('coordinate_probe');
  });
  const mk=(side,team)=>team.roster.forEach((pl,i)=>{
    const d=document.createElement('div'); d.className='mvdot '+side;
    const _ag=agBy?agBy[pl.name]:''; const _im=agImg(_ag);
    d.innerHTML=`<span class="lbl">${pl.name}</span>`+(_im?`<img class="dotimg" src="${_im}" alt="${_ag}">`:`<span class="agi">${abbr(_ag)}</span>`);
    field.appendChild(d);
    MV.dots[side+i]=d; MV.nameIdx[pl.name]={side,i}; MV.hpBy[pl.name]=100; MV.st[side+i]={x:50,y:50,tx:50,ty:50,dead:false,path:null,seg:0};
  });
  mk('home',home); mk('away',away);
  mvUpdateDiagnostics('map_initialized');
  const lg=document.getElementById('mvLegend');
  if(lg){ const keys=['smoke','molly','flash','recon','wall','trap','ult'];
    lg.innerHTML=`<span class="lg"><span class="lgteam atk"></span>${tr('공격 스킬','Attack utility')}</span>`+
      `<span class="lg"><span class="lgteam def"></span>${tr('수비 스킬','Defense utility')}</span>`+
      keys.map(t=>`<span class="lg"><span class="lgsym">${TYPESYM[t]}</span>${tr(TYPEKO[t],t.toUpperCase())}</span>`).join(''); }
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
  if(MV.timer){clearInterval(MV.timer);MV.timer=null;}MV.roundClock=null; }

export function mvPauseRound(){
  const clock=MV.roundClock;if(!clock||clock.paused)return;
  clock.paused=true;
  if(MV.raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(MV.raf);MV.raf=null;
}

export function mvResumeRound(){
  const clock=MV.roundClock;if(!clock||!clock.paused)return;
  clock.paused=false;clock.lastTs=null;
  if(typeof requestAnimationFrame==='function')MV.raf=requestAnimationFrame(clock.frame);
}

export function mvSetPlaybackRate(rate){const clock=MV.roundClock;if(clock)clock.rate=Math.max(1,Math.min(4,Number(rate)||1));}
export function mvStepRound(milliseconds=100){const clock=MV.roundClock;if(!clock||!clock.paused)return false;clock.pendingStep=(clock.pendingStep||0)+milliseconds;clock.frame(typeof performance!=='undefined'?performance.now():Date.now());return true;}
export function mvSkipRound(){const clock=MV.roundClock;if(!clock)return false;clock.skipRequested=true;clock.paused=false;clock.lastTs=null;clock.virtualElapsed=clock.finishAt;if(MV.raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(MV.raf);if(typeof requestAnimationFrame==='function')MV.raf=requestAnimationFrame(clock.frame);return true;}

export function mvRenderAlive(atkAlive,defAlive,atkShort,defShort){
  const el=document.getElementById('mvAlive'); if(!el)return;
  const pips=(n,cls)=>Array.from({length:5},(_,i)=>`<span class="apip ${cls}${i<n?'':' out'}"></span>`).join('');
  el.innerHTML=`<span class="aside"><span class="alabel atk">${atkShort} ATK</span>${pips(atkAlive,'atk')}</span>`+
    `<span class="aside">${pips(defAlive,'def')}<span class="alabel def">${defShort} DEF</span></span>`;
}
// broadcast player cards: agent · HP · weapon · shield · K/D

export function mvRenderCards(which,team,side,loadouts){
  const el=document.getElementById(which==='home'?'cardsHome':'cardsAway'); if(!el)return;
  const existingSpotlight=el.querySelector('.duelspotlight');
  const cards=team.roster.map((pl,i)=>{
    const b=MATCH.box[pl.name]||{k:0,d:0}; const lo=loadouts[i]||{weapon:'',shield:'none'};
    const dead=MV.st[which+i]&&MV.st[which+i].dead;
    const agent=MV.agBy?MV.agBy[pl.name]:'';
    const agentAbilities=abilityAssets(agent),used=MV.usedAbilities||new Set(),abilityState=MATCH.mapSimulation?.abilityState?.players?.[pl.name],definitions=agentAbilityDefinitions(agent,pl.role);
    const abilities=agentAbilities.filter(a=>a.slot!=='ultimate').map(a=>{const def=definitions.find(item=>item.name===a.name.en),charges=def?(abilityState?.abilities?.[def.id]??0):0;return `<span class="pcability ${charges?'':'used'}"><img src="${a.src}" alt="" title="${localizedAbilityName(a)}"><b>${charges}</b></span>`;}).join('');
    const ult=agentAbilities.find(a=>a.slot==='ultimate'),ultDef=definitions.find(item=>item.ultimate),ultMax=ultDef?.ultCost||7,ultPoints=abilityState?.ultPoints??0;
    const weapon=weaponAsset(lo.weapon),armorValue=lo.shieldValue??(lo.shield==='heavy'?50:lo.shield==='light'||lo.shield==='regen'?25:0);
    return `<div class="bcard ${which}${dead?' dead':''}">
      <div class="pcag">${agImg(agent)?`<img class="pcagimg" src="${agImg(agent)}" alt="">`:abbr(agent)}</div>
      <div class="pcmain"><div class="pcname" title="${pl.name}">${pl.name}</div><div class="pcvitals"><span class="pchealth">HP ${dead?0:(MV.hpBy?.[pl.name]??100)}</span><span class="pcarmorvalue">AR ${dead?0:armorValue}</span></div></div>
      <div class="pcabilities">${abilities}${ult?`<span class="pcult" title="${localizedAbilityName(ult)}">${ultPoints}/${ultMax}</span>`:''}</div>
      <div class="pcloadout">${weapon?`<img class="pcweaponimg" src="${weapon}" alt="">`:''}</div>
      <div class="pcmeta"><span class="pckd">K/D ${b.k}/${b.d}</span><span class="pccr">${lo.remaining!=null?('₵ '+lo.remaining):''}</span></div>
    </div>`;
  }).join('');
  const focusedName=MV.duelFocus?.[which],focused=focusedName&&team.roster.find(player=>player.name===focusedName);
  const portrait=focused?(playerImage(focused)||agImg(MV.agBy?.[focused.name])):'';
  const agent=focused?MV.agBy?.[focused.name]:'';
  const spotlight=focused?`<div class="duelspotlight ${which}" data-player="${focused.name}">
    <div class="duelportrait">${portrait?`<img src="${portrait}" alt="">`:''}</div>
    <div class="duelbar">${agent?`<span class="duelagent"><img src="${agImg(agent)}" alt=""><b>${agentLabel(agent)}</b></span>`:'<span></span>'}<strong>${focused.name}</strong></div>
  </div>`:'';
  el.innerHTML=cards;
  if(focused&&existingSpotlight?.dataset.player===focused.name)el.appendChild(existingSpotlight);
  else if(spotlight){const template=document.createElement('template');template.innerHTML=spotlight.trim();el.appendChild(template.content.firstElementChild);}
}

function mvShowRoundBreak(rd,loadoutsHome,loadoutsAway){
  const stage=document.querySelector('.viewerstage'),panel=document.getElementById('roundBreak');if(!stage||!panel)return;
  const events=rd.spatial?.events||[],roundKills=new Map(),roundDeaths=new Map(),roundAssists=new Map();
  events.filter(e=>e.type==='kill').forEach(e=>{roundKills.set(e.killer,(roundKills.get(e.killer)||0)+1);roundDeaths.set(e.victim,(roundDeaths.get(e.victim)||0)+1);if(e.assist)roundAssists.set(e.assist,(roundAssists.get(e.assist)||0)+1);});
  const rows=(team,loadouts,side)=>team.roster.map((pl,i)=>({pl,i,k:(MATCH.box[pl.name]?.k||0)+(roundKills.get(pl.name)||0)})).sort((a,b)=>b.k-a.k||a.i-b.i).map(({pl,i,k})=>{const agent=MV.agBy?.[pl.name]||'',lo=loadouts[i]||{},base=MATCH.box[pl.name]||{k:0,d:0,a:0},allAbilities=abilityAssets(agent),ult=allAbilities.find(a=>a.slot==='ultimate'),armor=armorAsset(lo.shield);
    const skills=allAbilities.filter(a=>a.slot!=='ultimate').map(a=>`<img class="${MV.usedAbilities?.has(`${pl.name}:${a.name.en}`)?'used':''}" src="${a.src}" alt="">`).join('');
    return `<div class="rbplayer ${side}"><span class="rbspent">−₵ ${lo.spent??0}</span><span class="rbmoney">₵ ${lo.remaining??0}</span><div class="rbskills">${skills}</div>${armor?`<img class="rbarmor" src="${armor}" alt="">`:'<span class="rbarmor empty"></span>'}<img class="rbweapon" src="${weaponAsset(lo.weapon)}" alt="">${ult?`<img class="rbult" src="${ult.src}" alt="">`:'<span class="rbult"></span>'}<span class="rbstat">${k} / ${base.d+(roundDeaths.get(pl.name)||0)} / ${base.a+(roundAssists.get(pl.name)||0)}</span><div class="rbidentity"><b>${pl.name}</b><small>${agentLabel(agent)}</small></div><img class="rbagent" src="${agImg(agent)}" alt=""></div>`;}).join('');
  const rounds=MATCH.mapSimulation?.rounds||[],roundByNumber=new Map(rounds.map(round=>[round.n,round])),slotCount=Math.max(24,...rounds.map(round=>round.n)),flowGrid=`grid-template-columns:52px repeat(12,24px) 54px repeat(${Math.max(12,slotCount-12)},24px)`;
  const homeLogo=teamLogo(MATCH.home.teamId||MATCH.home.id,MATCH.home.name),awayLogo=teamLogo(MATCH.away.teamId||MATCH.away.id,MATCH.away.name);
  const flowCells=render=>Array.from({length:slotCount},(_,index)=>{const n=index+1,cell=render(n,roundByNumber.get(n));return(n===13?'<i class="halftime"></i>':'')+cell;}).join('');
  const flowRow=side=>flowCells((n,round)=>`<i class="${round?.winner===side?'won':''}">${round?.winner===side?'◆':''}</i>`);
  panel.innerHTML=`<div class="rbflow"><div class="rbflownums" style="${flowGrid}"><b></b>${flowCells(n=>`<span>${n}</span>`)}</div><div class="rbflowrow home" style="${flowGrid}"><b>${homeLogo?`<img src="${homeLogo}" alt="">`:MATCH.home.short}</b>${flowRow('home')}</div><div class="rbflowrow away" style="${flowGrid}"><b>${awayLogo?`<img src="${awayLogo}" alt="">`:MATCH.away.short}</b>${flowRow('away')}</div></div><div class="rbteams"><section class="rbteam home">${rows(MATCH.home,loadoutsHome,'home')}</section><section class="rbteam away">${rows(MATCH.away,loadoutsAway,'away')}</section></div>`;
  stage.classList.add('round-break');
}

export function mvKill(killerName,victimName){
  const kk=MV.nameIdx[killerName], vk=MV.nameIdx[victimName]; const field=mvContentField();
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
  const field=mvContentField(); if(!field)return;
  const s=document.createElement('div'); s.className='mvspike'+(defused?' defused':''); s.textContent=defused?'◈':'✸';
  s.style.left=x+'%'; s.style.top=y+'%'; field.appendChild(s);
  setTimeout(()=>s.classList.add('show'),20);
}

export function mvAbility(ab,rd){
  const k=MV.nameIdx[ab.player]; const field=mvContentField(); if(!k||!field)return;
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
  const simStart=Number(ab.t)||0;
  const add=(cls,html,ms,x,y)=>{ const e=document.createElement('div'); e.className='fx '+cls+(isAtk?' atk':' def'); e.style.left=(x!=null?x:px)+'%'; e.style.top=(y!=null?y:py)+'%'; const ty=cls.replace('fx-',''); const R=SKILL_R[ty]; if(R&&ty!=='wall'){ e.style.width=(R*2)+'%'; e.style.height=(R*2)+'%'; } e.innerHTML=html||('<span class="fxsym">'+(TYPESYM[ty]||'')+'</span>');if(ms>=0)e.dataset.simExpire=String(simStart+ms/1000);field.appendChild(e);return e; };
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
  lab.style.left=px+'%'; lab.style.top=(py-7)+'%'; lab.textContent=(ab.ult?'★ ':'')+ab.player+': '+abilityNameLabel(ab.name); field.appendChild(lab);
  lab.dataset.simExpire=String(simStart+1.6);
}

export function fmtClock(sec){const s=Math.max(0,Math.round(sec)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
// animate one round: buy -> movement from spawn -> duels over time -> plant/defuse -> end

export function mvPlayRound(rd,speed,onDone){
  const field=mvContentField();
  if(!field){ onDone(); return; }
  mvStopRAF();
  MV.usedAbilities=new Set();
  MV.duelFocus=null;MV.duelCandidate=null;
  const stage=document.querySelector('.viewerstage'),roundBreak=document.getElementById('roundBreak');if(stage)stage.classList.remove('round-break');if(roundBreak)roundBreak.innerHTML='';
  const initialRate=speed==='fast'?4:Math.max(1,Math.min(4,Number(speed)||1)),fast=false;
  if(!rd.spatial){ onDone(); return; }
  const atkTeamSide=rd.hSide==='atk'?'home':'away';
  const defTeamSide=atkTeamSide==='home'?'away':'home';
  const atkTeam=atkTeamSide==='home'?MATCH.home:MATCH.away, defTeam=defTeamSide==='home'?MATCH.home:MATCH.away;
  const atkShort=atkTeam.short, defShort=defTeam.short;
  if(!MV.econ) initEcon();
  const uiBuyHome=MATCH.home.roster.map((pl,i)=>buyFromCredits(MV.econ.home[i],pl.role,i));
  const uiBuyAway=MATCH.away.roster.map((pl,i)=>buyFromCredits(MV.econ.away[i],pl.role,i));
  // Broadcast cards must show the same loadout that resolved combat.
  const loadoutsHome=rd.loadouts?.home?.map((loadout,i)=>({...loadout,remaining:loadout.remaining??uiBuyHome[i].remaining}))||uiBuyHome;
  const loadoutsAway=rd.loadouts?.away?.map((loadout,i)=>({...loadout,remaining:loadout.remaining??uiBuyAway[i].remaining}))||uiBuyAway;
  MV.remaining={home:loadoutsHome.map(l=>l.remaining), away:loadoutsAway.map(l=>l.remaining)};
  const wepBy={}; MATCH.home.roster.forEach((pl,i)=>wepBy[pl.name]=loadoutsHome[i].weapon);
  MATCH.away.roster.forEach((pl,i)=>wepBy[pl.name]=loadoutsAway[i].weapon);
  const kf=document.getElementById('killFeed'); if(kf)kf.innerHTML='';
  const refreshPanels=()=>{ mvRenderCards('home',MATCH.home,rd.hSide,loadoutsHome); mvRenderCards('away',MATCH.away,rd.aSide,loadoutsAway); };
  field.classList.remove('fast'); field.querySelectorAll('.mvtracer,.mvspike,.mvpulse,.mvablabel,.fx,.sight,.plantzone,.mvplantarea,.mvorb,.ability-object,.mvbarrier,.mvdoor,.mvdoorbutton,.mvstairs,.mvprep').forEach(e=>e.remove());
  for(const site of curGeo().siteNames||[]){const zone=curGeo().plantZone(site),area=document.createElement('div');area.className='mvplantarea';area.dataset.site=site;area.style.left=(zone.x-zone.w/2)+'%';area.style.top=(zone.y-zone.h/2)+'%';area.style.width=zone.w+'%';area.style.height=zone.h+'%';area.innerHTML=`<b>${site}</b>`;field.appendChild(area);}
  for(const orb of curGeo().orbs||[]){const marker=document.createElement('div');marker.className='mvorb';marker.dataset.orbId=orb.id;marker.style.left=orb.x+'%';marker.style.top=orb.y+'%';marker.title=orb.label;marker.innerHTML='<i></i>';field.appendChild(marker);}
  const barrierVisuals=curGeo().annotations?.barriers||rd.preparation?.barriers||[];
  for(const barrier of barrierVisuals){const from=barrier.displayFrom||barrier.from,to=barrier.displayTo||barrier.to,dx=to.x-from.x,dy=to.y-from.y,line=document.createElement('div');line.className=`mvbarrier ${barrier.side||'attack'}`;line.dataset.barrierId=barrier.id;line.style.left=from.x+'%';line.style.top=from.y+'%';line.style.width=Math.hypot(dx,dy)+'%';line.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;field.appendChild(line);}
  if(MATCH.diagnostic){
    for(const door of curGeo().annotations?.doors||[]){const dx=door.to.x-door.from.x,dy=door.to.y-door.from.y,line=document.createElement('div');line.className='mvdoor';line.dataset.doorId=door.id;line.style.left=door.from.x+'%';line.style.top=door.from.y+'%';line.style.width=Math.hypot(dx,dy)+'%';line.style.transform=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;field.appendChild(line);const button=document.createElement('div');button.className='mvdoorbutton';button.style.left=door.button.x+'%';button.style.top=door.button.y+'%';field.appendChild(button);}
    for(const stair of curGeo().annotations?.stairs||[]){const marker=document.createElement('div');marker.className='mvstairs';marker.style.left=stair.at.x+'%';marker.style.top=stair.at.y+'%';marker.style.width=stair.w+'%';marker.style.height=stair.h+'%';field.appendChild(marker);}
  }
  const prepIndicator=document.createElement('div');prepIndicator.className='mvprep';prepIndicator.innerHTML=`<b>${tr('준비 단계','PREPARATION')}</b><span>${tr('배리어 해제 전','BARRIERS ACTIVE')}</span>`;field.appendChild(prepIndicator);
  Object.values(MV.dots).forEach(d=>{d.classList.remove('dead');d.classList.remove('clutch');});

  // ---- replay directly from recorded per-tick position tracks (exact engine motion) ----
  const sp=rd.spatial; const dur=sp.duration||8;
  const uByKey={}; sp.units.forEach(u=>uByKey[u.side+u.idx]=u);
  const preparationByPlayer=new Map((rd.preparation?.players||[]).map(entry=>[entry.player,entry]));
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
  function prepPos(path,progress){const points=(path||[]).filter(Boolean);if(points.length<2){const point=points[0]||{x:50,y:50};return{x:point.x,y:point.y,f:0,c:0};}const lengths=[],total=points.slice(1).reduce((sum,point,index)=>{const length=Math.hypot(point.x-points[index].x,point.y-points[index].y);lengths.push(length);return sum+length;},0);let remaining=total*progress;for(let index=0;index<lengths.length;index++){if(remaining<=lengths[index]||index===lengths.length-1){const a=points[index],b=points[index+1],ratio=lengths[index]?Math.min(1,remaining/lengths[index]):1;return{x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio,f:Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI,c:0};}remaining-=lengths[index];}return{...points.at(-1),f:0,c:0};}
  function updateCamera(te,isPreparation=false){
    const camera=MV.camera||(MV.camera={x:50,y:50,zoom:1});
    if(isPreparation){camera.x=50;camera.y=50;camera.zoom=1;MV.duelFocus=null;MV.duelCandidate=null;field.style.setProperty('--camera-counter','1');field.style.transform='translate(0%,0%) scale(1)';return;}
    let target={x:50,y:50,zoom:1},closest=null,minDistance=Infinity;
    if(!fast){
      const lookAhead=Math.min(dur,te+1.25),home=[],away=[];
      Object.entries(walkers).forEach(([key,walker])=>{if(MV.st[key]?.dead)return;const point=posAt(walker,lookAhead),entry={key,point};(key.startsWith('home')?home:away).push(entry);});
      home.forEach(a=>away.forEach(b=>{const distance=Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y);if(distance<minDistance){minDistance=distance;closest={a,b};}}));
      if(closest&&minDistance<24){
        const zoom=Math.max(1.28,Math.min(1.72,1.72-(minDistance/24)*.36));
        const margin=50/zoom;
        target={x:Math.max(margin,Math.min(100-margin,(closest.a.point.x+closest.b.point.x)/2)),y:Math.max(margin,Math.min(100-margin,(closest.a.point.y+closest.b.point.y)/2)),zoom};
        const nextFocus={home:uByKey[closest.a.key]?.name,away:uByKey[closest.b.key]?.name};
        MV.duelLastClose=te;
        const signature=`${nextFocus.home}|${nextFocus.away}`,currentSignature=MV.duelFocus?`${MV.duelFocus.home}|${MV.duelFocus.away}`:'';
        if(signature!==currentSignature){
          if(MV.duelCandidate?.signature!==signature)MV.duelCandidate={signature,since:te,focus:nextFocus};
          if(!MV.duelFocus||te-MV.duelCandidate.since>=.9){MV.duelFocus=nextFocus;MV.duelFocusChangedAt=te;refreshPanels();}
        }else MV.duelCandidate=null;
      }
    }
    if(closest&&minDistance<30&&MV.duelFocus)MV.duelLastClose=te;
    if((!closest||minDistance>=30)&&MV.duelFocus&&te-(MV.duelLastClose??te)>=1.4){MV.duelFocus=null;MV.duelCandidate=null;refreshPanels();}
    const ease=(target.zoom>camera.zoom) ? 0.085 : 0.045;
    camera.x+=(target.x-camera.x)*ease;camera.y+=(target.y-camera.y)*ease;camera.zoom+=(target.zoom-camera.zoom)*ease;
    const tx=50-camera.x*camera.zoom,ty=50-camera.y*camera.zoom;
    field.style.setProperty('--camera-counter',(1/Math.sqrt(camera.zoom)).toFixed(4));
    field.style.transform=`translate(${tx.toFixed(2)}%,${ty.toFixed(2)}%) scale(${camera.zoom.toFixed(3)})`;
  }
  let atkAlive=5,defAlive=5; mvRenderAlive(atkAlive,defAlive,atkShort,defShort); refreshPanels();
  const bcH=document.getElementById('bcH'),bcA=document.getElementById('bcA');
  const setCrest=(element,team)=>{if(!element)return;const logo=teamLogo(team.teamId||team.id,team.name);element.style.setProperty('--team-color',team.color);element.innerHTML=logo?`<img src="${logo}" alt="">`:`<span>${team.short}</span>`;};
  setCrest(bcH,MATCH.home);setCrest(bcA,MATCH.away);
  const nameH=document.getElementById('bNameH'),nameA=document.getElementById('bNameA'),sideH=document.getElementById('bSideH'),sideA=document.getElementById('bSideA');
  if(nameH)nameH.textContent=MATCH.home.short;if(nameA)nameA.textContent=MATCH.away.short;
  if(sideH){sideH.textContent=rd.hSide.toUpperCase();sideH.className=rd.hSide;}if(sideA){sideA.textContent=rd.aSide.toUpperCase();sideA.className=rd.aSide;}
  const phase=document.getElementById('mvPhase');
  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const playerTag=name=>`<strong class="comment-player">${escapeHtml(name)}</strong>`;
  const siteTag=site=>`<strong class="comment-site">${escapeHtml(site)}</strong>`;
  const setPhase=t=>{if(phase){phase.className='mvcommentary';phase.textContent=t;}};
  const announce=(html,moment='')=>{if(!phase)return;phase.className='mvcommentary';phase.innerHTML=html;if(moment){void phase.offsetWidth;phase.className=`mvcommentary moment-${moment}`;}};
  const timerEl=document.getElementById('rTimer');
  const playerSide=MATCH.playerSide||'home',playerIsAttacking=playerSide===atkTeamSide;
  const visibleTactic=rd.tactics?(playerIsAttacking?`${tr('우리 팀 공격','Our attack')} · ${tacticLabel(rd.tactics.attack.type)}`:`${tr('우리 팀 수비','Our defense')} · ${tacticLabel(rd.tactics.defense.type)}`):tr('구매 · 라운드 준비','Buy · Round setup');
  setPhase(visibleTactic);
  if(timerEl){ timerEl.textContent='0:30'; timerEl.classList.remove('spike'); }
  MV._planted=false; MV._plantAt=0;

  // ---- event queue (kills/plant/defuse/util/recon from log + ability visuals) ----
  const evs=sp.events.slice();
  const hasSpatialAbilities=evs.some(event=>event.type==='ability');
  const abList=rd.abilities&&rd.abilities.length?rd.abilities:(rd.ability?[rd.ability]:[]);
  if(!hasSpatialAbilities)abList.forEach((ab,i)=>evs.push({t:Math.min(dur-0.1,1.8+i*(dur-1.8)/(abList.length+1)),type:'ability',ab}));
  evs.sort((x,y)=>x.t-y.t);
  let ei=0, firstBlood=false;

  function fireEvent(e){
    if(e.type==='damage'||e.type==='abilityDamage'){
      if(MV.hpBy)MV.hpBy[e.victim]=e.remainingHP;
      if(e.type==='abilityDamage')announce(`${playerTag(e.source)}${tr(' 선수의 ',' deals damage with ')}<strong class="comment-ability">${escapeHtml(abilityNameLabel(e.ability))}</strong>${tr('이 적중합니다.','.')}`);
      refreshPanels();
    } else if(e.type==='kill'){
      if(MV.hpBy)MV.hpBy[e.victim]=0;
      mvKill(e.killer,e.victim);
      if(kf){ const kk=MV.nameIdx[e.killer]; if(kk){ const row=document.createElement('div'); row.className='kfrow '+kk.side;
        row.innerHTML=`<b>${e.killer}</b><span class="kfw">${wepBy[e.killer]||''}</span><b>${e.victim}</b>`;
        kf.prepend(row); while(kf.children.length>5)kf.removeChild(kf.lastChild); } }
      const vk=MV.nameIdx[e.victim]; if(vk){ if(vk.side===atkTeamSide)atkAlive=Math.max(0,atkAlive-1); else defAlive=Math.max(0,defAlive-1); }
      mvRenderAlive(atkAlive,defAlive,atkShort,defShort); refreshPanels();
      if(!firstBlood){firstBlood=true;announce(`${playerTag(e.killer)}${tr(' 선수가 첫 킬을 만들어냅니다!',' finds the opening kill!')}`,'kill');}
      else announce(`${playerTag(e.killer)}${tr(' 선수가 ',' takes down ')}${playerTag(e.victim)}${tr(' 선수를 잡아냅니다.','.') } <span class="comment-count">${atkAlive}v${defAlive}</span>`,'kill');
      if(rd.clutch){ const ck=MV.nameIdx[rd.clutch.player]; if(ck && MV.st[ck.side+ck.i] && !MV.st[ck.side+ck.i].dead){ const d=MV.dots[ck.side+ck.i]; if(d)d.classList.add('clutch'); } }
    } else if(e.type==='plantStart'){
      announce(`${playerTag(e.planter)}${tr(' 선수가 스파이크 설치를 시도합니다.',' is attempting to plant the spike.')}`);
      const el=document.createElement('div'); el.className='fx fx-trap atk'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">◆</span>';
      el.dataset.simExpire=String(e.t+3.6);field.appendChild(el);
    } else if(e.type==='spikeDrop'){
      announce(tr('스파이크가 떨어졌습니다. 수비가 위치를 확인합니다.','The spike is down. The defenders know where it is.'),'objective');
      field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove());
      const el=document.createElement('div'); el.className='mvspike show dropped'; el.textContent='✸'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; field.appendChild(el);
    } else if(e.type==='spikePickup'){
      announce(`${playerTag(e.by)}${tr(' 선수가 떨어진 스파이크를 회수합니다.',' recovers the dropped spike.')}`);
      field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove());
    } else if(e.type==='defuseStart'){
      announce(`${playerTag(e.defuser)}${tr(' 선수가 해체를 시작합니다!',' starts the defuse!')}`,'objective');
      const el=document.createElement('div'); el.className='fx fx-recon def'; el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">◈</span>';
      el.dataset.simExpire=String(e.t+3.6);field.appendChild(el);
    } else if(e.type==='defuseStop'){
      announce(tr('해체가 중단됐습니다!','The defuse is interrupted!'),'objective');
    } else if(e.type==='plant'){
      MV._planted=true; MV._plantAt=Date.now(); field.querySelectorAll('.mvspike.dropped').forEach(x=>x.remove()); mvSpike(e.x,e.y,false);
      announce(`${playerTag(e.planter)}${tr(' 선수가 ',' plants the spike at ')}${siteTag(rd.site)}${tr(' 사이트에 스파이크를 설치했습니다!','!')}`,'objective');
    } else if(e.type==='defuse'){
      mvSpike(e.x,e.y,true);
      announce(`${playerTag(e.defuser)}${tr(' 선수가 스파이크를 해체합니다!',' defuses the spike!')}`,'objective');
    } else if(e.type==='util'){
      const el=document.createElement('div'); el.className='fx fx-'+(e.kind==='flash'?'flash':'smoke')+' atk';
      el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">'+(TYPESYM[e.kind]||'')+'</span>';
      el.dataset.simExpire=String(e.t+(e.kind==='flash' ? .7 : 4.6));field.appendChild(el);
      if(e.kind==='smoke') announce(`${siteTag(e.site)}${tr(' 진입로에 연막이 펼쳐집니다.',' entry is covered by smoke.')}`);
    } else if(e.type==='recon'){
      const el=document.createElement('div'); el.className='fx fx-recon atk';
      el.style.left=e.x+'%'; el.style.top=e.y+'%'; el.innerHTML='<span class="fxsym">'+TYPESYM.recon+'</span>';
      el.dataset.simExpire=String(e.t+1.1);field.appendChild(el);
      announce(tr('정찰 스킬이 수비 위치를 확인합니다.','Recon reveals the defensive setup.'));
    } else if(e.type==='orbStart'){
      const marker=field.querySelector(`.mvorb[data-orb-id="${e.orbId}"]`);if(marker)marker.classList.add('capturing');
      announce(`${playerTag(e.player)}${tr(' 선수가 궁극기 오브를 확보하려 합니다.',' starts capturing an ultimate orb.')}`);
    } else if(e.type==='orbCapture'){
      const marker=field.querySelector(`.mvorb[data-orb-id="${e.orbId}"]`);if(marker){marker.classList.remove('capturing');marker.classList.add('claimed');}
      announce(`${playerTag(e.player)}${tr(' 선수가 궁극기 포인트를 획득합니다.',' gains an ultimate point.')}`,'objective');refreshPanels();
    } else if(e.type==='orbCancel'){
      const marker=field.querySelector(`.mvorb[data-orb-id="${e.orbId}"]`);if(marker)marker.classList.remove('capturing');
      announce(`${playerTag(e.player)}${tr(' 선수의 오브 확보가 중단됩니다.',' has the orb capture interrupted.')}`);
    } else if(e.type==='abilityObjectPlace'){
      const object=document.createElement('div');object.className=`ability-object ${e.side} kind-${e.kind}`;object.dataset.objectId=e.objectId;object.dataset.simExpire=String(e.expiresAt);object.style.left=e.x+'%';object.style.top=e.y+'%';object.title=abilityNameLabel(e.ability);object.innerHTML=`<i>${TYPESYM[e.kind]||'◆'}</i>`;field.appendChild(object);
    } else if(e.type==='abilityObjectDestroy'){
      const object=field.querySelector(`.ability-object[data-object-id="${e.objectId}"]`);if(object){object.classList.add('destroyed');object.dataset.simExpire=String(e.t+.5);}
      announce(`${playerTag(e.player)}${tr(' 선수가 ',' destroys ')}<strong class="comment-ability">${escapeHtml(abilityNameLabel(e.ability))}</strong>${tr('을 파괴합니다.','.')}`);
    } else if(e.type==='abilityObjectExpire'){
      field.querySelector(`.ability-object[data-object-id="${e.objectId}"]`)?.remove();
    } else if(e.type==='ability'){const ab=e.ab||e;MV.usedAbilities.add(`${ab.player}:${ab.name}`);const spatialObject=['reveal_scan','drone_tag','turret_anchor','vulnerable_trap','remote_area_damage','detain_zone','vision_block','global_smoke'].includes(ab.mechanic);if(!spatialObject)mvAbility(ab,rd);announce(`${playerTag(ab.player)}${tr(' 선수가 ',' uses ')}<strong class="comment-ability">${escapeHtml(abilityNameLabel(ab.name))}</strong>${tr(' 스킬을 사용합니다.','.')}`);refreshPanels(); }
  }

  const preparationWall=2500,moveWall=Math.max(1000,dur*1000),holdWall=2100;
  let plantTe=-1,barrierReleased=false;
  function firePlantClock(){}
  function frame(ts){
    const clock=MV.roundClock;if(!clock)return;const stepping=clock.paused&&clock.pendingStep>0;if(clock.paused&&!stepping)return;
    const now=(typeof ts==='number'?ts:0);if(clock.lastTs==null)clock.lastTs=now;const delta=stepping?clock.pendingStep:Math.max(0,now-clock.lastTs)*clock.rate;clock.pendingStep=0;clock.virtualElapsed+=delta;clock.lastTs=now;const el=clock.virtualElapsed;
    let te;
    if(el<preparationWall){te=0;setPhase(tr('준비 단계 · 구매와 초기 배치','PREPARATION · Buy and initial setup'));}
    else {const playElapsed=el-preparationWall;te=Math.min(dur,playElapsed/moveWall*dur);if(!firstBlood&&el<preparationWall+120)setPhase(playerIsAttacking?`${tacticLabel(rd.tactics?.attack?.type||'EXECUTE')} · ${rd.site} ${tr('진입','entry')}`:`${rd.site} ${tr('사이트 진입 감지','site contact')}`);}
    Object.keys(walkers).forEach(key=>{ const s=MV.st[key]; const cone=cones[key];
      if(s.dead){ if(cone)cone.style.display='none'; return; }
      const unit=uByKey[key],prep=unit&&preparationByPlayer.get(unit.name),prepProgress=Math.max(0,Math.min(1,el/preparationWall));
      const p=el<preparationWall&&prep?.from&&prep?.to?prepPos(prep.path||[prep.from,prep.to],prepProgress):posAt(walkers[key],te);
      s.x=p.x; s.y=p.y; const d=MV.dots[key]; if(d){ d.style.left=s.x.toFixed(2)+'%'; d.style.top=s.y.toFixed(2)+'%'; d.classList.toggle('carry',!!p.c); }
      if(cone){ cone.style.left=s.x.toFixed(2)+'%'; cone.style.top=s.y.toFixed(2)+'%'; cone.style.transform='translate(-50%,-50%) rotate('+(p.f||0)+'deg)'; } });
    updateCamera(te,el<preparationWall);
    if(!barrierReleased&&el>=preparationWall){barrierReleased=true;field.querySelectorAll('.mvbarrier,.mvprep').forEach(element=>element.remove());announce(tr('배리어가 해제되고 라운드가 시작됩니다.','Barriers drop. The round is live.'));}
    while(ei<evs.length && evs[ei].t<=te){ if(evs[ei].type==='plant'&&plantTe<0)plantTe=evs[ei].t; fireEvent(evs[ei]); ei++; }
    field.querySelectorAll('[data-sim-expire]').forEach(element=>{if(Number(element.dataset.simExpire)<=te)element.remove();});
    if(timerEl){ if(el<preparationWall){timerEl.classList.remove('spike');timerEl.textContent=tr('준비','READY');}
      else if(plantTe>=0){timerEl.classList.add('spike');timerEl.textContent=fmtClock(45-(te-plantTe));}
      else {timerEl.classList.remove('spike');timerEl.textContent=fmtClock(100-te);} }
    if(el < preparationWall+moveWall){if(!clock.paused)MV.raf=requestAnimationFrame(frame);}
    else {
      while(ei<evs.length){ if(evs[ei].type==='plant'&&plantTe<0)plantTe=evs[ei].t; fireEvent(evs[ei]); ei++; }
      announce(`<strong class="comment-team">${escapeHtml(rd.winner===atkTeamSide?atkShort:defShort)}</strong>${tr('이 라운드를 가져갑니다!',' wins the round!')}`,'round');
      if(timerEl)timerEl.textContent='0:00';
      const scoreH=document.getElementById('bScoreH'),scoreA=document.getElementById('bScoreA');if(scoreH)scoreH.textContent=rd.h;if(scoreA)scoreA.textContent=rd.a;
      mvShowRoundBreak(rd,loadoutsHome,loadoutsAway);
      setTimeout(()=>{field.style.transform='translate(0%,0%) scale(1)';field.style.setProperty('--camera-counter','1');MV.camera={x:50,y:50,zoom:1};mvStopRAF();onDone();},clock.skipRequested?0:holdWall/clock.rate);
    }
  }
  MV.roundClock={paused:false,rate:initialRate,lastTs:null,virtualElapsed:0,pendingStep:0,finishAt:preparationWall+moveWall,skipRequested:false,frame};
  MV.raf=requestAnimationFrame(frame);
}

export function mvPlantConverge(){}


/* animated: compute the map, then replay round-by-round on the top-down map */
