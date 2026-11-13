import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// False in the prerendered HTML and during hydration, so the first client render matches the server's.
// True right after, which is when tabs hide their other panels and the JavaScript-only controls appear.
export function useEnhanced() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
