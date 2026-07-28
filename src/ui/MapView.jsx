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
      <div className="bcast">
        <div className="bcrest" id="bcH">H</div>
        <div className="bcards" id="cardsHome"></div>
        <div className="bcenter">
          <div className="bscore"><span id="bScoreH">0</span><span className="bcolon">:</span><span id="bScoreA">0</span></div>
          <div className="btimer" id="rTimer">1:40</div>
          <div className="bround" id="bRound">Round 1</div>
          <div className="bspike" id="bSpike"></div>
        </div>
        <div className="bcards" id="cardsAway"></div>
        <div className="bcrest" id="bcA">A</div>
      </div>
      <div className="mvbanner" id="mvBanner"></div>
      <div className="fieldwrap">
        <div className="mvfield" id="mvField"></div>
        <div className="killfeed" id="killFeed"></div>
      </div>
      <div className="mvphase" id="mvPhase"></div>
      <div className="mvlegend" id="mvLegend"></div>
      <div className="mvalive" id="mvAlive" style={{display:'none'}}></div>
    </div>
  );
}
