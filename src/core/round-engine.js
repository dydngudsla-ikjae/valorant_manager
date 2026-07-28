import { BUYMOD, SIDEMOD, decideBuy, homeSideAt } from './economy.js';
import { kitOf, playerOVR } from './ratings.js';
import { rollForm, teamPower } from './season.js';
import { spatialRound } from './spatial.js';
import { MATCH } from './state.js';
import { p } from '../data/leagues.js';

export function rand5(){return Math.floor(Math.random()*5);}

export function agentMap(cc){const m={};cc.home.agents.forEach(a=>m[a.name]=a.agent);cc.away.agents.forEach(a=>m[a.name]=a.agent);return m;}
// weighted pick by aim + a kit dimension + form

export function pickByKit(team,form,agByName,dim,mult){
  const w=team.roster.map(pl=>Math.max(1, pl.aim*0.4 + kitOf(agByName[pl.name],pl.role)[dim]*(mult||3) + (form[pl.name]||0)));
  const tot=w.reduce((s,x)=>s+x,0); let r=Math.random()*tot;
  for(let i=0;i<team.roster.length;i++){r-=w[i];if(r<=0)return team.roster[i];}
  return team.roster[0];
}

export function fbSbYScore(team,form,agByName){ // entry duel score of a team's best entry
  const pl=pickByKit(team,form,agByName,'en',3);
  return {pl, score: pl.aim*0.5 + kitOf(agByName[pl.name],pl.role).en*3 + (form[pl.name]||0)};
}

export function applyKills(box,kills){
  kills.forEach(k=>{ if(!box[k.killer])return;
    box[k.killer].k++; box[k.killer].acs+=(k.fb?230:(150+Math.floor(Math.random()*90)));
    if(box[k.victim])box[k.victim].d++;
    if(k.assist&&box[k.assist])box[k.assist].a++; });
}

export function applyRoundStats(box,rd){
  applyKills(box,rd.kills);
  if(rd.fb){ if(box[rd.fb.killer])box[rd.fb.killer].fb++; if(box[rd.fb.victim])box[rd.fb.victim].fd++; }
  if(rd.clutch&&box[rd.clutch.player]){box[rd.clutch.player].cl++; box[rd.clutch.player].acs+=60;}
  if(rd.abilities&&rd.abilities.length){ rd.abilities.forEach(ab=>{ if(box[ab.player]){box[ab.player].util++; box[ab.player].acs+=12;} }); }
  else if(rd.ability&&box[rd.ability.player]){box[rd.ability.player].util++; box[rd.ability.player].acs+=15;}
  if(rd.plant&&rd.planter&&box[rd.planter])box[rd.planter].plant++;
  if(rd.defuse&&rd.defuser&&box[rd.defuser])box[rd.defuser].defuse++;
}

export function newStat(){return {k:0,d:0,a:0,acs:0,fb:0,fd:0,cl:0,util:0,plant:0,defuse:0};}

export function freshBox(home,away){const b={};[...home.roster,...away.roster].forEach(p=>b[p.name]=newStat());return b;}

export function finalizeRatings(box,totalRounds){
  Object.values(box).forEach(b=>{
    b.acsFinal=Math.round(b.acs/Math.max(1,totalRounds));
    let r=0.75 + (b.acsFinal-200)*0.0025 + (b.fb-b.fd)*0.03 + b.cl*0.08 + (b.util-3)*0.01 + (b.k-b.d)*0.006;
    b.rating=+Math.max(0.30,Math.min(2.0,r)).toFixed(2);
  });
}
// full map sim: rich round-by-round log (opening duel, ability moment, plant/defuse, clutch)

