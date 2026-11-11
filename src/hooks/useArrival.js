import { createContext, useContext, useEffect, useRef, useState } from 'react';

// Windows and section titles wait out of sight, then play their entrance once when they scroll into view.
function createArrivals() {
  const waiting = new Map();
  let observer = null;
  const arrive = el => {
    const done = waiting.get(el);
    if (!done) return;
    waiting.delete(el);
    observer.unobserve(el);
    done();
  };
  return {
    watch(el, onArrive) {
      observer ??= new IntersectionObserver(entries => {
        entries.forEach(entry => { if (entry.isIntersecting) arrive(entry.target); });
      }, { rootMargin: '0px 0px -12% 0px' });
      waiting.set(el, onArrive);
      observer.observe(el);
      return () => {
        waiting.delete(el);
        observer?.unobserve(el);
      };
    },
    arriveWithin(section) {
      [...waiting.keys()].filter(el => section.contains(el)).forEach(arrive);
    },
    disconnect() {
      observer?.disconnect();
      observer = null;
    }
  };
}

export const ArrivalContext = createContext(null);

export function useArrivals() {
  const arrivals = useRef(null);
  arrivals.current ??= createArrivals();
  useEffect(() => () => arrivals.current.disconnect(), []);
  return arrivals.current;
}

// Returns a ref and the element's entrance class: none in the prerendered page, then is-waiting, then has-arrived.
export function useArrival() {
  const arrivals = useContext(ArrivalContext);
  const ref = useRef(null);
  const [state, setState] = useState('');
  useEffect(() => {
    setState('is-waiting');
    return arrivals.watch(ref.current, () => setState('has-arrived'));
  }, [arrivals]);
  return [ref, state];
}
