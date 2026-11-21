// Event Horizon — a review game. The ship's AI, B.F. 9000, has locked the system rooms while the ship
// drifts toward a black hole. Walk the ship, earn credits at the main terminal, pay for doors and repair
// failed systems before the event horizon clock runs out.
// Plan and handoff: project doc "claude/Event Horizon - Plan.md".
// Built so far: step 1 (the ship drawn in vector, walking with keys, collisions on a walkable grid).
//
// URL options:
//   ?dev   test tools: walkable-grid overlay, open all doors, jump to a room, player position
(function () {
'use strict';

/* ==== SECTION: Settings ==== */
const SETTINGS = {
  SPEED: 150,            // walking speed, ship units per second (terminal to a room door is about 6 s)
  PLAYER_SCALE: 0.62,    // the engine-room sample's astronaut, scaled to the ship
  FOOT_W: 9, FOOT_H: 5,  // half-width and half-height of the player's foot box (collisions)
  CELL: 8,               // walkable-grid cell size, ship units
  DOOR_SPEED: 3.5,       // door slide speed (share of a full slide per second)
  START: { x: 1094, y: 522, dir: 'right' }
};
const SHIP_W = 1536, SHIP_H = 1024;           // floor-plan coordinates
const BOX = { x: 60, y: 58, w: 1440, h: 908 }; // the part of the plan that is fit to the screen

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEV = params.has('dev');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stage = $('stage'), svg = $('ship');
// The scene is four stacked SVGs sharing one viewBox, so the static ship is painted once and cached:
//   bg (space, static) → sky (black hole, twinkles, plumes) → ship (#ship: hull, walls, floors, static props)
//   → front (machines, screens, doors, player: everything that moves)
function stackSvg(id, before) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.id = 'eh-' + id; s.setAttribute('class', 'eh-svg'); s.setAttribute('aria-hidden', 'true');
  stage.insertBefore(s, before);
  return s;
}
const SVG_BG = stackSvg('bgsvg', svg), SVG_SKY = stackSvg('skysvg', svg), SVG_FRONT = stackSvg('frontsvg', svg.nextSibling);
const ALL_SVGS = [SVG_BG, SVG_SKY, svg, SVG_FRONT];
let DEFS = null;

/* ==== SECTION: Art palette (read from style.css, --eh-<name>) ==== */
const cssVars = getComputedStyle(document.documentElement);
const C = new Proxy({}, {
  get(cache, name) {
    if (!(name in cache)) {
      cache[name] = cssVars.getPropertyValue('--eh-' + String(name)).trim();
      if (!cache[name]) console.warn('Event Horizon: missing art color --eh-' + String(name));
    }
    return cache[name];
  }
});

/* ==== SECTION: Helpers ==== */
const NS = 'http://www.w3.org/2000/svg';
const f1 = (n) => Math.round(n * 10) / 10;
const pts = (a) => a.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ');
const ref = (id) => document.getElementById('eh-' + id);
function add(parent, html) { parent.insertAdjacentHTML('beforeend', html); return parent.lastElementChild; }
function layer(id, parent) { const g = document.createElementNS(NS, 'g'); g.id = 'eh-' + id; (parent || svg).appendChild(g); return g; }
function rng(seed) { let s = seed; return () => (s = s * 16807 % 2147483647) / 2147483647; }

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// Blocker shapes: { r: [x1, y1, x2, y2] } | { c: [cx, cy, radius] } | { p: [[x, y], ...] }
function inShape(x, y, s) {
  if (s.r) return x >= s.r[0] && x <= s.r[2] && y >= s.r[1] && y <= s.r[3];
  if (s.c) return (x - s.c[0]) ** 2 + (y - s.c[1]) ** 2 <= s.c[2] ** 2;
  return inPoly(x, y, s.p);
}
// Catmull-Rom curve through points (open), then evenly spaced points with arc length and outward normal
function spline(p, perSeg) {
  const out = [], n = p.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(n - 1, i + 2)];
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((d) => .5 * (2 * p1[d] + (p2[d] - p0[d]) * t +
        (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(p[n - 1].slice());
  return out;
}
function resample(line, step) {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = cum[cum.length - 1], n = Math.max(2, Math.round(total / step)), out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const s = total * k / n;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const u = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push({ x: line[j][0] + (line[j + 1][0] - line[j][0]) * u, y: line[j][1] + (line[j + 1][1] - line[j][1]) * u, s });
  }
  out.forEach((q, i) => {       // clockwise travel, so the outward normal is (ty, -tx)
    const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    q.nx = ty / l; q.ny = -tx / l;
  });
  return out;
}
const mirror = (p) => [p[0], SHIP_H - p[1]];  // the ship is symmetric about y = 512

/* ==== SECTION: Floor plan ====
   Landscape brain seen from above: engines on the left, command center (front) on the right,
   the corridor along the fissure. Room shapes are polygons (clockwise); every upward-facing edge
   gets a wall face (3/4 view), which is not walkable. */
const W_BAND = 26;   // thickness of the cream wall tops around each floor
const FACE = 20;     // height of the north wall faces
const ROOMS = [
  { id: 'engine', name: 'Engine room', machine: 'Anti-gravity thruster', at: { x: 480, y: 318 },
    door: { x: 485, side: 's' },
    poly: [[380, 200], [604, 200], [640, 236], [640, 386], [616, 410], [344, 410], [320, 386], [320, 262]] },
  { id: 'life', name: 'Life support', machine: 'Oxygen tank and scrubbers', at: { x: 800, y: 290 },
    door: { x: 855, side: 's' },
    poly: [[700, 226], [736, 190], [784, 190], [796, 150], [884, 150], [896, 190], [930, 190], [1010, 262],
      [1010, 386], [986, 410], [724, 410], [700, 386]] },
  { id: 'reactor', name: 'Reactor', machine: 'Reactor core', at: { x: 486, y: 734 },
    door: { x: 485, side: 'n' },
    poly: [[344, 614], [616, 614], [640, 638], [640, 780], [596, 824], [382, 824], [320, 762], [320, 638]] },
  { id: 'shield', name: 'Shield bay', machine: 'Shield generator', at: { x: 858, y: 742 },
    door: { x: 855, side: 'n' },
    poly: [[724, 614], [986, 614], [1010, 638], [1010, 764], [940, 834], [764, 834], [700, 770], [700, 638]] }
];
const CORRIDOR = [[290, 462], [1060, 462], [1060, 562], [290, 562]];
const CC_POLY = [[1050, 346], [1106, 290], [1240, 290], [1340, 352], [1366, 452], [1366, 572], [1340, 672],
  [1240, 734], [1106, 734], [1050, 678]];
const TERMINAL = { x: 1144, y: 512 };

// Doors: one per room, 90 wide, through the wall between the room and the corridor
const DOORS = ROOMS.map((r, i) => {
  const d = r.door, up = d.side === 's';
  Object.assign(d, { i, room: r, x1: d.x - 45, x2: d.x + 45, y1: up ? 410 : 562, y2: up ? 462 : 614,
    open: false, want: false, t: 0 });
  d.mid = (d.y1 + d.y2) / 2;
  return d;
});
const FLOORS = [
  ...ROOMS.map((r) => ({ id: r.id, poly: r.poly, tile: 'floor', gaps: r.door.side === 'n' ? [[r.door.x1, r.door.x2]] : [] })),
  { id: 'corridor', poly: CORRIDOR, tile: 'floor2', faceMaxX: 1050,
    gaps: DOORS.filter((d) => d.side === 's').map((d) => [d.x1, d.x2]) },
  { id: 'cc', poly: CC_POLY, tile: 'floor', gaps: [] }
];
const PASSAGES = DOORS.map((d) => ({ id: 'door' + d.i, poly: [[d.x1, d.y1 - 6], [d.x2, d.y1 - 6], [d.x2, d.y2 + 6], [d.x1, d.y2 + 6]] }));

// Wall-face quads for a floor: upward-facing edges, minus door gaps
function faceQuads(f) {
  const out = [], p = f.poly;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (-dx / len >= -0.3) continue;              // outward normal's y component
    let segs = [[a, b]];
    if (dy === 0) {
      let spans = [[a[0], Math.min(b[0], f.faceMaxX || Infinity)]];
      (f.gaps || []).forEach(([g1, g2]) => {
        spans = spans.flatMap(([s, e]) => (g2 <= s || g1 >= e) ? [[s, e]] : [[s, g1], [g2, e]].filter((q) => q[1] - q[0] > 1));
      });
      segs = spans.map(([s, e]) => [[s, a[1]], [e, a[1]]]);
    }
    segs.forEach(([u, v]) => out.push({ flat: dy === 0, q: [u, v, [v[0], v[1] + FACE], [u[0], u[1] + FACE]] }));
  }
  return out;
}

/* ==== SECTION: Drawing registries ==== */
const BLOCKERS = [];                 // shapes the player can't walk into
const block = (...s) => BLOCKERS.push(...s);
const ANIM = [];                     // per-frame idle animations: (t, dt) => void
const SYS = {};                      // systems by room id (state, machine center) for later steps

/* ==== SECTION: Defs (patterns and gradients) ==== */
function drawDefs() {
  const glow = (id, c, a) => `<radialGradient id="eh-${id}"><stop offset="0" stop-color="${c}" stop-opacity="${a}"/>` +
    `<stop offset=".5" stop-color="${c}" stop-opacity="${f1(a / 3 * 10) / 10}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  const core = (id, a, b, c, d) => `<radialGradient id="eh-${id}"><stop offset="0" stop-color="${a}"/><stop offset=".35" stop-color="${b}"/>` +
    `<stop offset=".7" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></radialGradient>`;
  const floorTile = (id, bg, fill, lit) => `<pattern id="eh-${id}" width="28" height="28" patternUnits="userSpaceOnUse">
      <rect width="28" height="28" fill="${bg}"/><rect x="1" y="1" width="26" height="26" rx="1.5" fill="${fill}"/>
      <rect x="1" y="1" width="26" height="1.5" fill="${lit}"/>
      <g fill="${C.floorbolt}"><circle cx="4" cy="4.5" r=".8"/><circle cx="24" cy="4.5" r=".8"/><circle cx="4" cy="24" r=".8"/><circle cx="24" cy="24" r=".8"/></g>
    </pattern>`;
  DEFS = add(svg, `<defs id="eh-defs">
    <pattern id="eh-plating" width="72" height="48" patternUnits="userSpaceOnUse">
      <rect width="72" height="48" fill="${C.hull}"/>
      <rect width="72" height="1.6" fill="${C.hullline}"/><rect width="1.6" height="48" fill="${C.hullline}"/>
      <rect x="1.6" y="1.6" width="70.4" height="2.2" fill="${C.hulllit}"/>
      <g fill="${C.hullrivet}"><circle cx="6" cy="7" r="1.2"/><circle cx="66" cy="7" r="1.2"/><circle cx="6" cy="42" r="1.2"/><circle cx="66" cy="42" r="1.2"/></g>
      <rect x="23" y="19" width="26" height="9" rx="2" fill="${C.hullpanel}"/>
    </pattern>
    ${floorTile('floor', C.floorbg, C.floor, C.floorlit)}
    ${floorTile('floor2', C.floor2bg, C.floor2, C.floor2lit)}
    <pattern id="eh-grate" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="${C.grate}"/><rect width="6" height="2.2" fill="${C.gratelit}"/>
    </pattern>
    <pattern id="eh-hazard" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="${C.hazarddark}"/><rect width="5" height="10" fill="${C.hazard}"/>
    </pattern>
    <linearGradient id="eh-metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.metal1}"/><stop offset=".5" stop-color="${C.metal2}"/><stop offset="1" stop-color="${C.metal3}"/>
    </linearGradient>
    <linearGradient id="eh-metalDark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.metaldark1}"/><stop offset="1" stop-color="${C.metaldark2}"/>
    </linearGradient>
    <linearGradient id="eh-metalV" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.steelhi}"/><stop offset=".3" stop-color="${C.metal1}"/><stop offset=".7" stop-color="${C.metal2}"/><stop offset="1" stop-color="${C.metal3}"/>
    </linearGradient>
    <linearGradient id="eh-o2liq" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.o2}"/><stop offset="1" stop-color="${C.o2deep}"/>
    </linearGradient>
    <linearGradient id="eh-hdEnergy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.hd3}"/><stop offset=".5" stop-color="${C.hd2}"/><stop offset="1" stop-color="${C.hd3}"/>
    </linearGradient>
    <linearGradient id="eh-plume" x1="1" y1="0" x2="0" y2="0">
      <stop offset="0" stop-color="${C.cyanpale}" stop-opacity=".95"/><stop offset=".35" stop-color="${C.cyan}" stop-opacity=".55"/><stop offset="1" stop-color="${C.cyandeep}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="eh-visorG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C.visor1}"/><stop offset=".6" stop-color="${C.visor2}"/><stop offset="1" stop-color="${C.visor3}"/>
    </linearGradient>
    <linearGradient id="eh-bhDisk" gradientUnits="userSpaceOnUse" x1="-170" y1="0" x2="170" y2="0">
      <stop offset="0" stop-color="${C.bhdisk4}" stop-opacity="0"/><stop offset=".18" stop-color="${C.bhdisk3}"/>
      <stop offset=".5" stop-color="${C.bhdisk1}"/><stop offset=".82" stop-color="${C.bhdisk3}"/><stop offset="1" stop-color="${C.bhdisk4}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="eh-bhGlow"><stop offset=".2" stop-color="${C.bhdisk3}" stop-opacity=".28"/><stop offset=".55" stop-color="${C.bhdisk4}" stop-opacity=".1"/><stop offset="1" stop-color="${C.bhdisk4}" stop-opacity="0"/></radialGradient>
    <radialGradient id="eh-neb1"><stop offset="0" stop-color="${C.nebula1}" stop-opacity=".5"/><stop offset="1" stop-color="${C.nebula1}" stop-opacity="0"/></radialGradient>
    <radialGradient id="eh-neb2"><stop offset="0" stop-color="${C.nebula2}" stop-opacity=".55"/><stop offset="1" stop-color="${C.nebula2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="eh-vignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="${C.black}" stop-opacity="0"/><stop offset="1" stop-color="${C.black}" stop-opacity=".42"/></radialGradient>
    ${glow('glowBlue', C.cyan, .5)}${glow('glowTeal', C.o2, .42)}${glow('glowAmber', C.rx3, .5)}
    ${glow('glowViolet', C.sh2, .45)}${glow('glowMagenta', C.hd2, .42)}${glow('glowRed', C.red, .45)}
    ${glow('glowCyan', C.cyan, .35)}${glow('glowGrow', C.growlight, .4)}
    ${core('coreBlue', C.white, C.cyanpale, C.cyandeep, C.bluedeep)}
    ${core('coreAmber', C.rx1, C.rx2, C.rx3, C.rx4)}
    ${core('coreViolet', C.sh1, C.sh2, C.sh3, C.sh4)}
    ${core('coreMagenta', C.hd1, C.hd2, C.hd3, C.hd4)}
    ${core('eyeRed', C.eye1, C.eye2, C.eye3, C.outline)}
  </defs>`);
}

/* ==== SECTION: Space and the black hole ==== */
// gBg: static background (never repainted); gSky: what moves in space (twinkles, the black hole, engine plumes)
function drawSpace(gBg, gSky) {
  const R = rng(3), tint = [C.star, C.starcool, C.starwarm];
  let a = '', b = '';
  for (let i = 0; i < 46; i++) a += `<circle cx="${f1(R() * 420)}" cy="${f1(R() * 420)}" r="${f1(.5 + R() * .8)}" fill="${tint[i % 3]}" opacity="${f1(.3 + R() * .5)}"/>`;
  for (let i = 0; i < 12; i++) b += `<circle cx="${f1(R() * 610)}" cy="${f1(R() * 610)}" r="${f1(1.1 + R() * .9)}" fill="${tint[i % 3]}" opacity="${f1(.6 + R() * .4)}"/>`;
  add(DEFS, `<pattern id="eh-starsA" width="420" height="420" patternUnits="userSpaceOnUse">${a}</pattern>
    <pattern id="eh-starsB" width="610" height="610" patternUnits="userSpaceOnUse">${b}</pattern>`);
  add(gBg, `<rect x="-4000" y="-4000" width="10000" height="9000" fill="${C.space}"/>
    <ellipse cx="1380" cy="900" rx="560" ry="380" fill="url(#eh-neb1)"/>
    <ellipse cx="560" cy="-40" rx="620" ry="300" fill="url(#eh-neb2)"/>
    <rect x="-4000" y="-4000" width="10000" height="9000" fill="url(#eh-starsA)"/>
    <rect x="-4000" y="-4000" width="10000" height="9000" fill="url(#eh-starsB)"/>`);
  let tw = '';
  for (let i = 0; i < 18; i++) {
    tw += `<circle class="eh-tw" style="animation-delay:-${f1(R() * 2.6)}s;animation-duration:${f1(1.8 + R() * 2)}s" ` +
      `cx="${f1(-300 + R() * 2150)}" cy="${f1(-260 + R() * 1560)}" r="${f1(1.1 + R() * .9)}" fill="${C.star}"/>`;
  }
  // The black hole sits behind the ship's rear; step 5 grows it as the event horizon clock runs down.
  add(gSky, `${tw}<g id="eh-bh" transform="translate(150 150)">
    <circle r="260" fill="url(#eh-bhGlow)"/>
    <g transform="rotate(-16)">
      <ellipse rx="164" ry="36" fill="none" stroke="url(#eh-bhDisk)" stroke-width="26" opacity=".9"/>
      <ellipse id="eh-bh-sw1" rx="164" ry="36" fill="none" stroke="${C.bhdisk1}" stroke-width="2.5" stroke-dasharray="20 30" opacity=".5"/>
    </g>
    <ellipse rx="72" ry="66" fill="none" stroke="${C.bhdisk2}" stroke-width="7" opacity=".45"/>
    <circle r="61" fill="none" stroke="${C.bhring}" stroke-width="3" opacity=".9"/>
    <circle r="57" fill="${C.black}"/>
    <g transform="rotate(-16)">
      <path d="M-164 0 A164 36 0 0 0 164 0" fill="none" stroke="url(#eh-bhDisk)" stroke-width="26"/>
      <path id="eh-bh-sw2" d="M-164 0 A164 36 0 0 0 164 0" fill="none" stroke="${C.bhdisk1}" stroke-width="2.5" stroke-dasharray="20 30" opacity=".6"/>
    </g>
  </g>`);
  const sw1 = ref('bh-sw1'), sw2 = ref('bh-sw2');
  ANIM.push((t) => { const o = f1(-t * 36 % 50); sw1.setAttribute('stroke-dashoffset', o); sw2.setAttribute('stroke-dashoffset', o); });
}

/* ==== SECTION: Engines (left) and the bridge nose (right) ==== */
function drawEngines(gs, gSky) {
  const NOZ = [[116, 352, 32], [116, 672, 32], [120, 512, 58]];
  add(gSky, NOZ.map(([x, y, h]) => `<ellipse class="eh-plume" cx="${x - 34}" cy="${y}" rx="44" ry="${f1(h * .4)}" fill="url(#eh-plume)"/>`).join(''));
  const nozzle = (x, y, h) => `
    <rect x="${x - 4}" y="${y - h / 2 - 5}" width="22" height="${h + 10}" rx="6" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="3"/>
    <rect x="${x - 9}" y="${y - h / 2}" width="12" height="${h}" rx="5" fill="${C.hullblue}" stroke="${C.outline}" stroke-width="2.5"/>
    <rect x="${x - 7}" y="${y - h / 2 + 4}" width="4" height="${h - 8}" rx="2" fill="${C.cyanpale}" opacity=".85"/>`;
  const pod = (y) => `<rect x="126" y="${y - 23}" width="100" height="46" rx="14" fill="${C.armor}" stroke="${C.outline}" stroke-width="4"/>
    <rect x="134" y="${y - 16}" width="84" height="32" rx="10" fill="${C.armorlit}"/>
    <rect x="146" y="${y - 6}" width="26" height="12" rx="2" fill="url(#eh-grate)" stroke="${C.outline}" stroke-width="1.5"/>
    ${nozzle(116, y, 32)}`;
  add(gs, `${pod(352)}${pod(672)}
    <path d="M268 468 L212 462 Q170 459 148 473 L130 489 L130 535 L148 551 Q170 565 212 562 L268 556 Z" fill="${C.armor}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M262 475 L212 470 Q176 468 157 480 L144 493 L144 531 L157 544 Q176 556 212 554 L262 549 Z" fill="${C.armorlit}"/>
    <rect x="168" y="482" width="30" height="8" rx="2" fill="url(#eh-grate)" stroke="${C.outline}" stroke-width="1.5"/>
    <rect x="168" y="534" width="30" height="8" rx="2" fill="url(#eh-grate)" stroke="${C.outline}" stroke-width="1.5"/>
    <rect x="150" y="500" width="10" height="24" rx="3" fill="${C.pink}" stroke="${C.outline}" stroke-width="1.5"/>
    ${nozzle(120, 512, 58)}
    <path d="M1388 476 L1446 480 Q1482 487 1488 512 Q1482 537 1446 544 L1388 548 Z" fill="${C.armor}" stroke="${C.outline}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M1394 483 L1444 487 Q1474 493 1479 512 Q1474 531 1444 537 L1394 541 Z" fill="${C.armorlit}"/>
    <path d="M1440 494 Q1468 498 1472 512 Q1468 526 1440 530 Z" fill="${C.screen}" stroke="${C.outline}" stroke-width="2"/>
    <path d="M1446 500 Q1462 503 1464 512" fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>
    <line x1="1466" y1="486" x2="1490" y2="470" stroke="${C.outline}" stroke-width="2.5"/>
    <circle cx="1491" cy="469" r="3.5" fill="${C.pink}" stroke="${C.outline}" stroke-width="1.5"/>`);
  const plumes = [...gSky.querySelectorAll('.eh-plume')];
  const base = plumes.map((p) => ({ cx: +p.getAttribute('cx'), rx: +p.getAttribute('rx') }));
  ANIM.push((t) => {
    if (REDUCE) return;
    plumes.forEach((p, i) => {
      const k = .85 + .1 * Math.sin(t * 23 + i * 2) + .05 * Math.sin(t * 37 + i);
      p.setAttribute('rx', f1(base[i].rx * k)); p.setAttribute('cx', f1(base[i].cx + base[i].rx * (1 - k)));
    });
  });
}

/* ==== SECTION: Hull (brain silhouette with gyri) ==== */
const HULL_TOP = [[232, 512], [208, 474], [184, 410], [176, 330], [198, 250], [248, 186], [330, 134], [440, 104],
  [580, 90], [740, 88], [890, 96], [1030, 116], [1160, 152], [1272, 208], [1362, 284], [1418, 370], [1440, 446],
  [1434, 490], [1414, 512]];
function drawHull(g) {
  const base = resample(spline(HULL_TOP, 14), 3);
  const total = base[base.length - 1].s, R = rng(11);
  // Lobes (gyri) along the top half; the bottom half mirrors it
  const lobes = []; let s = 0;
  while (s < total) { const L = 92 + R() * 44; lobes.push({ s0: s, L, A: 13 + R() * 7 }); s += L; }
  const k = total / s; lobes.forEach((l) => { l.s0 *= k; l.L *= k; });
  const GAP = .09;
  let li = 0;
  const off = base.map((p) => {
    while (li < lobes.length - 1 && p.s >= lobes[li + 1].s0) li++;
    const l = lobes[li], u = (p.s - l.s0) / l.L;
    if (u < GAP || u > 1 - GAP) return 0;
    return l.A * Math.pow(Math.sin(Math.PI * (u - GAP) / (1 - 2 * GAP)), .42);
  });
  const at = (sv) => base[Math.min(base.length - 1, Math.max(0, Math.round(sv / total * (base.length - 1))))];
  const close = (top) => top.concat(top.slice(1, -1).reverse().map(mirror));
  const path = (arr) => 'M' + arr.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
  const lobed = base.map((p, i) => [p.x + p.nx * off[i], p.y + p.ny * off[i]]);
  const armor = base.map((p) => [p.x + p.nx * 9, p.y + p.ny * 9]);

  let lights = '', grooves = '', hi = '';
  const both = (fn) => { fn(false); fn(true); };
  const P = (x, y, m) => m ? [x, SHIP_H - y] : [x, y];
  lobes.forEach((l, j) => {
    // highlight along each lobe's outer edge
    const seg = base.filter((p) => p.s > l.s0 + l.L * .18 && p.s < l.s0 + l.L * .82);
    both((m) => {
      if (seg.length > 2) hi += `<polyline points="${pts(seg.map((p) => { const o = off[base.indexOf(p)] - 4.5; return P(p.x + p.nx * o, p.y + p.ny * o, m); }))}"/>`;
    });
    if (j === 0) return;
    // a light in the gap between lobes, and a sulcus groove running inward from it
    const b = at(l.s0);
    if (l.s0 < 30 || total - l.s0 < 30) return;
    const col = j % 2 ? C.hullblue : C.pink;
    const ang = Math.atan2(b.ny, b.nx) * 180 / Math.PI;
    both((m) => {
      const c = P(b.x + b.nx * 6, b.y + b.ny * 6, m), a2 = m ? -ang : ang;
      lights += `<rect x="-6" y="-2.6" width="12" height="5.2" rx="2.6" fill="${col}" stroke="${C.outline}" stroke-width="1.2" transform="translate(${f1(c[0])} ${f1(c[1])}) rotate(${f1(a2)})"/>`;
    });
    // sulcus: one fold per gap, running in from the gap and then along the lobe (deeper over the big rear lobes)
    const rearLobe = b.x < 300;
    const d = rearLobe ? 44 + R() * 26 : 24 + R() * 12;
    const dir = R() < .5 ? 1 : -1, hook = (rearLobe ? .5 : .32 + R() * .2) * (dir > 0 ? l.L : lobes[j - 1].L);
    const along = base.filter((p) => (p.s - l.s0) * dir > 10 && (p.s - l.s0) * dir < hook).sort((a, c) => (a.s - c.s) * dir);
    both((m) => {
      const line = [P(b.x - b.nx, b.y - b.ny, m), P(b.x - b.nx * (d - 6), b.y - b.ny * (d - 6), m)]
        .concat(along.map((p) => P(p.x - p.nx * d, p.y - p.ny * d, m)));
      grooves += `<polyline points="${pts(line)}"/>`;
    });
  });

  add(g, `<path d="${path(close(armor))}" fill="${C.armor}" stroke="${C.outline}" stroke-width="4.5" stroke-linejoin="round"/>
    <g>${lights}</g>
    <path d="${path(close(lobed))}" fill="url(#eh-plating)" stroke="${C.outline}" stroke-width="5" stroke-linejoin="round"/>
    <g fill="none" stroke="${C.hulllit}" stroke-width="3" stroke-linecap="round" opacity=".9">${hi}</g>
    <g fill="none" stroke="${C.outline}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${grooves}</g>`);
  // hull details: vents near the engines
  add(g, `<g stroke="${C.outline}" stroke-width="1.5">
    <rect x="216" y="420" width="12" height="34" rx="2" fill="url(#eh-grate)"/><rect x="216" y="570" width="12" height="34" rx="2" fill="url(#eh-grate)"/>
  </g>`);
}

