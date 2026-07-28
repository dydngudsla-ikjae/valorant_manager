import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { applyRealStats, buildAgentPools } from './core/roster.js';
import {
  buildSelect,
  go, startNextMatch, vetoSkip, startMapDraft, skipMatch, selectAgent,
  confirmDraft, backToHub, simCurrentMap, setBoxSide,
} from './legacy.js';
import { Hub } from './ui/screens/Hub.jsx';
import { Squad } from './ui/screens/Squad.jsx';
import { PlayerDetail } from './ui/screens/PlayerDetail.jsx';

// TEMP (Phase 0, still needed until Phase 4 step 10): the script is an ES
// module, so its top-level bindings aren't visible to onclick="" strings
// baked into innerHTML templates (they used to share the classic-script
// global lexical scope). Expose exactly what those inline strings call.
// Removed once every screen has moved off legacy.js's innerHTML rendering.
Object.assign(window, {
  go, startNextMatch, vetoSkip, startMapDraft, skipMatch, selectAgent,
  confirmDraft, backToHub, simCurrentMap, setBoxSide,
});

applyRealStats();
buildAgentPools();
buildSelect();

// One persistent React root per migrated screen (see PLAN.md Phase 4). Each
// mounts once here and re-renders itself via useStore()/bump() -- go() no
// longer needs to know these screens exist.
createRoot(document.getElementById('hubRoot')).render(<Hub />);
createRoot(document.getElementById('squadRoot')).render(<Squad />);
createRoot(document.getElementById('playerRoot')).render(<PlayerDetail />);
