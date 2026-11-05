// The animated diagrams in the experience and project windows. Every number on the page comes from the résumé;
// these pictures show how each system works and are labelled as illustrations. Everything drawn is a pure function
// of time, so a diagram loops cleanly and can hold one good frame when effects are off.

const C = {
  night: '#0a0f24', panel: '#151c40', plane: '#0e1430', line: '#2b3566', hot: '#5566b8', text: '#eef2ff', muted: '#a9b8e4',
  cyan: '#45d4ff', yellow: '#ffe94a', crimson: '#f2154c', green: '#22f27a', violet: '#8a3dff'
};
const FPS = 20;
const LABEL = '500 12px "Geist Mono", ui-monospace, Menlo, monospace';
const LABEL_SMALL = '500 10px "Geist Mono", ui-monospace, Menlo, monospace';
const NARROW = 480;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = x => x * x * (3 - 2 * x);

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

function polyline(points) {
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lengths.push(d);
    total += d;
  }
  return { points, lengths, total };
}

function pointOn(line, f) {
  let left = clamp(f, 0, 1) * line.total;
  for (let i = 0; i < line.lengths.length; i++) {
    if (left <= line.lengths[i] || i === line.lengths.length - 1) {
      const u = line.lengths[i] ? left / line.lengths[i] : 0;
      return [lerp(line.points[i][0], line.points[i + 1][0], u), lerp(line.points[i][1], line.points[i + 1][1], u)];
    }
    left -= line.lengths[i];
  }
  return line.points[0];
}

function strokeSpan(g, line, a, b) {
  const from = Math.min(a, b);
  const to = Math.max(a, b);
  g.beginPath();
  g.moveTo(...pointOn(line, from));
  let walked = 0;
  for (let i = 0; i < line.lengths.length - 1; i++) {
    walked += line.lengths[i];
    const f = walked / line.total;
    if (f > from && f < to) g.lineTo(...line.points[i + 1]);
  }
  g.lineTo(...pointOn(line, to));
  g.stroke();
}

function drawPacket(g, x, y, color = C.green) {
  const px = Math.round(x);
  const py = Math.round(y);
  g.fillStyle = C.violet;
  g.fillRect(px - 5, py - 1, 6, 6);
  g.fillStyle = color;
  g.fillRect(px - 3, py - 3, 6, 6);
}

const FISH = ['  ###   #', ' ##### ##', '#########', ' ##### ##', '  ###   #'];
function drawFish(g, x, y, facingLeft, color) {
  const px = Math.round(x);
  const py = Math.round(y);
  const size = 2;
  g.fillStyle = color;
  FISH.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      if (row[rx] !== '#') continue;
      const cx = facingLeft ? rx : row.length - 1 - rx;
      g.fillRect(px - 9 + cx * size, py - 5 + ry * size, size, size);
    }
  });
  g.fillStyle = C.night;
  g.fillRect(px - 9 + (facingLeft ? 2 : FISH[0].length - 3) * size, py - 5 + size, size, size);
}

// Flow diagrams are tables: nodes and wires placed in fractions of the canvas, moves that say when a packet travels
// which wire, and cues that light a node for a moment.
const leg = (wire, from, duration, options = {}) => ({ wire, from, to: from + duration, span: [0, 1], ...options });