/* ==== SECTION: Wall tops, floors and wall faces ==== */
function drawFloors(gWalls, gFloors) {
  // Cream wall tops: one band per floor, drawn in turn so each band gets its own seam (gyri)
  FLOORS.forEach((f) => {
    const p = pts(f.poly);
    add(gWalls, `<polygon points="${p}" fill="none" stroke="${C.outline}" stroke-width="${2 * W_BAND + 7}" stroke-linejoin="round"/>
      <polygon points="${p}" fill="none" stroke="${C.wallshade}" stroke-width="${2 * W_BAND}" stroke-linejoin="round"/>
      <polygon points="${p}" fill="none" stroke="${C.wall}" stroke-width="${2 * W_BAND - 8}" stroke-linejoin="round"/>`);
  });
  // floor outlines (the inner half is covered by the fills, so joined floors show no seam)
  let o = '';
  [...PASSAGES, ...FLOORS].forEach((f) => { o += `<polygon points="${pts(f.poly)}"/>`; });
  add(gFloors, `<g fill="none" stroke="${C.outline}" stroke-width="8" stroke-linejoin="round">${o}</g>`);
  PASSAGES.forEach((f) => add(gFloors, `<polygon points="${pts(f.poly)}" fill="url(#eh-floor2)"/>`));
  FLOORS.forEach((f) => add(gFloors, `<polygon points="${pts(f.poly)}" fill="url(#eh-${f.tile})"/>`));
  FLOORS.forEach((f) => add(gFloors, `<polygon points="${pts(f.poly)}" fill="url(#eh-vignette)"/>`));
  // north wall faces, clipped to their floor
  FLOORS.forEach((f) => {
    const quads = faceQuads(f);
    if (!quads.length) return;
    add(DEFS, `<clipPath id="eh-fclip-${f.id}"><polygon points="${pts(f.poly)}"/></clipPath>`);
    let s = '';
    quads.forEach(({ flat, q: [a, b, c, d] }) => {
      s += `<polygon points="${pts([d, c, [c[0], c[1] + 7], [d[0], d[1] + 7]])}" fill="${C.black}" opacity=".2"/>`;
      s += `<polygon points="${pts([a, b, c, d])}" fill="${C.face}"/>`;
      s += `<line x1="${a[0]}" y1="${a[1] + 1}" x2="${b[0]}" y2="${b[1] + 1}" stroke="${C.facelit}" stroke-width="2"/>`;
      s += `<line x1="${d[0]}" y1="${d[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${C.outline}" stroke-width="2.5"/>`;
      if (flat) {
        for (let x = a[0] + 46; x < b[0] - 12; x += 46) s += `<line x1="${x}" y1="${a[1] + 3}" x2="${x}" y2="${a[1] + FACE - 2}" stroke="${C.faceline}" stroke-width="1.5"/>`;
        s += `<line x1="${a[0]}" y1="${a[1]}" x2="${d[0]}" y2="${d[1]}" stroke="${C.outline}" stroke-width="2"/><line x1="${b[0]}" y1="${b[1]}" x2="${c[0]}" y2="${c[1]}" stroke="${C.outline}" stroke-width="2"/>`;
      }
    });
    add(gFloors, `<g clip-path="url(#eh-fclip-${f.id})">${s}</g>`);
  });
}

