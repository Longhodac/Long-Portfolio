// The pixel city behind the page. Everything is drawn once as palette tones, then recoloured as you scroll:
// rust dusk at the top of the page, neon magenta further down, deep blue night at the bottom.
// Scrolling sinks the camera into the city, with nearer towers rising faster.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const BUCKETS = 40;
const NIGHT_FROM = 0.46;

const rgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const STOPS = [
  { at: 0, sky: ['#3a1810', '#5e2412', '#8c3a1e', '#c4541f', '#ff8a2e'], star: '#3a1810', far: '#8c3a1e', mid: '#5a2414', near: '#23111c', litA: '#ffe94a', litB: '#ffb347', neonA: '#45d4ff', neonB: '#f2154c', sunA: '#ffc14a', sunB: '#f2641e', rain: '#ffc14a' },
  { at: 0.2, sky: ['#1c0f3d', '#3a1560', '#7a1f74', '#d6336c', '#ff7a59'], star: '#8c6fb0', far: '#6a1f6e', mid: '#3a1456', near: '#170c30', litA: '#ffe94a', litB: '#45d4ff', neonA: '#f2154c', neonB: '#22f27a', sunA: '#ffb347', sunB: '#f2154c', rain: '#c77fd6' },
  { at: NIGHT_FROM, sky: ['#070a1c', '#0a0f24', '#10163a', '#161f50', '#22306e'], star: '#eef2ff', far: '#1b2555', mid: '#11183a', near: '#0a0f24', litA: '#45d4ff', litB: '#ffe94a', neonA: '#8a3dff', neonB: '#22f27a', sunA: '#22306e', sunB: '#161f50', rain: '#45d4ff' }
].map(stop => Object.fromEntries(Object.entries(stop).map(([key, value]) => [
  key, key === 'at' ? value : Array.isArray(value) ? value.map(rgb) : rgb(value)
])));

// Tones in a layer buffer.
const CLEAR = 0; const BODY = 1; const SIDE = 2; const DIM = 3; const LIT_A = 4; const LIT_B = 5; const NEON_A = 6; const NEON_B = 7; const BEACON = 8;

const GLYPHS = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  G: '011100101101011', H: '101101111101101', L: '100100100100111', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', R: '110101110101101', T: '111010010010010', 2: '110001010100111', 4: '101101111001001'
};
const SIGNS = ['BAR', 'LONG', '24H', 'NOODLE', 'NEON', 'ARCADE', 'OPEN', 'TOP', 'HOTEL'];

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const pack = ([r, g, b]) => ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
const css = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

function prng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paletteAt(t) {
  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1].at) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const u = Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at)));
  const out = {};
  for (const key of Object.keys(a)) {
    if (key === 'at') continue;
    out[key] = Array.isArray(a[key][0]) ? a[key].map((c, n) => mix(c, b[key][n], u)) : mix(a[key], b[key], u);
  }
  return out;
}