function flow(spec) {
  const moves = spec.moves;
  const cues = [...(spec.cues || []), ...moves.filter(move => move.hit).map(move => ({ node: move.hit, from: move.to, to: move.to + 0.32, tone: 'active' }))];
  let nodes = {};
  let wires = {};
  let font = LABEL;

  return {
    period: spec.period,
    still: spec.still,
    height: narrow => spec.height,
    layout(g, w, h) {
      font = w < NARROW ? LABEL_SMALL : LABEL;
      g.font = font;
      const narrow = w < NARROW;
      nodes = Object.fromEntries(Object.entries(spec.nodes).map(([id, node]) => {
        const label = narrow && node.short ? node.short : node.label;
        const nodeW = Math.ceil(g.measureText(label).width) + (narrow ? 10 : 16);
        const nodeH = narrow ? 24 : 30;
        const cx = clamp(node.x * w, nodeW / 2 + 2, w - nodeW / 2 - 2);
        const cy = node.y * h;
        return [id, { label, cx, cy, x: Math.round(cx - nodeW / 2), y: Math.round(cy - nodeH / 2), w: nodeW, h: nodeH }];
      }));
      wires = Object.fromEntries(Object.entries(spec.wires).map(([id, points]) => [id, polyline(points.map(([x, y]) => [x * w, y * h]))]));
    },
    draw(g, t, w, h) {
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineCap = 'butt';
      g.lineJoin = 'miter';
      g.lineWidth = 2;
      g.strokeStyle = C.line;
      for (const line of Object.values(wires)) strokeSpan(g, line, 0, 1);

      // Data is always moving along the wires, a little brighter than the wires themselves.
      g.save();
      g.strokeStyle = 'rgb(69 212 255 / 0.3)';
      g.setLineDash([2, 10]);
      g.lineDashOffset = -Math.round(t * 24);
      for (const line of Object.values(wires)) strokeSpan(g, line, 0, 1);
      g.restore();

      const active = moves.filter(move => t >= move.from && t <= move.to);
      for (const move of active) {
        const u = (t - move.from) / (move.to - move.from);
        const f = lerp(move.span[0], move.span[1], u);
        const hot = move.color === C.crimson ? C.crimson : C.cyan;
        g.strokeStyle = hot;
        g.globalAlpha = 0.16;
        g.lineWidth = 6;
        strokeSpan(g, wires[move.wire], move.span[0], f);
        g.globalAlpha = 0.9;
        g.lineWidth = 2;
        strokeSpan(g, wires[move.wire], move.span[0], f);
        g.globalAlpha = 1;
      }

      // Packets travel behind the nodes, so they never cross a label.
      for (const move of active) {
        const u = (t - move.from) / (move.to - move.from);
        const f = lerp(move.span[0], move.span[1], u);
        const line = wires[move.wire];
        const [x, y] = pointOn(line, f);
        if (move.shape === 'fish') {
          drawFish(g, x, y, move.span[1] < move.span[0], move.color || C.cyan);
          continue;
        }
        const back = Math.sign(move.span[1] - move.span[0]) * (10 / line.total);
        for (let i = 3; i >= 1; i--) {
          const [tx, ty] = pointOn(line, clamp(f - back * i, Math.min(...move.span), Math.max(...move.span)));
          g.globalAlpha = 0.34 - i * 0.08;
          g.fillStyle = move.color || C.green;
          g.fillRect(Math.round(tx) - 3, Math.round(ty) - 3, 6, 6);
        }
        g.globalAlpha = 1;
        drawPacket(g, x, y, move.color);
      }

      for (const [id, node] of Object.entries(nodes)) {
        const cue = cues.filter(c => c.node === id && t >= c.from && t <= c.to).pop();
        const tone = cue ? { active: C.yellow, good: C.green, bad: C.crimson }[cue.tone] : null;
        if (cue) {
          const u = clamp((t - cue.from) / 0.32, 0, 1);
          const grow = u * 9;
          g.globalAlpha = (1 - u) * 0.8;
          g.strokeStyle = tone;
          g.lineWidth = 2;
          g.strokeRect(node.x - grow, node.y - grow, node.w + grow * 2, node.h + grow * 2);
          g.globalAlpha = 1;
        }
        g.fillStyle = C.panel;
        g.fillRect(node.x, node.y, node.w, node.h);
        g.strokeStyle = tone || C.line;
        g.lineWidth = 2;
        g.strokeRect(node.x + 1, node.y + 1, node.w - 2, node.h - 2);
        g.fillStyle = tone || C.cyan;
        for (const [cx, cy, dx, dy] of [[node.x, node.y, 1, 1], [node.x + node.w, node.y, -1, 1], [node.x, node.y + node.h, 1, -1], [node.x + node.w, node.y + node.h, -1, -1]]) {
          g.fillRect(dx > 0 ? cx : cx - 6, dy > 0 ? cy : cy - 2, 6, 2);
          g.fillRect(dx > 0 ? cx : cx - 2, dy > 0 ? cy : cy - 6, 2, 6);
        }
        g.fillStyle = C.text;
        g.fillText(node.label, node.cx, node.cy + 0.5);
      }

      if (spec.overlay) spec.overlay(g, t, nodes);

      for (const note of spec.notes || []) {
        if (note.from !== undefined && (t < note.from || t > note.to)) continue;
        const x = note.x * w;
        const y = note.y * h;
        g.fillStyle = C.muted;
        g.fillText(note.text, x, y);
        if (note.mark) {
          g.fillStyle = note.mark;
          g.fillRect(Math.round(x - g.measureText(note.text).width / 2 - 10), Math.round(y - 3), 6, 6);
        }
      }
    }
  };
}

