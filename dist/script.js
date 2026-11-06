'use strict';

// All content works without JavaScript. This adds the tabs, crash demo, copy button, effects toggle, city, and Capri.
const root = document.documentElement;
let capri = null;
let scene = null;
let viz = null;

function storedEffects() {
  try { return localStorage.getItem('effects'); } catch { return null; }
}

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = Boolean(navigator.connection && navigator.connection.saveData);
let effectsOn = (storedEffects() || (reducedMotion || saveData ? 'off' : 'on')) === 'on';
root.dataset.fx = effectsOn ? 'on' : 'off';

// Tabs ------------------------------------------------------------------------------------------
const tabKeys = {
  ArrowRight: i => i + 1,
  ArrowDown: i => i + 1,
  ArrowLeft: i => i - 1,
  ArrowUp: i => i - 1,
  Home: () => 0,
  End: (i, count) => count - 1
};

function tabGroup(group, onShow) {
  const tabs = [...group.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  const show = index => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (onShow) onShow(index, tabs);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => show(i));
    tab.addEventListener('keydown', event => {
      const target = tabKeys[event.key];
      if (!target) return;
      event.preventDefault();
      const next = (target(i, tabs.length) + tabs.length) % tabs.length;
      show(next);
      tabs[next].focus();
    });
  });
  group.classList.add('is-enhanced');
  show(0);
  return tabs;
}

const timelineRows = [...document.querySelectorAll('.timeline i')];
tabGroup(document.querySelector('.quest'), index => {
  timelineRows.forEach((row, i) => row.classList.toggle('is-current', i === index));
});

// A small simulation of the delivery rules: a sender keeps a batch until the next hop has it, so a crash
// only makes lines wait. Lines in flight towards a crashed stage go back and are resent, which is where
// the design's duplicates come from, and stable IDs mean they don't change the count.
const pipeline = document.querySelector('.pipeline');
const crashButton = pipeline.querySelector('.crash');
const crashName = pipeline.querySelector('.crash-name');
const onCall = pipeline.querySelector('.crt');
const sim = {
  canvas: pipeline.querySelector('.stages-canvas'),
  panel: pipeline.querySelector('.sim'),
  line: pipeline.querySelector('.edge'),
  status: pipeline.querySelector('.sim-status'),
  counts: Object.fromEntries([...pipeline.querySelectorAll('[data-count]')].map(el => [el.dataset.count, el])),
  down: new Set(),
  packets: [],
  read: 0,
  indexed: 0,
  nextId: 0,
  emit: 0,
  raf: 0,
  last: 0,
  visible: false
};
let selected = 0;

function syncCrashButton() {
  const down = sim.down.has(selected);
  crashButton.classList.toggle('is-down', down);
  crashButton.firstChild.textContent = down ? 'Restart ' : 'Crash ';
  onCall.classList.toggle('is-paged', sim.down.size > 0);
}

const tabs = tabGroup(pipeline, (index, all) => {
  selected = index;
  crashName.textContent = all[index].textContent;
  syncCrashButton();
});

