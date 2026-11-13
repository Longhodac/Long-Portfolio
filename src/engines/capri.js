// Capri, drawn at full resolution from capri-companion's vector model: palette-flat traced poses, one
// deformation field for head turns, hair sway and breath, glittering hair, a live face, and glitch bursts.
// She perches on page elements and teleports between them.
//
// The drawing code is adapted from capri-companion (MIT, see /capri-companion-LICENSE.txt). Its model data
// is traced from the show and isn't covered by that license.

const C = {
  hair: '#f2154c', violet: '#8a3dff', ink: '#0a0710', mask: '#22f27a', iris: '#1d6cff',
  white: '#ffffff', sparkle: '#ffe6ee', mouthInner: '#2a0f3a', shade: '#7a0d33'
};
const LAYERS = [
  ['violet', C.violet], ['hair', C.hair], ['crimson', C.hair], ['shade', C.shade], ['ink', C.ink], ['green', C.mask]
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = x => 1 - (1 - x) ** 3;

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

class Mat {
  constructor(a = 1, b = 0, c = 0, d = 1, e = 0, f = 0) { Object.assign(this, { a, b, c, d, e, f }); }
  mul(m) {
    return new Mat(
      this.a * m.a + this.c * m.b, this.b * m.a + this.d * m.b,
      this.a * m.c + this.c * m.d, this.b * m.c + this.d * m.d,
      this.a * m.e + this.c * m.f + this.e, this.b * m.e + this.d * m.f + this.f
    );
  }
  translate(x, y) { return this.mul(new Mat(1, 0, 0, 1, x, y)); }
  rotate(r) { const c = Math.cos(r); const s = Math.sin(r); return this.mul(new Mat(c, s, -s, c, 0, 0)); }
  scale(x, y = x) { return this.mul(new Mat(x, 0, 0, y, 0, 0)); }
  apply([x, y]) { return [this.a * x + this.c * y + this.e, this.b * x + this.d * y + this.f]; }
  map(poly) { return poly.map(point => this.apply(point)); }
}

function toPath(points) {
  const path = new Path2D();
  points.forEach(([x, y], i) => { if (i) path.lineTo(x, y); else path.moveTo(x, y); });
  path.closePath();
  return path;
}

// Face shapes, in units where 26 is the distance between her eyes.
const HEAD = [[-22, -25], [-27, -9], [-24, 8], [-15, 21], [-5, 30], [1, 33], [6, 29], [16, 19], [24, 6], [27, -10], [21, -26], [8, -32], [-9, -31]];
const MASK_L = [[-28, -15], [-3, -20], [-2, 4], [-8, 9], [-23, 8], [-29, -2]];
const MASK_R = [[3, -21], [28, -17], [30, -3], [23, 7], [7, 9], [2, 4]];
const BANGS = [[[-17, -32], [-3, -32], [-8, -14]], [[3, -32], [17, -30], [7, -16]], [[-27, -21], [-15, -28], [-23, -6]]];
const EYE = { w: 12.5, h: 8.4, slant: 0.2, iris: 5, ring: 6.8, pupil: 1.7 };
const EYES = [[[-13.5, -5.8], 1.08, -0.05], [[13.5, -3.6], 0.92, 0.1]];
const MANY = [
  [0, -12, 0.61, 0.05, 0], [-22, 4, 0.52, 0.15, -0.3], [22, 4, 0.52, 0.2, 0.3], [-4, 6, 0.43, 0.3, 0.1], [8, -16, 0.41, 0.4, -0.2],
  [-20, -15, 0.43, 0.45, 0.25], [20, -15, 0.43, 0.5, -0.25], [0, 3, 0.36, 0.6, 0], [-12, 8, 0.32, 0.7, 0.4], [12, 8, 0.32, 0.75, -0.4]
];
// Her face is a little larger than traced, so it still reads at this size.
const FACE_BOOST = 1.3;
const FACE_LIFT = 6;

function drawFace(ctx, head, p, S) {
  const yaw = clamp(p.headYaw, -1, 1);
  const fx = yaw * 4;
  const fy = p.headPitch * 4;
  const squeeze = 1 - Math.abs(yaw) * 0.12;
  const face = (poly, depth = 1) => poly.map(([x, y]) => [x * squeeze + fx * depth, y + fy * depth]);

  const plate = head.map(face(HEAD, 0.35));
  ctx.fillStyle = C.violet;
  ctx.fill(toPath(plate.map(([x, y]) => [x - 1.6 * S, y + 2 * S])));
  ctx.fillStyle = C.ink;
  ctx.fill(toPath(plate));

  const glow = clamp(p.maskGlow, 0, 1);
  const masks = [MASK_L, MASK_R].map(mask => head.map(face(mask)));
  ctx.save();
  if (glow > 0.35) {
    ctx.shadowColor = C.mask;
    ctx.shadowBlur = (glow - 0.35) * 16 * S;
  }
  ctx.fillStyle = C.mask;
  for (const mask of masks) ctx.fill(toPath(mask));
  ctx.restore();

  for (const [c, size, rot] of EYES) {
    const far = (c[0] < 0 ? yaw > 0 : yaw < 0) ? 1 - Math.abs(yaw) * 0.25 : 1;
    drawEye(ctx, head, face([c])[0], c[0] < 0 ? -1 : 1, far, size, p, S, rot);
  }
  if (p.manyEyes > 0.03) {
    ctx.save();
    const clip = new Path2D();
    for (const mask of masks) clip.addPath(toPath(mask));
    ctx.clip(clip);
    for (const [x, y, size, threshold, rot] of MANY) {
      const grow = clamp((p.manyEyes - threshold) / 0.12, 0, 1);
      if (grow > 0) drawEye(ctx, head, face([[x, y]])[0], x < 0 ? -1 : 1, 1, size * (0.6 + 0.4 * grow), { ...p, squint: p.squint * 0.5, blink: 0 }, S, rot);
    }
    ctx.restore();
  }
  ctx.fillStyle = C.ink;
  for (const bang of BANGS) ctx.fill(toPath(head.map(face(bang, 0.6))));
  drawMouth(ctx, head, face([[0, 19]])[0], p, S);
}

function drawEye(ctx, head, c, side, xScale, size, p, S, extraRot) {
  const closed = clamp(Math.max(p.blink, p.sleep * 0.9), 0, 1);
  const squint = clamp(p.squint, 0, 1);
  const wide = clamp(p.eyeWide, 0, 1);
  const m = head.translate(c[0], c[1]).rotate(side * (-EYE.slant - squint * 0.22) + extraRot).scale(xScale * size, size);
  const w = EYE.w * (1 + wide * 0.06);
  const hTop = EYE.h * (1 + wide * 0.3) * (1 - squint * 0.62) * (1 - closed);
  const hBot = EYE.h * 0.82 * (1 + wide * 0.2) * (1 - squint * 0.35) * (1 - closed);
  const almond = (top, bottom) => {
    const points = [];
    for (let i = 0; i <= 14; i++) {
      const x = -w + (2 * w * i) / 14;
      points.push([x, -top * Math.pow(Math.max(0, 1 - (x / w) ** 2), 0.75)]);
    }
    for (let i = 13; i >= 1; i--) {
      const x = -w + (2 * w * i) / 14;
      points.push([x, bottom * Math.pow(Math.max(0, 1 - (x / w) ** 2), 0.9)]);
    }
    return points;
  };
  ctx.fillStyle = C.ink;
  const thorns = [
    [[w * 0.6 * side, hBot * 0.6], [w * 0.85 * side, hBot * 0.3], [w * 0.98 * side, EYE.h * 1.05]],
    [[-w * 0.4 * side, -hTop * 0.8], [-w * 0.62 * side, -hTop * 0.55], [-w * 0.72 * side, -EYE.h * 1.12]]
  ];
  for (const thorn of thorns) ctx.fill(toPath(m.map(thorn)));
  if (hTop + hBot < 1.2) {
    ctx.fill(toPath(m.map(almond(0.8, 0.8))));
    return;
  }
  if (p.happyEyes > 0.5) {
    const arc = [];
    for (let i = 0; i <= 12; i++) {
      const x = -w + (2 * w * i) / 12;
      arc.push([x, -EYE.h * 0.55 * (1 - (x / w) ** 2) + EYE.h * 0.15]);
    }
    const t = EYE.h * 0.38;
    ctx.fill(toPath(m.map([...arc.map(([x, y]) => [x, y - t / 2]), ...[...arc].reverse().map(([x, y]) => [x, y + t / 2])])));
    return;
  }
  const shape = toPath(m.map(almond(hTop, hBot)));
  ctx.fill(shape);
  ctx.save();
  ctx.clip(shape);
  const gx = p.gazeX * w * 0.42;
  const gy = p.gazeY * EYE.h * 0.38;
  const dot = (cx, cy, r, color, stroke = 0) => {
    const [x, y] = m.apply([cx, cy]);
    ctx.beginPath();
    ctx.ellipse(x, y, r * Math.hypot(m.a, m.b), r * Math.hypot(m.c, m.d), Math.atan2(m.b, m.a), 0, Math.PI * 2);
    if (stroke) {
      ctx.strokeStyle = color;
      ctx.lineWidth = stroke * S * size;
      ctx.stroke();
    } else {
      ctx.fillStyle = color;
      ctx.fill();
    }
  };
  dot(gx * 0.85 + 0.6 * side, gy * 0.85 - 0.3, EYE.ring, C.mask, 0.8);
  if (p.blankEyes > 0.5) {
    dot(gx * 0.5, gy * 0.5, EYE.iris * 1.35, C.white);
  } else {
    dot(gx, gy, EYE.iris * (1 - wide * 0.15), C.iris);
    dot(gx, gy, EYE.pupil * (1 - wide * 0.25), C.white);
  }
  ctx.restore();
}

function mouthOpenness(p) {
  const smile = clamp(p.mouthSmile, -1, 1);
  return Math.max(clamp(p.mouthOpen, 0, 1), p.happyEyes > 0.5 ? 0.55 : 0, smile >= 0.95 && p.squint < 0.6 ? 0.3 : 0);
}

function drawMouth(ctx, head, c, p, S) {
  const open = mouthOpenness(p);
  const smile = clamp(p.mouthSmile, -1, 1);
  const maniac = p.mouthOpen > 0.12 && smile >= 0.85 && (p.squint >= 0.6 || p.eyeWide >= 0.7);
  if (open > 0.12 && !maniac) drawFang(ctx, head, c, p, open);
  else drawZigzag(ctx, head, c, p, S);
}

// The open mouth the show draws most: one white shape, wide on top and pointed below.
function drawFang(ctx, head, c, p, open) {
  const smile = clamp(p.mouthSmile, -1, 1);
  const w = 4.5 + open * 5.5 + Math.max(0, smile) * 2.5;
  const lift = Math.max(0, smile) * 1.6;
  const y0 = -1.2;
  const h = 3 + open * 9.5;
  const tipX = -w * 0.12 * smile;
  ctx.fillStyle = C.white;
  ctx.fill(toPath(head.translate(c[0], c[1]).map([
    [-w, y0 - lift], [-w * 0.55, y0 - lift * 0.25], [-w * 0.16, y0 + 0.35], [0, y0 + 0.9 + open * 0.6], [w * 0.16, y0 + 0.35], [w * 0.55, y0 - lift * 0.25], [w, y0 - lift],
    [w * 0.45, y0 + h * 0.55], [tipX, y0 + h], [-w * 0.45, y0 + h * 0.55]
  ])));
}

// At rest a short thin zigzag, with one corner hitched when she's smug. Her maniac grin opens it into a slot of teeth.
function drawZigzag(ctx, head, c, p, S) {
  const open = clamp(p.mouthOpen, 0, 1);
  const smile = clamp(p.mouthSmile, -1, 1);
  const grin = clamp((smile - 0.4) / 0.6, 0, 1);
  const frown = clamp(-smile, 0, 1);
  const smirk = open < 0.12 ? clamp((smile - 0.45) / 0.4, 0, 1) : 0;
  const w = 7.5 + grin * 7.5 + open * 1.5 - frown * 2;
  const n = 3 + Math.round(grin * 3 + open * 1.5);
  const lift = smile * 3.4;
  const depthMax = open * (3.2 + grin * 3.6) + (1 - grin) * open * 2.2;
  const zigAmp = 0.85 + open * 0.4 - frown * 0.25;
  const count = n * 2 + 1;
  const upper = [];
  const lower = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const u = 2 * t - 1;
    const x = -w + 2 * w * t;
    const base = -lift * u * u + lift * 0.35 - smirk * 2.6 * Math.max(0, u) ** 1.5;
    const zig = (i % 2 ? zigAmp : -zigAmp) * (1 - 0.5 * u * u);
    const profile = grin > 0.3 ? Math.pow(Math.max(0, 1 - u * u), 0.75) : Math.pow(Math.max(0, 1 - u * u), 0.45);
    const d = depthMax * profile;
    upper.push([x, base + zig - d * 0.35]);
    lower.push([x, base - zig * 0.6 + d * 0.65 + (grin > 0.3 ? lift * 0.25 * (1 - u * u) : 0)]);
  }
  const m = head.translate(c[0], c[1]);
  const top = m.map(upper);
  const bottom = m.map(lower);
  if (open > 0.05) {
    const slot = toPath([...top, ...[...bottom].reverse()]);
    ctx.fillStyle = C.mouthInner;
    ctx.fill(slot);
    ctx.save();
    ctx.clip(slot);
    ctx.fillStyle = C.white;
    const ky = Math.hypot(m.c, m.d);
    for (const [line, other, dir] of [[top, bottom, 1], [bottom, top, -1]]) {
      for (let i = 0; i + 2 < line.length; i += 2) {
        const a = line[i];
        const b = line[i + 2];
        const mid = line[i + 1];
        const gap = Math.abs(other[i + 1][1] - mid[1]);
        const length = Math.min(gap * (grin > 0.3 ? 0.55 : 0.4), (1.6 + grin * 2.6) * ky);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.lineTo(mid[0], mid[1] + dir * length);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.strokeStyle = C.white;
  ctx.lineWidth = (1.05 + grin * 0.35) * S;
  ctx.lineJoin = 'miter';
  for (const line of open > 0.05 ? [top, bottom] : [top]) {
    ctx.beginPath();
    line.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.stroke();
  }
}

// Expression and rig values, all eased by the same springs.
const REST = {
  breathe: 0.5, headYaw: 0, headPitch: 0, headRoll: 0, gazeX: 0, gazeY: 0, blink: 0, eyeWide: 0, squint: 0,
  mouthOpen: 0, mouthSmile: 0.35, maskGlow: 0.2, manyEyes: 0, happyEyes: 0, blankEyes: 0, sleep: 0, hairWind: 0
};
const LOOKS = {
  sit: { mouthSmile: 0.7, squint: 0.2 },
  crouch: { headPitch: 0.12, gazeX: -0.4, eyeWide: 0.2 },
  lie: { happyEyes: 1, mouthSmile: 0.7, squint: 0.3, headRoll: 0.2 },
  back: {}
};
const POKES = [
  { mouthOpen: 1, mouthSmile: 1, eyeWide: 0.8, maskGlow: 0.9 },
  { happyEyes: 1, mouthSmile: 1, maskGlow: 0.6 },
  { squint: 0.9, mouthSmile: -0.4 },
  { manyEyes: 1, eyeWide: 0.4, mouthOpen: 0.2, mouthSmile: 0.3, maskGlow: 1 },
  { blankEyes: 1, mouthSmile: 0.2 }
];
const STIFFNESS = {
  blink: 900, mouthOpen: 600, eyeWide: 160, gazeX: 260, gazeY: 260, headYaw: 55, headPitch: 55, headRoll: 45,
  manyEyes: 120, happyEyes: 160, blankEyes: 160, sleep: 30, maskGlow: 60
};
const FX_LENGTH = { out: 0.42, in: 0.4 };

export async function start({ canvas, bubble, modelUrl = '/assets/capri/model.json', pokeLines = [] }) {
  const model = await (await fetch(modelUrl)).json();
  const root = document.documentElement;
  const display = canvas.getContext('2d');
  const frame = document.createElement('canvas');
  const frameCtx = frame.getContext('2d');
  const tintCanvases = {};
  const random = prng(0xca9e1);
  const value = { ...REST };
  const velocity = {};

  let scale = 0.62; // CSS pixels per model unit
  let dpr = 1;
  let s = scale; // device pixels per model unit
  let poseName = 'sit';
  let pose = model.poses.sit;
  let W = 1;
  let H = 1;
  let ax = 0;
  let ay = 0;
  let hitPaths = [];
  let glitter = [];

  let perch = null; // { el, x, y, pose }
  let pending = null;
  let fxPhase = null;
  let fxTime = 0;
  let fxId = 0;
  let fxBox = null;
  let fxShards = [];

  let time = 0;
  let last = performance.now();
  let lastDraw = 0;
  let raf = 0;
  let frozen = null;
  let reaction = null;
  let squash = 0;
  let burst = 0;
  let burstKind = 'slice';
  let burstLeft = 0;
  let burstNext = 3;
  let sliceSeed = 1;
  let shards = [];
  let blinkPhase = -1;
  let blinkNext = 2.2;
  let blinkDouble = false;
  let snapRoll = 0;
  let snapUntil = 0;
  let snapNext = 3;
  let saccade = { x: 0, y: 0, next: 1 };
  let asleep = false;
  let lastInputAt = performance.now();
  const pointer = { x: 0, y: 0, at: -1e6 };
  let overHer = false;
  let greeted = false;
  const bubbleLine = bubble.querySelector('.bubble-line');
  const bubbleSizer = bubble.querySelector('.bubble-sizer');
  let queuedLine = null;
  let typing = 0;
  let bubbleTimer = 0;

  const effectsOn = () => root.dataset.fx !== 'off';

  function makeGlitter(seed) {
    const size = Math.round(150 * dpr);
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const g = tile.getContext('2d');
    const r = prng(seed);
    for (let i = 0; i < 380; i++) {
      g.globalAlpha = 0.7 + r() * 0.3;
      g.fillStyle = r() < 0.75 ? C.white : C.sparkle;
      g.beginPath();
      g.arc(r() * size, r() * size, (0.3 + r() ** 5 * 1.1) * dpr, 0, Math.PI * 2);
      g.fill();
    }
    return frameCtx.createPattern(tile, 'repeat');
  }

  function setPose(name) {
    poseName = name;
    pose = model.poses[name];
    const [x0, y0, x1, y1] = pose.bounds;
    const margin = 34;
    W = Math.ceil((x1 - x0 + margin * 2) * s);
    H = Math.ceil((y1 - y0 + margin * 2) * s);
    canvas.width = W;
    canvas.height = H;
    frame.width = W;
    frame.height = H;
    canvas.style.width = `${W / dpr}px`;
    canvas.style.height = `${H / dpr}px`;
    ax = (margin - x0) * s;
    ay = (margin - y0) * s;
    hitPaths = [];
  }

  // Where the seat line sits, in model units: sitting rests on its seat, everything else on its lowest point.
  const seatUnits = () => (pose.kind === 'sit' ? 0 : pose.bounds[3]);

  function place() {
    if (!perch) return;
    const { el, x, y } = perch;
    if (canvas.parentElement !== el) el.append(canvas, bubble);
    canvas.style.position = 'absolute';
    const box = el.getBoundingClientRect();
    canvas.style.left = `${Math.round(x * box.width - ax / dpr)}px`;
    canvas.style.top = `${Math.round(y * box.height - ay / dpr - seatUnits() * scale)}px`;
    placeBubble();
  }

  // Beside her head, on whichever side has room. The bubble sits behind the windows like she does, so it can
  // never cover text, but it looks for a spot where it isn't hidden either.
  function placeBubble() {
    if (bubble.hidden || !perch) return;
    const box = perch.el.getBoundingClientRect();
    const here = canvas.getBoundingClientRect();
    const headX = here.left + (ax + pose.face.x * s) / dpr;
    const headY = here.top + (ay + (pose.face.y - FACE_LIFT * FACE_BOOST) * s) / dpr;
    const reach = 42 * FACE_BOOST * scale;
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const gap = 16;
    const pageWidth = document.documentElement.clientWidth;
    const spots = {
      left: { x: headX - reach - gap - width, y: headY - height / 2 },
      right: { x: headX + reach + gap, y: headY - height / 2 },
      // Above her head it can slide sideways to stay on the page, because the tail still reaches her.
      above: { x: clamp(headX - width / 2, 8, pageWidth - width - 8), y: headY - reach - gap - height }
    };
    const order = headX > innerWidth / 2 ? ['left', 'above', 'right'] : ['right', 'above', 'left'];
    const blockers = [...document.querySelectorAll('.win, .sec-title, .hero-copy, .floor')].map(el => el.getBoundingClientRect());
    const onPage = ({ x }) => x >= 8 && x + width <= pageWidth - 8;
    const clear = ({ x, y }) => !blockers.some(b => x < b.right + 6 && x + width > b.left - 6 && y < b.bottom + 6 && y + height > b.top - 6);
    const side = order.find(name => onPage(spots[name]) && clear(spots[name])) || 'above';
    const spot = spots[side];
    bubble.dataset.side = side;
    bubble.style.left = `${Math.round(spot.x - box.left)}px`;
    bubble.style.top = `${Math.round(spot.y - box.top)}px`;
    bubble.style.setProperty('--tail', `${Math.round(clamp(headX - spot.x, 12, width - 12))}px`);
  }

  function hideBubble() {
    clearInterval(typing);
    clearTimeout(bubbleTimer);
    bubble.hidden = true;
  }

  function showLine(line) {
    hideBubble();
    bubbleSizer.textContent = line;
    bubbleLine.textContent = '';
    bubble.hidden = false;
    placeBubble();
    let shown = 0;
    typing = setInterval(() => {
      shown += 1;
      bubbleLine.textContent = line.slice(0, shown);
      if (shown >= line.length) clearInterval(typing);
    }, 34);
    bubbleTimer = setTimeout(hideBubble, 1600 + line.length * 60);
  }

  // A line said while she's teleporting waits until she lands.
  function say(line) {
    if (!line || !effectsOn()) return;
    if (fxPhase || pending) queuedLine = line;
    else showLine(line);
  }

  // Moves her to a page element. x and y are fractions of its box; the seat line lands on that point.
  function moveTo(next) {
    pending = next;
    if (!perch || !effectsOn() || document.hidden) {
      arrive();
      if (!raf) drawNow();
      return;
    }
    hideBubble();
    if (!fxPhase) startFx('out');
  }

  function arrive() {
    if (!pending) return;
    perch = pending;
    pending = null;
    setPose(perch.pose);
    place();
    Object.assign(value, poseTarget());
  }

  function startFx(phase) {
    fxPhase = phase;
    fxTime = 0;
    fxId += 1;
    fxBox = null;
    fxShards = [];
  }

  function startBurst(kind, length) {
    burstKind = kind;
    burstLeft = length;
    burst = 1;
    if (kind !== 'shatter') return;
    const r = random;
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI * (0.05 + r() * 0.9) + (r() < 0.25 ? Math.PI : 0);
      const speed = 150 + r() * 330;
      shards.push({
        x: (r() * 2 - 1) * 70, y: -60 - r() * 120, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        rot: r() * 6, spin: (r() * 2 - 1) * 9, size: 8 + r() * 20, life: 0.35 + r() * 0.4, ink: r() < 0.3
      });
    }
  }

  function poke() {
    if (pokeLines.length) say(pokeLines[Math.floor(random() * pokeLines.length)]);
    if (!effectsOn()) return;
    wake();
    squash = 1;
    startBurst(random() < 0.5 ? 'shatter' : 'slice', 0.2);
    reaction = { until: time + 1.4, params: POKES[Math.floor(random() * POKES.length)] };
  }

  function wake() {
    lastInputAt = performance.now();
    if (!asleep) return;
    asleep = false;
    if (effectsOn()) startBurst('slice', 0.14);
  }

  function lookAt(x, y) {
    const box = canvas.getBoundingClientRect();
    const hx = box.left + (ax + pose.face.x * s) / dpr;
    const hy = box.top + (ay + pose.face.y * s) / dpr;
    pointer.x = clamp((x - hx) / (innerWidth * 0.35), -1, 1);
    pointer.y = clamp((y - hy) / (innerHeight * 0.45), -1, 1);
    pointer.at = performance.now();
  }

  const poseTarget = () => ({ ...REST, ...(LOOKS[poseName] || {}) });

  function composeTarget(dt) {
    const target = poseTarget();
    if (frozen) return Object.assign(target, frozen);
    target.breathe = 0.5 + 0.5 * Math.sin(time * 1.4);
    if (performance.now() - pointer.at < 4000) {
      target.gazeX = clamp(target.gazeX * 0.25 + pointer.x, -1, 1);
      target.gazeY = clamp(target.gazeY * 0.25 + pointer.y, -1, 1);
      target.headYaw += pointer.x * 0.5;
      target.headPitch += pointer.y * 0.3;
    } else {
      saccade.next -= dt;
      if (saccade.next <= 0) saccade = { x: (random() - 0.5) * 1.2, y: (random() - 0.5) * 0.6, next: 0.8 + random() * 2.6 };
      target.gazeX += saccade.x;
      target.gazeY += saccade.y;
    }
    if (time > snapNext) {
      snapRoll = (random() < 0.5 ? -1 : 1) * (0.05 + random() * 0.14);
      snapUntil = time + 0.5 + random() * 1.1;
      snapNext = time + 3 + random() * 5;
    }
    if (time < snapUntil) target.headRoll += snapRoll;

    if (blinkPhase < 0 && time > blinkNext) {
      blinkPhase = 0;
      blinkDouble = random() < 0.15;
      blinkNext = time + 2 + random() * 4;
    }
    if (blinkPhase >= 0) {
      blinkPhase += dt;
      if (blinkPhase >= 0.17) {
        blinkPhase = blinkDouble ? 0 : -1;
        blinkDouble = false;
      } else {
        target.blink = 1;
      }
    }
    if (asleep) Object.assign(target, { sleep: 1, headPitch: 0.4, headRoll: 0.12, mouthOpen: 0, mouthSmile: 0.2, happyEyes: 0, eyeWide: 0 });
    if (reaction) {
      if (time > reaction.until) reaction = null;
      else Object.assign(target, reaction.params);
    }
    if (fxPhase === 'out') target.manyEyes = Math.max(target.manyEyes, Math.sin(clamp(fxTime / FX_LENGTH.out / 0.6, 0, 1) * Math.PI));
    return target;
  }

  function step(target, dt) {
    const h = clamp(dt, 0, 0.25);
    for (const key of Object.keys(target)) {
      if (h === 0) {
        value[key] = target[key];
        velocity[key] = 0;
        continue;
      }
      const w = Math.sqrt(STIFFNESS[key] ?? 40);
      const y = value[key] - target[key];
      const v = velocity[key] ?? 0;
      const e = Math.exp(-w * h);
      const tmp = (v + w * y) * h;
      value[key] = target[key] + (y + tmp) * e;
      velocity[key] = (v - w * tmp) * e;
    }
  }

  function renderFrame(dt) {
    const p = value;
    const f = pose.face;
    const t = time;
    const ctx = frameCtx;
    const bob = pose.kind === 'float' ? Math.sin(t * 1.1) * 5 + Math.sin(t * 0.37) * 2.5 : 0;
    const hx = p.headYaw * 12;
    const hy = p.headPitch * 9 + p.sleep * 6;
    const sway = (0.35 + p.hairWind) * 5;
    const breath = (p.breathe - 0.5) * 1.6;

    // One deformation field for every vertex of every layer, so neighbouring shapes stay glued together.
    const deform = (x, y) => {
      let dx = 0;
      let dy = 0;
      const ddx = x - f.x;
      const ddy = y - f.y;
      const d = Math.hypot(ddx, ddy);
      const wHead = Math.max(0, 1 - d / 85);
      dx += hx * wHead * wHead;
      dy += hy * wHead * wHead;
      const above = clamp((f.y + 40 - y) / 70, 0, 1);
      const wHair = Math.pow(clamp((d - 30) / 260, 0, 1), 1.25) * above;
      if (wHair > 0) {
        const phase = Math.atan2(ddy, ddx);
        dx += wHair * Math.sin(t * 1.15 + phase * 1.7) * sway;
        dy += wHair * Math.cos(t * 0.9 + phase * 2.3) * sway * 0.45;
      }
      if (y < 0 && y > f.y) dy -= breath * (1 - y / f.y);
      return [x + dx, y + dy];
    };

    const lean = Math.sin(t * 0.29) * 0.01;
    const sx = s * (1 + squash * 0.1);
    const sy = s * (1 - squash * 0.12);
    const base = new Mat(1, 0, 0, 1, ax, ay + bob * s).rotate(lean).scale(sx, sy);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.1 * dpr;
    ctx.lineJoin = 'round';
    hitPaths = [];
    let hairPath = null;
    for (const [name, color] of LAYERS) {
      const polys = pose.layers[name];
      if (!polys) continue;
      const all = new Path2D();
      for (const flat of polys) {
        for (let i = 0; i < flat.length; i += 2) {
          const [x, y] = base.apply(deform(flat[i], flat[i + 1]));
          if (i) all.lineTo(x, y);
          else all.moveTo(x, y);
        }
        all.closePath();
      }
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.fill(all, 'evenodd');
      ctx.stroke(all);
      if (name === 'hair') hairPath = all;
      if (name !== 'violet') hitPaths.push(all);
    }

    if (hairPath) {
      if (!glitter.length) glitter = [makeGlitter(7), makeGlitter(1337)];
      ctx.save();
      ctx.clip(hairPath, 'evenodd');
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.3);
      ctx.globalAlpha = 0.55 + 0.45 * twinkle;
      ctx.fillStyle = glitter[0];
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.55 + 0.45 * (1 - twinkle);
      ctx.fillStyle = glitter[1];
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      const [crownX, crownY] = base.apply(deform(f.x, f.y - 130));
      const crown = ctx.createRadialGradient(crownX, crownY, 0, crownX, crownY, 170 * s);
      crown.addColorStop(0, 'rgba(255,170,195,0.22)');
      crown.addColorStop(1, 'rgba(255,90,130,0)');
      ctx.fillStyle = crown;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (!pose.back) {
      const [fx, fy] = base.apply(deform(f.x, f.y));
      const head = new Mat(1, 0, 0, 1, fx, fy)
        .rotate(lean)
        .scale(sx * FACE_BOOST, sy * FACE_BOOST)
        .rotate(f.angle + p.headRoll * 0.6)
        .translate(0, -FACE_LIFT);
      drawFace(ctx, head, p, s * FACE_BOOST);
    }

    const [ox, oy] = base.apply([f.x, f.y]);
    for (const shard of shards) {
      shard.life -= dt;
      shard.x += shard.vx * dt;
      shard.y += shard.vy * dt;
      shard.rot += shard.spin * dt;
      const m = new Mat(1, 0, 0, 1, ox + shard.x * s, oy + shard.y * s).rotate(shard.rot).scale((s * shard.size) / 10);
      const tri = m.map([[-3, -1.4], [3, -1.1], [0.6, 9]]);
      ctx.globalAlpha = clamp(shard.life * 3, 0, 1);
      ctx.fillStyle = C.violet;
      ctx.fill(toPath(tri.map(([x, y]) => [x - 2 * s, y + 2 * s])));
      ctx.fillStyle = shard.ink ? C.ink : C.hair;
      ctx.fill(toPath(tri));
    }
    ctx.globalAlpha = 1;
    shards = shards.filter(shard => shard.life > 0);
  }

  function tinted(color) {
    let c = tintCanvases[color];
    if (!c) {
      c = document.createElement('canvas');
      tintCanvases[color] = c;
    }
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.drawImage(frame, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
    return c;
  }

  function presentBurst() {
    const r = random;
    if (burstKind === 'ghost') {
      display.globalAlpha = 0.55;
      display.drawImage(tinted(C.violet), Math.round((r() * 2 - 1) * W * 0.04), 0);
      display.drawImage(tinted(C.mask), Math.round((r() * 2 - 1) * W * 0.04), 0);
      display.globalAlpha = 1;
    }
    if (burstKind === 'slice') {
      if (r() < 0.5) sliceSeed += 1;
      const bands = prng(sliceSeed);
      const count = 7;
      for (let i = 0; i < count; i++) {
        const shift = bands() < 0.55 ? (bands() * 2 - 1) * W * 0.07 * burst : 0;
        const y = Math.floor((H * i) / count);
        const h = Math.ceil(H / count) + 1;
        display.drawImage(frame, 0, y, W, h, Math.round(shift), y, W, h);
      }
      return;
    }
    display.drawImage(frame, 0, 0);
    if (burstKind !== 'tear') return;
    for (let i = 0; i < Math.ceil(burst * 5); i++) {
      const h = Math.max(2, Math.floor(r() * H * 0.04));
      const y = Math.floor(r() * (H - h));
      const dx = Math.round((r() * 2 - 1) * W * 0.05 * burst);
      display.clearRect(0, y, W, h);
      display.drawImage(frame, 0, y, W, h, dx, y, W, h);
      if (r() < 0.3) {
        display.save();
        display.globalCompositeOperation = 'source-atop';
        display.fillStyle = r() < 0.6 ? C.mask : C.hair;
        const barW = W * (0.2 + r() * 0.5);
        display.fillRect(r() * (W - barW), y + h * 0.3, barW, Math.max(2, h * 0.35));
        display.restore();
      }
    }
  }

  // She breaks into bands and shards, and lands the same way in reverse. Shards start on points of her
  // model, so nothing has to be read back from the canvas.
  function prepareFx() {
    const [x0, y0, x1, y1] = pose.bounds;
    fxBox = { x: ax + x0 * s, y: ay + y0 * s, w: (x1 - x0) * s, h: (y1 - y0) * s };
    const r = prng(fxId * 7919 + (fxPhase === 'out' ? 1 : 2));
    const sources = LAYERS.filter(([name]) => name !== 'violet' && pose.layers[name]);
    const cx = fxBox.x + fxBox.w / 2;
    const cy = fxBox.y + fxBox.h * 0.45;
    fxShards = Array.from({ length: 70 }, () => {
      // Hair is most of her, so most shards come from it.
      const [name, color] = r() < 0.66 ? sources[0] : sources[Math.floor(r() * sources.length)];
      const polys = pose.layers[name];
      const flat = polys[Math.floor(r() * polys.length)];
      const k = Math.floor((r() * flat.length) / 2) * 2;
      const x = ax + flat[k] * s;
      const y = ay + flat[k + 1] * s;
      const a = Math.atan2(y - cy, x - cx) + (r() - 0.5) * 0.9;
      const distance = (0.35 + r() * 0.9) * Math.max(fxBox.w, fxBox.h) * 0.6;
      return { x, y, dx: Math.cos(a) * distance, dy: Math.sin(a) * distance, rot: r() * 6, spin: (r() - 0.5) * 14, size: (3 + r() * 9) * dpr, color };
    });
  }

  function presentTeleport(dt) {
    if (!fxBox) prepareFx();
    fxTime += dt;
    const u = Math.min(1, fxTime / FX_LENGTH[fxPhase]);
    const leaving = fxPhase === 'out';
    const broken = leaving ? Math.min(1, u / 0.85) : 1 - easeOut(Math.min(1, u / 0.8));
    const r = prng(Math.floor(fxTime * 60) + fxId * 31);
    const flick = r() < 0.18;
    const box = fxBox;

    const present = leaving ? 1 - Math.max(0, (u - 0.55) / 0.45) : Math.min(1, u / 0.35);
    if (present > 0 && !(flick && broken > 0.5)) {
      const bands = 18;
      const bandH = Math.ceil(box.h / bands) + 1;
      const chroma = broken * 14 * dpr;
      const fringes = chroma > 1 ? [[tinted(C.violet), -chroma], [tinted(C.mask), chroma]] : [];
      for (let i = 0; i < bands; i++) {
        if (r() > present + 0.15) continue;
        const y = box.y + i * (box.h / bands);
        const shift = (r() < 0.7 ? (r() - 0.5) * 2 : 0) * box.w * 0.22 * broken;
        display.globalAlpha = 0.6 * broken;
        for (const [fringe, dx] of fringes) display.drawImage(fringe, 0, y, W, bandH, shift + dx, y, W, bandH);
        display.globalAlpha = 1;
        display.drawImage(frame, 0, y, W, bandH, shift, y, W, bandH);
      }
    }
    const blocks = Math.round(broken * (1 - broken) * 36);
    display.globalAlpha = 0.85;
    for (let i = 0; i < blocks; i++) {
      display.fillStyle = [C.hair, C.mask, C.violet, C.ink][Math.floor(r() * 4)];
      display.fillRect(box.x + r() * box.w * 0.9, box.y + r() * box.h, (8 + r() * 46) * dpr, (2 + r() * 7) * dpr);
    }
    display.globalAlpha = 1;

    const fly = leaving ? Math.max(0, (u - 0.25) / 0.75) : 1 - Math.min(1, u / 0.7);
    if (fly > 0) {
      const eased = easeOut(fly);
      display.globalAlpha = leaving ? Math.max(0, 1 - fly * 0.9) : Math.min(1, fly * 1.4);
      for (const shard of fxShards) {
        display.fillStyle = shard.color;
        display.setTransform(1, 0, 0, 1, shard.x + shard.dx * eased, shard.y + shard.dy * eased + 60 * dpr * eased * eased);
        display.rotate(shard.rot + shard.spin * eased);
        const z = shard.size;
        display.beginPath();
        display.moveTo(-z, -z * 0.4);
        display.lineTo(z, 0);
        display.lineTo(-z * 0.3, z * 0.6);
        display.closePath();
        display.fill();
      }
      display.setTransform(1, 0, 0, 1, 0, 0);
      display.globalAlpha = 1;
    }
    if (u < 1) return;
    if (leaving) {
      arrive();
      startFx('in');
    } else {
      fxPhase = null;
      if (pending) {
        startFx('out');
      } else if (queuedLine) {
        showLine(queuedLine);
        queuedLine = null;
      }
    }
  }

  function draw(dt) {
    const moving = dt > 0;
    if (moving && !frozen) time += dt;
    squash = moving ? Math.max(0, squash - dt * 4) : 0;
    step(composeTarget(moving ? dt : 0), moving ? dt : 0);

    if (moving && burstLeft > 0) {
      burstLeft -= dt;
      burst = burstLeft > 0 ? 0.55 + 0.45 * random() : 0;
      if (burstLeft <= 0) burstNext = 3 + random() * 7;
    } else if (moving && !fxPhase && !asleep && effectsOn()) {
      burstNext -= dt;
      if (burstNext <= 0) startBurst(['slice', 'shatter', 'ghost', 'tear', 'slice'][Math.floor(random() * 5)], 0.08 + random() * 0.25);
    }

    renderFrame(moving ? dt : 0);
    display.setTransform(1, 0, 0, 1, 0, 0);
    display.clearRect(0, 0, W, H);
    if (fxPhase) presentTeleport(dt);
    else if (burst > 0) presentBurst();
    else display.drawImage(frame, 0, 0);
  }

  function drawNow() { draw(0); }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!asleep && now - lastInputAt > 30000 && !fxPhase) {
      asleep = true;
      say('Wake me when you scroll.');
    }
    // Twelve drawings a second, like limited animation, and half that while she sleeps. Effects get twenty-four.
    const busy = fxPhase || burst > 0 || shards.length || squash > 0;
    const budget = 1000 / (busy ? 24 : asleep ? 6 : 12) - 1;
    if (now - lastDraw < budget) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    lastDraw = now;
    draw(dt);
  }

  function sync() {
    const run = effectsOn() && !document.hidden && !frozen;
    if (run && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (run) return;
    hideBubble();
    queuedLine = null;
    fxPhase = null;
    burst = 0;
    burstLeft = 0;
    shards = [];
    asleep = false;
    if (pending) arrive();
    drawNow();
  }

  function setScale(nextScale) {
    scale = nextScale;
    dpr = Math.min(devicePixelRatio || 1, 2);
    s = scale * dpr;
    glitter = [];
    setPose(poseName);
    place();
    if (!raf) drawNow();
  }

  const overContent = target => Boolean(target.closest && target.closest('a, button, summary, input, .win, .nav'));
  function onHer(event) {
    if (overContent(event.target) || !hitPaths.length || fxPhase) return false;
    const box = canvas.getBoundingClientRect();
    const x = (event.clientX - box.left) * dpr;
    const y = (event.clientY - box.top) * dpr;
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    return hitPaths.some(path => frameCtx.isPointInPath(path, x, y, 'evenodd'));
  }

  const listening = new AbortController();
  const { signal } = listening;
  addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    wake();
    lookAt(event.clientX, event.clientY);
    const over = onHer(event);
    if (over === overHer) return;
    overHer = over;
    document.body.style.cursor = over ? 'pointer' : '';
    if (over && !greeted) {
      greeted = true;
      say('Go on. Poke me.');
    }
  }, { passive: true, signal });
  addEventListener('pointerdown', event => {
    wake();
    if (onHer(event)) poke();
  }, { passive: true, signal });
  addEventListener('keydown', wake, { passive: true, signal });
  addEventListener('scroll', wake, { passive: true, signal });
  document.addEventListener('focusin', event => {
    if (!event.target.matches(':focus-visible')) return;
    const box = event.target.getBoundingClientRect();
    lookAt(box.left + box.width / 2, box.top + box.height / 2);
  }, { signal });
  document.addEventListener('visibilitychange', sync, { signal });

  setScale(scale);

  return {
    moveTo,
    place,
    poke,
    say,
    sync,
    setScale,
    get perch() { return pending || perch; },
    stop() {
      listening.abort();
      cancelAnimationFrame(raf);
      raf = 0;
      clearInterval(typing);
      clearTimeout(bubbleTimer);
      if (overHer) document.body.style.cursor = '';
    },
    // Holds her still with chosen values, for checking the artwork.
    freeze(values, name) {
      frozen = values;
      time = 10;
      if (name) setPose(name);
      sync();
      drawNow();
    }
  };
}
