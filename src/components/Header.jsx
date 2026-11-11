import { useEffect } from 'react';
import { useEnhanced } from '../hooks/useEnhanced.js';

const LINKS = [['#work', 'Work'], ['#projects', 'Projects'], ['#about', 'About'], ['#contact', 'Contact']];

// `anchor` is the id of the section mid-screen, which the nav marks as the current location.
export function Header({ anchor, effectsOn, onToggleEffects }) {
  const enhanced = useEnhanced();
  useProgressFallback();
  const pressed = enhanced ? effectsOn : true;
  return (
    <header className="nav">
      <a className="nav-name" href="#main">Long HoDac</a>
      <nav aria-label="Main">
        {LINKS.map(([href, label]) => <a key={href} href={href} aria-current={href === `#${anchor}` ? 'location' : undefined}>{label}</a>)}
      </nav>
      <button className="fx-toggle" type="button" aria-pressed={String(pressed)} hidden={!enhanced} onClick={onToggleEffects}><span aria-hidden="true">FX: </span><span className="sr-only">Effects</span><span className="fx-state" aria-hidden="true">{pressed ? 'ON' : 'OFF'}</span></button>
      <span className="nav-progress" aria-hidden="true"></span>
    </header>
  );
}

// The progress bar runs on scroll-driven animations. Browsers without them get --progress from here.
function useProgressFallback() {
  useEffect(() => {
    if (CSS.supports('animation-timeline: scroll()')) return undefined;
    const root = document.documentElement;
    let queued = false;
    const update = () => {
      queued = false;
      const range = root.scrollHeight - innerHeight;
      root.style.setProperty('--progress', range > 0 ? Math.min(1, scrollY / range) : 0);
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => removeEventListener('scroll', onScroll);
  }, []);
}
