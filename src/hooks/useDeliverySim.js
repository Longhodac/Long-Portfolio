import { useEffect, useRef, useState } from 'react';

// A small simulation of the delivery rules: a sender keeps a batch until the next hop has it, so a crash
// only makes lines wait. Lines in flight towards a crashed stage go back and are resent, which is where
// the design's duplicates come from, and stable IDs mean they don't change the count.
// `down` is the set of crashed stage indexes. Packets are animation state, so they live in a ref.

const SPEED = 1.1;

function step(sim, down, stageCount, dt) {
  if (!down.has(0)) {
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
    for (let stage = next; stage < stageCount; stage++) {
      if (down.has(stage)) {
        const count = blocked[stage] = (blocked[stage] || 0) + 1;
        limit = stage - 0.34 - (count - 1) * 0.045;
        break;
      }
    }
    packet.pos = Math.max(packet.pos, Math.min(limit, packet.pos + SPEED * dt));
    if (packet.pos < limit) packet.pos = Math.min(packet.pos, limit);
  });
  sim.packets = sim.packets.filter(packet => {
    if (packet.pos < stageCount - 1) return true;
    sim.indexed += 1;
    return false;
  });
}

function stageCenters(canvas, tabs, line) {
  const box = canvas.getBoundingClientRect();
  // Stacked stages have different widths, so packets follow the connecting line rather than each stage's centre.
  const stacked = tabs[1].getBoundingClientRect().top > tabs[0].getBoundingClientRect().bottom;
  const lineX = line.getBoundingClientRect().left - box.left + 1;
  return { box, points: tabs.map(tab => {
    const r = tab.getBoundingClientRect();
    return [stacked ? lineX : r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
  }) };
}

function draw(sim, canvas, tabs, line) {
  const { box, points } = stageCenters(canvas, tabs, line);
  // One canvas pixel is one of the page's pixels, so packets stay on the same grid as everything else.
  const px = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--px'), 10) || 4;
  const width = Math.ceil(box.width / px);
  const height = Math.ceil(box.height / px);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const g = canvas.getContext('2d');
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

export function useDeliverySim({ effectsOn, root, canvas, line, tabs }) {
  const sim = useRef({ packets: [], read: 0, indexed: 0, nextId: 0, emit: 0 });
  const [down, setDown] = useState(() => new Set());
  const [counts, setCounts] = useState({ read: 0, indexed: 0 });
  const downNow = useRef(down);
  downNow.current = down;

  useEffect(() => {
    if (!effectsOn) return undefined;
    let raf = 0;
    let last = 0;
    let visible = false;
    const frame = now => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = sim.current;
      step(s, downNow.current, tabs.current.length, dt);
      setCounts(c => (c.read === s.read && c.indexed === s.indexed ? c : { read: s.read, indexed: s.indexed }));
      draw(s, canvas.current, tabs.current, line.current);
    };
    const sync = () => {
      const run = visible && !document.hidden;
      if (run && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    observer.observe(root.current);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      cancelAnimationFrame(raf);
    };
  }, [effectsOn, root, canvas, line, tabs]);

  // Returns true when the stage went down, false when it came back.
  const toggle = stage => {
    const next = new Set(down);
    const crashing = !down.has(stage);
    if (crashing) {
      next.add(stage);
      // The sender never got an ack for these, so they go back one hop and are resent.
      sim.current.packets.forEach(packet => {
        if (packet.pos > stage - 1 && packet.pos < stage + 1 && stage > 0) packet.pos = stage - 1;
      });
    } else {
      next.delete(stage);
    }
    downNow.current = next;
    setDown(next);
    return crashing;
  };

  return { down, counts, toggle };
}