const runbooksFlow = flow({
  period: 6.2,
  still: 2.6,
  height: 148,
  nodes: {
    transcripts: { label: 'Transcripts', x: 0.1, y: 0.18 },
    slack: { label: 'Slack', x: 0.1, y: 0.5 },
    docs: { label: 'Design docs', x: 0.1, y: 0.82 },
    agents: { label: 'ReAct agents', short: 'Agents', x: 0.42, y: 0.5 },
    runbooks: { label: 'Runbooks', x: 0.68, y: 0.5 },
    engineers: { label: 'Engineers', short: 'Eng.', x: 0.92, y: 0.5 }
  },
  wires: {
    a: [[0.1, 0.18], [0.26, 0.18], [0.26, 0.5], [0.42, 0.5]],
    b: [[0.1, 0.5], [0.42, 0.5]],
    c: [[0.1, 0.82], [0.26, 0.82], [0.26, 0.5], [0.42, 0.5]],
    build: [[0.42, 0.5], [0.68, 0.5]],
    search: [[0.68, 0.5], [0.92, 0.5]]
  },
  moves: [
    leg('a', 0, 0.9, { hit: 'agents' }), leg('build', 1.15, 0.75, { hit: 'runbooks' }),
    leg('b', 2, 0.7, { hit: 'agents' }), leg('build', 2.95, 0.75, { hit: 'runbooks' }),
    leg('c', 3.9, 0.9, { hit: 'agents' }), leg('build', 5.05, 0.75, { hit: 'runbooks' }),
    // Searches take a fraction of the time builds do, so they barely register as they pass.
    ...[0.6, 2.5, 4.4].flatMap(from => [
      leg('search', from, 0.14, { span: [1, 0], color: C.cyan, hit: 'runbooks' }),
      leg('search', from + 0.2, 0.14, { color: C.cyan, hit: 'engineers' })
    ])
  ],
  notes: [{ text: '<100 ms', x: 0.8, y: 0.3 }],
  overlay(g, t, nodes) {
    const made = [1.9, 3.7, 5.8].filter(at => t >= at).length;
    const { x, y } = nodes.runbooks;
    g.fillStyle = C.cyan;
    for (let i = 0; i < made; i++) g.fillRect(x + 4 + i * 10, y - 12, 7, 8);
    const thinking = Math.floor(t * 6) % 3;
    const agents = nodes.agents;
    for (let i = 0; i < 3; i++) {
      g.fillStyle = i === thinking ? C.yellow : C.line;
      g.fillRect(Math.round(agents.cx - 12 + i * 10), agents.y - 11, 5, 5);
    }
  }
});

const triageFlow = flow({
  period: 7.6,
  still: 3.1,
  height: 148,
  nodes: {
    incident: { label: 'Incident', x: 0.08, y: 0.74 },
    agent: { label: 'LangGraph agent', short: 'Agent', x: 0.3, y: 0.74 },
    mcp: { label: 'MCP', x: 0.46, y: 0.17 },
    jira: { label: 'Jira', x: 0.6, y: 0.17 },
    cli: { label: 'CLI', x: 0.74, y: 0.17 },
    approval: { label: 'Approval', x: 0.7, y: 0.74 },
    resolved: { label: 'Resolved', x: 0.92, y: 0.74 }
  },
  wires: {
    in: [[0.08, 0.74], [0.3, 0.74]],
    mcp: [[0.3, 0.74], [0.3, 0.44], [0.46, 0.44], [0.46, 0.17]],
    jira: [[0.3, 0.74], [0.3, 0.44], [0.6, 0.44], [0.6, 0.17]],
    cli: [[0.3, 0.74], [0.3, 0.44], [0.74, 0.44], [0.74, 0.17]],
    out: [[0.3, 0.74], [0.7, 0.74]],
    done: [[0.7, 0.74], [0.92, 0.74]]
  },
  moves: [
    leg('in', 0, 0.7, { hit: 'agent', color: C.crimson }),
    leg('mcp', 0.9, 0.5, { hit: 'mcp' }), leg('mcp', 1.5, 0.5, { span: [1, 0], hit: 'agent' }),
    leg('jira', 2.1, 0.55, { hit: 'jira' }), leg('jira', 2.75, 0.55, { span: [1, 0], hit: 'agent' }),
    leg('cli', 3.4, 0.6, { hit: 'cli' }), leg('cli', 4.1, 0.6, { span: [1, 0], hit: 'agent' }),
    leg('out', 4.8, 0.6, { hit: 'approval' }),
    leg('done', 6, 0.5, { hit: 'resolved' })
  ],
  cues: [
    { node: 'incident', from: 0, to: 0.8, tone: 'bad' },
    { node: 'approval', from: 5.4, to: 6, tone: 'active' },
    { node: 'resolved', from: 6.5, to: 7.6, tone: 'good' }
  ],
  notes: [{ text: '20+ tools', x: 0.89, y: 0.17 }]
});

