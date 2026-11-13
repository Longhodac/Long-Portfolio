import { useRef } from 'react';
import { ArrivalContext, useArrivals } from './hooks/useArrival.js';
import { useEffectsSetting } from './hooks/useEffectsSetting.js';
import { useFxVideos } from './hooks/useFxVideos.js';
import { useCapri, useScene, useViz } from './hooks/useEngines.js';
import { useSectionTracking } from './hooks/useSectionTracking.js';
import { Header } from './components/Header.jsx';
import { Hero } from './components/Hero.jsx';
import { Work } from './components/Work.jsx';
import { Projects } from './components/Projects.jsx';
import { About } from './components/About.jsx';
import { Contact } from './components/Contact.jsx';
import { FxVideo, Hang } from './components/parts.jsx';
import { cx } from './components/cx.js';

// All content renders without JavaScript (the build prerenders it). Hydration adds the tabs, crash demo,
// copy button, effects toggle, entrances, section tracking, and the city, diagrams, and Capri.
export default function App() {
  const { effectsOn, toggleEffects } = useEffectsSetting();
  const arrivals = useArrivals();
  const follow = useRef(() => {});
  const { section, anchor } = useSectionTracking(current => {
    // Capri never lands on a window that hasn't appeared yet.
    arrivals.arriveWithin(current);
    follow.current();
  });
  // The diagrams load first, as they show their figures and so set the page height the city is sized to.
  useViz(effectsOn);
  const scene = useScene(effectsOn);
  const capri = useCapri(effectsOn, section);
  follow.current = capri.follow;
  useFxVideos(effectsOn);

  return (
    <ArrivalContext.Provider value={arrivals}>
      <a className="skip-link" href="#main">Skip to content</a>

      <canvas ref={scene.canvas} className={cx('scene', scene.live && 'is-live')} id="scene" aria-hidden="true"></canvas>
      <div className="scanlines" aria-hidden="true"></div>

      <Header anchor={anchor} effectsOn={effectsOn} onToggleEffects={toggleEffects} />

      <main id="main" tabIndex={-1}>
        <Hero />

        <Hang slot="hero"><FxVideo poster="/assets/art/roman.jpg" src="/assets/art/roman.mp4" width="840" height="494" /></Hang>

        <Work />

        <Hang slot="work"><img src="/assets/art/crack.jpg" alt="" width="840" height="472" loading="lazy" decoding="async" /></Hang>

        <Projects effectsOn={effectsOn} say={capri.say} />

        <Hang slot="about"><FxVideo poster="/assets/art/duel.jpg" src="/assets/art/duel.mp4" width="840" height="474" /></Hang>

        <About />

        <Hang slot="sky"><FxVideo poster="/assets/art/embers.jpg" src="/assets/art/embers.mp4" width="840" height="472" /></Hang>

        <Contact say={capri.say} />
      </main>
    </ArrivalContext.Provider>
  );
}