/* ==== SECTION: Shared props ==== */
const lightBar = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="${C.cyan}" opacity=".85"/>`;
const grate = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="url(#eh-grate)" stroke="${C.outline}" stroke-width="1.5"/>`;
function screen(x, y, w, h, inner) {
  return `<g transform="translate(${x} ${y})"><rect x="-2" y="-1.5" width="${w + 4}" height="${h + 3}" rx="3" fill="${C.outline}"/>` +
    `<rect width="${w}" height="${h}" rx="2" fill="${C.screen}"/>${inner || ''}</g>`;
}
function wallEye(x, y) {   // B.F. 9000's eye, mounted on a wall face
  return `<g transform="translate(${x} ${y})"><circle r="8" fill="${C.outline}"/><circle r="6.2" fill="${C.armor}"/>` +
    `<circle class="eh-bfeye" r="3.2" fill="${C.red}"/><circle cx="-1.5" cy="-1.5" r="1" fill="${C.white}" opacity=".7"/></g>`;
}
function pipe(d, w) {
  return `<path d="${d}" fill="none" stroke="${C.outline}" stroke-width="${w + 4}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${C.metal2}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${C.steelhi}" stroke-width="${f1(Math.max(1, w * .25))}" stroke-linecap="round" opacity=".55" transform="translate(0 ${f1(-w * .2)})"/>`;
}
function crate(x, y, w, h) {
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="3" fill="${C.crate}" stroke="${C.outline}" stroke-width="2"/>` +
    `<rect x="3.5" y="3.5" width="${w - 7}" height="${h - 7}" rx="2" fill="${C.cratelit}"/>` +
    `<path d="M5 5 L${w - 5} ${h - 5} M${w - 5} 5 L5 ${h - 5}" stroke="${C.cratedark}" stroke-width="3"/>` +
    `<rect x="3.5" y="3.5" width="${w - 7}" height="${h - 7}" rx="2" fill="none" stroke="${C.cratedark}" stroke-width="2"/></g>`;
}
function metalCrate(x, y, w, h) {
  return `<g transform="translate(${x} ${y})"><rect width="${w}" height="${h}" rx="3" fill="${C.metal2}" stroke="${C.outline}" stroke-width="2"/>` +
    `<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="2" fill="${C.steel}"/><rect x="3" y="${h / 2 - 3}" width="${w - 6}" height="6" fill="url(#eh-hazard)"/></g>`;
}
function warnSign(x, y) {
  return `<g transform="translate(${x} ${y})"><path d="M7 0 L14 12 L0 12 Z" fill="${C.hazard}" stroke="${C.outline}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `<rect x="6.2" y="3.5" width="1.6" height="4.5" fill="${C.outline}"/><rect x="6.2" y="9" width="1.6" height="1.6" fill="${C.outline}"/></g>`;
}
function radSign(x, y, r) {   // radiation trefoil
  const rr = r * .8, pt = (deg) => f1(rr * Math.cos(deg * Math.PI / 180)) + ' ' + f1(rr * Math.sin(deg * Math.PI / 180));
  let w = '';
  for (let i = 0; i < 3; i++) w += `<path d="M0 0 L${pt(i * 120 - 30)} A${f1(rr)} ${f1(rr)} 0 0 1 ${pt(i * 120 + 30)} Z"/>`;
  return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${C.hazard}" stroke="${C.outline}" stroke-width="1.2"/><g fill="${C.outline}">${w}</g>` +
    `<circle r="${f1(r * .22)}" fill="${C.hazard}" stroke="${C.outline}" stroke-width="${f1(r * .12)}"/></g>`;
}
const label = (x, y, text, color) => `<g transform="translate(${x} ${y})"><rect x="-12" y="-4" width="24" height="8" rx="1.5" fill="${C.armor}" stroke="${C.outline}" stroke-width="1"/>` +
  `<text y="2" text-anchor="middle" font-size="4.8" fill="${color}">${text}</text></g>`;

/* ==== SECTION: Engine room (anti-gravity thruster) ====
   Each room draws into gs (static layer, painted once) and gd (front layer, for anything that moves). */
