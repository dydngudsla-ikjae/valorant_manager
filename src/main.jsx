import './styles/index.css';
import { applyRealStats, buildAgentPools } from './core/roster.js';
import {
  buildSelect,
  go, startNextMatch, vetoSkip, startMapDraft, skipMatch, selectAgent,
  confirmDraft, backToHub, simCurrentMap, setBoxSide,
} from './legacy.js';

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
