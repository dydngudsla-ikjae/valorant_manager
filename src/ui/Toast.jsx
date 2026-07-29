import { useEffect, useRef, useState } from 'react';
import { useStore } from './useStore.js';
import { toastState } from '../core/state.js';

// The .toast div is always mounted (its CSS slides in/out via translateY, not
// display), so this mirrors that: local visible/msg state plus a timer,
// keyed off toastState.id so a repeat toast() call while one is showing
// restarts the clock instead of being ignored.
export function Toast() {
  useStore();
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const seenId = useRef(null);

  useEffect(() => {
    if (!toastState || toastState.id === seenId.current) return;
    seenId.current = toastState.id;
    setMsg(toastState.msg);
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  });

  return <div className={'toast' + (visible ? ' on' : '')}>{msg}</div>;
}