export function simOneMap(home,away,cc,homeStartAtk){
  const hForm=rollForm(home),aForm=rollForm(away);
  const agBy=agentMap(cc);
  const baseH=teamPower(home,hForm)+cc.home.delta;
  const baseA=teamPower(away,aForm)+cc.away.delta;
  let credH=800,credA=800;
  let h=0,a=0,r=0; const rounds=[];
  const effR=(pl,form)=>playerOVR(pl)+kitOf(agBy[pl.name],pl.role).le*0.5+(form[pl.name]||0)+(pl.role==='DUE'?3:0);
  while(!((h>=13||a>=13)&&Math.abs(h-a)>=2)){
    if(r>50)break;
    const hSide=homeSideAt(r,homeStartAtk), aSide=hSide==='atk'?'def':'atk';
    const isPistol=(r===0||r===12);
    const buyH=decideBuy(credH,isPistol), buyA=decideBuy(credA,isPistol);
    const powH=baseH+SIDEMOD[cc.home.stance][hSide]+BUYMOD[buyH];
    const powA=baseA+SIDEMOD[cc.away.stance][aSide]+BUYMOD[buyA];
    // per-duel team bias (home perspective). pistols flatten skill/economy.
    const teamGap=(powH-powA+cc.edge)*(isPistol?0.4:1);
    const atkSide=hSide==='atk'?'home':'away', defSide=atkSide==='home'?'away':'home';
    const atkTeamObj=atkSide==='home'?home:away;
    // recon/util strength from the attacking team's agent kits (initiators find angles; controllers/duelists open sites)
    let sumIn=0,sumUt=0; atkTeamObj.roster.forEach(pl=>{const k=kitOf(agBy[pl.name],pl.role); sumIn+=k.in; sumUt+=(k.co+k.le);});
    const reconStrength=Math.max(0,Math.min(1,(sumIn/atkTeamObj.roster.length)/8));
    const utilStrength=Math.max(0,Math.min(1,(sumUt/atkTeamObj.roster.length)/12));
    const ratingOf=(pl,key)=>effR(pl, key==='home'?hForm:aForm);
    const res=spatialRound(home,away,{atkTeamKey:atkSide,defTeamKey:defSide,teamGap,ratingOf,reconStrength,utilStrength,isPistol});
    const kills=res.kills, fb=res.fb, site=res.site;
    const homeWon = res.winner==='home';
    if(homeWon)h++; else a++;
    if(homeWon){credH=Math.min(9000,credH+3000);credA=Math.min(9000,credA+1900);}
    else {credA=Math.min(9000,credA+3000);credH=Math.min(9000,credH+1900);}
    const winSide=res.winner;
    const atkTeam=atkSide==='home'?home:away, defTeam=defSide==='home'?home:away;
    let plant=res.planted, defuse=res.defused,
        planter=res.plantEv?res.plantEv.planter:null, defuser=res.defuseEv?res.defuseEv.defuser:null;
    const clutch=res.clutch;
    // ability moments for the broadcast visuals (names/agents); positions/timing come from the tick log
    const abilities=[];
    const nAb=1+Math.floor(Math.random()*3);
    for(let ai=0;ai<nAb;ai++){
      const abSide=Math.random()<0.6?winSide:(winSide==='home'?'away':'home');
      const Tm=abSide==='home'?home:away;
      const dims=['in','co','su','le']; const dim=dims[Math.floor(Math.random()*dims.length)];
      const pl=pickByKit(Tm,abSide==='home'?hForm:aForm,agBy,dim,3);
      const kit=kitOf(agBy[pl.name],pl.role);
      const idx=Math.random()<0.14?3:Math.floor(Math.random()*3);
      abilities.push({player:pl.name, agentName:agBy[pl.name], name:kit.ab[idx], ult:idx===3, side:abSide, kind:dim});
    }
    const ability=abilities[0]||null;
    rounds.push({n:r+1,hSide,aSide,winner:winSide,buyH,buyA,isPistol,kills,fb,
      ability,abilities,plant,defuse,planter,defuser,clutch,site,h,a,
      spatial:{units:res.units,events:res.events,duration:res.duration,site:res.site},
      reconEv:res.reconEv,utilEvs:res.utilEvs});
    r++;
  }
  return {h,a,rounds,hForm,aForm};
}

export function topKillerOfRound(rd){const c={};rd.kills.forEach(k=>{if(k.side===rd.winner)c[k.killer]=(c[k.killer]||0)+1;});
  let best=null,bk=0;Object.entries(c).forEach(([n,v])=>{if(v>bk){bk=v;best=n;}});return best?{name:best,k:bk}:null;}


export function weightedPlayer(team,form){
  const weights=team.roster.map(pl=>Math.max(1,pl.aim + (form[pl.name]||0) + (pl.role==='DUE'?8:0)));
  const tot=weights.reduce((s,w)=>s+w,0); let r=Math.random()*tot;
  for(let i=0;i<team.roster.length;i++){r-=weights[i];if(r<=0)return team.roster[i];}
  return team.roster[0];
}


export function matchMVP(){let best=null,ba=-1;Object.entries(MATCH.box).forEach(([n,b])=>{if(b.rating>ba){ba=b.rating;best=n;}});return best;}
/* round-by-round timeline (TFM-style inspectable log) */