function drawEngineRoom(gs, gd) {
  const graph = screen(392, 202, 52, 16, `<polyline id="eh-eng-graph" fill="none" stroke="${C.cyan}" stroke-width="1"/>` +
    `<g fill="${C.cyan}"><rect x="42" y="10" width="2" height="4"/><rect x="45" y="7" width="2" height="7"/><rect x="48" y="4" width="2" height="10"/></g>` +
    `<text x="3" y="6" font-size="4" fill="${C.cyanhi}">AG-THRUST OK</text>`);
  const radar = screen(530, 202, 52, 16, `<circle cx="9" cy="8" r="6" fill="none" stroke="${C.cyan}" stroke-width=".8" opacity=".7"/>` +
    `<line id="eh-eng-radar" x1="9" y1="8" x2="15" y2="8" stroke="${C.cyanhi}" stroke-width="1"/>` +
    `<g fill="${C.cyan}"><rect x="19" y="3" width="29" height="1.6" rx=".8" opacity=".7"/><rect x="19" y="7" width="21" height="1.6" rx=".8" opacity=".5"/><rect x="19" y="11" width="25" height="1.6" rx=".8" opacity=".6"/></g>`);
  let cells = '';
  [288, 320, 352].forEach((y, i) => {
    cells += `<g transform="translate(325 ${y})"><rect width="26" height="28" rx="5" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>` +
      `<rect x="5" y="4" width="16" height="20" rx="3" fill="${C.outline}"/><rect class="eh-eng-lvl" data-i="${i}" x="7" y="6" width="12" height="16" rx="1.5" fill="${C.amber}"/></g>`;
  });
  add(gs, `${grate(482, 204, 30, 12)}${warnSign(343, 240)}
    ${pipe('M384 224 L600 224', 6)}
    <g fill="${C.armor}"><rect x="420" y="219" width="5" height="10"/><rect x="500" y="219" width="5" height="10"/><rect x="570" y="219" width="5" height="10"/></g>
    <g transform="translate(446 224)"><circle r="5" fill="none" stroke="${C.red}" stroke-width="1.8"/><path d="M-5 0 H5 M0 -5 V5" stroke="${C.red}" stroke-width="1.2"/></g>
    <rect x="320" y="282" width="36" height="102" rx="3" fill="${C.floorbg}"/>
    <circle cx="480" cy="318" r="80" fill="url(#eh-glowBlue)"/>
    ${pipe('M356 318 L430 318', 7)}${pipe('M480 228 L480 262', 6)}${pipe('M584 330 C 560 330, 548 322, 530 320', 6)}
    <g fill="${C.hazard}" stroke="${C.outline}" stroke-width="1.2"><rect x="372" y="312" width="5" height="12" rx="1"/><rect x="398" y="312" width="5" height="12" rx="1"/><rect x="474" y="240" width="12" height="5" rx="1"/></g>
    <g transform="translate(380 326)"><rect width="14" height="10" rx="2" fill="${C.metaldark2}" stroke="${C.outline}" stroke-width="1.2"/><rect x="3" y="3" width="8" height="2" fill="${C.hazard}"/></g>
    <g transform="translate(608 262)"><circle r="15" fill="url(#eh-metal)" stroke="${C.outline}" stroke-width="2"/><circle r="10" fill="${C.water}" stroke="${C.outline}" stroke-width="1.2"/>
      <circle cx="-3" cy="-3" r="2.5" fill="${C.waterhi}" opacity=".7"/><text y="2.5" text-anchor="middle" font-size="6" fill="${C.white}">H₂O</text></g>
    <g transform="translate(586 288)"><rect width="40" height="30" rx="4" fill="${C.metaldark2}" stroke="${C.outline}" stroke-width="2"/>
      <rect x="4" y="4" width="32" height="9" rx="1.5" fill="${C.outline}"/><rect x="6" y="6" width="8" height="5" fill="${C.pink}"/><rect x="17" y="6" width="8" height="5" fill="${C.cyan}"/>
      <rect x="5" y="17" width="28" height="3" fill="${C.metal3}"/><rect x="5" y="22" width="20" height="3" fill="${C.metal3}"/></g>
    ${crate(590, 326, 38, 34)}${metalCrate(598, 364, 28, 22)}
    ${grate(356, 392, 40, 12)}${grate(548, 392, 40, 12)}
    ${lightBar(410, 404, 22, 3)}${lightBar(536, 404, 22, 3)}`);
  add(gd, `${graph}${wallEye(466, 210)}${radar}${cells}`);
  drawThruster(gd, 480, 318);
  block({ r: [320, 280, 360, 388] }, { r: [580, 244, 640, 392] }, { c: [480, 318, 58] }, { r: [380, 200, 604, 230] });

  const gr = ref('eng-graph'), radarLine = ref('eng-radar'), lv = [...gd.querySelectorAll('.eh-eng-lvl')];
  ANIM.push((t) => {
    const p = [];
    for (let x = 3; x <= 38; x += 2.5) p.push(f1(x) + ',' + f1(11 + 2.6 * Math.sin(x * .35 + t * 4) + 1.2 * Math.sin(x * .9 + t * 7)));
    gr.setAttribute('points', p.join(' '));
    radarLine.setAttribute('transform', `rotate(${f1(t * 120 % 360)} 9 8)`);
    lv.forEach((r, i) => { const h = 16 * (.75 + .2 * Math.sin(t * 1.3 + i * 1.7)); r.setAttribute('y', f1(22 - h)); r.setAttribute('height', f1(h)); });
  });
}
function drawThruster(g, cx, cy) {
  let bolts = '', bolts8 = '', em = '', clamps = '';
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; bolts += `<circle cx="${f1(36 * Math.cos(a))}" cy="${f1(36 * Math.sin(a))}" r="1.3"/>`; }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; bolts8 += `<circle cx="${f1(48 * Math.cos(a))}" cy="${f1(48 * Math.sin(a))}" r="1.5"/>`; }
  for (let j = 0; j < 6; j++) {
    em += `<rect x="-3" y="-31" width="6" height="6" rx="1" fill="${C.metal1}" stroke="${C.outline}" stroke-width="1" transform="rotate(${j * 60})"/>` +
      `<rect class="eh-thr-em" x="-1.25" y="-29.5" width="2.5" height="2.5" fill="${C.cyan}" transform="rotate(${j * 60})"/>`;
  }
  for (let j = 0; j < 3; j++) clamps += `<rect x="-2.5" y="-22" width="5" height="7" rx="1" transform="rotate(${j * 120})"/>`;
  add(g, `<g transform="translate(${cx} ${cy})">
    <polygon points="-56,-23 -23,-56 23,-56 56,-23 56,23 23,56 -23,56 -56,23" fill="${C.pad}" stroke="${C.outline}" stroke-width="2.5"/>
    <polygon points="-51,-21 -21,-51 21,-51 51,-21 51,21 21,51 -21,51 -51,21" fill="none" stroke="${C.padline}" stroke-width="1"/>
    <circle r="52" fill="none" stroke="url(#eh-hazard)" stroke-width="5"/>
    <g fill="${C.metaldark1}">${bolts8}</g>
    <circle r="42" fill="${C.outline}"/><circle r="40" fill="url(#eh-metal)"/>
    <circle r="40" fill="none" stroke="${C.steelhi}" stroke-width="1" opacity=".5"/>
    <g fill="${C.metaldark2}">${bolts}</g>
    <circle r="32" fill="${C.well}" stroke="${C.outline}" stroke-width="1.5"/>
    <g id="eh-thr-outer">
      <circle r="28" fill="none" stroke="${C.armor}" stroke-width="6"/>
      <circle class="eh-thr-ring" r="28" fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-dasharray="11 6.6"/>
      ${em}
    </g>
    <g id="eh-thr-inner">
      <circle r="18" fill="none" stroke="${C.metal3}" stroke-width="3"/>
      <path d="M0 -20 A20 20 0 0 1 17.3 10" fill="none" stroke="${C.metal1}" stroke-width="2" stroke-linecap="round"/>
      <g fill="${C.metal1}" stroke="${C.outline}" stroke-width="1">${clamps}</g>
    </g>
    <g id="eh-thr-core"><circle r="12" fill="url(#eh-coreBlue)"/><circle r="12" fill="none" stroke="${C.outline}" stroke-width="1.5"/>
      <circle cx="-3.5" cy="-4" r="2.5" fill="${C.white}" opacity=".55"/></g>
    ${label(0, 47, 'AG-7', C.cyanhi)}
  </g>`);
  const outer = ref('thr-outer'), inner = ref('thr-inner'), core = ref('thr-core');
  let a1 = 0, a2 = 0;
  ANIM.push((t, dt) => {
    a1 = (a1 + 70 * dt) % 360; a2 = (a2 - 112 * dt) % 360;
    outer.setAttribute('transform', `rotate(${f1(a1)})`);
    inner.setAttribute('transform', `rotate(${f1(a2)})`);
    core.setAttribute('transform', `scale(${(1 + .06 * Math.sin(t * 3)).toFixed(3)})`);
  });
}

