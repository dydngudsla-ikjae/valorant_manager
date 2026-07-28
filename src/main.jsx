import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { applyRealStats, buildAgentPools } from './core/roster.js';
import { Box } from './ui/screens/Box.jsx';
import { Draft } from './ui/screens/Draft.jsx';
import { Hub } from './ui/screens/Hub.jsx';
import { MatchButtons, MatchFeed, MatchHead } from './ui/screens/Match.jsx';
import { Select } from './ui/screens/Select.jsx';
import { Squad } from './ui/screens/Squad.jsx';
import { PlayerDetail } from './ui/screens/PlayerDetail.jsx';
import { Veto } from './ui/screens/Veto.jsx';

applyRealStats();
buildAgentPools();

// One persistent React root per migrated screen (see PLAN.md Phase 4). Each
// mounts once here and re-renders itself via useStore()/bump() -- go() no
// longer needs to know these screens exist. As of step 8 every screen's
// onclick="" strings are gone, so legacy.js's action functions no longer need
// the window exposure Phase 0 relied on.
createRoot(document.getElementById('selectRoot')).render(<Select />);
createRoot(document.getElementById('hubRoot')).render(<Hub />);
createRoot(document.getElementById('squadRoot')).render(<Squad />);
createRoot(document.getElementById('playerRoot')).render(<PlayerDetail />);
createRoot(document.getElementById('boxRoot')).render(<Box />);
createRoot(document.getElementById('vetoRoot')).render(<Veto />);
createRoot(document.getElementById('draftRoot')).render(<Draft />);
createRoot(document.getElementById('matchHeadRoot')).render(<MatchHead />);
createRoot(document.getElementById('matchFeedRoot')).render(<MatchFeed />);
createRoot(document.getElementById('matchBtnsRoot')).render(<MatchButtons />);
