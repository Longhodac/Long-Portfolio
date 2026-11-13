import { useEffect, useState } from 'react';

// Effects start off for reduced motion and data saver, unless the visitor chose otherwise before.
export function initialEffects() {
  let stored = null;
  try { stored = localStorage.getItem('effects'); } catch {}
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (stored || (reducedMotion || saveData() ? 'off' : 'on')) === 'on';
}

export const saveData = () => Boolean(navigator.connection && navigator.connection.saveData);

// The engines read <html data-fx>, so it changes before any of them sync.
export function useEffectsSetting() {
  const [effectsOn, setEffectsOn] = useState(() => (typeof window === 'undefined' ? true : initialEffects()));

  useEffect(() => {
    document.documentElement.dataset.fx = effectsOn ? 'on' : 'off';
  }, [effectsOn]);

  const toggleEffects = () => {
    const next = !effectsOn;
    try { localStorage.setItem('effects', next ? 'on' : 'off'); } catch {}
    setEffectsOn(next);
  };

  return { effectsOn, toggleEffects };
}