function buildLayer({ seed, w, h, rise, minWidth, maxWidth, lit, big, signs, depth }) {
  const r = prng(seed);
  const tones = new Uint8Array(w * h);
  const set = (x, y, tone) => { if (x >= 0 && y >= 0 && x < w && y < h) tones[y * w + x] = tone; };
  const windows = [];
  const flickers = [];
  const beacons = [];
  let signCount = 0;

  let x = -Math.floor(r() * maxWidth);
  while (x < w) {
    const width = minWidth + Math.floor(r() * (maxWidth - minWidth));
    const top = Math.floor(r() ** 1.3 * rise);
    const setback = r() < 0.45 ? 2 + Math.floor(r() * Math.max(2, width / 5)) : 0;
    const crown = setback ? 3 + Math.floor(r() * 7) : 0;
    const shade = Math.max(1, Math.floor(width / 7));

    for (let px = x; px < x + width; px++) {
      const inner = px >= x + setback && px < x + width - setback;
      const start = inner ? top : top + crown;
      for (let py = start; py < h; py++) set(px, py, px >= x + width - shade ? SIDE : BODY);
    }

    const pattern = Math.floor(r() * 3);
    const cellX = big ? 3 + Math.floor(r() * 2) : 2 + Math.floor(r() * 2);
    const cellY = big ? 4 : 3;
    const litBias = lit * (0.6 + r() * 0.8);
    for (let py = top + crown + 3; py < h - 1; py += cellY) {
      const band = pattern === 1 && r() < 0.35;
      for (let px = x + 2 + setback; px < x + width - shade - 1 - setback; px += cellX) {
        const on = band || r() < litBias;
        const tone = on ? (r() < 0.72 ? LIT_A : LIT_B) : DIM;
        const winW = pattern === 2 ? cellX : big ? 2 : 1;
        const winH = big ? 2 : 1;
        for (let wy = 0; wy < winH; wy++) {
          for (let wx = 0; wx < winW; wx++) set(px + wx, py + wy, tone);
        }
        if (r() < 0.12) windows.push({ x: px, y: py, w: winW, h: winH, on });
      }
    }

    if (r() < 0.55) {
      const ax = x + Math.floor(width / 2) + Math.floor(r() * 5) - 2;
      const height = 4 + Math.floor(r() * (depth * 9 + 3));
      for (let py = top - height; py < top; py++) set(ax, py, BODY);
      set(ax, top - height, BEACON);
      beacons.push({ x: ax, y: top - height, phase: Math.floor(r() * 12) });
    }
    if (width > 14 && r() < 0.4) {
      const bx = x + 2 + setback;
      const boxW = 4 + Math.floor(r() * 5);
      for (let px = bx; px < bx + boxW; px++) {
        for (let py = top - 3; py < top; py++) set(px, py, BODY);
      }
    }

    if (signs && width > 12 && r() < 0.55) {
      const word = SIGNS[signCount++ % SIGNS.length];
      const tone = r() < 0.5 ? NEON_A : NEON_B;
      const sx = r() < 0.5 ? x + 1 : x + width - shade - 5;
      let sy = top + crown + 6 + Math.floor(r() * 20);
      const pixels = [];
      for (const ch of word) {
        const glyph = GLYPHS[ch];
        for (let gy = 0; gy < 5; gy++) {
          for (let gx = 0; gx < 3; gx++) {
            if (glyph[gy * 3 + gx] === '1') {
              set(sx + gx, sy + gy, tone);
              pixels.push([sx + gx, sy + gy]);
            } else {
              set(sx + gx, sy + gy, SIDE);
            }
          }
        }
        sy += 6;
      }
      flickers.push({ pixels, tone, off: false, next: r() * 8 });
    }

    x += width + (r() < 0.25 ? 1 + Math.floor(r() * 3) : 0);
  }
  return { tones, w, h, windows, flickers, beacons };
}

function paintTones(canvas, tones, w, h, lut) {
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(w, h);
  const out = new Uint32Array(image.data.buffer);
  for (let i = 0, n = w * h; i < n; i++) out[i] = lut[tones[i]];
  ctx.putImageData(image, 0, 0);
}