const billingFlow = flow({
  period: 6.8,
  still: 3.5,
  height: 132,
  nodes: {
    document: { label: 'Document', x: 0.09, y: 0.24 },
    ocr: { label: 'Cloud Vision OCR', short: 'OCR', x: 0.47, y: 0.24 },
    portal: { label: 'Review portal', short: 'Portal', x: 0.89, y: 0.24 },
    stripe: { label: 'Stripe webhook', short: 'Stripe', x: 0.09, y: 0.76 },
    api: { label: 'Billing API', short: 'API', x: 0.47, y: 0.76 },
    ledger: { label: 'Credit ledger', short: 'Ledger', x: 0.89, y: 0.76 }
  },
  wires: {
    scan: [[0.09, 0.24], [0.47, 0.24]],
    review: [[0.47, 0.24], [0.89, 0.24]],
    event: [[0.09, 0.76], [0.47, 0.76]],
    write: [[0.47, 0.76], [0.89, 0.76]]
  },
  moves: [
    leg('scan', 0.2, 1, { hit: 'ocr' }), leg('review', 1.6, 0.9, { hit: 'portal' }),
    leg('scan', 3.6, 1, { hit: 'ocr' }), leg('review', 5, 0.9, { hit: 'portal' }),
    leg('event', 0, 0.8, { hit: 'api' }), leg('write', 1, 0.8, { hit: 'ledger' }),
    leg('event', 2.4, 0.8), leg('event', 3.2, 0.45, { span: [1, 0.45], color: C.crimson }),
    leg('event', 4.4, 0.7, { hit: 'api' }), leg('write', 5.3, 0.8, { hit: 'ledger' })
  ],
  cues: [{ node: 'api', from: 3.2, to: 3.8, tone: 'bad' }],
  notes: [{ text: 'Duplicate ignored', x: 0.68, y: 0.6, from: 3.2, to: 4.5, mark: C.crimson }],
  overlay(g, t, nodes) {
    const rows = [1.8, 6.1].filter(at => t >= at).length;
    const { x, y, w } = nodes.ledger;
    g.fillStyle = C.green;
    for (let i = 0; i < rows; i++) g.fillRect(x + 3, y - 7 - i * 6, w - 6, 3);
  }
});