/* ==== SECTION: Life support (oxygen tank and scrubbers) ==== */
function drawLifeSupport(gs, gd) {
  let bub = '';
  for (let i = 0; i < 7; i++) bub += `<circle class="eh-bub" r="${f1(1.1 + (i % 3) * .7)}" fill="${C.o2hi}" opacity=".75"/>`;
  const plant = (x, i) => {
    let l = '';
    [-58, -28, 0, 28, 58].forEach((a, k) => {
      const len = k === 2 ? 11 : 8.5;
      l += `<ellipse cx="0" cy="${-len}" rx="3.2" ry="${len}" fill="${k % 2 ? C.leaflit : C.leaf}" stroke="${C.outline}" stroke-width="1" transform="rotate(${a})"/>`;
    });
    return `<g transform="translate(${x} 186)"><g class="eh-plant" data-i="${i}">${l}<circle r="2" fill="${C.leafdark}"/></g></g>`;
  };
  const scrubber = (x, id) => `<g transform="translate(${x} 252)">
      <rect width="38" height="46" rx="5" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
      <circle cx="19" cy="23" r="15" fill="${C.grate}" stroke="${C.outline}" stroke-width="1.5"/>
      <g transform="translate(19 23)"><g id="eh-${id}" fill="${C.steel}" stroke="${C.outline}" stroke-width=".8">
        <ellipse cx="0" cy="-6.5" rx="3.6" ry="7"/><ellipse cx="0" cy="-6.5" rx="3.6" ry="7" transform="rotate(120)"/><ellipse cx="0" cy="-6.5" rx="3.6" ry="7" transform="rotate(240)"/>
      </g><circle r="3.5" fill="${C.metal1}" stroke="${C.outline}" stroke-width="1"/></g>
      <rect y="46" width="38" height="16" rx="2" fill="${C.face}" stroke="${C.outline}" stroke-width="1.5"/>
      <g stroke="${C.faceline}" stroke-width="1.5"><line x1="4" y1="51" x2="26" y2="51"/><line x1="4" y1="55" x2="26" y2="55"/><line x1="4" y1="59" x2="26" y2="59"/></g>
      <circle cx="32" cy="54" r="2.5" fill="${C.green}" stroke="${C.outline}" stroke-width=".8"/>
    </g>`;
  let cans = '';
  [942, 962, 982].forEach((x) => {
    cans += `<g transform="translate(${x} 300)"><rect width="16" height="34" rx="7" fill="${C.steelhi}" stroke="${C.outline}" stroke-width="1.5"/>` +
      `<rect y="16" width="16" height="5" fill="${C.o2deep}"/><ellipse cx="8" cy="4" rx="6" ry="3" fill="${C.o2}" stroke="${C.outline}" stroke-width="1"/></g>`;
  });
  add(DEFS, `<clipPath id="eh-tankclip"><rect x="726" y="240" width="52" height="92" rx="12"/></clipPath>`);
  add(gs, `<ellipse cx="840" cy="164" rx="52" ry="22" fill="url(#eh-glowGrow)"/>
    <rect x="804" y="153" width="72" height="5" rx="2.5" fill="${C.growlight}" stroke="${C.outline}" stroke-width="1"/>
    <rect x="800" y="173" width="80" height="22" rx="4" fill="${C.cratedark}" stroke="${C.outline}" stroke-width="2"/>
    <rect x="804" y="177" width="72" height="10" rx="2" fill="${C.soil}"/>
    <ellipse cx="790" cy="290" rx="96" ry="70" fill="url(#eh-glowTeal)"/>
    ${pipe('M778 274 L800 274', 7)}${pipe('M838 262 L846 262', 6)}${pipe('M752 336 L752 352 L800 352 L800 316', 5)}
    <rect x="936" y="296" width="64" height="42" rx="4" fill="${C.floorbg}" stroke="${C.outline}" stroke-width="1.5"/>${cans}
    <rect x="936" y="314" width="64" height="4" fill="${C.metal3}"/>
    ${grate(930, 380, 50, 14)}${lightBar(740, 404, 22, 3)}${lightBar(946, 404, 22, 3)}`);
  add(gd, `${screen(740, 192, 40, 15, `<text x="3" y="6" font-size="4.2" fill="${C.cyanhi}">O₂ 21%</text><polyline id="eh-o2-wave" fill="none" stroke="${C.o2}" stroke-width="1"/>`)}
    ${wallEye(913, 200)}
    ${plant(820, 0)}${plant(840, 1)}${plant(860, 2)}
    <ellipse cx="752" cy="334" rx="31" ry="10" fill="${C.outline}"/><ellipse cx="752" cy="332" rx="29" ry="8.5" fill="${C.metal3}"/>
    <rect x="726" y="240" width="52" height="92" rx="12" fill="${C.glass}"/>
    <g clip-path="url(#eh-tankclip)">
      <rect x="724" y="262" width="56" height="74" fill="url(#eh-o2liq)"/>
      <ellipse id="eh-o2-surface" cx="752" cy="262" rx="26" ry="3" fill="${C.o2hi}" opacity=".5"/>
      <g>${bub}</g>
    </g>
    <rect x="733" y="248" width="6" height="76" rx="3" fill="${C.white}" opacity=".22"/>
    <rect x="726" y="240" width="52" height="92" rx="12" fill="none" stroke="${C.outline}" stroke-width="2.5"/>
    <rect x="722" y="284" width="60" height="6" rx="2" fill="${C.metal2}" stroke="${C.outline}" stroke-width="1.5"/>
    <rect x="722" y="312" width="60" height="6" rx="2" fill="${C.metal2}" stroke="${C.outline}" stroke-width="1.5"/>
    <text x="752" y="304" text-anchor="middle" font-size="9" fill="${C.o2hi}">O₂</text>
    <ellipse cx="752" cy="240" rx="27" ry="9" fill="url(#eh-metal)" stroke="${C.outline}" stroke-width="2"/>
    <ellipse cx="752" cy="239" rx="15" ry="4.5" fill="${C.metal3}" stroke="${C.outline}" stroke-width="1"/>
    <circle cx="752" cy="238" r="3.5" fill="${C.red}" stroke="${C.outline}" stroke-width="1"/>
    ${scrubber(800, 'fan1')}${scrubber(846, 'fan2')}`);
  block({ r: [796, 150, 884, 198] }, { r: [720, 228, 786, 344] }, { r: [796, 246, 888, 318] }, { r: [932, 292, 1004, 342] });

  const fans = [ref('fan1'), ref('fan2')], bubs = [...gd.querySelectorAll('.eh-bub')], plants = [...gd.querySelectorAll('.eh-plant')];
  const wave = ref('o2-wave'), surf = ref('o2-surface');
  const B = bubs.map((b, i) => ({ x: 736 + (i * 37 % 32), y: 330 - i * 10, v: 14 + (i % 4) * 5 }));
  let fa = 0;
  ANIM.push((t, dt) => {
    fa = (fa + 300 * dt) % 360;
    fans[0].setAttribute('transform', `rotate(${f1(fa)})`); fans[1].setAttribute('transform', `rotate(${f1(-fa * 1.1)})`);
    B.forEach((b, i) => {
      b.y -= b.v * dt; if (b.y < 264) { b.y = 330; b.x = 734 + Math.random() * 36; }
      bubs[i].setAttribute('cx', f1(b.x + Math.sin(t * 3 + i) * 1.5)); bubs[i].setAttribute('cy', f1(b.y));
    });
    surf.setAttribute('ry', f1(2.6 + .6 * Math.sin(t * 2)));
    plants.forEach((p, i) => p.setAttribute('transform', `rotate(${f1(4 * Math.sin(t * 1.2 + i * 1.3))})`));
    const p = [];
    for (let x = 22; x <= 38; x += 1.5) p.push(f1(x) + ',' + f1(8 + 3 * Math.sin(x * .6 - t * 3)));
    wave.setAttribute('points', p.join(' '));
  });
}

/* ==== SECTION: Reactor (reactor core) ==== */
function drawReactor(gs, gd) {
  let seg = '', barrels = '';
  for (let i = 0; i < 8; i++) {
    seg += `<g transform="rotate(${i * 45 + 22.5})"><rect x="-7" y="-46" width="14" height="15" rx="3" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="1.5"/>` +
      `<rect class="eh-rx-light" x="-2.5" y="-42" width="5" height="4" rx="1" fill="${C.rx2}"/></g>`;
  }
  [[340, 668], [368, 670], [342, 698], [370, 700]].forEach(([x, y]) => {
    barrels += `<g transform="translate(${x} ${y})"><circle r="13" fill="${C.hazard}" stroke="${C.outline}" stroke-width="2"/>` +
      `<circle r="9" fill="none" stroke="${C.hazarddark}" stroke-width="1.2" opacity=".6"/>${radSign(0, 0, 5)}</g>`;
  });
  add(gs, `${radSign(374, 624, 7)}
    <circle cx="486" cy="734" r="100" fill="url(#eh-glowAmber)"/>
    <rect x="430" y="682" width="112" height="104" rx="10" fill="${C.pad}" stroke="${C.outline}" stroke-width="2"/>
    <rect x="435" y="687" width="102" height="94" rx="7" fill="none" stroke="url(#eh-hazard)" stroke-width="4"/>
    ${pipe('M486 734 L446 694 M486 734 L526 694 M486 734 L446 774 M486 734 L526 774', 8)}
    ${pipe('M384 684 C 410 684, 420 700, 440 712', 6)}${pipe('M600 700 C 580 700, 560 712, 536 718', 6)}
    ${label(486, 793, 'RX-2', C.rx2)}
    <rect x="324" y="652" width="62" height="64" rx="4" fill="${C.floorbg}" opacity=".7"/>${barrels}
    ${grate(390, 786, 36, 14)}${grate(548, 786, 36, 14)}${lightBar(440, 818, 22, 3)}${lightBar(532, 818, 22, 3)}`);
  add(gd, `${screen(544, 616, 58, 15, `<text x="3" y="6" font-size="4" fill="${C.rx2}">RX-2 TEMP</text>` +
      `<g transform="translate(44 8)"><circle r="5.5" fill="none" stroke="${C.rx2}" stroke-width=".8"/><line id="eh-rx-needle" x2="0" y2="-4.5" stroke="${C.rx1}" stroke-width="1"/></g>` +
      `<g fill="${C.rx2}"><rect x="3" y="9" width="18" height="1.6" rx=".8"/><rect x="3" y="12" width="12" height="1.6" rx=".8" opacity=".6"/></g>`)}
    ${wallEye(414, 624)}
    <g transform="translate(486 734)">
      <circle r="48" fill="${C.outline}"/><circle r="46" fill="url(#eh-metal)"/>
      ${seg}
      <circle r="29" fill="${C.well}" stroke="${C.outline}" stroke-width="1.5"/>
      <g id="eh-rx-ring"><circle r="23" fill="none" stroke="${C.rx3}" stroke-width="3" stroke-dasharray="6 5" opacity=".9"/></g>
      <g id="eh-rx-core"><circle r="16" fill="url(#eh-coreAmber)"/><circle r="16" fill="none" stroke="${C.outline}" stroke-width="1.5"/>
        <circle cx="-4.5" cy="-5" r="3" fill="${C.white}" opacity=".55"/></g>
    </g>
    <g transform="translate(598 664)"><rect width="38" height="70" rx="5" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
      <rect x="5" y="5" width="12" height="60" rx="2" fill="${C.screen}" stroke="${C.outline}" stroke-width="1"/>
      <g fill="${C.rx2}"><rect x="7" y="10" width="8" height="2" rx="1"/><rect x="7" y="16" width="6" height="2" rx="1" opacity=".7"/><rect x="7" y="22" width="8" height="2" rx="1" opacity=".5"/></g>
      <rect id="eh-rx-bar" x="7" y="30" width="8" height="30" rx="1" fill="${C.rx3}"/>
      <g fill="${C.metal3}"><rect x="21" y="8" width="12" height="4" rx="1"/><rect x="21" y="16" width="12" height="4" rx="1"/><rect x="21" y="24" width="12" height="4" rx="1"/></g>
      <circle cx="27" cy="44" r="4" fill="${C.red}" stroke="${C.outline}" stroke-width="1"/><circle cx="27" cy="56" r="4" fill="${C.green}" stroke="${C.outline}" stroke-width="1"/></g>`);
  block({ c: [486, 734, 52] }, { r: [322, 650, 388, 718] }, { r: [594, 660, 640, 738] });

  const ring = ref('rx-ring'), core = ref('rx-core'), needle = ref('rx-needle'), bar = ref('rx-bar');
  const lights = [...gd.querySelectorAll('.eh-rx-light')];
  let a = 0;
  ANIM.push((t, dt) => {
    a = (a + 30 * dt) % 360;
    ring.setAttribute('transform', `rotate(${f1(a)})`);
    core.setAttribute('transform', `scale(${(1 + .07 * Math.sin(t * 2.2)).toFixed(3)})`);
    needle.setAttribute('transform', `rotate(${f1(20 + 10 * Math.sin(t * .9))})`);
    const h = 30 * (.6 + .1 * Math.sin(t * 1.7)); bar.setAttribute('y', f1(60 - h)); bar.setAttribute('height', f1(h));
    lights.forEach((l, i) => l.setAttribute('opacity', f1(.65 + .35 * Math.sin(t * 2.2 + i * .8))));
  });
}