export function startScene(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const root = document.documentElement;
  let S = 4;
  let W = 0;
  let H = 0;
  let maxScroll = 1;
  let skyTones = new Uint8Array(1);
  let sky = null;
  let sun = null;
  let sunR = 0;
  let layers = [];
  let cars = [];
  let drops = [];
  let meteor = null;
  let bucket = -1;
  let palette = paletteAt(0);
  let raf = 0;
  let drawnY = -1;
  let lastBeat = 0;
  let beat = 0;
  const motion = () => root.dataset.fx !== 'off';
  const newCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

  function build() {
    const vw = root.clientWidth || innerWidth;
    const vh = innerHeight;
    S = vw <= 600 ? 2 : vw <= 1000 ? 3 : vw <= 2200 ? 4 : 6;
    W = Math.ceil(vw / S);
    H = Math.ceil(vh / S);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * S}px`;
    canvas.style.height = `${H * S}px`;
    ctx.imageSmoothingEnabled = false;
    maxScroll = Math.max(1, root.scrollHeight - vh);

    const r = prng(9);
    skyTones = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const v = Math.min(3.999, (y / (H * 0.74)) * 4);
      const band = Math.floor(v);
      const frac = (v - band) * 16;
      for (let x = 0; x < W; x++) {
        skyTones[y * W + x] = band + (frac > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0);
        if (y < H * 0.55 && r() < 0.003) skyTones[y * W + x] = 5;
      }
    }
    sky = newCanvas(W, H);

    sunR = Math.round(Math.min(H * 0.26, W * 0.2));
    sun = newCanvas(sunR * 2 + 1, sunR * 2 + 1);

    const span = rate => Math.ceil((maxScroll * rate) / S) + 4;
    layers = [
      { name: 'far', rate: 0.05, top: Math.round(H * 0.42), rise: Math.round(H * 0.2), minWidth: 9, maxWidth: 26, lit: 0.05, big: false, signs: false, depth: 0.2, seed: 31 },
      { name: 'mid', rate: 0.09, top: Math.round(H * 0.55), rise: Math.round(H * 0.2), minWidth: 12, maxWidth: 34, lit: 0.16, big: false, signs: false, depth: 0.5, seed: 57 },
      { name: 'near', rate: 0.16, top: Math.round(H * 0.72), rise: Math.round(H * 0.2), minWidth: 18, maxWidth: 52, lit: 0.17, big: true, signs: true, depth: 1, seed: 83 }
    ].map(spec => {
      const h = H - spec.top + span(spec.rate) + 2;
      const built = buildLayer({ ...spec, w: W, h });
      return { ...spec, ...built, h, canvas: newCanvas(W, h) };
    });

    const c = prng(21);
    cars = Array.from({ length: Math.round(W / 26) }, () => ({
      x: c() * W,
      y: Math.round(H * (0.2 + c() * 0.5)),
      v: (c() < 0.5 ? -1 : 1) * (0.6 + c() * 1.8),
      len: 2 + Math.floor(c() * 4),
      neon: c() < 0.5
    }));
    drops = Array.from({ length: Math.round((W * H) / 900) }, () => ({ x: Math.floor(c() * W), y: Math.floor(c() * H) }));
    bucket = -1;
    drawnY = -1;
  }

  function paintSun() {
    const g = sun.getContext('2d');
    g.clearRect(0, 0, sun.width, sun.height);
    const r = sunR;
    for (let y = -r; y <= r; y++) {
      const halfW = Math.floor(Math.sqrt(r * r - y * y));
      const stripe = y > -r * 0.2 && ((y + r) % 8) < 1 + Math.floor(((y + r * 0.2) / r) * 4);
      if (stripe) continue;
      const u = (y + r) / (2 * r);
      for (let x = -halfW; x <= halfW; x++) {
        const on = u * 16 > BAYER[((y + r) & 3) * 4 + ((x + r) & 3)];
        g.fillStyle = css(on ? palette.sunB : palette.sunA);
        g.fillRect(x + r, y + r, 1, 1);
      }
    }
  }

  function applyPalette(next) {
    if (next === bucket) return;
    bucket = next;
    palette = paletteAt(next / BUCKETS);
    const skyLut = new Uint32Array(6);
    palette.sky.forEach((color, i) => { skyLut[i] = pack(color); });
    skyLut[5] = pack(palette.star);
    paintTones(sky, skyTones, W, H, skyLut);
    paintSun();
    for (const layer of layers) {
      const body = palette[layer.name];
      const lut = new Uint32Array(9);
      lut[BODY] = pack(body);
      lut[SIDE] = pack(mix(body, [6, 6, 20], 0.35));
      lut[DIM] = pack(mix(body, [6, 6, 20], 0.5));
      lut[LIT_A] = pack(mix(body, palette.litA, layer.big ? 0.7 : 0.55));
      lut[LIT_B] = pack(mix(body, palette.litB, layer.big ? 0.7 : 0.55));
      lut[NEON_A] = pack(palette.neonA);
      lut[NEON_B] = pack(palette.neonB);
      lut[BEACON] = pack(palette.neonB);
      paintTones(layer.canvas, layer.tones, layer.w, layer.h, lut);
      layer.lut = lut;
    }
  }

  function draw(scroll) {
    ctx.drawImage(sky, 0, 0);
    ctx.drawImage(sun, Math.round(W * 0.72 - sunR), Math.round(H * 0.34 - sunR + (scroll * 0.14) / S));
    if (meteor) {
      const reach = Math.max(Math.abs(meteor.vx), Math.abs(meteor.vy));
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = css(mix(palette.star, palette.sky[1], i / 8));
        ctx.fillRect(Math.round(meteor.x - (meteor.vx / reach) * i), Math.round(meteor.y - (meteor.vy / reach) * i), 1, 1);
      }
    }
    for (const layer of layers) {
      ctx.drawImage(layer.canvas, 0, Math.round(layer.top - (scroll * layer.rate) / S));
      if (layer.name === 'mid') {
        for (const car of cars) {
          const y = car.y - Math.round((scroll * 0.12) / S);
          if (y < 0 || y >= H) continue;
          const head = Math.round(car.x);
          ctx.fillStyle = css(car.neon ? palette.neonA : palette.litB);
          ctx.fillRect(car.v > 0 ? head - car.len : head + 1, y, car.len, 1);
          ctx.fillStyle = css(palette.litA);
          ctx.fillRect(head, y, 1, 1);
        }
      }
    }
    const t = bucket / BUCKETS;
    if (t > 0.12) {
      const count = Math.round(drops.length * Math.min(1, (t - 0.12) * 3));
      ctx.fillStyle = css(mix(palette.sky[3], palette.rain, 0.55));
      for (let i = 0; i < count; i++) ctx.fillRect(drops[i].x, drops[i].y, 1, 3);
    }
  }

  function stepAnimation() {
    beat++;
    for (const car of cars) {
      car.x += car.v;
      if (car.x < -8) car.x = W + 8;
      if (car.x > W + 8) car.x = -8;
    }
    for (const drop of drops) {
      drop.y += 5;
      drop.x -= 1;
      if (drop.y >= H) drop.y -= H;
      if (drop.x < 0) drop.x += W;
    }
    // A shooting star every several seconds, once the sky is dark enough to show one.
    if (meteor) {
      meteor.x += meteor.vx;
      meteor.y += meteor.vy;
      meteor.life -= 1;
      if (meteor.life <= 0) meteor = null;
    } else if (bucket / BUCKETS > 0.25 && Math.random() < 0.012) {
      meteor = { x: W * (0.2 + Math.random() * 0.75), y: H * Math.random() * 0.3, vx: -(2 + Math.random() * 2), vy: 1 + Math.random(), life: 10 + Math.floor(Math.random() * 8) };
    }
    for (const layer of layers) {
      const g = layer.canvas.getContext('2d');
      const color = tone => `#${(layer.lut[tone] & 0xffffff).toString(16).padStart(6, '0').replace(/(..)(..)(..)/, '$3$2$1')}`;
      for (const beacon of layer.beacons) {
        const on = (beat + beacon.phase) % 12 < 3;
        g.fillStyle = color(on ? BEACON : BODY);
        g.fillRect(beacon.x, beacon.y, 1, 1);
      }
      for (const sign of layer.flickers) {
        sign.next -= 1 / 12;
        if (sign.next > 0) continue;
        sign.off = !sign.off;
        sign.next = sign.off ? 0.08 + Math.random() * 0.25 : 1 + Math.random() * 9;
        g.fillStyle = color(sign.off ? SIDE : sign.tone);
        for (const [x, y] of sign.pixels) g.fillRect(x, y, 1, 1);
      }
      if (beat % 5 === 0 && layer.windows.length) {
        const win = layer.windows[Math.floor(Math.random() * layer.windows.length)];
        win.on = !win.on;
        g.fillStyle = color(win.on ? LIT_A : DIM);
        g.fillRect(win.x, win.y, win.w, win.h);
      }
    }
  }

  const scrollDepth = () => Math.max(0, Math.min(maxScroll, scrollY));
  const bucketAt = y => Math.min(Math.ceil(NIGHT_FROM * BUCKETS), Math.round((y / maxScroll) * BUCKETS));

  function render(scroll) {
    applyPalette(bucketAt(scroll));
    draw(scroll);
    drawnY = scroll;
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const scroll = scrollDepth();
    const due = now - lastBeat >= 1000 / 12;
    if (scroll === drawnY && !due) return;
    if (due) {
      lastBeat = now;
      stepAnimation();
    }
    render(scroll);
  }

  function sync() {
    const run = motion() && !document.hidden;
    if (run && !raf) {
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      meteor = null;
    }
    if (!run && !document.hidden) render(0);
  }

  let builtWidth = 0;
  let builtHeight = 0;
  function rebuild() {
    build();
    builtWidth = root.clientWidth;
    builtHeight = innerHeight;
    render(motion() ? scrollDepth() : 0);
  }
  const listening = new AbortController();
  const { signal } = listening;
  addEventListener('resize', () => {
    // A phone's address bar changes the height while scrolling. That shouldn't rebuild the city.
    if (root.clientWidth === builtWidth && innerHeight <= builtHeight) return;
    rebuild();
  }, { passive: true, signal });
  document.addEventListener('visibilitychange', sync, { signal });
  const resizer = new ResizeObserver(() => {
    const next = Math.max(1, root.scrollHeight - innerHeight);
    if (Math.abs(next - maxScroll) > innerHeight) rebuild();
    else maxScroll = next;
  });
  resizer.observe(document.body);

  rebuild();
  sync();
  return {
    sync,
    stop() {
      listening.abort();
      resizer.disconnect();
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
}
