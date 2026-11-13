import { useEffect, useRef, useState } from 'react';

// Which section is mid-screen drives the nav, the windows' entrances, and where Capri goes.
export function useSectionTracking(onEnter) {
  const section = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const enter = useRef(onEnter);
  enter.current = onEnter;

  useEffect(() => {
    const sections = [...document.querySelectorAll('[data-perch-section]')];
    section.current = document.querySelector('.hero');
    const inView = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) inView.add(entry.target);
        else inView.delete(entry.target);
      });
      // Sections nest, so the last one in page order is the most specific.
      const current = sections.findLast(s => inView.has(s));
      if (!current || current === section.current) return;
      section.current = current;
      setAnchor(current.id || current.closest('[id]')?.id);
      enter.current(current);
    }, { rootMargin: '-25% 0px -40% 0px' });
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return { section, anchor };
}
