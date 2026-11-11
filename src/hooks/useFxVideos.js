import { useEffect, useRef } from 'react';

// Chrome drops the whole page to about 16 fps while two videos play, so only the largest one on screen runs.
export function useFxVideos(effectsOn) {
  const sync = useRef(() => {});

  useEffect(() => {
    const videos = [...document.querySelectorAll('[data-fx-video]')];
    const area = new Map();
    let on = effectsOn;
    sync.current = nextOn => {
      on = nextOn;
      let largest = null;
      let largestArea = 0;
      area.forEach((a, video) => {
        if (a > largestArea) {
          largest = video;
          largestArea = a;
        }
      });
      videos.forEach(video => {
        if (on && video === largest) video.play().catch(() => {});
        else video.pause();
      });
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const { width, height } = entry.intersectionRect;
        area.set(entry.target, entry.isIntersecting ? width * height : 0);
      });
      sync.current(on);
    }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
    videos.forEach(video => observer.observe(video));
    return () => {
      observer.disconnect();
      sync.current = () => {};
    };
  }, []);

  useEffect(() => {
    sync.current(effectsOn);
  }, [effectsOn]);
}
