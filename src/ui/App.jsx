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
import { TeamSelect } from './screens/TeamSelect.jsx';
import { Squad } from './screens/Squad.jsx';
import { PlayerDetail } from './screens/PlayerDetail.jsx';
import { Veto } from './screens/Veto.jsx';
import { CompetitionStats } from './screens/CompetitionStats.jsx';
import { tr } from '../i18n.js';

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
  useEffect(() => { document.documentElement.lang = ST.language; }, []);

  return (
    <>
      <Header />
      <section className="screen on">
        <div className="wrap">
          {screen === 'scSelect' && (
            <>
              <div className="eyebrow">{tr('2026 시즌 · 커리어 모드', '2026 Season · Career Mode')}</div>
              <h1 className="big">{tr('감독으로 ', 'Take the ')}<em>{tr('시작하세요', 'chair')}</em>.</h1>
              <p className="sub introcopy">
                {tr('4개 국제 리그 중 한 팀을 선택하세요.', 'Pick a club from one of the four international leagues.')}<br />
                {tr('선수단과 경기 전략을 운영하면 서버가 매 라운드의 결과를 시뮬레이션합니다.', 'You run the roster and the game plan — the server decides the rest, round by round.')}
              </p>
              <TeamSelect />
            </>
          )}
          {screen === 'scHub' && <Hub />}
          {screen === 'scTeamPreview' && <Squad preview />}
          {screen === 'scSquad' && <Squad />}
          {screen === 'scPlayer' && <PlayerDetail />}
          {screen === 'scStats' && <CompetitionStats />}
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