const uploadsFlow = flow({
  period: 7,
  still: 3.2,
  height: 156,
  nodes: {
    app: { label: 'iOS field app', short: 'iOS app', x: 0.09, y: 0.2 },
    sync: { label: 'Sync API', x: 0.5, y: 0.2 },
    s3: { label: 'AWS S3', x: 0.91, y: 0.2 },
    images: { label: 'Fish images', short: 'Images', x: 0.09, y: 0.76 },
    analysis: { label: 'Analysis', x: 0.91, y: 0.76 }
  },
  wires: {
    up: [[0.09, 0.2], [0.5, 0.2]],
    store: [[0.5, 0.2], [0.91, 0.2]],
    t1: [[0.09, 0.76], [0.26, 0.76], [0.26, 0.56], [0.74, 0.56], [0.74, 0.76], [0.91, 0.76]],
    t2: [[0.09, 0.76], [0.26, 0.76], [0.26, 0.69], [0.74, 0.69], [0.74, 0.76], [0.91, 0.76]],
    t3: [[0.09, 0.76], [0.26, 0.76], [0.26, 0.82], [0.74, 0.82], [0.74, 0.76], [0.91, 0.76]],
    t4: [[0.09, 0.76], [0.26, 0.76], [0.26, 0.95], [0.74, 0.95], [0.74, 0.76], [0.91, 0.76]]
  },
  moves: [
    leg('up', 0, 1, { shape: 'fish', hit: 'sync' }), leg('store', 1.1, 1, { shape: 'fish', hit: 's3' }),
    leg('up', 2.4, 0.6, { shape: 'fish', span: [0, 0.62] }),
    leg('up', 3, 0.4, { shape: 'fish', span: [0.62, 0], color: C.crimson }),
    leg('up', 3.7, 1, { shape: 'fish', hit: 'sync' }), leg('store', 4.8, 1, { shape: 'fish', hit: 's3' }),
    ...[0, 0.5, 2.2, 3.9, 4.4].flatMap((from, i) => ['t1', 't2', 't3', 't4'].map((wire, n) => leg(wire, from + n * 0.14, 1.7 - ((i + n) % 3) * 0.2, n === 3 ? { hit: 'analysis' } : {})))
  ],
  notes: [
    { text: 'Automatic retry', x: 0.28, y: 0.39, from: 3, to: 3.8, mark: C.crimson },
    { text: 'Rayon threads', x: 0.5, y: 0.47 }
  ]
});