/* ==== SECTION: Shield bay (shield generator) ==== */
function drawShieldBay(gs, gd) {
  const hex = (r, rot) => { const p = []; for (let i = 0; i < 6; i++) { const a = (i * 60 + (rot || 0)) * Math.PI / 180; p.push([r * Math.cos(a), r * Math.sin(a)]); } return pts(p); };
  let nodes = '', caps = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 60 * Math.PI / 180, x = f1(38 * Math.cos(a)), y = f1(38 * Math.sin(a));
    nodes += `<g transform="translate(${x} ${y})"><polygon points="${hex(6.5, 30)}" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="1.2"/><circle r="2.6" fill="${C.sh2}"/></g>`;
  }
  [670, 702, 734].forEach((y) => {
    caps += `<g transform="translate(728 ${y})"><circle r="13" fill="url(#eh-metal)" stroke="${C.outline}" stroke-width="2"/>` +
      `<circle r="8.5" fill="${C.sh4}" stroke="${C.outline}" stroke-width="1"/><circle class="eh-cap" r="5" fill="none" stroke="${C.sh2}" stroke-width="2"/></g>`;
  });
  add(gs, `<g transform="translate(952 618)"><rect width="26" height="11" rx="2" fill="${C.outline}"/><g fill="${C.sh2}"><circle cx="5" cy="5.5" r="2"/><circle cx="13" cy="5.5" r="2" opacity=".6"/><circle cx="21" cy="5.5" r="2" opacity=".3"/></g></g>
    <circle cx="858" cy="742" r="104" fill="url(#eh-glowViolet)"/>
    ${pipe('M750 702 C 780 702, 790 724, 806 728', 6)}
    <rect x="710" y="652" width="36" height="98" rx="6" fill="${C.floorbg}" stroke="${C.outline}" stroke-width="1.5"/>
    <g transform="translate(858 742)">
      <polygon points="${hex(54, 30)}" fill="${C.pad}" stroke="${C.outline}" stroke-width="2.5"/>
      <polygon points="${hex(48, 30)}" fill="none" stroke="${C.sh3}" stroke-width="1.5" opacity=".6"/>
      <circle r="38" fill="none" stroke="${C.sh3}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".8"/>
      <circle r="22" fill="${C.outline}"/><circle r="20" fill="url(#eh-metal)"/>
      <circle r="14" fill="${C.well}" stroke="${C.outline}" stroke-width="1.2"/>
    </g>
    ${label(858, 806, 'SG-4', C.sh1)}
    ${grate(900, 812, 36, 12)}${lightBar(800, 828, 22, 3)}${lightBar(900, 828, 22, 3)}`);
  add(gd, `${screen(736, 616, 60, 15, `<text x="3" y="6" font-size="4" fill="${C.sh1}">SHIELD 100%</text><polyline id="eh-sh-wave" fill="none" stroke="${C.sh2}" stroke-width="1"/>`)}
    ${wallEye(930, 624)}${caps}
    <g transform="translate(858 742)">
      <g id="eh-sh-ring">${nodes}</g>
      <g id="eh-sh-orb"><circle r="8" fill="url(#eh-coreViolet)"/><circle cx="-2.5" cy="-2.5" r="2" fill="${C.white}" opacity=".6"/></g>
      <polygon id="eh-sh-field" points="${hex(64)}" fill="${C.sh2}" fill-opacity=".06" stroke="${C.sh2}" stroke-width="2" stroke-dasharray="14 6"/>
    </g>
    <g transform="translate(948 668)"><rect width="50" height="54" rx="6" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
      <rect x="5" y="5" width="40" height="44" rx="4" fill="${C.screen}" stroke="${C.outline}" stroke-width="1"/>
      <ellipse cx="25" cy="27" rx="13" ry="9" fill="none" stroke="${C.cyan}" stroke-width="1.2"/><line x1="12" y1="27" x2="38" y2="27" stroke="${C.cyan}" stroke-width=".8"/>
      <circle id="eh-sh-holo" cx="25" cy="27" r="17" fill="${C.sh2}" fill-opacity=".12" stroke="${C.sh2}" stroke-width="1.2"/></g>`);
  block({ c: [858, 742, 56] }, { r: [706, 648, 750, 754] }, { r: [944, 664, 1002, 726] });

  const ring = ref('sh-ring'), field = ref('sh-field'), orb = ref('sh-orb'), holo = ref('sh-holo'), wave = ref('sh-wave');
  const capL = [...gd.querySelectorAll('.eh-cap')];
  let a = 0, b = 0;
  ANIM.push((t, dt) => {
    a = (a + 24 * dt) % 360; b = (b - 9 * dt) % 360;
    ring.setAttribute('transform', `rotate(${f1(a)})`);
    field.setAttribute('transform', `rotate(${f1(b)})`);
    field.setAttribute('opacity', f1(.6 + .4 * Math.sin(t * 1.8)));
    orb.setAttribute('transform', `scale(${(1 + .1 * Math.sin(t * 3)).toFixed(3)})`);
    holo.setAttribute('r', f1(16 + 1.5 * Math.sin(t * 1.8)));
    capL.forEach((c, i) => c.setAttribute('opacity', f1(.35 + .65 * Math.max(0, Math.sin(t * 3 - i * 1.1)))));
    const p = [];
    for (let x = 34; x <= 57; x += 1.5) p.push(f1(x) + ',' + f1(8 + 2.5 * Math.sin(x * .9 + t * 4)));
    wave.setAttribute('points', p.join(' '));
  });
}

/* ==== SECTION: Command center (hyperdrive, main terminal, crew stations, B.F. 9000) ==== */
function drawCommand(gs, gd) {
  let clamps = '';
  [1137, 1158, 1179, 1200, 1221].forEach((x) => {
    clamps += `<rect x="${x - 4}" y="330" width="8" height="64" rx="3" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="1.5"/>` +
      `<circle class="eh-hd-light" cx="${x}" cy="337" r="2" fill="${C.hd2}"/><circle cx="${x}" cy="387" r="1.5" fill="${C.cyan}"/>`;
  });
  // crew stations on the three right-hand walls (the crew arrive in step 5)
  const station = (x, y, rot, i) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})">
      <rect x="-11" y="-31" width="22" height="62" rx="4" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
      <rect x="2" y="-27" width="7" height="25" rx="1.5" fill="${C.screen}" stroke="${C.outline}" stroke-width="1"/>
      <rect x="2" y="2" width="7" height="25" rx="1.5" fill="${C.screen}" stroke="${C.outline}" stroke-width="1"/>
      <g class="eh-crew-scr" data-i="${i}" fill="${C.cyan}"><rect x="4" y="-23" width="3" height="10" rx="1"/><rect x="4" y="-10" width="3" height="5" rx="1" opacity=".6"/>
        <rect x="4" y="6" width="3" height="7" rx="1" opacity=".7"/><rect x="4" y="16" width="3" height="8" rx="1"/></g>
      <rect x="-9" y="-17" width="7" height="34" rx="2" fill="${C.metal3}"/>
      <g fill="${C.metal1}"><rect x="-8" y="-14" width="5" height="2"/><rect x="-8" y="-9" width="5" height="2"/><rect x="-8" y="-4" width="5" height="2"/><rect x="-8" y="1" width="5" height="2"/><rect x="-8" y="6" width="5" height="2"/><rect x="-8" y="11" width="5" height="2"/></g>
      <g transform="translate(-27 0)"><circle r="9" fill="${C.armorlit}" stroke="${C.outline}" stroke-width="2"/><circle r="5" fill="${C.armor}"/>
        <path d="M-6 -9 Q-12 0 -6 9" fill="none" stroke="${C.outline}" stroke-width="5.5" stroke-linecap="round"/>
        <path d="M-6 -9 Q-12 0 -6 9" fill="none" stroke="${C.armorlit}" stroke-width="2.5" stroke-linecap="round"/></g>
    </g>`;
  const rack = (x) => `<rect x="${x}" y="636" width="40" height="42" rx="4" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
      <g stroke="${C.metal3}" stroke-width="2"><line x1="${x + 6}" y1="646" x2="${x + 34}" y2="646"/><line x1="${x + 6}" y1="654" x2="${x + 34}" y2="654"/><line x1="${x + 6}" y1="662" x2="${x + 34}" y2="662"/></g>
      <rect x="${x}" y="676" width="40" height="12" rx="2" fill="${C.face}" stroke="${C.outline}" stroke-width="1.5"/>`;
  const leds = (x) => { let s = ''; for (let i = 0; i < 6; i++) s += `<rect class="eh-led" x="${x + 4 + i * 6}" y="680" width="3.5" height="3" rx="1" fill="${i % 3 ? C.cyan : C.red}"/>`; return s; };
  add(gs, `<g transform="translate(1264 300) rotate(31.8)"><rect width="34" height="10" rx="2" fill="${C.outline}"/><g fill="${C.cyan}"><rect x="4" y="3.5" width="6" height="3" rx="1"/><rect x="14" y="3.5" width="6" height="3" rx="1" opacity=".6"/><rect x="24" y="3.5" width="6" height="3" rx="1" opacity=".3"/></g></g>
    <circle cx="1258" cy="512" r="40" fill="none" stroke="${C.cyan}" stroke-width="2" opacity=".18"/>
    <circle cx="1258" cy="512" r="30" fill="none" stroke="${C.cyan}" stroke-width="1" opacity=".14" stroke-dasharray="4 5"/>
    <path d="M1258 492 C1236 490 1232 512 1240 520 C1236 534 1252 538 1258 530 C1264 538 1280 534 1276 520 C1284 512 1280 490 1258 492 Z M1258 494 L1258 530" fill="none" stroke="${C.cyan}" stroke-width="1.8" opacity=".22"/>
    ${lightBar(1130, 728, 22, 3)}${lightBar(1214, 728, 22, 3)}
    <ellipse cx="1179" cy="362" rx="110" ry="58" fill="url(#eh-glowMagenta)"/>
    <rect x="1102" y="388" width="16" height="12" rx="2" fill="${C.armor}" stroke="${C.outline}" stroke-width="1.5"/>
    <rect x="1240" y="388" width="16" height="12" rx="2" fill="${C.armor}" stroke="${C.outline}" stroke-width="1.5"/>
    <rect x="1095" y="332" width="168" height="60" rx="30" fill="url(#eh-metalV)" stroke="${C.outline}" stroke-width="2.5"/>
    <rect x="1117" y="350" width="124" height="24" rx="12" fill="${C.hd4}" stroke="${C.outline}" stroke-width="1.5"/>
    <rect x="1120" y="353" width="118" height="18" rx="9" fill="url(#eh-hdEnergy)"/>
    <rect x="1129" y="399" width="100" height="8" rx="3" fill="${C.well}" stroke="${C.outline}" stroke-width="1.5"/>
    <text x="1179" y="418" text-anchor="middle" font-size="6.5" fill="${C.hd2}" opacity=".55" letter-spacing="1.5">HYPERDRIVE</text>
    <ellipse cx="1144" cy="470" rx="30" ry="26" fill="url(#eh-glowCyan)"/>
    <path d="M1136 488 L1128 470 L1160 470 L1152 488 Z" fill="${C.cyan}" opacity=".12"/>
    <ellipse cx="1144" cy="540" rx="26" ry="5" fill="${C.black}" opacity=".3"/>
    <rect x="1118" y="496" width="10" height="34" rx="3" fill="${C.metal2}" stroke="${C.outline}" stroke-width="1.5"/>
    <g fill="${C.metal1}"><rect x="1120" y="500" width="6" height="2"/><rect x="1120" y="505" width="6" height="2"/><rect x="1120" y="510" width="6" height="2"/><rect x="1120" y="515" width="6" height="2"/><rect x="1120" y="520" width="6" height="2"/></g>
    <rect x="1126" y="488" width="38" height="50" rx="6" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
    <rect x="1130" y="492" width="24" height="42" rx="3" fill="${C.screen}" stroke="${C.outline}" stroke-width="1"/>
    <g fill="${C.cyan}"><rect x="1133" y="497" width="16" height="2" rx="1"/><rect x="1133" y="502" width="11" height="2" rx="1" opacity=".7"/><rect x="1133" y="507" width="14" height="2" rx="1" opacity=".7"/>
      <rect x="1133" y="514" width="8" height="8" rx="1" opacity=".35"/><rect x="1143" y="514" width="8" height="8" rx="1" opacity=".35"/></g>
    <circle cx="1159" cy="494" r="2" fill="${C.green}"/>
    <ellipse cx="1180" cy="668" rx="80" ry="60" fill="url(#eh-glowRed)"/>
    ${pipe('M1152 668 L1150 668 M1208 668 L1212 668', 6)}
    ${rack(1112)}${rack(1208)}
    <g transform="translate(1180 666)"><circle r="30" fill="${C.outline}"/><circle r="28" fill="url(#eh-metal)"/><circle r="21" fill="${C.well}" stroke="${C.outline}" stroke-width="1.5"/></g>
    <g transform="translate(1180 704)"><rect x="-22" y="-5" width="44" height="10" rx="2" fill="${C.well}" stroke="${C.outline}" stroke-width="1"/>
      <text y="2.6" text-anchor="middle" font-size="6" fill="${C.red}">B.F. 9000</text></g>`);
  add(gd, `${screen(1118, 292, 110, 16, `<circle cx="9" cy="8" r="4" fill="${C.black}" stroke="${C.bhdisk2}" stroke-width="1.2"/>` +
      `<ellipse cx="9" cy="8" rx="8" ry="2" fill="none" stroke="${C.bhdisk3}" stroke-width=".8"/>` +
      `<text x="22" y="7" font-size="4.4" fill="${C.cyanhi}">EVENT HORIZON</text><rect x="22" y="10" width="60" height="2" rx="1" fill="${C.cyan}" opacity=".4"/>` +
      `<circle id="eh-cc-blink" cx="102" cy="8" r="2" fill="${C.red}"/>`)}
    <line id="eh-hd-flow" x1="1124" y1="362" x2="1234" y2="362" stroke="${C.hd1}" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 14"/>
    ${clamps}
    <g transform="translate(1112 362)"><circle r="19" fill="url(#eh-metal)" stroke="${C.outline}" stroke-width="2"/><circle class="eh-hd-cap" r="10" fill="url(#eh-coreMagenta)" stroke="${C.outline}" stroke-width="1.2"/></g>
    <g transform="translate(1246 362)"><circle r="19" fill="url(#eh-metal)" stroke="${C.outline}" stroke-width="2"/><circle class="eh-hd-cap" r="10" fill="url(#eh-coreMagenta)" stroke="${C.outline}" stroke-width="1.2"/></g>
    <rect id="eh-hd-charge" x="1131" y="401" width="10" height="4" rx="2" fill="${C.hd2}"/>
    ${station(1339.4, 405.5, -14.6, 0)}${station(1352, 512, 0, 1)}${station(1339.4, 618.5, 14.6, 2)}
    <g id="eh-holo" opacity=".85"><path d="M1144 456 C1131 455 1128 467 1133 472 C1131 480 1140 482 1144 478 C1148 482 1157 480 1155 472 C1160 467 1157 455 1144 456 Z M1144 457 L1144 478 M1136 465 Q1140 467 1138 471 M1152 465 Q1148 467 1150 471" fill="none" stroke="${C.cyanhi}" stroke-width="1.6" stroke-linecap="round"/></g>
    <rect id="eh-term-cursor" x="1133" y="526" width="5" height="2.5" fill="${C.cyanhi}"/>
    ${leds(1112)}${leds(1208)}
    <g transform="translate(1180 666)">
      <circle id="eh-bf-eye" r="15" fill="url(#eh-eyeRed)"/>
      <circle r="15" fill="none" stroke="${C.eye3}" stroke-width="1.5"/>
      <circle id="eh-bf-pupil" r="5" fill="${C.eye1}" opacity=".85"/>
      <circle cx="-5" cy="-6" r="3" fill="${C.white}" opacity=".7"/>
    </g>`);
  block({ r: [1090, 324, 1268, 410] }, { r: [1114, 484, 1168, 542] }, { r: [1106, 630, 1254, 712] },
    { r: [1306, 368, 1366, 444] }, { r: [1314, 476, 1366, 548] }, { r: [1306, 580, 1366, 656] });

  const flow = ref('hd-flow'), charge = ref('hd-charge'), holo = ref('holo'), cursor = ref('term-cursor'), blink = ref('cc-blink');
  const eye = ref('bf-eye'), pupil = ref('bf-pupil');
  const hdl = [...gd.querySelectorAll('.eh-hd-light')], caps = [...gd.querySelectorAll('.eh-hd-cap')], ledEls = [...gd.querySelectorAll('.eh-led')];
  const crew = [...gd.querySelectorAll('.eh-crew-scr')];
  let ledT = 0;
  ANIM.push((t, dt) => {
    flow.setAttribute('stroke-dashoffset', f1(-t * 40 % 22));
    hdl.forEach((l, i) => l.setAttribute('opacity', f1(.3 + .7 * Math.max(0, Math.sin(t * 4 - i * .9)))));
    caps.forEach((c) => c.setAttribute('transform', `scale(${(1 + .08 * Math.sin(t * 3)).toFixed(3)})`));
    charge.setAttribute('width', f1(10 + 3 * Math.sin(t * 1.5)));
    holo.setAttribute('transform', `translate(0 ${f1(Math.sin(t * 2) * 2)})`);
    holo.setAttribute('opacity', f1(.7 + .2 * Math.sin(t * 5)));
    cursor.setAttribute('opacity', Math.sin(t * 6) > 0 ? 1 : 0);
    blink.setAttribute('opacity', Math.sin(t * 4) > 0 ? 1 : .25);
    eye.setAttribute('r', f1(14.5 + .8 * Math.sin(t * 1.4)));
    pupil.setAttribute('r', f1(4.5 + 1.2 * Math.sin(t * 1.4)));
    crew.forEach((c, i) => c.setAttribute('opacity', f1(.75 + .25 * Math.sin(t * 2.5 + i * 2))));
    ledT += dt;
    if (ledT > .25) { ledT = 0; ledEls.forEach((l) => { if (Math.random() < .3) l.setAttribute('opacity', Math.random() < .5 ? 1 : .3); }); }
  });
}

/* ==== SECTION: Corridor details ==== */
function drawCorridor(gs, gd) {
  let lights = '', chev = '';
  [322, 388, 580, 640, 700, 760, 940, 1000].forEach((x) => { lights += lightBar(x, 554, 22, 3); });
  [978, 1002, 1026].forEach((x) => { chev += `<path class="eh-chev" d="M${x} 500 L${x + 10} 512 L${x} 524" fill="none" stroke="${C.cyan}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".25"/>`; });
  add(gs, `${pipe('M296 471 L436 471', 5)}${pipe('M534 471 L806 471', 5)}${pipe('M904 471 L1046 471', 5)}
    <g fill="${C.armor}"><rect x="340" y="467" width="4" height="9"/><rect x="600" y="467" width="4" height="9"/><rect x="700" y="467" width="4" height="9"/><rect x="960" y="467" width="4" height="9"/></g>
    ${grate(330, 500, 64, 24)}${grate(620, 500, 120, 24)}${lights}
    <g transform="translate(270 476)"><rect width="18" height="72" rx="3" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
      <rect x="4" y="5" width="10" height="62" rx="2" fill="url(#eh-hazard)"/><circle cx="9" cy="36" r="3" fill="${C.redoff}" stroke="${C.outline}" stroke-width="1"/></g>
    <rect x="1042" y="440" width="14" height="30" rx="3" fill="${C.wall}" stroke="${C.outline}" stroke-width="2"/>
    <rect x="1042" y="554" width="14" height="30" rx="3" fill="${C.wall}" stroke="${C.outline}" stroke-width="2"/>`);
  add(gd, chev);
  const ch = [...gd.querySelectorAll('.eh-chev')];
  ANIM.push((t) => ch.forEach((c, i) => c.setAttribute('opacity', f1(.15 + .35 * Math.max(0, Math.sin(t * 3 - i * .9))))));
}

