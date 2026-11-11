import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useEnhanced } from './useEnhanced.js';

const KEYS = {
  ArrowRight: i => i + 1,
  ArrowDown: i => i + 1,
  ArrowLeft: i => i - 1,
  ArrowUp: i => i - 1,
  Home: () => 0,
  End: (i, count) => count - 1
};

// The WAI-ARIA tabs pattern. Before enhancement every panel shows, so the prerendered page reads without JavaScript.
export function useTabs(count, onSelect) {
  const enhanced = useEnhanced();
  const [selected, setSelected] = useState(0);
  const tabs = useRef([]);

  // The new panel is on screen before onSelect runs, since the quest board measures itself there.
  const select = index => {
    flushSync(() => setSelected(index));
    if (onSelect) onSelect(index);
  };

  const tabProps = index => ({
    ref: el => { tabs.current[index] = el; },
    type: 'button',
    role: 'tab',
    'aria-selected': String(index === selected),
    tabIndex: index === selected ? 0 : -1,
    onClick: () => select(index),
    onKeyDown: event => {
      const target = KEYS[event.key];
      if (!target) return;
      event.preventDefault();
      const next = (target(index, count) + count) % count;
      select(next);
      tabs.current[next].focus();
    }
  });

  const panelHidden = index => enhanced && index !== selected;

  return { enhanced, selected, select, tabProps, panelHidden, tabs };
}
