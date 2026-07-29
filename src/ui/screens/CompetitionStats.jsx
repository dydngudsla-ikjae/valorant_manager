import { useMemo, useState } from 'react';
import HISTORY from '../../../history_json/data/players.json' with { type:'json' };
import { go } from '../../core/state.js';
import { tr } from '../../i18n.js';

const COLS=[['r','R'],['acs','ACS'],['kd','K:D'],['kast','KAST'],['adr','ADR'],['kpr','KPR'],['apr','APR'],['fkfd','FK:FD'],['k','K'],['d','D'],['a','A'],['fk','FK'],['fd','FD']];
const display=(key,value)=>value==null?'—':key==='kast'?`${Math.round(value*100)}%`:value;

export function CompetitionStats(){
  const [year,setYear]=useState(2026),[eventId,setEventId]=useState('all'),[sort,setSort]=useState({key:'r',dir:-1});
  const players=Object.values(HISTORY.players);
  const events=useMemo(()=>{const found=new Map();for(const p of players)for(const e of p.years[year]?.events||[])found.set(e.tournamentId,e.name);return [...found].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));},[year]);
  const rows=useMemo(()=>players.flatMap(player=>{const y=player.years[year];if(!y)return[];const stats=eventId==='all'?y.total:y.events.find(e=>e.tournamentId===eventId);return stats?[{...stats,playerId:player.playerId,name:player.name}]:[];}).sort((a,b)=>{const av=a[sort.key]??-Infinity,bv=b[sort.key]??-Infinity;return typeof av==='string'?av.localeCompare(bv)*sort.dir:(av-bv)*sort.dir;}),[players,year,eventId,sort]);
  const chooseYear=e=>{setYear(Number(e.target.value));setEventId('all');};
  const toggleSort=key=>setSort(s=>({key,dir:s.key===key?s.dir*-1:-1}));
  return <>
    <div className="statshead">
      <div><div className="eyebrow">VCT · DATABASE</div><h1 className="big">{tr('대회 통계','Competition Stats')}</h1></div>
      <button className="btn ghost" onClick={()=>go('scHub')}>{tr('허브로 돌아가기','Back to Hub')}</button>
    </div>
    <div className="statsfilters panel">
      <label>{tr('연도','Year')}<select value={year} onChange={chooseYear}>{HISTORY.years.filter(x=>x>=2023).sort((a,b)=>b-a).map(x=><option key={x}>{x}</option>)}</select></label>
      <label>{tr('대회','Competition')}<select value={eventId} onChange={e=>setEventId(e.target.value)}><option value="all">{tr('연도 전체','Year total')}</option>{events.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}</select></label>
      <span>{rows.length} PLAYERS</span>
    </div>
    <div className="panel competitiontablewrap"><table className="competitiontable"><thead><tr><th>#</th><th><button onClick={()=>toggleSort('name')}>PLAYER {sort.key==='name'?(sort.dir<0?'▼':'▲'):''}</button></th><th>G (R)</th>{COLS.map(([key,label])=><th key={key}><button onClick={()=>toggleSort(key)}>{label} {sort.key===key?(sort.dir<0?'▼':'▲'):''}</button></th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.playerId}><td>{i+1}</td><td>{row.name}</td><td>{row.games} ({row.rounds})</td>{COLS.map(([key])=><td className={key==='r'?'rating':''} key={key}>{display(key,row[key])}</td>)}</tr>)}</tbody></table></div>
  </>;
}