/* ==== SECTION: Doors ==== */
function drawDoors(g) {
  DOORS.forEach((d) => {
    const w = d.x2 - d.x1, h2 = w / 2, my = d.mid;
    add(DEFS, `<clipPath id="eh-dclip${d.i}"><rect x="${d.x1}" y="${d.y1}" width="${w}" height="${d.y2 - d.y1}"/></clipPath>`);
    const panel = (x, flip) => `<rect x="${x}" y="${my - 7}" width="${h2 + 1}" height="14" fill="url(#eh-metal)" stroke="${C.outline}" stroke-width="2"/>` +
      `<rect x="${x + 4}" y="${my - 4}" width="${h2 - 8}" height="2.5" fill="${C.metal3}"/>` +
      `<rect x="${x + 4}" y="${my + 1}" width="${h2 - 8}" height="3" fill="url(#eh-hazard)"/>` +
      `<rect x="${flip ? x + 1 : x + h2 - 3}" y="${my - 6}" width="3" height="12" fill="${C.armor}"/>`;
    const lx = d.x2 + 8, ly = d.side === 's' ? 464 : 571;
    add(g, `<g id="eh-door${d.i}">
      <rect x="${d.x1}" y="${my - 5}" width="${w}" height="10" fill="${C.grate}"/>
      <g clip-path="url(#eh-dclip${d.i})"><g id="eh-door${d.i}L">${panel(d.x1, false)}</g><g id="eh-door${d.i}R">${panel(d.x - 1, true)}</g></g>
      <rect x="${d.x1 - 7}" y="${my - 17}" width="10" height="34" rx="3" fill="${C.wall}" stroke="${C.outline}" stroke-width="2"/>
      <rect x="${d.x2 - 3}" y="${my - 17}" width="10" height="34" rx="3" fill="${C.wall}" stroke="${C.outline}" stroke-width="2"/>
      <g transform="translate(${lx} ${ly})">
        <rect width="26" height="16" rx="3" fill="${C.armor}" stroke="${C.outline}" stroke-width="1.5"/>
        <circle id="eh-lock${d.i}" cx="6" cy="6" r="2.6" fill="${C.red}"/>
        <path d="M15.5 6 v-1.6 a2.5 2.5 0 0 1 5 0 v1.6" fill="none" stroke="${C.wall}" stroke-width="1.2"/>
        <rect x="14.5" y="6" width="7" height="5" rx="1" fill="${C.wall}"/>
        <text id="eh-cost${d.i}" x="13" y="14.6" text-anchor="middle" font-size="3.6" fill="${C.hazard}"></text>
      </g>
    </g>`);
    d.elL = ref('door' + d.i + 'L'); d.elR = ref('door' + d.i + 'R'); d.lock = ref('lock' + d.i);
  });
}

