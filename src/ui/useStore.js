import { useSyncExternalStore } from 'react';
import { subscribe, getVersion } from '../core/state.js';

// Coarse-grained: any bump() (from setMatch(), go(), toast(), or a call site
// in ui/match-flow.js that mutates ST/MATCH directly) re-renders every
// component that calls this.
export function useStore() {
  return useSyncExternalStore(subscribe, getVersion);
}
