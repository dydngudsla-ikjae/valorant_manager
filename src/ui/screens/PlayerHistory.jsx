import { useState } from 'react';
import HISTORY from '../../../history_json/data/players.json' with { type:'json' };
import { tr } from '../../i18n.js';
import { AGENTS, agImg } from '../../data/agents.js';

const COLS=['G','RND','R','ACS','K:D','KAST','ADR','KPR','APR','FK:FD'
  // 누적 수치는 데이터에 보존하되 역사 카드에서는 잠시 숨긴다.
  // ,'K','D','A','FK','FD'
];
const AGENT_NAMES=new Map(Object.values(AGENTS).flat().map(name=>[name.toLowerCase().replace(/[^a-z0-9]/g,''),name]));
const agentName=id=>AGENT_NAMES.get(String(id).toLowerCase().replace(/[^a-z0-9]/g,''))||id;
const eventName=(name,year)=>name
  .replace(new RegExp(`^(?:Champions Tour|VCT)\\s+${year}:\\s*`,'i'),'')
  .replace(/^Valorant\s+/i,'')
  .replace(new RegExp(`\\s+${year}$`),'')
  .trim();
const values=s=>[s.games,s.rounds,s.r,s.acs,s.kd,s.kast==null?'—':`${Math.round(s.kast*100)}%`,s.adr,s.kpr,s.apr,s.fkfd
  // ,s.k,s.d,s.a,s.fk,s.fd
];
function StatCells({stats}){return values(stats).map((v,i)=><span className={COLS[i]==='R'?'rating':''} key={COLS[i]}>{v??'—'}</span>);}

export function PlayerHistory({playerId}){
  const [open,setOpen]=useState({});
  const [openYears,setOpenYears]=useState({2026:true});
  const history=HISTORY.players[String(playerId)];
  if(!history||!Object.keys(history.years).length)return <div className="panel historypanel"><div className="ph">{tr('역사','History')}</div><div className="pbody pmeta">{tr('기록 없음','No records')}</div></div>;
  const years=Object.values(history.years).filter(x=>x.year>=2023).sort((a,b)=>b.year-a.year);
  return <div className="panel historypanel">
    <div className="ph">{tr('역사','History')}</div>
    <div className="historyscroll">
      <div className="historytable">
        <div className="historyrow historycols"><span>{tr('대회','Competition')}</span>{COLS.map(x=><span key={x}>{x}</span>)}</div>
        {years.map(year=><section className="historyyear" key={year.year}>
          <button className="historyyearhead" onClick={()=>setOpenYears(x=>({...x,[year.year]:!x[year.year]}))}><b>{openYears[year.year]?'−':'+'}</b>{year.year}</button>
          {openYears[year.year]&&year.events.map(event=>{
            const key=`${year.year}:${event.tournamentId}`,opened=!!open[key];
            return <div className="historyevent" key={key}>
              <button className="historyrow" onClick={()=>setOpen(x=>({...x,[key]:!opened}))} aria-expanded={opened}>
                <span className="eventname" title={event.name}><b>{opened?'−':'+'}</b><span className="eventtitle">{eventName(event.name,year.year)}</span></span><StatCells stats={event}/>
              </button>
              {opened&&event.agents.map(agent=><div className="historyrow agenthistory" key={agent.agent}><span><img src={agImg(agentName(agent.agent))} alt="" onError={e=>{e.currentTarget.hidden=true;}} />{agentName(agent.agent)}</span><StatCells stats={agent}/></div>)}
            </div>;
          })}
          <div className="historyrow yeartotal"><span>{year.year} TOTAL</span><StatCells stats={year.total}/></div>
        </section>)}
      </div>
    </div>
  </div>;
}