/* ==== SECTION: Player (the sample's astronaut) ==== */
function drawPlayer(g) {
  const o = C.outline;
  add(g, `<g id="eh-player"><g transform="scale(${SETTINGS.PLAYER_SCALE})">
    <ellipse cx="0" cy="2" rx="17" ry="6" fill="${C.black}" opacity=".35"/>
    <rect id="eh-legL" x="-10" y="-8" width="9" height="12" rx="3" fill="${C.suitleg}" stroke="${o}" stroke-width="2.5"/>
    <rect id="eh-legR" x="1" y="-8" width="9" height="12" rx="3" fill="${C.suitleg}" stroke="${o}" stroke-width="2.5"/>
    <g id="eh-torso">
      <rect id="eh-armL" x="-19" y="-28" width="8" height="16" rx="4" fill="${C.suitarm}" stroke="${o}" stroke-width="2.5"/>
      <rect id="eh-armR" x="11" y="-28" width="8" height="16" rx="4" fill="${C.suitarm}" stroke="${o}" stroke-width="2.5"/>
      <rect x="-13" y="-31" width="26" height="25" rx="8" fill="${C.suit}" stroke="${o}" stroke-width="2.5"/>
      <g id="eh-front"><rect x="-13" y="-17" width="26" height="4" fill="${C.amber}"/>
        <rect x="-5" y="-27" width="10" height="7" rx="2" fill="${C.cyan}" stroke="${o}" stroke-width="1.5"/></g>
      <g id="eh-back" style="display:none"><rect x="-11" y="-30" width="22" height="20" rx="5" fill="${C.pack}" stroke="${o}" stroke-width="2.5"/>
        <rect x="-6" y="-26" width="12" height="4" fill="${C.amber}"/><circle cx="0" cy="-16" r="2" fill="${C.cyan}"/></g>
      <g transform="translate(0 -44)">
        <line x1="8" y1="-12" x2="11" y2="-21" stroke="${o}" stroke-width="2.5"/>
        <circle cx="11" cy="-22" r="3" fill="${C.pink}" stroke="${o}" stroke-width="1.5"/>
        <circle r="16" fill="${C.helmet}" stroke="${o}" stroke-width="2.5"/>
        <g id="eh-visor"><rect id="eh-visorR" x="-11" y="-6" width="22" height="15" rx="7" fill="url(#eh-visorG)" stroke="${o}" stroke-width="2"/>
          <rect id="eh-visorHi" x="-7" y="-3" width="7" height="3" rx="1.5" fill="${C.visorhi}" opacity=".8"/></g>
      </g>
    </g>
  </g></g>`);
}
const PL = { x: SETTINGS.START.x, y: SETTINGS.START.y, dir: SETTINGS.START.dir, walk: 0, moving: false };
let PR = null;   // player element refs
function posePlayer(t) {
  if (!PR) PR = { g: ref('player'), torso: ref('torso'), legL: ref('legL'), legR: ref('legR'), armL: ref('armL'), armR: ref('armR'),
    front: ref('front'), back: ref('back'), visor: ref('visor'), visorR: ref('visorR'), visorHi: ref('visorHi') };
  const sw = PL.moving ? Math.sin(PL.walk) : 0;
  const bob = PL.moving ? Math.abs(Math.sin(PL.walk)) * -2 : Math.sin(t * 2) * .6;
  const side = PL.dir === 'left' || PL.dir === 'right';
  PR.g.setAttribute('transform', `translate(${f1(PL.x)} ${f1(PL.y)})`);
  PR.torso.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`);
  PR.legL.setAttribute('transform', side ? `translate(${f1(sw * 5)} 0)` : `translate(0 ${f1(sw * 3)})`);
  PR.legR.setAttribute('transform', side ? `translate(${f1(-sw * 5)} 0)` : `translate(0 ${f1(-sw * 3)})`);
  PR.armL.setAttribute('transform', `translate(0 ${f1(-sw * 3)})`);
  PR.armR.setAttribute('transform', `translate(0 ${f1(sw * 3)})`);
  PR.front.style.display = PL.dir === 'down' ? '' : 'none';
  PR.back.style.display = PL.dir === 'up' ? '' : 'none';
  if (PL.dir === 'up') PR.visor.style.display = 'none';
  else {
    PR.visor.style.display = '';
    const dx = PL.dir === 'left' ? -7 : PL.dir === 'right' ? 7 : 0, w = side ? 14 : 22;
    PR.visorR.setAttribute('x', f1(dx - w / 2)); PR.visorR.setAttribute('width', w);
    PR.visorHi.setAttribute('x', f1(dx - w / 2 + 4));
  }
  PR.armL.style.display = PL.dir === 'right' ? 'none' : '';
  PR.armR.style.display = PL.dir === 'left' ? 'none' : '';
}

/* ==== SECTION: Walkable grid ====
   Cells are walkable when their center is on a floor, not on a wall face and not inside a prop.
   Door cells are walkable only while that door is open. The same grid will feed tap-to-move (step 7). */
const CELL = SETTINGS.CELL, GW = SHIP_W / CELL, GH = SHIP_H / CELL;
const grid = new Uint8Array(GW * GH);
const doorOf = new Int8Array(GW * GH).fill(-1);
function buildGrid() {
  const faces = FLOORS.flatMap((f) => faceQuads(f).map((q) => q.q));
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const x = gx * CELL + CELL / 2, y = gy * CELL + CELL / 2, i = gy * GW + gx;
      const d = DOORS.find((q) => x > q.x1 && x < q.x2 && y > q.y1 && y < q.y2);
      if (d) { doorOf[i] = d.i; continue; }
      let ok = FLOORS.some((f) => inPoly(x, y, f.poly));
      if (ok && faces.some((q) => inPoly(x, y, q))) ok = false;
      if (ok && BLOCKERS.some((s) => inShape(x, y, s))) ok = false;
      grid[i] = ok ? 1 : 0;
    }
  }
}
function walkable(gx, gy) {
  if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return false;
  const i = gy * GW + gx;
  if (grid[i]) return true;
  const d = doorOf[i];
  return d >= 0 && DOORS[d].t > .7;
}
function free(x, y) {
  const fw = SETTINGS.FOOT_W, fh = SETTINGS.FOOT_H;
  const x1 = Math.floor((x - fw) / CELL), x2 = Math.floor((x + fw - .01) / CELL);
  const y1 = Math.floor((y - fh) / CELL), y2 = Math.floor((y + fh - .01) / CELL);
  for (let gy = y1; gy <= y2; gy++) for (let gx = x1; gx <= x2; gx++) if (!walkable(gx, gy)) return false;
  return true;
}
function playerInDoor(d) {
  const fw = SETTINGS.FOOT_W, fh = SETTINGS.FOOT_H;
  return PL.x + fw > d.x1 && PL.x - fw < d.x2 && PL.y + fh > d.y1 && PL.y - fh < d.y2;
}
// Which room (or corridor / command center) a point is in
function areaAt(x, y) {
  const r = ROOMS.find((q) => inPoly(x, y, q.poly));
  if (r) return r.id;
  if (inPoly(x, y, CC_POLY)) return 'cc';
  if (inPoly(x, y, CORRIDOR)) return 'corridor';
  const d = DOORS.find((q) => x > q.x1 && x < q.x2 && y > q.y1 && y < q.y2);
  return d ? 'door-' + d.room.id : '';
}

/* ==== SECTION: Input and movement ==== */
const keys = {};
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
function gameHasFocus() { const a = document.activeElement; return !a || a === stage || a === document.body; }
window.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || !gameHasFocus()) return;
  const k = KEYMAP[e.code];
  if (k) { keys[k] = true; e.preventDefault(); }
  else if (e.code === 'Space') e.preventDefault();   // Space will interact (step 2); never scroll the page
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
const releaseKeys = () => { for (const k in keys) keys[k] = false; };
window.addEventListener('blur', releaseKeys);
stage.addEventListener('blur', releaseKeys);
stage.addEventListener('pointerdown', () => stage.focus({ preventScroll: true }));

function movePlayer(dt) {
  let vx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), vy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  PL.moving = false;
  if (!vx && !vy) return;
  const len = Math.hypot(vx, vy); vx /= len; vy /= len;
  const dist = SETTINGS.SPEED * dt, n = Math.ceil(dist / 2), sx = vx * dist / n, sy = vy * dist / n;
  const x0 = PL.x, y0 = PL.y;
  for (let k = 0; k < n; k++) {
    if (sx) { if (free(PL.x + sx, PL.y)) PL.x += sx; else if (!sy) nudge('y', sx); }
    if (sy) { if (free(PL.x, PL.y + sy)) PL.y += sy; else if (!sx) nudge('x', sy); }
  }
  PL.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
  PL.moving = PL.x !== x0 || PL.y !== y0;
  if (PL.moving) PL.walk += dt * 11;
}
// Blocked head-on: if an opening is within 14 units to one side (a doorway), drift toward it.
function nudge(axis, d) {
  const m = Math.abs(d);
  for (let s = 2; s <= 14; s += 2) {
    for (const sg of [1, -1]) {
      const o = s * sg;
      const ok = axis === 'y' ? free(PL.x + d, PL.y + o) && free(PL.x, PL.y + sg * m)
        : free(PL.x + o, PL.y + d) && free(PL.x + sg * m, PL.y);
      if (ok) { if (axis === 'y') PL.y += sg * m; else PL.x += sg * m; return; }
    }
  }
}

/* ==== SECTION: Doors (state) ==== */
function setDoor(d, open) { d.want = open; }
function updateDoors(dt) {
  DOORS.forEach((d) => {
    if (!d.want && d.t > 0 && playerInDoor(d)) return;   // never close on the player
    d.open = d.want;
    const t0 = d.t;
    d.t = Math.max(0, Math.min(1, d.t + (d.open ? 1 : -1) * dt * SETTINGS.DOOR_SPEED));
    if (d.t === t0) return;
    const e = d.t * d.t * (3 - 2 * d.t), off = f1(e * 44);
    d.elL.setAttribute('transform', `translate(${-off} 0)`);
    d.elR.setAttribute('transform', `translate(${off} 0)`);
    d.lock.setAttribute('fill', d.t > .5 ? C.green : C.red);
  });
}

/* ==== SECTION: Fit the ship to the stage ==== */
function fit() {
  const r = stage.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const s = Math.min(r.width / BOX.w, r.height / BOX.h), vw = r.width / s, vh = r.height / s;
  const vb = [BOX.x + BOX.w / 2 - vw / 2, BOX.y + BOX.h / 2 - vh / 2, vw, vh].map(f1).join(' ');
  ALL_SVGS.forEach((el) => el.setAttribute('viewBox', vb));
}

/* ==== SECTION: Test tools (?dev) ==== */
let devGridOn = false;
function devGrid() {
  const g = ref('devgrid');
  g.textContent = '';
  if (!devGridOn) return;
  let a = '', b = '';
  for (let gy = 0; gy < GH; gy++) {
    for (let gx = 0; gx < GW; gx++) {
      const i = gy * GW + gx, x = gx * CELL + .6, y = gy * CELL + .6, c = `M${x} ${y}h${CELL - 1.2}v${CELL - 1.2}h${-(CELL - 1.2)}z`;
      if (grid[i]) a += c; else if (doorOf[i] >= 0) b += c;
    }
  }
  add(g, `<path d="${a}" fill="${C.devfloor}" opacity=".3"/><path id="eh-dev-doors" d="${b}" fill="${C.devdoor}" opacity=".35"/>
    <rect id="eh-dev-foot" width="${SETTINGS.FOOT_W * 2}" height="${SETTINGS.FOOT_H * 2}" fill="none" stroke="${C.devdoor}" stroke-width="1.5"/>`);
}
function devInit() {
  $('dev').hidden = false;
  const go = $('devGo');
  const spots = [['', 'Choose a spot…'], ['start', 'Start (command center)'], ...ROOMS.map((r) => [r.id, r.name]), ['corridor', 'Corridor (rear)']];
  go.innerHTML = spots.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  const SPOT_XY = { start: [SETTINGS.START.x, SETTINGS.START.y], engine: [485, 396], life: [855, 380], reactor: [485, 650], shield: [855, 650], corridor: [320, 530] };
  go.addEventListener('change', () => {
    const p = SPOT_XY[go.value];
    if (p) { PL.x = p[0]; PL.y = p[1]; }
    go.value = ''; stage.focus({ preventScroll: true });
  });
  $('devGrid').addEventListener('change', (e) => { devGridOn = e.target.checked; devGrid(); });
  $('devDoors').addEventListener('click', (e) => {
    const open = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', open);
    e.currentTarget.textContent = open ? 'Close all doors' : 'Open all doors';
    DOORS.forEach((d) => setDoor(d, open));
  });
}
let devLast = '';
function devTick() {
  const s = `x ${Math.round(PL.x)}, y ${Math.round(PL.y)} · ${areaAt(PL.x, PL.y) || '—'}`;
  if (s !== devLast) { $('devPos').textContent = s; devLast = s; }
  const foot = ref('dev-foot');
  if (foot) { foot.setAttribute('x', f1(PL.x - SETTINGS.FOOT_W)); foot.setAttribute('y', f1(PL.y - SETTINGS.FOOT_H)); }
}

/* ==== SECTION: Build and run ==== */
function build() {
  drawDefs();
  drawSpace(layer('space', SVG_BG), layer('sky', SVG_SKY));
  drawEngines(layer('engines'), SVG_SKY.firstChild);
  drawHull(layer('hull'));
  drawFloors(layer('walls'), layer('floors'));
  const gs = layer('props'), gd = layer('machines', SVG_FRONT);
  drawCorridor(gs, gd);
  drawEngineRoom(gs, gd); drawLifeSupport(gs, gd); drawReactor(gs, gd); drawShieldBay(gs, gd); drawCommand(gs, gd);
  drawDoors(layer('doors', SVG_FRONT));
  layer('devgrid', SVG_FRONT);
  drawPlayer(layer('actors', SVG_FRONT));
  layer('fx', SVG_FRONT);
  const eyes = [...SVG_FRONT.querySelectorAll('.eh-bfeye')];
  ANIM.push((t) => eyes.forEach((e, i) => e.setAttribute('r', f1(3 + .6 * Math.sin(t * 2 + i)))));
  ROOMS.forEach((r) => { SYS[r.id] = { room: r, state: 'ok' }; });
  buildGrid();
}

build();
fit();
new ResizeObserver(fit).observe(stage);
if (DEV) devInit();
stage.focus({ preventScroll: true });

// Main loop: the player moves every frame; idle machine animations run at about 30 fps to save painting.
let last = performance.now(), T = 0, animDt = 0, frameNo = 0;
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now; T += dt; animDt += dt;
  movePlayer(dt);
  posePlayer(T);
  updateDoors(dt);
  if (++frameNo % 2 === 0 || animDt > .05) {
    for (let i = 0; i < ANIM.length; i++) ANIM[i](T, animDt);
    animDt = 0;
  }
  if (DEV) devTick();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test hooks for automated checks, only with ?dev
if (DEV) window.__eh = { PL, DOORS, keys, setDoor, free, areaAt, SETTINGS, ANIM };
})();