function stageCenters() {
  const box = sim.canvas.getBoundingClientRect();
  // Stacked stages have different widths, so packets follow the connecting line rather than each stage's centre.
  const stacked = tabs[1].getBoundingClientRect().top > tabs[0].getBoundingClientRect().bottom;
  const lineX = sim.line.getBoundingClientRect().left - box.left + 1;
  return { box, points: tabs.map(tab => {
    const r = tab.getBoundingClientRect();
    return [stacked ? lineX : r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
  }) };
}

function stepSim(dt) {
  const speed = 1.1;
  if (!sim.down.has(0)) {
    sim.emit += dt * 3.4;
    while (sim.emit >= 1 && sim.packets.length < 60) {
      sim.emit -= 1;
      sim.read += 1;
      sim.packets.push({ pos: 0, id: sim.nextId++ });
    }
    sim.emit = Math.min(sim.emit, 1);
  }
  const blocked = {};
  [...sim.packets].sort((a, b) => b.pos - a.pos).forEach(packet => {
    const next = Math.floor(packet.pos + 1e-6) + 1;
    let limit = Infinity;
    for (let stage = next; stage < tabs.length; stage++) {
      if (sim.down.has(stage)) {
        const count = blocked[stage] = (blocked[stage] || 0) + 1;
        limit = stage - 0.34 - (count - 1) * 0.045;
        break;
      }
    }
    packet.pos = Math.max(packet.pos, Math.min(limit, packet.pos + speed * dt));
    if (packet.pos < limit) packet.pos = Math.min(packet.pos, limit);
  });
  sim.packets = sim.packets.filter(packet => {
    if (packet.pos < tabs.length - 1) return true;
    sim.indexed += 1;
    return false;
  });
  sim.counts.read.textContent = sim.read;
  sim.counts.indexed.textContent = sim.indexed;
  sim.counts.waiting.textContent = sim.read - sim.indexed;
}

function drawSim() {
  const { box, points } = stageCenters();
  // One canvas pixel is one of the page's pixels, so packets stay on the same grid as everything else.
  const px = parseInt(getComputedStyle(root).getPropertyValue('--px'), 10) || 4;
  const width = Math.ceil(box.width / px);
  const height = Math.ceil(box.height / px);
  if (sim.canvas.width !== width || sim.canvas.height !== height) {
    sim.canvas.width = width;
    sim.canvas.height = height;
  }
  const g = sim.canvas.getContext('2d');
  g.clearRect(0, 0, width, height);
  for (const packet of sim.packets) {
    const index = Math.min(Math.floor(packet.pos), points.length - 2);
    const t = packet.pos - index;
    const x = Math.round((points[index][0] + (points[index + 1][0] - points[index][0]) * t) / px);
    const y = Math.round((points[index][1] + (points[index + 1][1] - points[index][1]) * t) / px);
    g.fillStyle = '#8a3dff';
    g.fillRect(x - 1, y, 2, 2);
    g.fillStyle = '#22f27a';
    g.fillRect(x, y - 1, 2, 2);
  }
}

function simFrame(now) {
  sim.raf = requestAnimationFrame(simFrame);
  const dt = Math.min(0.05, (now - sim.last) / 1000);
  sim.last = now;
  stepSim(dt);
  drawSim();
}

function syncSim() {
  const run = effectsOn && sim.visible && !document.hidden;
  if (run && !sim.raf) {
    sim.last = performance.now();
    sim.raf = requestAnimationFrame(simFrame);
  } else if (!run && sim.raf) {
    cancelAnimationFrame(sim.raf);
    sim.raf = 0;
  }
  sim.panel.hidden = !effectsOn;
  sim.canvas.hidden = !effectsOn;
}

crashButton.addEventListener('click', () => {
  if (sim.down.has(selected)) {
    sim.down.delete(selected);
    tabs[selected].classList.remove('is-down');
    sim.status.textContent = `${tabs[selected].textContent} restarted. Waiting lines move again.`;
  } else {
    sim.down.add(selected);
    tabs[selected].classList.add('is-down');
    // The sender never got an ack for these, so they go back one hop and are resent.
    sim.packets.forEach(packet => {
      if (packet.pos > selected - 1 && packet.pos < selected + 1 && selected > 0) packet.pos = selected - 1;
    });
    sim.status.textContent = `${tabs[selected].textContent} is down. Lines wait and none are lost.`;
    say('Nothing lost. Told you.');
  }
  syncCrashButton();
});

new IntersectionObserver(([entry]) => {
  sim.visible = entry.isIntersecting;
  syncSim();
}).observe(pipeline);
document.addEventListener('visibilitychange', syncSim);

// Copy email ------------------------------------------------------------------------------------
const copyButton = document.querySelector('.copy');
const copyStatus = document.querySelector('.copy-status');
if (navigator.clipboard && window.isSecureContext) {
  copyButton.hidden = false;
  let clearStatus;
  copyButton.addEventListener('click', async () => {
    clearTimeout(clearStatus);
    try {
      await navigator.clipboard.writeText('lhodac@ucsd.edu');
      copyStatus.textContent = 'Copied';
      say('Good. Use it.');
    } catch {
      copyStatus.textContent = 'Couldn’t copy';
    }
    clearStatus = setTimeout(() => { copyStatus.textContent = ''; }, 3000);
  });
}

const say = line => { if (capri) capri.say(line); };

// Effects ---------------------------------------------------------------------------------------
const fxToggle = document.querySelector('.fx-toggle');
const videos = [...document.querySelectorAll('[data-fx-video]')];
const videoArea = new Map();

// Chrome drops the whole page to about 16 fps while two videos play, so only the largest one on screen runs.
function syncVideos() {
  let largest = null;
  let largestArea = 0;
  videoArea.forEach((area, video) => {
    if (area > largestArea) {
      largest = video;
      largestArea = area;
    }
  });
  videos.forEach(video => {
    if (effectsOn && video === largest) video.play().catch(() => {});
    else video.pause();
  });
}

const videoObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    const { width, height } = entry.intersectionRect;
    videoArea.set(entry.target, entry.isIntersecting ? width * height : 0);
  });
  syncVideos();
}, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1] });
videos.forEach(video => videoObserver.observe(video));

