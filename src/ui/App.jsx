import { memo, useEffect } from 'react';
import { useStore } from './useStore.js';
import { ST } from '../core/state.js';
import { Header } from './Header.jsx';
import { Toast } from './Toast.jsx';
import { MapView } from './MapView.jsx';
import { Box } from './screens/Box.jsx';
import { Draft } from './screens/Draft.jsx';
import { Hub } from './screens/Hub.jsx';
import { MatchButtons, MatchFeed, MatchHead } from './screens/Match.jsx';
import { Select } from './screens/Select.jsx';
import { Squad } from './screens/Squad.jsx';
import { PlayerDetail } from './screens/PlayerDetail.jsx';
import { Veto } from './screens/Veto.jsx';

// Never re-renders (no props, ever) even though it now lives inside the tree
// App re-renders on every bump(). That's load-bearing: mapview.js pokes
// #mapView's children directly (mvBuild/mvPlayRound), and if this component's
// function body ran again, React would re-apply its literal
// style={{display:'none'}} JSX and stomp the display:'block' match-flow.js
// set imperatively. memo() with zero props bails out unconditionally.
const StableMapView = memo(MapView);

export function App() {
  useStore();
  const screen = ST.screen;

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [screen]);

  return (
    <>
      <Header />
      <section className="screen on">
        <div className="wrap">
          {screen === 'scSelect' && (
            <>
              <div className="eyebrow">2026 Season · Career Mode</div>
              <h1 className="big">Take the <em>chair</em>.</h1>
              <p className="sub">Pick a club from one of the four international leagues. You run the roster and the game plan — the server decides the rest, round by round. Foundation build: static ratings, live match sim, full regular season.</p>
              <Select />
            </>
          )}
          {screen === 'scHub' && <Hub />}
          {screen === 'scSquad' && <Squad />}
          {screen === 'scPlayer' && <PlayerDetail />}
          {screen === 'scVeto' && <Veto />}
          {screen === 'scDraft' && <Draft />}
          {screen === 'scMatch' && (
            <>
              <MatchHead />
              <StableMapView />
              <MatchFeed />
              <Box />
              <MatchButtons />
            </>
          )}
        </div>
      </section>
      <Toast />
    </>
  );
}
