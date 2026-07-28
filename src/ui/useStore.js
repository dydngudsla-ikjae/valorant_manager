import { useSyncExternalStore } from 'react';
import { subscribe, getVersion } from '../core/state.js';

// Coarse-grained: any bump() (from setMatch() or a call site that mutates
// ST/MATCH and calls bump() directly) re-renders every component that calls
// this. Nothing calls bump() outside setMatch() yet -- screens migrated in
// later Phase 4 steps add bump() at their own mutation points as they move
// off legacy.js's manual render-then-go() calls.
export function useStore() {
  return useSyncExternalStore(subscribe, getVersion);
}