function applyEffects() {
  root.dataset.fx = effectsOn ? 'on' : 'off';
  fxToggle.setAttribute('aria-pressed', String(effectsOn));
  fxToggle.querySelector('.fx-state').textContent = effectsOn ? 'ON' : 'OFF';
  syncVideos();
  syncSim();
  if (scene) scene.sync();
  if (viz) viz.sync();
  if (capri) capri.sync();
}

fxToggle.hidden = false;
fxToggle.addEventListener('click', () => {
  effectsOn = !effectsOn;
  try { localStorage.setItem('effects', effectsOn ? 'on' : 'off'); } catch {}
  applyEffects();
});
applyEffects();

// Progress bar, for browsers without scroll-driven animations -------------------------------------
if (!CSS.supports('animation-timeline: scroll()')) {
  let queued = false;
  const update = () => {
    queued = false;
    const range = root.scrollHeight - innerHeight;
    root.style.setProperty('--progress', range > 0 ? Math.min(1, scrollY / range) : 0);
  };
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

// Which section is mid-screen drives the nav and where Capri goes.
const navLinks = [...document.querySelectorAll('.nav nav a')];
const wideMedia = matchMedia('(min-width: 1400px)');
let activeSection = document.querySelector('.hero');

function perchFor(section) {
  const el = section.querySelector('.perch');
  if (!el) return null;
  const { pose, x, y, widePose, wideX, wideY } = el.dataset;
  const wide = widePose && wideMedia.matches;
  return { el, pose: wide ? widePose : pose, x: Number(wide ? wideX : x), y: Number(wide ? wideY : y) };
}

function moveCapri(section) {
  if (!capri) return;
  const perch = perchFor(section);
  if (perch && (!capri.perch || capri.perch.el !== perch.el || capri.perch.pose !== perch.pose)) capri.moveTo(perch);
}

const sections = [...document.querySelectorAll('[data-perch-section]')];
const sectionsInView = new Set();
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) sectionsInView.add(entry.target);
    else sectionsInView.delete(entry.target);
  });
  // Sections nest, so the last one in page order is the most specific.
  const current = sections.findLast(section => sectionsInView.has(section));
  if (!current || current === activeSection) return;
  activeSection = current;
  const anchor = activeSection.id || activeSection.closest('[id]')?.id;
  navLinks.forEach(link => {
    if (link.hash === `#${anchor}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  moveCapri(activeSection);
  say(activeSection.dataset.line);
}, { rootMargin: '-25% 0px -40% 0px' });
sections.forEach(section => sectionObserver.observe(section));

// Diagrams, the city, and Capri load after the content, and none of them are needed to read it. ------
import('/viz.js')
  .then(module => { viz = module.startViz(); })
  .catch(() => {});

if (!saveData) {
  const sceneCanvas = document.getElementById('scene');
  import('/scene.js')
    .then(module => {
      scene = module.startScene(sceneCanvas);
      sceneCanvas.classList.add('is-live');
    })
    .catch(() => {});

  const capriCanvas = document.createElement('canvas');
  capriCanvas.className = 'capri';
  capriCanvas.setAttribute('aria-hidden', 'true');
  const scaleFor = () => (innerWidth <= 1000 ? 0.42 : 0.62);
  const loadCapri = () => import('/capri.js')
    .then(module => module.start({
      canvas: capriCanvas,
      bubble: document.querySelector('.bubble'),
      pokeLines: ['Hey. Hands off.', 'Careful, choom.', 'Do that again. See what happens.', 'Yes, I’m real enough.', 'Read the page, not me.']
    }))
    .then(instance => {
      capri = instance;
      let scale = scaleFor();
      capri.setScale(scale);
      moveCapri(activeSection);
      capri.sync();
      say(activeSection.dataset.line);
      let resizeQueued = false;
      addEventListener('resize', () => {
        if (resizeQueued) return;
        resizeQueued = true;
        requestAnimationFrame(() => {
          resizeQueued = false;
          if (scale !== scaleFor()) {
            scale = scaleFor();
            capri.setScale(scale);
          }
          moveCapri(activeSection);
          capri.place();
        });
      }, { passive: true });
    })
    .catch(() => { capriCanvas.remove(); });
  if ('requestIdleCallback' in window) requestIdleCallback(loadCapri, { timeout: 1200 });
  else setTimeout(loadCapri, 200);
}
