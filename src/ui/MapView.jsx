import { useEffect, useState } from 'react';
import { mvStopRAF } from './mapview.js';
import { MATCH } from '../core/state.js';

// Thin wrapper: mapview.js drives this DOM imperatively via getElementById
// (mvBuild/mvPlayRound/etc. -- see PLAN.md). This component only owns the
// markup and mount lifecycle; it never re-renders (no store subscription),
// so React never fights the innerHTML/style mutations mapview.js makes inside it.
export function MapView(){
  const [copied,setCopied]=useState(false);
  useEffect(() => () => mvStopRAF(), []);
  const copyDiagnostics=async()=>{
    const text=document.getElementById('diagnosticOutput')?.textContent||'';
    if(!text)return;
    await navigator.clipboard.writeText(text);setCopied(true);setTimeout(()=>setCopied(false),1600);
  };
  return (
    <div className="mapview" id="mapView" style={{display:'none'}}>
      <div className="bseries" id="bSeries"></div>
      <div className="bcast">
        <div className="bteam bteam-home"><div className="bcrest" id="bcH">H</div><div className="bteamcopy"><b id="bNameH">HOME</b><span id="bSideH">ATK</span></div><strong className="bteamscore" id="bScoreH">0</strong></div>
        <div className="bcenter">
          <div className="bround" id="bRound">R1</div>
          <div className="btimer" id="rTimer">1:40</div>
        </div>
        <div className="bteam bteam-away"><strong className="bteamscore" id="bScoreA">0</strong><div className="bteamcopy"><b id="bNameA">AWAY</b><span id="bSideA">DEF</span></div><div className="bcrest" id="bcA">A</div></div>
      </div>
      <div className="broadcast-control-slot" id="broadcastControls"></div>
      <div className="mvbanner" id="mvBanner"></div>
      <div className="viewerstage">
        <div className="bcards" id="cardsHome"></div>
        <div className="fieldwrap">
          <div className="mvfield" id="mvField"></div>
          <div className="killfeed" id="killFeed"></div>
          <div className="mvcommentary" id="mvPhase"></div>
        </div>
        <div className="bcards" id="cardsAway"></div>
        <div className="roundbreak" id="roundBreak"></div>
      </div>
      <details className="matchdiagnostics" id="matchDiagnostics" style={{display:MATCH?.diagnostic?'block':'none'}}>
        <summary><span>CODEX DIAGNOSTIC</span><b id="diagnosticIssueCount">0 issues</b></summary>
        <div className="diagnostictools">
          <p>{'이 내용을 복사해 그대로 Codex에게 보내주세요. 같은 seed로 문제를 재현할 수 있습니다.'}</p>
          <button className="btn ghost" type="button" onClick={copyDiagnostics}>{copied?'복사됨':'진단 내용 복사'}</button>
        </div>
        <pre id="diagnosticOutput">{'{"status":"waiting_for_match"}'}</pre>
      </details>
    </div>
  );
}