function waffle() {
  const r = prng(46);
  const order = [...Array(100).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const changed = new Set(order.slice(0, 46));

  return {
    period: 7,
    still: 6,
    height: narrow => (narrow ? 148 : 96),
    draw(g, t, w, h) {
      const narrow = w < NARROW;
      const cols = narrow ? 20 : 25;
      const rows = narrow ? 5 : 4;
      const gap = 2;
      const legendW = narrow ? 0 : 190;
      const cell = Math.floor(Math.min((w - legendW - 8 - gap * (cols - 1)) / cols, (h - (narrow ? 34 : 8) - gap * (rows - 1)) / rows));
      const sweep = clamp(t / 3.2, 0, 1) * cols;
      let shown = 0;
      for (let i = 0; i < 100; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const done = col < sweep;
        if (done && changed.has(i)) shown += 1;
        g.fillStyle = !done ? C.plane : changed.has(i) ? C.crimson : C.hot;
        g.fillRect(col * (cell + gap), 4 + row * (cell + gap), cell, cell);
      }
      if (sweep < cols) {
        g.fillStyle = C.yellow;
        g.fillRect(Math.round(sweep * (cell + gap)) - 1, 0, 2, rows * (cell + gap) + 6);
      }
      const legendX = narrow ? 0 : cols * (cell + gap) + 18;
      const legendY = narrow ? rows * (cell + gap) + 14 : 22;
      const lineGap = narrow ? 0 : 24;
      g.font = narrow ? LABEL_SMALL : LABEL;
      g.textAlign = 'left';
      g.textBaseline = 'middle';
      const passed = Math.round((clamp(sweep, 0, cols) / cols) * 100);
      g.fillStyle = C.crimson;
      g.fillRect(legendX, legendY - 4, 8, 8);
      g.fillStyle = C.text;
      g.fillText(`${shown}% prediction changed`, legendX + 14, legendY);
      const secondX = narrow ? legendX + w / 2 + 8 : legendX;
      g.fillStyle = C.hot;
      g.fillRect(secondX, legendY + lineGap - 4, 8, 8);
      g.fillStyle = C.muted;
      g.fillText(`${passed - shown}% unchanged`, secondX + 14, legendY + lineGap);
    }
  };
}

function race() {
  const RUN = 7;
  return {
    period: 8,
    still: 7.4,
    height: () => 92,
    draw(g, t, w) {
      const run = clamp(t / RUN, 0, 1);
      const done = Math.min(23, Math.floor(run * 23));
      g.font = w < NARROW ? LABEL_SMALL : LABEL;
      g.textBaseline = 'middle';
      const lanes = [
        { y: 8, label: 'Without the cache', count: run >= 1 ? '1 query' : '0 queries' },
        { y: 50, label: 'Redis + OpenSearch', count: `${done} ${done === 1 ? 'query' : 'queries'}` }
      ];
      for (const lane of lanes) {
        g.textAlign = 'left';
        g.fillStyle = C.muted;
        g.fillText(lane.label, 0, lane.y);
        g.textAlign = 'right';
        g.fillStyle = C.text;
        g.fillText(lane.count, w, lane.y);
        g.fillStyle = C.line;
        g.fillRect(0, lane.y + 10, w, 4);
      }
      g.fillStyle = C.muted;
      g.fillRect(0, lanes[0].y + 10, Math.round(run * w), 4);
      const lap = run >= 1 ? 1 : (run * 23) % 1;
      g.fillStyle = C.cyan;
      g.fillRect(0, lanes[1].y + 10, Math.round(lap * w), 4);
      const tick = (w - 22 * 2) / 23;
      for (let i = 0; i < 23; i++) {
        g.fillStyle = i < done ? C.cyan : C.line;
        g.fillRect(Math.round(i * (tick + 2)), lanes[1].y + 20, Math.max(1, Math.floor(tick)), 6);
      }
    }
  };
}

function hnsw() {
  const r = prng(41);
  const COUNTS = [84, 24, 7];
  const HOP = 0.24;
  const HOLD = 1.3;
  const points = Array.from({ length: COUNTS[0] }, () => [r(), r()]);
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const links = COUNTS.map((count, layer) => {
    const adjacent = Array.from({ length: count }, () => new Set());
    for (let i = 0; i < count; i++) {
      const nearest = [...Array(count).keys()]
        .filter(j => j !== i)
        .sort((a, b) => distance(points[i], points[a]) - distance(points[i], points[b]))
        .slice(0, layer === 2 ? 2 : 3);
      for (const j of nearest) {
        adjacent[i].add(j);
        adjacent[j].add(i);
      }
    }
    return adjacent.map(set => [...set]);
  });
  // A real greedy descent: move to whichever neighbour is closer to the query until none is, then drop a layer.
  let clock = 0;
  const searches = Array.from({ length: 6 }, () => {
    const query = [0.08 + r() * 0.84, 0.08 + r() * 0.84];
    let node = 0;
    const hops = [{ layer: 2, node }];
    for (let layer = 2; layer >= 0; layer--) {
      if (layer < 2) hops.push({ layer, node });
      for (;;) {
        const best = links[layer][node].reduce((b, n) => (distance(points[n], query) < distance(points[b], query) ? n : b), node);
        if (best === node) break;
        node = best;
        hops.push({ layer, node });
      }
    }
    const start = clock;
    clock += hops.length * HOP + HOLD;
    return { query, hops, start };
  });
  let base = null;
  let project = () => [0, 0];
  let planeH = 0;

  return {
    period: clock,
    still: searches[0].hops.length * HOP + 0.2,
    height: () => 228,
    layout(g, w, h, dpr) {
      const left = 22;
      const shear = Math.min(44, w * 0.1);
      const planeW = w - left - shear - 4;
      const gap = 10;
      planeH = (h - gap * 2 - 4) / 3;
      const top = layer => 2 + (2 - layer) * (planeH + gap);
      project = ([x, y], layer) => [left + shear * (1 - y) + x * planeW, top(layer) + y * planeH];

      base = document.createElement('canvas');
      base.width = w * dpr;
      base.height = h * dpr;
      const b = base.getContext('2d');
      b.scale(dpr, dpr);
      b.font = LABEL_SMALL;
      b.textBaseline = 'middle';
      for (let layer = 2; layer >= 0; layer--) {
        const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(p => project(p, layer));
        b.beginPath();
        corners.forEach(([x, y], i) => { if (i) b.lineTo(x, y); else b.moveTo(x, y); });
        b.closePath();
        b.fillStyle = 'rgb(21 28 64 / 0.75)';
        b.fill();
        b.strokeStyle = 'rgb(69 212 255 / 0.45)';
        b.lineWidth = 1;
        b.stroke();
        b.fillStyle = C.muted;
        b.fillText(`L${layer}`, 0, top(layer) + planeH / 2);
        b.strokeStyle = 'rgb(85 102 184 / 0.75)';
        b.beginPath();
        links[layer].forEach((neighbours, i) => {
          for (const n of neighbours) {
            if (n < i) continue;
            b.moveTo(...project(points[i], layer));
            b.lineTo(...project(points[n], layer));
          }
        });
        b.stroke();
        b.fillStyle = C.muted;
        const size = layer === 0 ? 2 : 3;
        for (let i = 0; i < COUNTS[layer]; i++) {
          const [x, y] = project(points[i], layer);
          b.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
        }
      }
    },
    draw(g, t, w, h) {
      if (!base) return;
      g.drawImage(base, 0, 0, w, h);
      const search = searches.filter(s => t >= s.start).pop();
      const local = t - search.start;
      const { hops, query } = search;
      const reached = Math.min(hops.length - 1, Math.floor(local / HOP));
      const finished = local >= (hops.length - 1) * HOP;

      const [qx, qTop] = project(query, 2);
      const [, qBottom] = project(query, 0);
      g.strokeStyle = C.yellow;
      g.globalAlpha = 0.35;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(qx, qTop);
      g.lineTo(qx, qBottom);
      g.stroke();
      g.globalAlpha = 1;
      for (let layer = 0; layer <= 2; layer++) {
        const [x, y] = project(query, layer);
        g.fillStyle = C.yellow;
        g.fillRect(Math.round(x) - 4, Math.round(y) - 1, 8, 2);
        g.fillRect(Math.round(x) - 1, Math.round(y) - 4, 2, 8);
      }

      g.strokeStyle = C.cyan;
      g.lineWidth = 2;
      g.beginPath();
      hops.forEach((hop, i) => {
        if (i > reached) return;
        const [x, y] = project(points[hop.node], hop.layer);
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      });
      const current = hops[reached];
      const next = hops[reached + 1];
      const [cx, cy] = project(points[current.node], current.layer);
      let headX = cx;
      let headY = cy;
      if (next) {
        const [nx, ny] = project(points[next.node], next.layer);
        const u = smooth(clamp(local / HOP - reached, 0, 1));
        headX = lerp(cx, nx, u);
        headY = lerp(cy, ny, u);
        g.lineTo(headX, headY);
      }
      g.stroke();
      g.fillStyle = C.cyan;
      for (let i = 0; i <= reached; i++) {
        const [x, y] = project(points[hops[i].node], hops[i].layer);
        g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
      }
      drawPacket(g, headX, headY);
      if (finished) {
        g.strokeStyle = C.yellow;
        g.lineWidth = 2;
        g.strokeRect(Math.round(headX) - 8, Math.round(headY) - 8, 16, 16);
      }
    }
  };
}

function rerank() {
  const ITEMS = [
    { match: true, length: 0.94 }, { match: false, length: 0.62 }, { match: true, length: 0.8 }, { match: false, length: 0.7 },
    { match: false, length: 0.5 }, { match: true, length: 0.68 }, { match: true, length: 0.76 }, { match: false, length: 0.44 }
  ];
  // Two of the first five are matches before reranking and four after, which is the measured 40% to 80%.
  const BEFORE = [0, 1, 2, 3, 4, 5, 6, 7];
  const AFTER = [0, 2, 5, 6, 1, 3, 4, 7];
  const MOVE_FROM = 2.2;
  const MOVE_TO = 3.4;

  return {
    period: 7,
    still: 5,
    height: () => 196,
    draw(g, t, w, h) {
      const head = 26;
      const rowH = (h - head) / 8;
      const u = smooth(clamp((t - MOVE_FROM) / (MOVE_TO - MOVE_FROM), 0, 1));
      g.font = w < NARROW ? LABEL_SMALL : LABEL;
      g.textBaseline = 'middle';
      g.textAlign = 'left';
      g.fillStyle = C.muted;
      g.fillText(t < MOVE_FROM ? 'FAISS retrieval' : 'After reranking', 0, 10);
      g.textAlign = 'right';
      g.fillStyle = C.text;
      g.fillText(`Top-5 matches ${u < 0.5 ? 40 : 80}%`, w, 10);

      g.fillStyle = C.plane;
      g.fillRect(0, head - 2, w, rowH * 5);
      g.fillStyle = C.yellow;
      g.fillRect(0, head - 2, 2, rowH * 5);

      g.textAlign = 'left';
      for (let rank = 0; rank < 8; rank++) {
        g.fillStyle = rank < 5 ? C.muted : C.hot;
        g.fillText(String(rank + 1), 8, head - 2 + rowH * (rank + 0.5));
      }
      const trackX = 24;
      const trackW = w - trackX - 20;
      ITEMS.forEach((item, index) => {
        const from = BEFORE.indexOf(index);
        const to = AFTER.indexOf(index);
        const y = head - 2 + rowH * (lerp(from, to, u) + 0.5);
        g.fillStyle = item.match ? C.cyan : C.line;
        g.fillRect(trackX, Math.round(y) - 3, Math.round(item.length * trackW), 6);
        const markX = w - 14;
        if (item.match) {
          g.fillStyle = C.cyan;
          g.fillRect(markX, Math.round(y) - 4, 8, 8);
        } else {
          g.strokeStyle = C.hot;
          g.lineWidth = 1;
          g.strokeRect(markX + 0.5, Math.round(y) - 3.5, 7, 7);
        }
      });
    }
  };
}

const DIAGRAMS = {
  runbooks: runbooksFlow, triage: triageFlow, billing: billingFlow, uploads: uploadsFlow,
  waffle: waffle(), race: race(), hnsw: hnsw(), rerank: rerank()
};

function decode(el) {
  const final = el.dataset.final || el.textContent;
  el.dataset.final = final;
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    if (step >= 9) {
      clearInterval(timer);
      el.textContent = final;
      return;
    }
    el.textContent = final.replace(/\d/g, digit => (Math.random() < step / 9 ? digit : String(Math.floor(Math.random() * 10))));
  }, 45);
}

