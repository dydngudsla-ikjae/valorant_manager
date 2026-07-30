import { useEffect } from 'react';
import { mvStopRAF } from './mapview.js';

// Thin wrapper: mapview.js drives this DOM imperatively via getElementById
// (mvBuild/mvPlayRound/etc. -- see PLAN.md). This component only owns the
// markup and mount lifecycle; it never re-renders (no store subscription),
// so React never fights the innerHTML/style mutations mapview.js makes inside it.
export function MapView(){
  useEffect(() => () => mvStopRAF(), []);
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
    </div>
  );
}
