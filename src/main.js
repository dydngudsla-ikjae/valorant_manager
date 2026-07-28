import './styles/index.css';
import { applyRealStats, buildAgentPools } from './core/roster.js';
import {
  buildSelect,
  go, startNextMatch, vetoSkip, startMapDraft, skipMatch, selectAgent,
  confirmDraft, backToHub, simCurrentMap, setBoxSide,
} from './legacy.js';

// TEMP (Phase 0, still needed after Phase 3a): the script is an ES module, so
// its top-level bindings aren't visible to onclick="" strings baked into
// innerHTML templates (they used to share the classic-script global lexical
// scope). Expose exactly what those inline strings call. Removed in Phase 4
// when handlers move to addEventListener.
Object.assign(window, {
  go, startNextMatch, vetoSkip, startMapDraft, skipMatch, selectAgent,
  confirmDraft, backToHub, simCurrentMap, setBoxSide,
});

applyRealStats();
buildAgentPools();
buildSelect();