export function startViz() {
  const root = document.documentElement;
  const effectsOn = () => root.dataset.fx !== 'off';
  const items = [...document.querySelectorAll('[data-viz]')].map(el => {
    el.hidden = false;
    const canvas = el.querySelector('canvas');
    return { el, canvas, g: canvas.getContext('2d'), spec: DIAGRAMS[el.dataset.viz], w: 0, h: 0, dpr: 1, visible: false, start: 0 };
  });
  let raf = 0;
  let last = 0;

  function fit(item) {
    const w = Math.round(item.el.clientWidth);
    if (!w) return false;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (w === item.w && dpr === item.dpr) return true;
    const h = item.spec.height(w < NARROW);
    Object.assign(item, { w, h, dpr });
    item.canvas.width = Math.round(w * dpr);
    item.canvas.height = Math.round(h * dpr);
    item.canvas.style.height = `${h}px`;
    item.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (item.spec.layout) item.spec.layout(item.g, w, h, dpr);
    return true;
  }

  function paint(item, t) {
    if (!fit(item)) return;
    item.g.setTransform(item.dpr, 0, 0, item.dpr, 0, 0);
    item.g.clearRect(0, 0, item.w, item.h);
    item.spec.draw(item.g, t % item.spec.period, item.w, item.h);
  }

  const paintStill = item => paint(item, item.spec.still);

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / FPS - 1) return;
    last = now;
    for (const item of items) {
      if (item.visible) paint(item, (now - item.start) / 1000);
    }
  }

  function sync() {
    const run = effectsOn() && !document.hidden && items.some(item => item.visible);
    if (run && !raf) {
      const now = performance.now();
      for (const item of items) item.start = now;
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (!effectsOn()) items.forEach(item => { if (item.visible) paintStill(item); });
  }

  const viewer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const item = items.find(i => i.el === entry.target);
      item.visible = entry.isIntersecting;
      if (item.visible) {
        item.start = performance.now();
        paintStill(item);
      }
    }
    sync();
  }, { rootMargin: '120px 0px' });
  items.forEach(item => viewer.observe(item.el));

  const resizer = new ResizeObserver(entries => {
    for (const entry of entries) {
      const item = items.find(i => i.el === entry.target);
      if (item.visible && !raf) paintStill(item);
      else fit(item);
    }
  });
  items.forEach(item => resizer.observe(item.el));

  const redo = () => items.forEach(item => {
    item.w = 0;
    if (item.visible) paintStill(item);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redo);

  // Headline numbers decode and their meters run each time they come into view.
  const lists = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) {
        entry.target.classList.remove('is-live');
        continue;
      }
      if (!effectsOn()) continue;
      entry.target.classList.add('is-live');
      entry.target.querySelectorAll('b').forEach(decode);
    }
  }, { threshold: 0.4 });
  document.querySelectorAll('.stats').forEach(list => lists.observe(list));

  document.addEventListener('visibilitychange', sync);
  sync();
  return { sync };
}
