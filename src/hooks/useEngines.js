import { useCallback, useEffect, useRef, useState } from 'react';
import { saveData } from './useEffectsSetting.js';
import { useEnhanced } from './useEnhanced.js';
import { POKE_LINES } from '../content.js';

// The diagrams, the city, and Capri load after the content, and none of them are needed to read it.
// Each engine is an imperative module with sync() and stop(). These hooks start it once and keep it in step with effects.
// They start after enhancement, once the tabs have hidden their other panels, because the city sizes itself to the page.

function useEngine(load, effectsOn) {
  const enhanced = useEnhanced();
  const engine = useRef(null);
  useEffect(() => {
    if (!enhanced) return undefined;
    let stopped = false;
    load()
      .then(instance => {
        if (!instance) return;
        if (stopped) instance.stop();
        else engine.current = instance;
      })
      .catch(() => {});
    return () => {
      stopped = true;
      engine.current?.stop();
      engine.current = null;
    };
  }, [enhanced]);
  useEffect(() => {
    engine.current?.sync();
  }, [effectsOn]);
}

export function useViz(effectsOn) {
  useEngine(() => import('../engines/viz.js').then(module => module.startViz()), effectsOn);
}

export function useScene(effectsOn) {
  const canvas = useRef(null);
  const [live, setLive] = useState(false);
  useEngine(async () => {
    if (saveData()) return null;
    const module = await import('../engines/scene.js');
    const scene = module.startScene(canvas.current);
    setLive(true);
    return scene;
  }, effectsOn);
  return { canvas, live };
}

const idle = callback => {
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(callback, { timeout: 1200 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 200);
  return () => clearTimeout(id);
};

const scaleFor = () => (innerWidth <= 1000 ? 0.42 : 0.62);

function perchFor(section, wideMedia) {
  const el = section.querySelector('.perch');
  if (!el) return null;
  const { pose, x, y, widePose, wideX, wideY } = el.dataset;
  const wide = widePose && wideMedia.matches;
  return { el, pose: wide ? widePose : pose, x: Number(wide ? wideX : x), y: Number(wide ? wideY : y) };
}

function createBubble() {
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.setAttribute('aria-hidden', 'true');
  bubble.hidden = true;
  const sizer = Object.assign(document.createElement('span'), { className: 'bubble-sizer' });
  const line = Object.assign(document.createElement('span'), { className: 'bubble-line' });
  bubble.append(sizer, line);
  return bubble;
}

// Capri follows the section that's mid-screen. `section` holds that element, kept current by useSectionTracking.
export function useCapri(effectsOn, section) {
  const enhanced = useEnhanced();
  const capri = useRef(null);
  const wideMedia = useRef(null);

  const move = useCallback(() => {
    const instance = capri.current;
    if (!instance || !section.current) return;
    const perch = perchFor(section.current, wideMedia.current);
    if (perch && (!instance.perch || instance.perch.el !== perch.el || instance.perch.pose !== perch.pose)) instance.moveTo(perch);
  }, [section]);

  const say = useCallback(line => { capri.current?.say(line); }, []);

  const follow = useCallback(() => {
    move();
    say(section.current.dataset.line);
  }, [move, say, section]);

  useEffect(() => {
    if (!enhanced || saveData()) return undefined;
    wideMedia.current = matchMedia('(min-width: 1400px)');
    const canvas = document.createElement('canvas');
    canvas.className = 'capri';
    canvas.setAttribute('aria-hidden', 'true');
    const bubble = createBubble();
    let stopped = false;
    let removeResize = () => {};

    const cancelIdle = idle(() => import('../engines/capri.js')
      .then(module => module.start({ canvas, bubble, pokeLines: POKE_LINES }))
      .then(instance => {
        if (stopped) {
          instance.stop();
          return;
        }
        capri.current = instance;
        let scale = scaleFor();
        instance.setScale(scale);
        move();
        instance.sync();
        say(section.current.dataset.line);
        let queued = false;
        const onResize = () => {
          if (queued) return;
          queued = true;
          requestAnimationFrame(() => {
            queued = false;
            if (scale !== scaleFor()) {
              scale = scaleFor();
              instance.setScale(scale);
            }
            move();
            instance.place();
          });
        };
        addEventListener('resize', onResize, { passive: true });
        removeResize = () => removeEventListener('resize', onResize);
      })
      .catch(() => { canvas.remove(); }));

    return () => {
      stopped = true;
      cancelIdle();
      removeResize();
      capri.current?.stop();
      capri.current = null;
      canvas.remove();
      bubble.remove();
    };
  }, [enhanced, move, say, section]);

  useEffect(() => {
    capri.current?.sync();
  }, [effectsOn]);

  return { say, follow };
}
