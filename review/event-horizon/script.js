// Event Horizon — a review game. The ship's AI, B.F. 9000, has locked the system rooms while the ship
// drifts toward a black hole. Walk the ship, earn credits at the main terminal, pay for doors and repair
// failed systems before the event horizon clock runs out.
// Plan and handoff: project doc "claude/Event Horizon - Plan.md".
// Built so far: step 1 (the ship drawn in vector, walking with keys, collisions on a walkable grid), step 1b
// (angular plated hull, NASA-style black hole, command center moved right, chibi astronaut) and step 2
// (failures, alarms, repairs with Space, both clocks, the HUD, win and lose).
//
// URL options:
//   ?dev     test tools: walkable-grid overlay, open all doors, jump to a room, player position, break or repair
//            systems, set the clocks, skip to the next failure, invincible, freeze the clocks
//   ?seed=N  repeatable failure order (N is any whole number)
(function () {
'use strict';

/* ==== SECTION: Settings ==== */
const SETTINGS = {
  SPEED: 150,            // walking speed, ship units per second (terminal to a room door is about 6 s)
  PLAYER_SCALE: 0.62,    // the engine-room sample's astronaut, scaled to the ship
  FOOT_W: 9, FOOT_H: 5,  // half-width and half-height of the player's foot box (collisions)
  CELL: 8,               // walkable-grid cell size, ship units
  DOOR_SPEED: 3.5,       // door slide speed (share of a full slide per second)
  START: { x: 1114, y: 522, dir: 'right' },
  // Clocks and failures (Normal)
  HYPERDRIVE: 600,       // hyperdrive clock at the start, s; the player wins when it reaches 0:00
  HORIZON: 180,          // event horizon clock at the start and its maximum, s; the player loses at 0:00
  DRAIN: 1,              // horizon seconds lost per second while any system is down (same for one or four)
  REPAIR_BONUS: 15,      // horizon seconds added by each repair, up to HORIZON
  REPAIR_TIME: 3,        // seconds a repair takes; the player can't move meanwhile
  REACH: 26,             // how close (ship units) the player's feet must be to a machine's footprint to repair it
  // The 8 failures: [mission time s, door cost in credits]. Each hits a random working system other than the
  // previous failure's (any working one if that's the only choice; skipped if all four are down). Costs: step 3.
  FAILURES: [[30, 5], [110, 5], [185, 10], [255, 10], [320, 10], [380, 10], [435, 15], [485, 15]]
};
const SHIP_W = 1536, SHIP_H = 1024;           // floor-plan coordinates
const BOX = { x: 70, y: 50, w: 1470, h: 936 }; // the part of the plan that is fit to the screen

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
const mirror = (p) => [p[0], SHIP_H - p[1]];  // the ship is symmetric about y = 512
// Distance from a point to a blocker shape's edge (0 inside); rects and circles only
function distToShape(x, y, s) {
  if (s.c) return Math.max(0, Math.hypot(x - s.c[0], y - s.c[1]) - s.c[2]);
  const dx = Math.max(s.r[0] - x, 0, x - s.r[2]), dy = Math.max(s.r[1] - y, 0, y - s.r[3]);
  return Math.hypot(dx, dy);
}
// A point on edge i of a clockwise polygon, share s along it, pushed out by d (positive = outside)
function edgePoint(poly, i, s, d) {
  const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
  return [a[0] + dx * s + dy / len * d, a[1] + dy * s - dx / len * d];
}
const mmss = (s) => { const n = Math.max(0, Math.ceil(s - 1e-6)); return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0'); };
// For animation callbacks: returns the system's state, and calls look(state) once whenever it changes
function watch(id, look) {
  let shown = null;
  return () => { const st = SYS[id].state; if (st !== shown) { shown = st; look(st); } return st; };
}

/* ==== SECTION: Floor plan ====
   Landscape brain seen from above: engines on the left, command center (front) on the right,
   the corridor along the fissure. Room shapes are polygons (clockwise); every upward-facing edge
   gets a wall face (3/4 view), which is not walkable. */
const W_BAND = 26;   // thickness of the cream wall tops around each floor
const FACE = 20;     // height of the north wall faces
// Per room: hud = HUD label; fixed = the line shown after a repair; hit = the machine's footprint (the player
// repairs within REACH of it); ring = repair ring [x, y, radius]; tint = machine color (art palette name);
// beacons = alarm beacons on the wall top, as [edge index, share along the edge] of poly.
const ROOMS = [
  { id: 'engine', name: 'Engine room', machine: 'Anti-gravity thruster', at: { x: 480, y: 318 },
    hud: 'Engine', fixed: 'Thruster recalibrated', tint: 'cyan',
    hit: [{ c: [480, 318, 58] }], ring: [480, 318, 68], beacons: [[8, .5], [1, .5]],
    door: { x: 485, side: 's' },
    poly: [[448, 200], [604, 200], [640, 236], [640, 386], [616, 410], [344, 410], [320, 386], [320, 292], [372, 238]] },
  { id: 'life', name: 'Life support', machine: 'Oxygen tank and scrubbers', at: { x: 800, y: 290 },
    hud: 'Life support', fixed: 'Scrubbers reset', tint: 'o2',
    hit: [{ r: [720, 228, 786, 344] }, { r: [796, 246, 888, 318] }], ring: [752, 287, 62], beacons: [[0, .5], [6, .55]],
    door: { x: 855, side: 's' },
    poly: [[700, 226], [736, 190], [784, 190], [796, 150], [884, 150], [896, 190], [930, 190], [1010, 262],
      [1010, 386], [986, 410], [724, 410], [700, 386]] },
  { id: 'reactor', name: 'Reactor', machine: 'Reactor core', at: { x: 486, y: 734 },
    hud: 'Reactor', fixed: 'Coolant vented', tint: 'rx2',
    hit: [{ c: [486, 734, 52] }], ring: [486, 734, 64], beacons: [[5, .5], [3, .5]],
    door: { x: 485, side: 'n' },
    poly: [[344, 614], [616, 614], [640, 638], [640, 780], [596, 824], [448, 824], [372, 786], [320, 732], [320, 638]] },
  { id: 'shield', name: 'Shield bay', machine: 'Shield generator', at: { x: 858, y: 742 },
    hud: 'Shields', fixed: 'Emitter realigned', tint: 'sh2',
    hit: [{ c: [858, 742, 56] }], ring: [858, 742, 72], beacons: [[5, .5], [3, .5]],
    door: { x: 855, side: 'n' },
    poly: [[724, 614], [986, 614], [1010, 638], [1010, 764], [940, 834], [764, 834], [700, 770], [700, 638]] }
];
const CORRIDOR = [[290, 462], [1080, 462], [1080, 562], [290, 562]];
// The command center sits CC_DX right of where step 1 drew it, so its wall top clears the front rooms' walls.
// drawCommand() keeps its step 1 coordinates inside a translate(CC_DX 0) group; everything here is already shifted.
const CC_DX = 20;
const CC_POLY = [[1070, 346], [1126, 290], [1260, 290], [1360, 352], [1386, 452], [1386, 572], [1360, 672],
  [1260, 734], [1126, 734], [1070, 678]];
const TERMINAL = { x: 1164, y: 512 };

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
  { id: 'corridor', poly: CORRIDOR, tile: 'floor2', faceMaxX: 1070,
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
// Systems by room id. state: 'ok' | 'broken' | 'repairing'; progress: repair progress 0–1;
// fail: which scheduled failure broke it (−1 = a dev break) and cost: that failure's door cost (step 3).
const SYS = {};
ROOMS.forEach((r) => { SYS[r.id] = { room: r, state: 'ok', progress: 0, fail: -1, cost: 0 }; });
const isDown = (id) => SYS[id].state !== 'ok';

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
    <linearGradient id="eh-bhBand" gradientUnits="userSpaceOnUse" x1="-200" y1="0" x2="200" y2="0">
      <stop offset="0" stop-color="${C.bhdisk1}" stop-opacity="0"/><stop offset=".16" stop-color="${C.bhhot}"/><stop offset=".42" stop-color="${C.bhdisk1}"/>
      <stop offset=".62" stop-color="${C.bhdisk2}"/><stop offset=".82" stop-color="${C.bhdisk3}" stop-opacity=".85"/><stop offset="1" stop-color="${C.bhdeep}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="eh-bhArc" gradientUnits="userSpaceOnUse" x1="-140" y1="0" x2="140" y2="0">
      <stop offset="0" stop-color="${C.bhhot}"/><stop offset=".3" stop-color="${C.bhdisk1}"/><stop offset=".58" stop-color="${C.bhdisk2}"/>
      <stop offset=".82" stop-color="${C.bhdisk3}"/><stop offset="1" stop-color="${C.bhdeep}"/>
    </linearGradient>
    <linearGradient id="eh-bhCore" gradientUnits="userSpaceOnUse" x1="-200" y1="0" x2="200" y2="0">
      <stop offset=".08" stop-color="${C.white}" stop-opacity="0"/><stop offset=".25" stop-color="${C.white}" stop-opacity=".95"/>
      <stop offset=".55" stop-color="${C.bhhot}" stop-opacity=".6"/><stop offset=".85" stop-color="${C.bhdisk2}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="eh-bhGlow"><stop offset=".18" stop-color="${C.bhdisk2}" stop-opacity=".3"/><stop offset=".5" stop-color="${C.bhdisk3}" stop-opacity=".1"/><stop offset="1" stop-color="${C.bhdisk4}" stop-opacity="0"/></radialGradient>
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
    ${core('coreRed', C.hot1, C.hot2, C.hot3, C.eye3)}
    <linearGradient id="eh-o2liqBad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.hot3}"/><stop offset="1" stop-color="${C.eye3}"/>
    </linearGradient>
    <radialGradient id="eh-smokeG"><stop offset="0" stop-color="${C.smoke}"/><stop offset=".55" stop-color="${C.smoke}" stop-opacity=".7"/><stop offset="1" stop-color="${C.smoke}" stop-opacity="0"/></radialGradient>
    <radialGradient id="eh-steamG"><stop offset="0" stop-color="${C.steam}"/><stop offset=".55" stop-color="${C.steam}" stop-opacity=".6"/><stop offset="1" stop-color="${C.steam}" stop-opacity="0"/></radialGradient>
    <radialGradient id="eh-beam" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="120">
      <stop offset="0" stop-color="${C.washred}" stop-opacity=".5"/><stop offset="1" stop-color="${C.washred}" stop-opacity="0"/>
    </radialGradient>
    ${glow('glowFault', C.hot3, .5)}
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
  // A flat take on NASA Goddard's accretion-disk visualization (J. Schnittman): the disk is seen nearly edge-on;
  // its far side is bent by gravity into a big arch over the shadow and a thin arc under it. The left side,
  // turning toward us, is brighter (Doppler beaming); the right side is dimmer and redder.
  const semi = (ro, ry, ri, riy, y0, down) => {      // half an elliptical ring, from y0 over the top (or under the bottom)
    const s = down ? 0 : 1;
    return `M${-ro} ${y0} A${ro} ${ry} 0 0 ${s} ${ro} ${y0} L${ri} ${y0} A${ri} ${riy} 0 0 ${1 - s} ${-ri} ${y0} Z`;
  };
  const archLine = (r, ry, y0) => `M${-r} ${y0} A${r} ${ry} 0 0 1 ${r} ${y0}`;
  const BAND = 'M-215 3 C-140 -3 -70 -9 0 -9 C70 -9 140 -3 215 3 C140 10 70 23 0 23 C-70 23 -140 10 -215 3 Z';
  const CORE = 'M-205 3 C-130 5.5 -64 7.5 0 7.5 C64 7.5 130 5.5 205 3';
  const LOW = 'M-180 5 C-110 8.5 -50 13 0 13 C50 13 110 8.5 180 5';
  let fine = '';
  [[66, 61], [76, 68], [96, 80], [124, 100]].forEach(([r, ry], i) => {
    fine += `<path d="${archLine(r, ry, 4)}" stroke="${i % 2 ? C.bhdisk3 : C.bhhot}" opacity="${i % 2 ? .35 : .3}"/>`;
  });
  // #eh-bh is placed in the top-left corner; the inner group holds the tilt and the starting size.
  add(gSky, `${tw}<g id="eh-bh" transform="translate(146 174)"><g transform="rotate(-8) scale(.85)">
    <circle r="250" fill="url(#eh-bhGlow)"/>
    <ellipse rx="240" ry="60" fill="url(#eh-bhGlow)" opacity=".8"/>
    <path d="${semi(150, 122, 60, 57, 4)}" fill="${C.bhdisk2}" opacity=".2"/>
    <path d="${semi(122, 98, 56, 54, 4)}" fill="url(#eh-bhArc)" opacity=".88"/>
    <g fill="none" stroke-width=".9">${fine}</g>
    <path d="${archLine(59, 56, 4)}" fill="none" stroke="url(#eh-bhArc)" stroke-width="5" opacity=".95"/>
    <path d="${archLine(58, 55, 4)}" fill="none" stroke="${C.white}" stroke-width="1.6" opacity=".7"/>
    <path id="eh-bh-arcflow" d="${archLine(90, 76, 4)}" fill="none" stroke="${C.bhhot}" stroke-width="1.5" stroke-dasharray="14 24" opacity=".45"/>
    <path d="${semi(60, 61, 52, 53, 6, true)}" fill="url(#eh-bhArc)" opacity=".8"/>
    <circle r="47" fill="${C.black}"/>
    <circle r="49.5" fill="none" stroke="${C.bhring}" stroke-width="2.2"/>
    <path d="${BAND}" fill="url(#eh-bhBand)"/>
    <path d="${CORE}" fill="none" stroke="url(#eh-bhCore)" stroke-width="3.5" stroke-linecap="round"/>
    <path id="eh-bh-flow1" d="${CORE}" fill="none" stroke="${C.white}" stroke-width="1.4" stroke-dasharray="16 30" opacity=".5"/>
    <path id="eh-bh-flow2" d="${LOW}" fill="none" stroke="${C.bhdisk1}" stroke-width="1.2" stroke-dasharray="10 26" opacity=".45"/>
  </g></g>`);
  // slow streaks: the near side of the disk flows left to right, its bent far side right to left
  const flows = [[ref('bh-flow1'), -14], [ref('bh-flow2'), -22], [ref('bh-arcflow'), 10]];
  ANIM.push((t) => { if (!REDUCE) flows.forEach(([el, v]) => el.setAttribute('stroke-dashoffset', f1(t * v % 1000))); });
}

/* ==== SECTION: Engines (left) and the bridge nose (right) ====
   Layered metal housings: a dark housing with its side face, blue glow bands, beveled cream caps, and nozzles
   whose plumes flicker in the sky layer. The side pods and the nose are drawn under the hull and stick out
   past it (gUnder); the main engine plugs into the back notch on top of it (gOver). */
const NOZZLES = [[102, 352, 46], [102, 672, 46], [94, 512, 70]];   // [exit x, center y, height]
function drawEngines(gUnder, gOver, gSky) {
  add(gSky, NOZZLES.map(([x, y, h]) => `<ellipse class="eh-plume" cx="${x - 36}" cy="${y}" rx="46" ry="${f1(h * .36)}" fill="url(#eh-plume)"/>`).join(''));
  const o = C.outline;
  // a beveled cream cap: side face, top, light rim, rivets (chamfered rectangle)
  const cap = (x1, y1, x2, y2, c) => {
    const p = (dy) => pts([[x1 + c, y1 + dy], [x2 - c, y1 + dy], [x2, y1 + c + dy], [x2, y2 - c + dy], [x2 - c, y2 + dy], [x1 + c, y2 + dy], [x1, y2 - c + dy], [x1, y1 + c + dy]]);
    return `<polygon points="${p(5)}" fill="${C.hullside}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>
      <polygon points="${p(0)}" fill="${C.hull}" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M${x1 + c + 1} ${y1 + 3.5} H${x2 - c - 1}" stroke="${C.hulllit}" stroke-width="2.5" stroke-linecap="round"/>
      <g fill="${C.hullrivet}"><circle cx="${x1 + 5}" cy="${y1 + c + 3}" r="1.3"/><circle cx="${x2 - 5}" cy="${y1 + c + 3}" r="1.3"/>
        <circle cx="${x1 + 5}" cy="${y2 - c - 1}" r="1.3"/><circle cx="${x2 - 5}" cy="${y2 - c - 1}" r="1.3"/></g>`;
  };
  // a blue glow band (a lit ring around a housing)
  const band = (x, y1, y2, w) => `<rect x="${x}" y="${y1}" width="${w}" height="${y2 - y1}" rx="${w / 2}" fill="${C.armordark}" stroke="${o}" stroke-width="3"/>
    <rect x="${x + 2.5}" y="${y1 + 4}" width="${w - 5}" height="${y2 - y1 - 8}" rx="${(w - 5) / 2}" fill="${C.hullblue}"/>
    <rect x="${x + w / 2 - 1}" y="${y1 + 8}" width="2" height="${y2 - y1 - 16}" rx="1" fill="${C.cyanpale}" opacity=".9"/>`;
  // a nozzle bell flaring toward the rear, with the lit exit
  const nozzle = (x, cy, h) => `<path d="M${x + 34} ${cy - h * .38} L${x + 34} ${cy + h * .38} L${x + 6} ${cy + h / 2} L${x + 6} ${cy - h / 2} Z" fill="url(#eh-metalDark)" stroke="${o}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M${x + 14} ${cy - h * .45} V${cy + h * .45} M${x + 24} ${cy - h * .42} V${cy + h * .42}" stroke="${C.metal3}" stroke-width="2"/>
    <rect x="${x - 2}" y="${cy - h / 2 - 1}" width="11" height="${h + 2}" rx="5" fill="${C.hullblue}" stroke="${o}" stroke-width="2.5"/>
    <rect x="${x + 1}" y="${cy - h / 2 + 5}" width="4" height="${h - 10}" rx="2" fill="${C.cyanpale}" opacity=".85"/>`;
  const housing = (x1, y1, x2, y2, r) => `<rect x="${x1}" y="${y1 + 6}" width="${x2 - x1}" height="${y2 - y1}" rx="${r}" fill="${C.armordark}" stroke="${o}" stroke-width="4"/>
    <rect x="${x1}" y="${y1}" width="${x2 - x1}" height="${y2 - y1}" rx="${r}" fill="${C.armor}" stroke="${o}" stroke-width="4"/>
    <rect x="${x1 + 5}" y="${y1 + 4}" width="${x2 - x1 - 10}" height="3" rx="1.5" fill="${C.armorlit}"/>`;
  const pod = (cy) => `${nozzle(102, cy, 46)}${housing(134, cy - 22, 238, cy + 22, 9)}
    ${band(138, cy - 28, cy + 28, 12)}${cap(158, cy - 15, 228, cy + 13, 6)}
    <path d="M193 ${cy - 13} V${cy + 11}" stroke="${C.hullline}" stroke-width="1.8"/>
    <rect x="231" y="${cy - 2}" width="5" height="4" rx="1" fill="${C.pink}"/>`;
  add(gUnder, `${pod(352)}${pod(672)}`);
  add(gOver, `${nozzle(94, 512, 70)}
    ${housing(130, 474, 280, 550, 12)}
    ${band(134, 464, 560, 14)}${band(252, 470, 554, 9)}
    ${cap(156, 482, 240, 506, 6)}${cap(156, 520, 240, 544, 6)}
    <rect x="164" y="508" width="68" height="9" rx="2" fill="url(#eh-grate)" stroke="${o}" stroke-width="1.5"/>
    <rect x="238" y="508" width="9" height="8" rx="2" fill="${C.pink}" stroke="${o}" stroke-width="1.5"/>`);
  // the bridge block in the front notch (drawn under the hull; the part past the armor shows)
  const nose = (dy) => pts([[1420, 470 + dy], [1502, 470 + dy], [1528, 488 + dy], [1536, 512 + dy], [1528, 536 + dy], [1502, 554 + dy], [1420, 554 + dy]]);
  add(gUnder, `<polygon points="${nose(7)}" fill="${C.armordark}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>
    <polygon points="${nose(0)}" fill="${C.armor}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M1424 475 L1500 475 L1522 490" fill="none" stroke="${C.armorlit}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${band(1462, 466, 558, 10)}
    ${cap(1476, 484, 1500, 540, 5)}
    <path d="M1504 492 Q1528 498 1530 512 Q1528 526 1504 532 Z" fill="${C.screen}" stroke="${o}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M1509 499 Q1521 502 1524 510" fill="none" stroke="${C.cyan}" stroke-width="2.5" stroke-linecap="round" opacity=".9"/>
    <line x1="1512" y1="482" x2="1530" y2="466" stroke="${o}" stroke-width="2.5"/>
    <circle cx="1531" cy="465" r="3.5" fill="${C.pink}" stroke="${o}" stroke-width="1.5"/>`);
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

/* ==== SECTION: Hull (one rounded outline, built in layers) ====
   Like the reference image: one rounded outer shape (a brain seen from above, fuller at the back, with shallow
   notches at the back and front), with the rooms inside it. The hull is built in layers that step in toward
   the rooms, so the corners between the rooms and the outline fill with hull. Bottom up:
     armor   a dark rim past the outline (thicker below, for the 3/4 view), blue light panels, pink running lights
     plates  the outer layer: angular plates along the outline, with gentle bumps and small gaps between them
     middle  a layer stepped in from the outline (MID) that fills the corners, with seams, slots, lights and hatches
     inner   a raised layer that hugs the rooms (HUG past each room's floor), clipped inside the middle layer
   The side engines and the bridge sit between the plates and the middle layer (see Engines). HULL_SHAPE
   describes the outline; the top half is sampled and the bottom half mirrors it. */
const HULL_SHAPE = {
  CX: 830, CY: 512,
  FRONT: 645, BACK: 685,          // reach of the outline ahead of and behind CX
  H_FRONT: 410, H_BACK: 460,      // half-height near the front and near the back (fuller at the back)
  ROUND: 2.2,                     // 2 = an ellipse; higher fills the shoulders
  NOTCH_BACK: 30, NOTCH_FRONT: 22, NOTCH_W: 58   // shallow notches on the center line (main engine, bridge)
};
const HULL = {
  FACET: 78,      // straight facets along the outline, about this long
  ARMOR: 12,      // armor rim past the outline
  UNDER: 16,      // extra armor shown below bottom-facing edges
  DROP: 8,        // side faces shown below each layer
  PLATE_IN: -30,  // inner edge of the outer plates
  MID: -26,       // middle layer's outer edge
  HUG: 54,        // inner layer: reach past each room's floor (the wall tops end at 29.5)
  GAP: 10, CHAMFER: 7
};
// Outer plates along the top half, back notch → front notch: [share of the length, outward step].
// Steps of 10–13 are the gentle bumps; small steps leave the armor (and its light panels) showing.
const HULL_BUMPS = [[.65, 4], [1, 16], [.75, 2], [1.15, 17], [.8, 2], [1.2, 16], [.8, 2], [1.1, 17], [.75, 3], [.6, 12]];

// shapes the inner layer wraps: [shape (top half), symmetric already?]; each room's convex outline, offset by HUG
const HUG_SHAPES = [
  [() => ROOMS[0].poly.concat(ROOMS[2].poly.map(mirror)), false],   // engine room and reactor
  [() => ROOMS[1].poly.concat(ROOMS[3].poly.map(mirror)), false],   // life support and shield bay
  [() => CC_POLY, true],
  [() => [[300, 462], [1080, 462], [1080, 562], [300, 562]], true]   // corridor
];
function convexHull(points) {        // monotone chain; clockwise on screen (y down)
  const p = points.map((q) => q.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list) => { const h = []; list.forEach((q) => { while (h.length > 1 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); }); return h; };
  return half(p).slice(0, -1).concat(half(p.slice().reverse()).slice(0, -1));
}
function offsetPoly(poly, dd) {      // mitered outward offset of a convex clockwise polygon
  const n = poly.length;
  const N = poly.map((a, i) => { const b = poly[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[1] - a[1]) / l, -(b[0] - a[0]) / l]; });
  return poly.map((v, i) => {
    const a = N[(i - 1 + n) % n], b = N[i], k = dd / (1 + a[0] * b[0] + a[1] * b[1]);
    return [v[0] + (a[0] + b[0]) * k, v[1] + (a[1] + b[1]) * k];
  });
}
function hullCurve() {             // the top half of the outline: evenly spaced points with arc length and outward normal
  const S = HULL_SHAPE, e = 2 / S.ROUND, dense = [];
  for (let i = 0; i <= 600; i++) {
    const t = Math.PI + Math.PI * i / 600, c = Math.cos(t), s = Math.sin(t);
    const w = (1 - c) / 2, b = S.H_FRONT + (S.H_BACK - S.H_FRONT) * Math.pow(w, .8);
    let x = S.CX + (c < 0 ? S.BACK : S.FRONT) * Math.sign(c) * Math.pow(Math.abs(c), e);
    const y = S.CY + b * Math.sign(s) * Math.pow(Math.abs(s), e);
    x += (c < 0 ? S.NOTCH_BACK : -S.NOTCH_FRONT) * Math.exp(-(((y - S.CY) / S.NOTCH_W) ** 2));
    dense.push([x, Math.min(y, S.CY)]);
  }
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  const total = cum[cum.length - 1], n = Math.round(total / 2), out = [];
  let j = 0;
  for (let k = 0; k <= n; k++) {
    const sv = total * k / n;
    while (j < cum.length - 2 && cum[j + 1] < sv) j++;
    const u = (sv - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push({ x: dense[j][0] + (dense[j + 1][0] - dense[j][0]) * u, y: dense[j][1] + (dense[j + 1][1] - dense[j][1]) * u, s: sv });
  }
  out.forEach((q, i) => {           // clockwise on screen, so the outward normal is (ty, -tx)
    const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    q.nx = ty / l; q.ny = -tx / l;
  });
  out[0].ny = out[out.length - 1].ny = 0;   // the notches sit on the center line
  return out;
}

function drawHull(gLow, gHigh) {
  const o = C.outline, base = hullCurve(), n = base.length - 1, total = base[n].s;
  const at = (s) => base[Math.round(Math.max(0, Math.min(total, s)) / total * n)];
  const off = (p, d) => [p.x + p.nx * d, Math.min(p.y + p.ny * d, SHIP_H / 2)];
  const stops = (s0, s1, step) => { const k = Math.max(1, Math.round((s1 - s0) / step)); return Array.from({ length: k + 1 }, (_, i) => s0 + (s1 - s0) * i / k); };
  const flip = (a, m) => m ? a.map(mirror) : a;
  const both = (fn) => fn(false) + fn(true);
  const close = (top) => top.concat(top.slice(1, -1).reverse().map(mirror));
  const d = (a, z) => 'M' + a.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + (z === false ? '' : 'Z');
  const tilt = (s, m) => { const p = at(s), a = Math.atan2(p.nx, -p.ny) * 180 / Math.PI; return f1(m ? -a : a); };
  const facets = stops(0, total, HULL.FACET);
  const layer = (dd) => close(facets.map((v) => off(at(v), dd)));
  // a layer: its side face (dropped copy), then its top, both outlined
  const slab = (poly, fill, side) => `<path d="${d(poly.map(([x, y]) => [x, y + HULL.DROP]))}" fill="${side}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>` +
    `<path d="${d(poly)}" fill="${fill}" stroke="${o}" stroke-width="4" stroke-linejoin="round"/>`;
  const nearFloor = (x, y, r) => FLOORS.some((f) => inPoly(x, y, f.poly) || f.poly.some((q, i) => {
    const b = f.poly[(i + 1) % f.poly.length], vx = b[0] - q[0], vy = b[1] - q[1];
    const u = Math.max(0, Math.min(1, ((x - q[0]) * vx + (y - q[1]) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(x - q[0] - u * vx, y - q[1] - u * vy) < r;
  }));

  // plate extents along the outline
  const wsum = HULL_BUMPS.reduce((a, p) => a + p[0], 0);
  let s = 0;
  const plates = HULL_BUMPS.map(([w, step]) => {
    const L = total * w / wsum, p = { s0: s + HULL.GAP / 2, s1: s + L - HULL.GAP / 2, o: step };
    s += L;
    p.ss = stops(p.s0 + HULL.CHAMFER, p.s1 - HULL.CHAMFER, HULL.FACET);
    return p;
  });
  const along = (p, dd) => p.ss.map((v) => off(at(v), dd));
  const platePoly = (p) => [off(at(p.s0), p.o - HULL.CHAMFER), ...along(p, p.o), off(at(p.s1), p.o - HULL.CHAMFER),
    off(at(p.s1), HULL.PLATE_IN), ...along(p, HULL.PLATE_IN).reverse(), off(at(p.s0), HULL.PLATE_IN)];

  // 1. Armor: underside, rim, fins with pink running lights in the gaps, blue panels outside the stepped-in plates
  const armor = close(stops(0, total, 24).map((v) => off(at(v), HULL.ARMOR)));
  let fins = '', run = '', panels = '';
  plates.slice(0, -1).forEach((a, i) => {
    const b = plates[i + 1], sg = (a.s1 + b.s0) / 2, hi = Math.max(a.o, b.o) + 6, h = HULL.GAP / 2 + 3;
    const fin = [off(at(sg - h - 7), HULL.ARMOR - 4), off(at(sg - h), hi), off(at(sg + h), hi), off(at(sg + h + 7), HULL.ARMOR - 4)];
    fins += both((m) => `<path d="${d(flip(fin, m))}"/>`);
    run += both((m) => { const c = flip([off(at(sg), hi - 3)], m)[0]; return `<rect x="-4.5" y="-2" width="9" height="4" rx="2" transform="translate(${f1(c[0])} ${f1(c[1])}) rotate(${tilt(sg, m)})"/>`; });
  });
  plates.forEach((p) => {
    if (p.o > 6) return;
    const a = stops(p.s0 + 16, p.s1 - 16, 24).map((v) => off(at(v), (p.o + HULL.ARMOR) / 2 + .5));
    panels += both((m) => `<path d="${d(flip(a, m), false)}" stroke-dasharray="${p.s1 - p.s0 > 160 ? '30 8' : '14 7'}"/>`);
  });
  add(gLow, `<path d="${d(armor.map(([x, y]) => [x, y + HULL.UNDER]))}" fill="${C.armordark}" stroke="${o}" stroke-width="4.5" stroke-linejoin="round"/>
    <path d="${d(armor)}" fill="${C.armor}" stroke="${o}" stroke-width="4.5" stroke-linejoin="round"/>
    <g fill="${C.armor}" stroke="${o}" stroke-width="3" stroke-linejoin="round">${fins}</g>
    <g fill="none" stroke-linecap="round"><g stroke="${o}" stroke-width="7">${panels}</g><g stroke="${C.hullblue}" stroke-width="3.6">${panels}</g></g>
    <g fill="${C.pink}" stroke="${o}" stroke-width="1.2">${run}</g>`);

  // 2. Outer plates: side face, top, light rim along the outer edge, a seam along and seams across, rivets
  let ps = '', pt = '', rims = '', seams = '', bolts = '';
  plates.forEach((p) => {
    const poly = platePoly(p), L = p.s1 - p.s0;
    both((m) => {
      const q = flip(poly, m);
      ps += `<path d="${d(q.map(([x, y]) => [x, y + HULL.DROP]))}"/>`;
      pt += `<path d="${d(q)}"/>`;
      rims += `<path d="${d(flip(along(p, p.o - 4), m), false)}"/>`;
      seams += `<path d="${d(flip([off(at(p.s0 + 2), p.o - 14), ...along(p, p.o - 14), off(at(p.s1 - 2), p.o - 14)], m), false)}"/>`;
      const cuts = Math.max(1, Math.round(L / 110));
      for (let j = 1; j < cuts; j++) {
        const v = p.s0 + L * j / cuts;
        seams += `<path d="${d(flip([off(at(v), p.o - 14), off(at(v), HULL.PLATE_IN + 4)], m), false)}"/>`;
      }
      [p.s0 + 9, p.s1 - 9].forEach((v) => { const c = flip([off(at(v), p.o - 8)], m)[0]; bolts += `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="1.4"/>`; });
      return '';
    });
  });
  add(gLow, `<g fill="${C.hullside}" stroke="${o}" stroke-width="4" stroke-linejoin="round">${ps}</g>
    <g fill="${C.hull}" stroke="${o}" stroke-width="4" stroke-linejoin="round">${pt}</g>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${C.hullrim}" stroke-width="3.4">${rims}</g>
      <g stroke="${C.hullseam}" stroke-width="2">${seams}</g></g>
    <g fill="${C.hullrivet}">${bolts}</g>`);

  // 3. Middle layer: stepped in from the outline, filling the corners; seams, slots, rivets, lights, hatches
  const hugs = HUG_SHAPES.flatMap(([shape, sym]) => {
    const p = offsetPoly(convexHull(shape()), HULL.HUG);
    return sym ? [p] : [p, p.map(mirror)];
  });
  const underHug = (x, y) => hugs.some((q) => inPoly(x, y, q));
  let midRim = both((m) => `<path d="${d(flip(facets.map((v) => off(at(v), HULL.MID - 4)), m), false)}"/>`);
  let mSeams = '', slots = '', dots = '', rivets = '', k = 0;
  for (let v = 30; v < total - 30; v += 40) {
    const c = off(at(v), HULL.MID - 16);
    if (underHug(c[0], c[1]) || nearFloor(c[0], c[1], W_BAND + 14)) continue;
    const kind = k++ % 4;
    both((m) => {
      const q = flip([c], m)[0], tr = `translate(${f1(q[0])} ${f1(q[1])}) rotate(${tilt(v, m)})`;
      if (kind === 0) mSeams += `<path d="${d(flip([off(at(v), HULL.MID - 4), off(at(v), HULL.MID - 30)], m), false)}"/>`;
      else if (kind === 1) slots += `<g transform="${tr}"><rect x="-11" y="-3.2" width="22" height="6.4" rx="3.2"/><rect x="-7.5" y="-1" width="15" height="2" rx="1" fill="${C.armorlit}" stroke="none"/></g>`;
      else if (kind === 2) rivets += `<g transform="${tr}"><circle cx="-7" r="1.6"/><circle r="1.6"/><circle cx="7" r="1.6"/></g>`;
      else dots += `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="2.6" fill="${k % 8 === 0 ? C.cyan : C.pink}"/>`;
      return '';
    });
  }
  // hull hatches in the open stretch between life support and the command center
  const hatch = (y) => `<g transform="translate(1166 ${y})">
      <rect x="-40" y="-14" width="80" height="28" rx="6" fill="${C.hullside}" stroke="${o}" stroke-width="2.5"/>
      <rect x="-34" y="-9" width="42" height="18" rx="3" fill="url(#eh-grate)" stroke="${o}" stroke-width="1.5"/>
      <rect x="13" y="-9" width="21" height="18" rx="3" fill="${C.armor}" stroke="${o}" stroke-width="1.5"/>
      <circle cx="19" cy="0" r="2.6" fill="${C.cyan}"/><circle cx="28" cy="0" r="2.6" fill="${C.pink}"/></g>`;
  add(gHigh, `${slab(layer(HULL.MID), C.hull, C.hullside)}
    <g fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="${C.hullrim}" stroke-width="3">${midRim}</g>
      <g stroke="${C.hullseam}" stroke-width="2.2">${mSeams}</g></g>
    <g fill="${C.armor}" stroke="${o}" stroke-width="1.4">${slots}</g>
    <g fill="${C.hullrivet}">${rivets}</g>
    <g stroke="${o}" stroke-width="1.3">${dots}</g>
    ${hatch(206)}${hatch(SHIP_H - 206)}`);

  // 4. Inner layer: hugs the rooms (one outline around all of them: outlines first, then fills), raised above
  //    the middle layer with its own side face, and kept inside the middle layer's edge
  add(DEFS, `<clipPath id="eh-hugclip"><path d="${d(layer(HULL.MID - 8))}"/></clipPath>`);
  const P = (q) => `<polygon points="${pts(q)}"/>`;
  const union = (fill, dy) => `<g transform="translate(0 ${dy})"><g fill="${o}" stroke="${o}" stroke-width="8" stroke-linejoin="miter">${hugs.map(P).join('')}</g>` +
    `<g fill="${fill}">${hugs.map(P).join('')}</g></g>`;
  add(gHigh, `<g clip-path="url(#eh-hugclip)">${union(C.hullside, HULL.DROP)}${union(C.hull, 0)}</g>`);
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

/* ==== SECTION: Particles and effects ====
   In the front layer's #eh-fx group. Puffs (smoke, steam) and sparks are pooled SVG elements; when a pool is
   full, new ones are dropped. They move with the idle animations (about 30 fps). Callers skip them under
   reduced motion. Also here: the repair ring and the burst rings when a repair finishes. */
const FX = { puffs: [], sparks: [], bursts: [], ring: null, ringBack: null };
const FX_PUFFS = 48, FX_SPARKS = 64, FX_BURSTS = 3;
function fxInit(g) {
  const many = (n, s) => { let o = ''; for (let i = 0; i < n; i++) o += s; return o; };
  const gp = add(g, `<g>${many(FX_PUFFS, '<circle r="0" opacity="0"/>')}</g>`);
  const gsp = add(g, `<g stroke-linecap="round">${many(FX_SPARKS, '<line stroke-width="2" opacity="0"/>')}</g>`);
  const gb = add(g, `<g fill="none">${many(FX_BURSTS, '<circle r="0" stroke-width="5" opacity="0"/>')}</g>`);
  FX.puffs = [...gp.children].map((el) => ({ el, life: 0, max: 0 }));
  FX.sparks = [...gsp.children].map((el) => ({ el, life: 0, max: 0 }));
  FX.bursts = [...gb.children].map((el) => ({ el, life: 0, max: 0 }));
  // repair ring: a dark backing ring and a mint arc that fills clockwise from the top
  FX.ringBack = add(g, `<circle fill="none" stroke="${C.outline}" stroke-width="9" opacity="0"/>`);
  FX.ring = add(g, `<circle fill="none" stroke="${C.mint}" stroke-width="5" stroke-linecap="round" opacity="0"/>`);
  ANIM.push((t, dt) => fxTick(dt));
}
const freeSlot = (pool) => pool.find((p) => p.life >= p.max) || null;
function puff(kind, x, y, vx, vy, r0, grow, max, alpha) {
  const p = freeSlot(FX.puffs);
  if (!p) return;
  Object.assign(p, { x, y, vx, vy, r0, grow, max, alpha, life: 0 });
  p.el.setAttribute('fill', kind === 'smoke' ? 'url(#eh-smokeG)' : 'url(#eh-steamG)');
}
// n sparks from (x, y) around direction dir (radians) within spread; gravity pulls them down the screen
function sparks(x, y, n, colors, dir, spread, gravity) {
  for (let i = 0; i < n; i++) {
    const p = freeSlot(FX.sparks);
    if (!p) return;
    const a = dir + (Math.random() - .5) * spread, v = 70 + Math.random() * 140;
    Object.assign(p, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: .3 + Math.random() * .35, g: gravity == null ? 380 : gravity });
    p.el.setAttribute('stroke', colors[i % colors.length]);
  }
}
function burstRing(x, y, r, color) {
  const p = freeSlot(FX.bursts);
  if (!p) return;
  Object.assign(p, { x, y, r, life: 0, max: .8 });
  p.el.setAttribute('cx', x); p.el.setAttribute('cy', y); p.el.setAttribute('stroke', color);
}
function fxTick(dt) {
  FX.puffs.forEach((p) => {
    if (p.life >= p.max) { if (p.on) { p.on = false; p.el.setAttribute('opacity', 0); } return; }
    p.on = true; p.life = Math.min(p.max, p.life + dt);
    const k = p.life / p.max;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.el.setAttribute('cx', f1(p.x)); p.el.setAttribute('cy', f1(p.y));
    p.el.setAttribute('r', f1(p.r0 + p.grow * k));
    p.el.setAttribute('opacity', (p.alpha * Math.min(1, k * 6) * (1 - k)).toFixed(2));
  });
  FX.sparks.forEach((p) => {
    if (p.life >= p.max) { if (p.on) { p.on = false; p.el.setAttribute('opacity', 0); } return; }
    p.on = true; p.life = Math.min(p.max, p.life + dt);
    p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    p.el.setAttribute('x1', f1(p.x)); p.el.setAttribute('y1', f1(p.y));
    p.el.setAttribute('x2', f1(p.x - p.vx * .035)); p.el.setAttribute('y2', f1(p.y - p.vy * .035));
    p.el.setAttribute('opacity', (1 - p.life / p.max).toFixed(2));
  });
  FX.bursts.forEach((p) => {
    if (p.life >= p.max) { if (p.on) { p.on = false; p.el.setAttribute('opacity', 0); } return; }
    p.on = true; p.life = Math.min(p.max, p.life + dt);
    const k = p.life / p.max;
    p.el.setAttribute('r', f1(p.r + 70 * k));
    p.el.setAttribute('opacity', (1 - k).toFixed(2));
  });
}
function fxClear() { [...FX.puffs, ...FX.sparks, ...FX.bursts].forEach((p) => { p.life = p.max; }); }
function repairRing(r, k) {   // k = progress 0–1, or null to hide
  if (k == null) { FX.ring.setAttribute('opacity', 0); FX.ringBack.setAttribute('opacity', 0); return; }
  const [x, y, rad] = r.ring, len = 2 * Math.PI * rad;
  [FX.ringBack, FX.ring].forEach((el) => { el.setAttribute('cx', x); el.setAttribute('cy', y); el.setAttribute('r', rad); });
  FX.ring.setAttribute('transform', `rotate(-90 ${x} ${y})`);
  FX.ring.setAttribute('stroke-dasharray', `${f1(len * k)} ${f1(len + 10)}`);
  FX.ring.setAttribute('opacity', 1); FX.ringBack.setAttribute('opacity', .45);
}

/* ==== SECTION: Alarms (every broken room) ====
   Under the machines: a red wash over the floor and a hot glow around the machine. Over them: two rotating
   beacons on the wall top (beams clipped to the room). The door's lock light blinks; the HUD shows the rest. */
function drawAlarms(gUnder, gOver) {
  const wedge = 'M0 0 L112 -26 A115 115 0 0 1 112 26 Z';
  const rooms = ROOMS.map((r) => {
    add(DEFS, `<clipPath id="eh-rclip-${r.id}"><polygon points="${pts(r.poly)}"/></clipPath>`);
    const [cx, cy, rr] = r.ring;
    const under = add(gUnder, `<g id="eh-alarm-${r.id}" style="display:none">
      <polygon class="eh-wash" points="${pts(r.poly)}" fill="${C.washred}" opacity=".1"/>
      <circle class="eh-faultglow" cx="${cx}" cy="${cy}" r="${rr + 46}" fill="url(#eh-glowFault)"/>
    </g>`);
    let beams = '', lamps = '';
    r.beacons.forEach(([i, s]) => {
      const [x, y] = edgePoint(r.poly, i, s, 13).map(f1);
      beams += `<g transform="translate(${x} ${y})"><g class="eh-beam"><path d="${wedge}" fill="url(#eh-beam)"/>` +
        `<path d="${wedge}" fill="url(#eh-beam)" transform="rotate(180)"/></g></g>`;
      lamps += `<g transform="translate(${x} ${y})"><circle r="8.5" fill="${C.outline}"/><circle r="6.5" fill="${C.armor}"/>` +
        `<circle class="eh-lamp" r="4.6" fill="${C.redoff}"/><circle cx="-1.6" cy="-1.9" r="1.5" fill="${C.white}" opacity=".5"/></g>`;
    });
    const over = add(gOver, `<g><g clip-path="url(#eh-rclip-${r.id})" style="display:none">${beams}</g>${lamps}</g>`);
    return { r, under, beamsG: over.firstElementChild, beams: [...over.querySelectorAll('.eh-beam')],
      lamps: [...over.querySelectorAll('.eh-lamp')], wash: under.querySelector('.eh-wash'), glow: under.querySelector('.eh-faultglow'),
      on: false, lamp: '' };
  });
  ANIM.push((t) => {
    const pulse = REDUCE ? .5 : .5 + .5 * Math.sin(t * 5);     // about 0.8 pulses a second
    const blink = Math.sin(t * 4 * Math.PI) > 0;                // 2 blinks a second
    rooms.forEach((a) => {
      const on = isDown(a.r.id);
      if (on !== a.on) {
        a.on = on;
        a.under.style.display = on ? '' : 'none';
        a.beamsG.style.display = on && !REDUCE ? '' : 'none';  // reduced motion: no sweeping beams
      }
      const lamp = !on ? 'off' : REDUCE || blink ? 'a' : 'b';
      if (lamp !== a.lamp) {
        a.lamp = lamp;
        a.lamps.forEach((l, k) => l.setAttribute('fill', lamp === 'off' ? C.redoff : (lamp === 'a') === (k === 0) || REDUCE ? C.red : C.eye3));
      }
      if (!on) return;
      a.wash.setAttribute('opacity', (.05 + .09 * pulse).toFixed(3));
      a.glow.setAttribute('opacity', (.55 + .45 * pulse).toFixed(2));
      if (!REDUCE) a.beams.forEach((b, k) => b.setAttribute('transform', `rotate(${f1((k ? 180 - t * 150 : t * 150 + 40) % 360)})`));
    });
    // lock lights: green while open, blinking red while the room's system is down, otherwise steady red
    DOORS.forEach((d) => {
      const c = d.t > .5 ? C.green : !isDown(d.room.id) || REDUCE || blink ? C.red : C.redoff;
      if (c !== d.lockC) { d.lockC = c; d.lock.setAttribute('fill', c); }
    });
  });
}

/* ==== SECTION: Engine room (anti-gravity thruster) ====
   Each room draws into gs (static layer, painted once) and gd (front layer, for anything that moves). */
function drawEngineRoom(gs, gd) {
  const graph = screen(452, 202, 52, 16, `<polyline id="eh-eng-graph" fill="none" stroke="${C.cyan}" stroke-width="1"/>` +
    `<g fill="${C.cyan}"><rect x="42" y="10" width="2" height="4"/><rect x="45" y="7" width="2" height="7"/><rect x="48" y="4" width="2" height="10"/></g>` +
    `<text id="eh-eng-text" x="3" y="6" font-size="4" fill="${C.cyanhi}">AG-THRUST OK</text>`);
  const radar = screen(532, 202, 52, 16, `<circle cx="9" cy="8" r="6" fill="none" stroke="${C.cyan}" stroke-width=".8" opacity=".7"/>` +
    `<line id="eh-eng-radar" x1="9" y1="8" x2="15" y2="8" stroke="${C.cyanhi}" stroke-width="1"/>` +
    `<g fill="${C.cyan}"><rect x="19" y="3" width="29" height="1.6" rx=".8" opacity=".7"/><rect x="19" y="7" width="21" height="1.6" rx=".8" opacity=".5"/><rect x="19" y="11" width="25" height="1.6" rx=".8" opacity=".6"/></g>`);
  let cells = '';
  [304, 332, 360].forEach((y, i) => {
    cells += `<g transform="translate(330 ${y})"><rect width="26" height="28" rx="5" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>` +
      `<rect x="5" y="4" width="16" height="20" rx="3" fill="${C.outline}"/><rect class="eh-eng-lvl" data-i="${i}" x="7" y="6" width="12" height="16" rx="1.5" fill="${C.amber}"/></g>`;
  });
  add(gs, `${warnSign(398, 226)}
    ${pipe('M456 224 L600 224', 6)}
    <g fill="${C.armor}"><rect x="510" y="219" width="5" height="10"/><rect x="574" y="219" width="5" height="10"/></g>
    <g transform="translate(464 224)"><circle r="5" fill="none" stroke="${C.red}" stroke-width="1.8"/><path d="M-5 0 H5 M0 -5 V5" stroke="${C.red}" stroke-width="1.2"/></g>
    <rect x="324" y="298" width="38" height="94" rx="3" fill="${C.floorbg}"/>
    <circle cx="480" cy="318" r="80" fill="url(#eh-glowBlue)"/>
    ${pipe('M360 318 L430 318', 7)}${pipe('M480 228 L480 262', 6)}${pipe('M584 330 C 560 330, 548 322, 530 320', 6)}
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
  add(gd, `${graph}${wallEye(518, 210)}${radar}${cells}`);
  drawThruster(gd, 480, 318);
  block({ r: [320, 298, 364, 392] }, { r: [580, 244, 640, 392] }, { c: [480, 318, 58] }, { r: [448, 200, 604, 230] });

  const gr = ref('eng-graph'), radarLine = ref('eng-radar'), lv = [...gd.querySelectorAll('.eh-eng-lvl')], txt = ref('eng-text');
  const state = watch('engine', (st) => {
    const bad = st !== 'ok';
    txt.textContent = st === 'ok' ? 'AG-THRUST OK' : st === 'broken' ? 'AG-THRUST FAULT' : 'RECALIBRATING';
    txt.setAttribute('fill', st === 'broken' ? C.faulttext : C.cyanhi);
    gr.setAttribute('stroke', bad ? C.faulttext : C.cyan);
    lv.forEach((r) => r.setAttribute('fill', bad ? C.red : C.amber));
  });
  let sparkT = 1;
  ANIM.push((t, dt) => {
    const st = state(), broken = st === 'broken';
    const p = [];
    for (let x = 3; x <= 38; x += 2.5) {
      const y = broken ? 11 + (Math.random() - .5) * 8 : 11 + 2.6 * Math.sin(x * .35 + t * 4) + 1.2 * Math.sin(x * .9 + t * 7);
      p.push(f1(x) + ',' + f1(y));
    }
    gr.setAttribute('points', p.join(' '));
    radarLine.setAttribute('transform', `rotate(${f1(t * 120 % 360)} 9 8)`);
    lv.forEach((r, i) => {
      const h = 16 * (st === 'ok' ? .75 + .2 * Math.sin(t * 1.3 + i * 1.7) : .2 + .12 * Math.sin(t * 3 + i));
      r.setAttribute('y', f1(22 - h)); r.setAttribute('height', f1(h));
    });
    // the junction box by the thruster spits sparks now and then
    if (broken && !REDUCE && (sparkT -= dt) <= 0) {
      sparkT = .6 + Math.random() * 1.1;
      sparks(387, 329, 7 + (Math.random() * 6 | 0), [C.spark, C.sparkhi], -Math.PI / 2, 2.6);
    }
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
  const outer = ref('thr-outer'), inner = ref('thr-inner'), core = ref('thr-core'), coreFill = core.firstElementChild;
  const lights = [...g.querySelectorAll('.eh-thr-ring, .eh-thr-em')];
  const S = SYS.engine;
  const state = watch('engine', (st) => {
    coreFill.setAttribute('fill', st === 'ok' ? 'url(#eh-coreBlue)' : 'url(#eh-coreRed)');
    lights.forEach((l) => l.setAttribute(l.tagName === 'circle' ? 'stroke' : 'fill', st === 'ok' ? C.cyan : C.red));
  });
  let a1 = 0, a2 = 0, flick = 1, shownFlick = 1, flickT = 0, smokeT = 0;
  ANIM.push((t, dt) => {
    const st = state();
    // working: smooth spin; broken: the rings stutter (lurch, stall, slip back); repairing: spinning back up
    let v = 70;
    if (st === 'broken') v = REDUCE ? 14 : (Math.sin(t * 13) > .2 ? 30 : -6);
    else if (st === 'repairing') v = 25 + 70 * S.progress;
    a1 = (a1 + v * dt) % 360; a2 = (a2 - v * 1.6 * dt) % 360;
    outer.setAttribute('transform', `rotate(${f1(a1)})`);
    inner.setAttribute('transform', `rotate(${f1(a2)})`);
    // the broken core sputters: a short dip about once a second (well under 3 flashes per second)
    if (st === 'broken' && !REDUCE) {
      if ((flickT -= dt) <= 0) { flick = flick < 1 ? 1 : .3; flickT = flick < 1 ? .09 : .5 + Math.random() * .7; }
    } else flick = 1;
    if (flick !== shownFlick) {
      shownFlick = flick;
      core.setAttribute('opacity', flick);
      lights.forEach((l) => l.setAttribute('opacity', flick < 1 ? .3 : 1));
    }
    const pulse = st === 'broken' ? .9 + .06 * Math.sin(t * 9) : 1 + .06 * Math.sin(t * 3);
    core.setAttribute('transform', `scale(${pulse.toFixed(3)})`);
    if (st === 'broken' && !REDUCE && (smokeT -= dt) <= 0) {
      smokeT = .2;
      puff('smoke', cx + (Math.random() - .5) * 40, cy + (Math.random() - .5) * 16,
        (Math.random() - .5) * 14, -22 - Math.random() * 16, 6 + Math.random() * 5, 20, 1.8 + Math.random(), .65);
    }
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
      <circle class="eh-scr-led" cx="32" cy="54" r="2.5" fill="${C.green}" stroke="${C.outline}" stroke-width=".8"/>
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
  add(gd, `${screen(740, 192, 40, 15, `<text id="eh-o2-text" x="3" y="6" font-size="4.2" fill="${C.cyanhi}">O₂ 21%</text><polyline id="eh-o2-wave" fill="none" stroke="${C.o2}" stroke-width="1"/>`)}
    ${wallEye(913, 200)}
    ${plant(820, 0)}${plant(840, 1)}${plant(860, 2)}
    <ellipse cx="752" cy="334" rx="31" ry="10" fill="${C.outline}"/><ellipse cx="752" cy="332" rx="29" ry="8.5" fill="${C.metal3}"/>
    <rect x="726" y="240" width="52" height="92" rx="12" fill="${C.glass}"/>
    <g clip-path="url(#eh-tankclip)">
      <rect id="eh-o2-liq" x="724" y="262" width="56" height="74" fill="url(#eh-o2liq)"/>
      <ellipse id="eh-o2-surface" cx="752" cy="262" rx="26" ry="3" fill="${C.o2hi}" opacity=".5"/>
      <g id="eh-o2-bubs">${bub}</g>
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
  const wave = ref('o2-wave'), surf = ref('o2-surface'), liq = ref('o2-liq'), txt = ref('o2-text'), bubG = ref('o2-bubs');
  const leds = [...gd.querySelectorAll('.eh-scr-led')];
  const B = bubs.map((b, i) => ({ x: 736 + (i * 37 % 32), y: 330 - i * 10, v: 14 + (i % 4) * 5 }));
  const S = SYS.life;
  const state = watch('life', (st) => {
    const bad = st !== 'ok';
    liq.setAttribute('fill', bad ? 'url(#eh-o2liqBad)' : 'url(#eh-o2liq)');
    surf.setAttribute('fill', bad ? C.eye1 : C.o2hi);
    bubG.style.display = st === 'broken' ? 'none' : '';     // the bubbles stop
    txt.textContent = st === 'ok' ? 'O₂ 21%' : st === 'broken' ? 'O₂ LOW' : 'RESETTING';
    txt.setAttribute('fill', st === 'broken' ? C.faulttext : C.cyanhi);
    wave.setAttribute('stroke', bad ? C.faulttext : C.o2);
    if (!bad) leds.forEach((l) => { l.setAttribute('fill', C.green); l.setAttribute('opacity', 1); });
  });
  let fa = 0, fv = 300, hissT = 0, puffT = 0;
  ANIM.push((t, dt) => {
    const st = state(), broken = st === 'broken';
    // the fans spin down when broken and back up during a repair
    const want = st === 'ok' ? 300 : broken ? 0 : 60 + 240 * S.progress;
    fv += (want - fv) * Math.min(1, dt * 1.2);
    fa = (fa + fv * dt) % 360;
    fans[0].setAttribute('transform', `rotate(${f1(fa)})`); fans[1].setAttribute('transform', `rotate(${f1(-fa * 1.1)})`);
    if (!broken) {
      B.forEach((b, i) => {
        b.y -= b.v * dt; if (b.y < 264) { b.y = 330; b.x = 734 + Math.random() * 36; }
        bubs[i].setAttribute('cx', f1(b.x + Math.sin(t * 3 + i) * 1.5)); bubs[i].setAttribute('cy', f1(b.y));
      });
    }
    surf.setAttribute('ry', f1(2.6 + .6 * Math.sin(t * 2)));
    plants.forEach((p, i) => p.setAttribute('transform', `rotate(${f1(4 * Math.sin(t * 1.2 + i * 1.3))})`));
    const p = [];
    for (let x = 22; x <= 38; x += 1.5) p.push(f1(x) + ',' + f1(broken ? 8 + (Math.random() - .5) * 2 : 8 + 3 * Math.sin(x * .6 - t * 3)));
    wave.setAttribute('points', p.join(' '));
    if (broken) {
      const on = Math.sin(t * 4 * Math.PI) > 0;   // the scrubbers' status lights blink red (2 per second)
      leds.forEach((l, i) => { l.setAttribute('fill', C.red); l.setAttribute('opacity', REDUCE || (i % 2 ? !on : on) ? 1 : .25); });
      // the vents hiss: bursts of steam out of the scrubbers' front grilles (1.6 s on, 1 s off)
      hissT = (hissT + dt) % 2.6;
      if (!REDUCE && hissT < 1.6 && (puffT -= dt) <= 0) {
        puffT = .09;
        const x = (Math.random() < .5 ? 815 : 861) + (Math.random() - .5) * 18;
        puff('steam', x, 312, (Math.random() - .5) * 18, 34 + Math.random() * 20, 3 + Math.random() * 2, 12, .8 + Math.random() * .4, .6);
      }
    }
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
    ${grate(548, 786, 36, 14)}${lightBar(458, 818, 22, 3)}${lightBar(532, 818, 22, 3)}`);
  add(gd, `${screen(544, 616, 58, 15, `<text id="eh-rx-text" x="3" y="6" font-size="4" fill="${C.rx2}">RX-2 TEMP</text>` +
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

  const ring = ref('rx-ring'), core = ref('rx-core'), needle = ref('rx-needle'), bar = ref('rx-bar'), txt = ref('rx-text');
  const lights = [...gd.querySelectorAll('.eh-rx-light')];
  const state = watch('reactor', (st) => {
    const bad = st !== 'ok';
    core.firstElementChild.setAttribute('fill', bad ? 'url(#eh-coreRed)' : 'url(#eh-coreAmber)');
    ring.firstElementChild.setAttribute('stroke', bad ? C.red : C.rx3);
    bar.setAttribute('fill', bad ? C.red : C.rx3);
    lights.forEach((l) => l.setAttribute('fill', bad ? C.red : C.rx2));
    txt.textContent = st === 'ok' ? 'RX-2 TEMP' : st === 'broken' ? 'RX-2 OVERHEAT' : 'VENTING';
    txt.setAttribute('fill', st === 'broken' ? C.faulttext : C.rx2);
  });
  // steam escapes where the four coolant pipes meet the pad
  const VENTS = [[446, 694], [526, 694], [446, 774], [526, 774]];
  let a = 0, steamT = 0;
  ANIM.push((t, dt) => {
    const st = state(), broken = st === 'broken';
    a = (a + (broken ? 95 : 30) * dt) % 360;
    ring.setAttribute('transform', `rotate(${f1(a)})`);
    // broken: the core throbs (bigger, faster pulse; a smooth swell, not a flash)
    const s = broken && !REDUCE ? 1 + .14 * Math.sin(t * 10) : 1 + .07 * Math.sin(t * 2.2);
    core.setAttribute('transform', `scale(${s.toFixed(3)})`);
    needle.setAttribute('transform', `rotate(${f1(broken ? 68 + (REDUCE ? 0 : 6 * Math.sin(t * 23)) : 20 + 10 * Math.sin(t * .9))})`);
    const h = 30 * (broken ? .96 : .6 + .1 * Math.sin(t * 1.7)); bar.setAttribute('y', f1(60 - h)); bar.setAttribute('height', f1(h));
    lights.forEach((l, i) => l.setAttribute('opacity', broken
      ? (REDUCE ? 1 : f1(.25 + .75 * Math.max(0, Math.sin(t * 7 - i * .785))))     // a warning chase around the ring
      : f1(.65 + .35 * Math.sin(t * 2.2 + i * .8))));
    if (broken && !REDUCE && (steamT -= dt) <= 0) {
      steamT = .16;
      const [x, y] = VENTS[Math.random() * 4 | 0];
      puff('steam', x + (Math.random() - .5) * 8, y, (Math.random() - .5) * 16, -24 - Math.random() * 18, 4 + Math.random() * 3, 16, 1.2 + Math.random() * .5, .55);
    }
  });
}

/* ==== SECTION: Shield bay (shield generator) ==== */
function drawShieldBay(gs, gd) {
  const hex = (r, rot) => { const p = []; for (let i = 0; i < 6; i++) { const a = (i * 60 + (rot || 0)) * Math.PI / 180; p.push([r * Math.cos(a), r * Math.sin(a)]); } return pts(p); };
  let nodes = '', caps = '';
  for (let i = 0; i < 6; i++) {
    const a = i * 60 * Math.PI / 180, x = f1(38 * Math.cos(a)), y = f1(38 * Math.sin(a));
    nodes += `<g transform="translate(${x} ${y})"><polygon points="${hex(6.5, 30)}" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="1.2"/><circle class="eh-sh-node" r="2.6" fill="${C.sh2}"/></g>`;
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
  add(gd, `${screen(736, 616, 60, 15, `<text id="eh-sh-text" x="3" y="6" font-size="4" fill="${C.sh1}">SHIELD 100%</text><polyline id="eh-sh-wave" fill="none" stroke="${C.sh2}" stroke-width="1"/>`)}
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
  const capL = [...gd.querySelectorAll('.eh-cap')], nodeL = [...gd.querySelectorAll('.eh-sh-node')], txt = ref('sh-text');
  const S = SYS.shield;
  const state = watch('shield', (st) => {
    const bad = st !== 'ok';
    nodeL.forEach((n) => n.setAttribute('fill', bad ? C.red : C.sh2));
    holo.setAttribute('fill', bad ? C.red : C.sh2); holo.setAttribute('stroke', bad ? C.red : C.sh2);
    wave.setAttribute('stroke', bad ? C.faulttext : C.sh2);
    txt.textContent = st === 'ok' ? 'SHIELD 100%' : st === 'broken' ? 'SHIELD 0%' : 'REALIGNING';
    txt.setAttribute('fill', st === 'broken' ? C.faulttext : C.sh1);
  });
  let a = 0, b = 0, flashT = 0, flashOn = 0, sparkT = .4;
  ANIM.push((t, dt) => {
    const st = state(), broken = st === 'broken';
    a = (a + (broken ? 6 : 24) * dt) % 360; b = (b - 9 * dt) % 360;
    ring.setAttribute('transform', `rotate(${f1(a)})`);
    field.setAttribute('transform', `rotate(${f1(b)})`);
    // broken: the field is off except for brief flickers (at most 2 a second); repairing: it fades back in
    let fo = .6 + .4 * Math.sin(t * 1.8);
    if (broken) {
      if (!REDUCE && (flashT -= dt) <= 0) { flashOn = flashOn ? 0 : 1; flashT = flashOn ? .07 : .5 + Math.random() * .9; }
      fo = flashOn && !REDUCE ? .45 : 0;
    } else if (st === 'repairing') fo = .15 + .6 * S.progress;
    field.setAttribute('opacity', f1(fo));
    orb.setAttribute('opacity', broken ? (flashOn && !REDUCE ? .8 : .35) : 1);
    orb.setAttribute('transform', `scale(${(broken ? .8 : 1 + .1 * Math.sin(t * 3)).toFixed(3)})`);
    holo.setAttribute('r', f1(16 + 1.5 * Math.sin(t * 1.8)));
    capL.forEach((c, i) => c.setAttribute('opacity', broken ? .1 : f1(.35 + .65 * Math.max(0, Math.sin(t * 3 - i * 1.1)))));
    const p = [];
    for (let x = 34; x <= 57; x += 1.5) p.push(f1(x) + ',' + f1(broken ? 8 + (Math.random() - .5) * 5 : 8 + 2.5 * Math.sin(x * .9 + t * 4)));
    wave.setAttribute('points', p.join(' '));
    // the emitter sparks: bursts from one of the six nodes as the ring grinds round
    if (broken && !REDUCE && (sparkT -= dt) <= 0) {
      sparkT = .45 + Math.random() * .9;
      const k = Math.random() * 6 | 0, ang = (k * 60 + a) * Math.PI / 180;
      sparks(858 + 38 * Math.cos(ang), 742 + 38 * Math.sin(ang), 7 + (Math.random() * 5 | 0), [C.sh1, C.sparkhi], ang, 2.2);
    }
  });
}

/* ==== SECTION: Command center (hyperdrive, main terminal, crew stations, B.F. 9000) ====
   Drawn in step 1 coordinates inside groups shifted right by CC_DX (add CC_DX to any x here to get the
   floor-plan x). Blockers are listed in the same coordinates and shifted when registered. */
function drawCommand(gs0, gd0) {
  const shift = `transform="translate(${CC_DX} 0)"`;
  const gs = add(gs0, `<g id="eh-cc-static" ${shift}></g>`), gd = add(gd0, `<g id="eh-cc-front" ${shift}></g>`);
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
  [[1090, 324, 1268, 410], [1114, 484, 1168, 542], [1106, 630, 1254, 712],
    [1306, 368, 1366, 444], [1314, 476, 1366, 548], [1306, 580, 1366, 656]]
    .forEach(([x1, y1, x2, y2]) => block({ r: [x1 + CC_DX, y1, x2 + CC_DX, y2] }));

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
  [998, 1022, 1046].forEach((x) => { chev += `<path class="eh-chev" d="M${x} 500 L${x + 10} 512 L${x} 524" fill="none" stroke="${C.cyan}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".25"/>`; });
  add(gs, `${pipe('M296 471 L436 471', 5)}${pipe('M534 471 L806 471', 5)}${pipe('M904 471 L1066 471', 5)}
    <g fill="${C.armor}"><rect x="340" y="467" width="4" height="9"/><rect x="600" y="467" width="4" height="9"/><rect x="700" y="467" width="4" height="9"/><rect x="960" y="467" width="4" height="9"/></g>
    ${grate(330, 500, 64, 24)}${grate(620, 500, 120, 24)}${lights}
    <g transform="translate(270 476)"><rect width="18" height="72" rx="3" fill="url(#eh-metalDark)" stroke="${C.outline}" stroke-width="2"/>
      <rect x="4" y="5" width="10" height="62" rx="2" fill="url(#eh-hazard)"/><circle cx="9" cy="36" r="3" fill="${C.redoff}" stroke="${C.outline}" stroke-width="1"/></g>
    <rect x="${1042 + CC_DX}" y="440" width="14" height="30" rx="3" fill="${C.wall}" stroke="${C.outline}" stroke-width="2"/>
    <rect x="${1042 + CC_DX}" y="554" width="14" height="30" rx="3" fill="${C.wall}" stroke="${C.outline}" stroke-width="2"/>`);
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

/* ==== SECTION: Player (the Cadet: a chibi astronaut) ====
   Drawn facing right for the side views; facing left is the same figure mirrored. The origin is between the
   feet, so the foot box and collisions don't depend on the art. Parts shown per view:
     down (front): visor, chest panel, both arms     up (back): backpack, helmet vent, both arms
     left/right (profile): side visor, backpack in profile, the near arm over the torso, the far arm behind it */
function drawPlayer(g) {
  const o = C.outline;
  const limb = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${fill}" stroke="${o}" stroke-width="2.2"/>`;
  add(g, `<g id="eh-player"><g transform="scale(${SETTINGS.PLAYER_SCALE})">
    <ellipse cx="0" cy="1.5" rx="14" ry="4.5" fill="${C.black}" opacity=".35"/>
    <g id="eh-fig">
      <g id="eh-legB">${limb(-4, -10, 8, 11, C.suitleg)}</g>
      <g id="eh-legF">${limb(-4, -10, 8, 11, C.suitleg)}</g>
      <g id="eh-torso">
        <g id="eh-armFar">${limb(-1, -23, 7, 12, C.suitshade)}</g>
        <g id="eh-packSide"><rect x="-18" y="-27" width="11" height="17" rx="3.5" fill="${C.pack}" stroke="${o}" stroke-width="2.2"/>
          <circle cx="-13.5" cy="-15" r="1.6" fill="${C.cyan}"/></g>
        <g id="eh-armL">${limb(-16, -24, 7, 11, C.suitarm)}</g>
        <g id="eh-armR">${limb(9, -24, 7, 11, C.suitarm)}</g>
        <rect x="-11" y="-27" width="22" height="20" rx="9" fill="${C.suit}" stroke="${o}" stroke-width="2.4"/>
        <g id="eh-chest"><rect x="-10.4" y="-14" width="20.8" height="3" fill="${C.amber}"/>
          <rect x="-5" y="-23" width="10" height="6.5" rx="1.6" fill="${C.cyan}" stroke="${o}" stroke-width="1.3"/>
          <rect x="-3" y="-21.5" width="4" height="1.4" rx=".7" fill="${C.cyanpale}"/></g>
        <g id="eh-pack"><rect x="-9.5" y="-27" width="19" height="17" rx="5" fill="${C.pack}" stroke="${o}" stroke-width="2.2"/>
          <rect x="-5.5" y="-23.5" width="11" height="3" rx="1" fill="${C.amber}"/><circle cx="0" cy="-15" r="2" fill="${C.cyan}"/></g>
        <g id="eh-armNear">${limb(-3.5, -23, 7, 12, C.suitarm)}</g>
        <g id="eh-head">
          <g id="eh-antenna"><line x1="7" y1="-60" x2="10.5" y2="-67.5" stroke="${o}" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="11" cy="-68.5" r="2.9" fill="${C.pink}" stroke="${o}" stroke-width="1.5"/></g>
          <circle cy="-44" r="19" fill="${C.helmet}" stroke="${o}" stroke-width="2.5"/>
          <path d="M-14.5 -50 A16 16 0 0 1 -6 -59" fill="none" stroke="${C.white}" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>
          <g id="eh-visorF"><rect x="-14" y="-52" width="28" height="17" rx="8.5" fill="url(#eh-visorG)" stroke="${o}" stroke-width="2"/>
            <path d="M-9.5 -45 Q-9 -48.5 -4.5 -49" fill="none" stroke="${C.visorhi}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>
            <circle cx="6.5" cy="-47.5" r="1.3" fill="${C.visorhi}" opacity=".75"/></g>
          <g id="eh-visorS"><path d="M-1 -48 Q-1 -52 4 -52 L12 -52 Q18.5 -52 18.5 -44 Q18.5 -36 12 -36 L4 -36 Q-1 -36 -1 -40 Z" fill="url(#eh-visorG)" stroke="${o}" stroke-width="2"/>
            <path d="M3 -44.5 Q3.5 -48.5 7.5 -49" fill="none" stroke="${C.visorhi}" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>
            <circle cx="14" cy="-48" r="1.2" fill="${C.visorhi}" opacity=".75"/></g>
          <g id="eh-helmBack"><rect x="-7" y="-36" width="14" height="5" rx="2.5" fill="${C.hullline}" stroke="${o}" stroke-width="1.4"/>
            <rect x="-4" y="-34.2" width="8" height="1.4" rx=".7" fill="${C.outline}" opacity=".5"/></g>
        </g>
      </g>
    </g>
  </g></g>`);
}
const PL = { x: SETTINGS.START.x, y: SETTINGS.START.y, dir: SETTINGS.START.dir, walk: 0, moving: false, working: false };
let PR = null;   // player element refs
const PLAYER_PARTS = {   // which parts each view shows
  chest: ['down'], pack: ['up'], helmBack: ['up'], visorF: ['down'], visorS: ['left', 'right'],
  packSide: ['left', 'right'], armNear: ['left', 'right'], armFar: ['left', 'right'], armL: ['up', 'down'], armR: ['up', 'down']
};
function posePlayer(t) {
  if (!PR) {
    PR = { g: ref('player'), fig: ref('fig'), torso: ref('torso'), legB: ref('legB'), legF: ref('legF'), armL: ref('armL'), armR: ref('armR'),
      armNear: ref('armNear'), armFar: ref('armFar'), antenna: ref('antenna'), dir: '' };
    PR.parts = Object.keys(PLAYER_PARTS).map((k) => [ref(k), PLAYER_PARTS[k]]);
    PR.legFill = [PR.legB.firstElementChild, PR.legF.firstElementChild];
  }
  const dir = PL.dir, side = dir === 'left' || dir === 'right';
  if (dir !== PR.dir) {               // swap the parts only when the facing changes
    PR.dir = dir;
    PR.parts.forEach(([el, views]) => { el.style.display = views.includes(dir) ? '' : 'none'; });
    PR.antenna.setAttribute('transform', dir === 'down' ? '' : 'scale(-1 1)');   // it sits on the right as seen from the front
    PR.legFill[0].setAttribute('fill', side ? C.suitshade : C.suitleg);          // the far leg is shaded in profile
  }
  // a short, bouncy walk: the body hops on every step and squashes a little as each foot lands
  const sw = PL.moving ? Math.sin(PL.walk) : 0, hop = PL.moving ? Math.abs(sw) : 0;
  const bob = PL.moving ? -hop * 3.4 : Math.sin(t * 2) * .6, sq = PL.moving ? (1 - hop) * .05 : 0;
  PR.g.setAttribute('transform', `translate(${f1(PL.x)} ${f1(PL.y)})`);
  PR.fig.setAttribute('transform', side ? `scale(${dir === 'left' ? -1 : 1} 1)${PL.moving ? ' rotate(4)' : ''}` : '');
  PR.torso.setAttribute('transform', `translate(0 ${bob.toFixed(2)}) scale(${(1 + sq).toFixed(3)} ${(1 - sq).toFixed(3)})`);
  if (side) {
    PR.legB.setAttribute('transform', `translate(${f1(-1.5 - sw * 4.5)} 0)`);
    PR.legF.setAttribute('transform', `translate(${f1(1.5 + sw * 4.5)} 0)`);
    PR.armNear.setAttribute('transform', `rotate(${f1(sw * 32)} 0 -21)`);      // swings opposite the near leg
    PR.armFar.setAttribute('transform', `rotate(${f1(-sw * 32)} 2.5 -21)`);
  } else {
    PR.legB.setAttribute('transform', `translate(-5 ${f1(-Math.max(0, sw) * 2.6)})`);
    PR.legF.setAttribute('transform', `translate(5 ${f1(-Math.max(0, -sw) * 2.6)})`);
    PR.armL.setAttribute('transform', `translate(0 ${f1(sw * 2)})`);
    PR.armR.setAttribute('transform', `translate(0 ${f1(-sw * 2)})`);
  }
  if (PL.working) {   // repairing: arms reach forward and work quickly
    const w = REDUCE ? 0 : Math.sin(t * 18);
    if (side) {
      PR.armNear.setAttribute('transform', `rotate(${f1(-62 + w * 16)} 0 -21)`);
      PR.armFar.setAttribute('transform', `rotate(${f1(-50 - w * 16)} 2.5 -21)`);
    } else {
      PR.armL.setAttribute('transform', `translate(0 ${f1(-2 + w * 1.8)})`);
      PR.armR.setAttribute('transform', `translate(0 ${f1(-2 - w * 1.8)})`);
    }
  }
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
  else if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) interact(); }   // never scroll the page
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
const releaseKeys = () => { for (const k in keys) keys[k] = false; };
window.addEventListener('blur', releaseKeys);
stage.addEventListener('blur', releaseKeys);
stage.addEventListener('pointerdown', () => stage.focus({ preventScroll: true }));

function movePlayer(dt) {
  let vx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0), vy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  PL.moving = false;
  if (GAME.state !== 'play' || GAME.repair) return;   // no walking during a repair or after the game ends
  if (!vx && !vy) return;
  if (vy) bumpDoor(vy);
  const len = Math.hypot(vx, vy); vx /= len; vy /= len;
  const dist = SETTINGS.SPEED * dt, n = Math.ceil(dist / 2), sx = vx * dist / n, sy = vy * dist / n;
  const x0 = PL.x, y0 = PL.y;
  for (let k = 0; k < n; k++) {
    if (sx) { if (free(PL.x + sx, PL.y)) PL.x += sx; else if (!sy) nudge('y', sx); }
    if (sy) { if (free(PL.x, PL.y + sy)) PL.y += sy; else if (!sx) nudge('x', sy); }
  }
  PL.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
  PL.moving = PL.x !== x0 || PL.y !== y0;
  if (PL.moving) PL.walk += dt * 13;   // step rate (short, quick steps)
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

/* ==== SECTION: Doors (state) ====
   Walking into a closed door (bumpDoor): from inside the room it always opens; from the corridor it opens
   while the room's system is down. FOR NOW it's free: step 3 charges the failure's cost and adds B.F. 9000's
   lines. An opened door relocks once the player has been in the room and left it (or walked away without
   going in). d.dev marks doors held open by the test tools. */
function setDoor(d, open) { d.want = open; }
function bumpDoor(vy) {
  const y = PL.y + Math.sign(vy) * (SETTINGS.FOOT_H + 4);
  const d = DOORS.find((q) => !q.want && PL.x > q.x1 + 4 && PL.x < q.x2 - 4 && y >= q.y1 - 2 && y <= q.y2 + 2);
  if (!d) return;
  const inside = areaAt(PL.x, PL.y) === d.room.id;
  if (inside || isDown(d.room.id)) { setDoor(d, true); d.visited = inside; }
}
function drawDoor(d) {
  const e = d.t * d.t * (3 - 2 * d.t), off = f1(e * 44);
  d.elL.setAttribute('transform', `translate(${-off} 0)`);
  d.elR.setAttribute('transform', `translate(${off} 0)`);
}
function updateDoors(dt) {
  const here = areaAt(PL.x, PL.y);
  DOORS.forEach((d) => {
    if (d.want && !d.dev) {
      if (here === d.room.id) d.visited = true;
      else if (!playerInDoor(d) && (d.visited || Math.hypot(PL.x - d.x, PL.y - d.mid) > 90)) { d.want = false; d.visited = false; }
    }
    if (!d.want && d.t > 0 && playerInDoor(d)) return;   // never close on the player
    d.open = d.want;
    const t0 = d.t;
    d.t = Math.max(0, Math.min(1, d.t + (d.open ? 1 : -1) * dt * SETTINGS.DOOR_SPEED));
    if (d.t !== t0) drawDoor(d);
  });
}

/* ==== SECTION: Game: clocks, failures and repairs ==== */
const SEED = params.has('seed') ? (parseInt(params.get('seed'), 10) || 0) : null;
const GAME = { state: 'play', t: 0, horizon: SETTINGS.HORIZON, next: 0, last: null, repair: null,
  repairs: 0, failures: 0, rand: Math.random, invincible: false, frozen: false, bonus: 0, bonusT: 0, warned: 999 };
const hyperLeft = () => Math.max(0, SETTINGS.HYPERDRIVE - GAME.t);
const anyDown = () => ROOMS.some((r) => isDown(r.id));
const live = $('live');
function announce(msg) { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 60); }

function resetGame() {
  Object.assign(GAME, { state: 'play', t: 0, horizon: SETTINGS.HORIZON, next: 0, last: null, repair: null,
    repairs: 0, failures: 0, bonus: 0, bonusT: 0, warned: 999,
    rand: SEED === null ? Math.random : rng(((SEED % 2147483646) + 2147483646) % 2147483646 + 1) });
  ROOMS.forEach((r) => Object.assign(SYS[r.id], { state: 'ok', progress: 0, fail: -1, cost: 0 }));
  DOORS.forEach((d) => { Object.assign(d, { want: false, open: false, t: 0, visited: false, dev: false }); drawDoor(d); });
  Object.assign(PL, { x: SETTINGS.START.x, y: SETTINGS.START.y, dir: SETTINGS.START.dir, walk: 0, moving: false, working: false });
  repairRing(null); fxClear(); clearToasts();
  $('end').hidden = true;
  if (DEV) devReset();
}
// Failure number n (index into SETTINGS.FAILURES) breaks a random working system other than the last one
function scheduledFailure() {
  const n = GAME.next++, working = ROOMS.filter((r) => !isDown(r.id));
  if (!working.length) return;                              // all four are down: this failure is skipped
  const fresh = working.filter((r) => r.id !== GAME.last), pool = fresh.length ? fresh : working;
  failSystem(pool[Math.floor(GAME.rand() * pool.length)].id, n, SETTINGS.FAILURES[n][1]);
}
function failSystem(id, n, cost) {
  const S = SYS[id];
  if (GAME.repair && GAME.repair.r.id === id) { GAME.repair = null; PL.working = false; repairRing(null); }
  Object.assign(S, { state: 'broken', progress: 0, fail: n, cost });
  GAME.last = id; GAME.failures++;
  announce(`Alert: ${S.room.name} failure. The event horizon clock is draining.`);
}
// The room whose machine the player is standing next to (inside that room), or null
function machineNear() {
  const r = ROOMS.find((q) => q.id === areaAt(PL.x, PL.y));
  return r && Math.min(...r.hit.map((s) => distToShape(PL.x, PL.y, s))) <= SETTINGS.REACH ? r : null;
}
function interact() {   // Space
  if (GAME.state !== 'play' || GAME.repair) return;
  const r = machineNear();
  if (r && SYS[r.id].state === 'broken') startRepair(r);
}
function startRepair(r) {
  GAME.repair = { r, t: 0, sparkT: 0 };
  Object.assign(SYS[r.id], { state: 'repairing', progress: 0 });
  PL.working = true; PL.moving = false;
  const dx = r.ring[0] - PL.x, dy = r.ring[1] - PL.y;   // turn to face the machine
  PL.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  announce(`Repairing the ${r.machine.toLowerCase()}.`);
}
function tickRepair(dt) {
  const R = GAME.repair, r = R.r, S = SYS[r.id];
  R.t += dt; S.progress = Math.min(1, R.t / SETTINGS.REPAIR_TIME);
  repairRing(r, S.progress);
  // sparks fly from the machine's edge toward the player's tools
  if (!REDUCE && (R.sparkT -= dt) <= 0) {
    R.sparkT = .08;
    const a = Math.atan2(PL.y - 20 - r.ring[1], PL.x - r.ring[0]);
    sparks(r.ring[0] + Math.cos(a) * (r.ring[2] - 6), r.ring[1] + Math.sin(a) * (r.ring[2] - 6), 3, [C.cyanpale, C.cyan], a, 2.2, 200);
  }
  if (S.progress >= 1) finishRepair();
}
function finishRepair() {
  const r = GAME.repair.r, S = SYS[r.id], [x, y, rad] = r.ring, tint = C[r.tint];
  Object.assign(S, { state: 'ok', progress: 0, fail: -1, cost: 0 });
  GAME.repair = null; PL.working = false; repairRing(null);
  const before = GAME.horizon;
  GAME.horizon = Math.min(SETTINGS.HORIZON, GAME.horizon + SETTINGS.REPAIR_BONUS);
  GAME.repairs++;
  GAME.bonus = Math.round(GAME.horizon - before); GAME.bonusT = 2.5;
  GAME.warned = GAME.horizon > 60 ? 999 : GAME.horizon > 30 ? 60 : GAME.warned;   // re-arm the spoken warnings
  if (!REDUCE) {
    burstRing(x, y, rad, tint);
    for (let i = 0; i < 4; i++) sparks(x, y, 5, [tint, C.white], i * Math.PI / 2, 1.6, 40);
  }
  toast('✓ ' + r.fixed, x, y - rad - 10);
  announce(`${r.fixed}. ${r.name} is back online.` + (GAME.bonus ? ` Event horizon plus ${GAME.bonus} seconds.` : ''));
}
function tickGame(dt) {
  if (GAME.state !== 'play') return;
  if (!GAME.frozen) {
    GAME.t += dt;
    const F = SETTINGS.FAILURES;
    while (GAME.next < F.length && GAME.t >= F[GAME.next][0]) scheduledFailure();
    if (anyDown() && !GAME.invincible) GAME.horizon = Math.max(0, GAME.horizon - SETTINGS.DRAIN * dt);
  }
  if (GAME.repair) tickRepair(dt);
  if (GAME.bonusT > 0) GAME.bonusT -= dt;
  // screen readers hear the horizon clock at 1:00 and 0:30
  [60, 30].forEach((s) => { if (GAME.horizon <= s && GAME.warned > s) { GAME.warned = s; announce(`Event horizon in ${s} seconds.`); } });
  if (hyperLeft() <= 0) endGame('won');
  else if (GAME.horizon <= 0) endGame('lost');
}
// Win or lose: freeze the clocks, cancel a repair in progress and show the end card (placeholder until step 6)
function endGame(result) {
  if (GAME.state !== 'play') return;
  GAME.state = result;
  if (GAME.repair) { Object.assign(SYS[GAME.repair.r.id], { state: 'broken', progress: 0 }); GAME.repair = null; PL.working = false; repairRing(null); }
  releaseKeys();
  const won = result === 'won';
  $('endTitle').textContent = won ? 'Hyperdrive engaged!' : 'Lost to the black hole';
  $('endText').textContent = won
    ? `The ship jumped to safety with ${mmss(GAME.horizon)} left on the event horizon clock.`
    : `The ship crossed the event horizon with ${mmss(hyperLeft())} still to go on the hyperdrive.`;
  const stat = (label, value) => `<div class="stat"><span>${label}</span><strong>${value}</strong></div>`;
  $('endStats').innerHTML = stat('Repairs made', GAME.repairs) + stat('Failures', GAME.failures) +
    (won ? stat('Horizon left', mmss(GAME.horizon)) : stat('Hyperdrive left', mmss(hyperLeft())));
  $('end').hidden = false;
  $('again').focus({ preventScroll: true });
}

/* ==== SECTION: Fit the ship to the stage ==== */
const VIEW = { x: 0, y: 0, s: 1 };   // ship units → stage pixels, for the HTML overlay
function fit() {
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  const s = Math.min(w / BOX.w, h / BOX.h), vw = w / s, vh = h / s;
  const vb = [BOX.x + BOX.w / 2 - vw / 2, BOX.y + BOX.h / 2 - vh / 2, vw, vh].map(f1);
  ALL_SVGS.forEach((el) => el.setAttribute('viewBox', vb.join(' ')));
  Object.assign(VIEW, { x: vb[0], y: vb[1], s: w / vb[2] });
  placeToasts();
}
const toStage = (x, y) => [(x - VIEW.x) * VIEW.s, (y - VIEW.y) * VIEW.s];

/* ==== SECTION: HUD and on-screen text ====
   The HUD (#hud) is HTML above the stage. Text that sits on the ship (the "Space Repair" prompt and the
   "✓ Thruster recalibrated" toasts) is HTML too, in the #ui overlay, so it stays readable at any size;
   it's placed with toStage() and uses the site tokens. */
const ICONS = {
  engine: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.4"/><path d="M8 0.8V3M8 13V15.2M0.8 8H3M13 8H15.2"/>',
  life: '<path d="M2.5 13.5C2.5 6.5 6.5 2.5 13.5 2.5C13.5 9.5 9.5 13.5 2.5 13.5Z"/><path d="M2.5 13.5L9 7"/>',
  reactor: '<ellipse cx="8" cy="8" rx="6.8" ry="2.6"/><ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(60 8 8)"/>' +
    '<ellipse cx="8" cy="8" rx="6.8" ry="2.6" transform="rotate(-60 8 8)"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/>',
  shield: '<path d="M8 1.5L14 3.8V8C14 11.4 11.4 13.7 8 14.6C4.6 13.7 2 11.4 2 8V3.8Z"/>',
  ok: '<path d="M3 8.5L6.5 12L13 4.5"/>',
  broken: '<path d="M8 1.8L15 14.2H1Z"/><path d="M8 6.2V9.8"/><circle cx="8" cy="12" r=".5"/>',
  repairing: '<path d="M10.6 1.8a3.6 3.6 0 0 0-3.4 4.8L1.9 11.9a1.4 1.4 0 0 0 2 2L9.2 8.6a3.6 3.6 0 0 0 4.8-3.4L12 7.2L9 4.2Z"/>'
};
const icon = (name, cls) => `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
const STATE_WORD = { ok: 'OK', broken: 'Failure', repairing: 'Repairing' };
const HUD = { shown: {} };
function hudInit() {
  $('hudSys').innerHTML = ROOMS.map((r) => `<li class="eh-sys" data-state="ok" id="hud-${r.id}">${icon(r.id, 'eh-ico')}` +
    `<span class="eh-sys-txt"><span class="eh-sys-name">${r.hud}</span><strong class="eh-sys-st"></strong></span></li>`).join('');
  HUD.hyper = $('hudHyperT'); HUD.bar = $('hudHyperBar'); HUD.horizon = $('hudHorizon');
  HUD.horizonT = $('hudHorizonT'); HUD.horizonS = $('hudHorizonS');
  HUD.sys = ROOMS.map((r) => { const li = $('hud-' + r.id); return { id: r.id, li, st: li.querySelector('.eh-sys-st') }; });
}
function hudSet(key, el, value, how) {   // touch the DOM only when a value changes
  if (HUD.shown[key] === value) return;
  HUD.shown[key] = value; how(el, value);
}
function hudTick() {
  const text = (el, v) => { el.textContent = v; };
  hudSet('hyper', HUD.hyper, mmss(hyperLeft()), text);
  hudSet('bar', HUD.bar, f1(100 * GAME.t / SETTINGS.HYPERDRIVE), (el, v) => { el.style.width = Math.min(100, v) + '%'; });
  hudSet('horizonT', HUD.horizonT, mmss(GAME.horizon), text);
  const drain = GAME.state === 'play' && anyDown() && !GAME.invincible && !GAME.frozen;
  const mode = GAME.state === 'lost' ? 'crossed' : GAME.bonusT > 0 && GAME.bonus ? 'bonus' : drain ? 'drain' : 'stable';
  hudSet('horizonM', HUD.horizon, mode + (GAME.horizon <= 30 ? ' low' : ''), (el, v) => {
    el.dataset.mode = v.split(' ')[0]; el.classList.toggle('is-low', v.endsWith('low'));
  });
  const word = { bonus: `+${GAME.bonus} s`, drain: '▼ Draining', crossed: 'Crossed', stable: GAME.state === 'won' ? 'Escaped' : 'Stable' };
  hudSet('horizonS', HUD.horizonS, word[mode], text);
  HUD.sys.forEach((h) => hudSet('sys-' + h.id, h, SYS[h.id].state, (o, st) => {
    o.li.dataset.state = st;
    o.st.innerHTML = icon(st, 'eh-ico-s') + STATE_WORD[st];
  }));
}

// "Space Repair" prompt above the player whenever a broken machine is in reach
const ui = $('ui'), promptEl = $('prompt');
let promptAt = '', promptFor = null;
function uiTick() {
  const r = GAME.state === 'play' && !GAME.repair ? machineNear() : null, show = !!(r && SYS[r.id].state === 'broken');
  if (show !== !promptEl.hidden) promptEl.hidden = !show;
  if (show && promptFor !== r && !(GAME.t - r.said < 8)) { r.said = GAME.t; announce(`Press Space to repair the ${r.machine.toLowerCase()}.`); }
  promptFor = show ? r : null;
  if (!show) return;
  const [x, y] = toStage(PL.x, PL.y - 50), at = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  if (at !== promptAt) { promptAt = at; promptEl.style.transform = at; }
}
// Toasts: a short line that rises and fades over a spot on the ship (3 s)
const toasts = [];
function toast(text, x, y) {
  const el = document.createElement('div');
  el.className = 'eh-toast';
  el.innerHTML = '<span></span>';
  el.firstChild.textContent = text;
  ui.appendChild(el);
  const t = { el, x, y };
  toasts.push(t); placeToasts();
  el.firstChild.addEventListener('animationend', () => { el.remove(); toasts.splice(toasts.indexOf(t), 1); });
}
function placeToasts() {
  toasts.forEach((t) => { const [x, y] = toStage(t.x, t.y); t.el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; });
}
function clearToasts() { toasts.splice(0).forEach((t) => t.el.remove()); }

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
    DOORS.forEach((d) => { setDoor(d, open); d.dev = open; d.visited = false; });
  });
  // Failures and clocks
  const brk = $('devBreak');
  brk.innerHTML = '<option value="">Choose a system…</option>' + ROOMS.map((r) => `<option value="${r.id}">${r.hud}</option>`).join('');
  brk.addEventListener('change', () => {
    if (brk.value && GAME.state === 'play' && SYS[brk.value].state !== 'broken') failSystem(brk.value, -1, 5);
    brk.value = ''; stage.focus({ preventScroll: true });
  });
  $('devRepair').addEventListener('click', () => {
    if (GAME.repair) { GAME.repair = null; PL.working = false; repairRing(null); }
    ROOMS.forEach((r) => Object.assign(SYS[r.id], { state: 'ok', progress: 0, fail: -1, cost: 0 }));
  });
  $('devNext').addEventListener('click', () => {
    const f = SETTINGS.FAILURES[GAME.next];
    if (f && GAME.state === 'play') GAME.t = Math.max(GAME.t, f[0]);
  });
  $('devHyper').addEventListener('change', (e) => devSetHyper(+e.target.value));
  $('devHorizon').addEventListener('change', (e) => { GAME.horizon = Math.max(0, Math.min(SETTINGS.HORIZON, +e.target.value || 0)); });
  $('devInvincible').addEventListener('change', (e) => { GAME.invincible = e.target.checked; });
  $('devFreeze').addEventListener('change', (e) => { GAME.frozen = e.target.checked; });
}
// Set the hyperdrive clock (s left). Failures scheduled before the new mission time are skipped, later ones still come.
function devSetHyper(left) {
  GAME.t = Math.max(0, Math.min(SETTINGS.HYPERDRIVE, SETTINGS.HYPERDRIVE - (left || 0)));
  GAME.next = SETTINGS.FAILURES.findIndex((f) => f[0] > GAME.t);
  if (GAME.next < 0) GAME.next = SETTINGS.FAILURES.length;
}
function devReset() {   // after Play again: the test tools' toggles start over too (except invincible and freeze)
  const b = $('devDoors');
  b.setAttribute('aria-pressed', 'false'); b.textContent = 'Open all doors';
  GAME.invincible = $('devInvincible').checked; GAME.frozen = $('devFreeze').checked;
}
let devLast = '', devLastG = '';
function devTick() {
  const s = `x ${Math.round(PL.x)}, y ${Math.round(PL.y)} · ${areaAt(PL.x, PL.y) || '—'}`;
  if (s !== devLast) { $('devPos').textContent = s; devLast = s; }
  const f = SETTINGS.FAILURES[GAME.next];
  const g = `mission ${mmss(GAME.t)} · next failure ${f ? `#${GAME.next + 1} at ${mmss(f[0])}` : 'none'} · ` +
    `failures ${GAME.failures} · repairs ${GAME.repairs} · ${GAME.state}`;
  if (g !== devLastG) { $('devGame').textContent = g; devLastG = g; }
  const foot = ref('dev-foot');
  if (foot) { foot.setAttribute('x', f1(PL.x - SETTINGS.FOOT_W)); foot.setAttribute('y', f1(PL.y - SETTINGS.FOOT_H)); }
}

/* ==== SECTION: Build and run ==== */
function build() {
  drawDefs();
  drawSpace(layer('space', SVG_BG), layer('sky', SVG_SKY));
  // hull plates, then the side engines and bridge, then the hull's inner layers, then the main engine
  const gHullLow = layer('hull'), gUnder = layer('engines-under'), gHullHigh = layer('hull-inner');
  drawHull(gHullLow, gHullHigh);
  drawEngines(gUnder, layer('engines'), SVG_SKY.firstChild);
  drawFloors(layer('walls'), layer('floors'));
  const gs = layer('props'), gAlarmUnder = layer('alarm-under', SVG_FRONT), gd = layer('machines', SVG_FRONT);
  drawCorridor(gs, gd);
  drawEngineRoom(gs, gd); drawLifeSupport(gs, gd); drawReactor(gs, gd); drawShieldBay(gs, gd); drawCommand(gs, gd);
  drawDoors(layer('doors', SVG_FRONT));
  drawAlarms(gAlarmUnder, layer('alarm-over', SVG_FRONT));
  layer('devgrid', SVG_FRONT);
  drawPlayer(layer('actors', SVG_FRONT));
  fxInit(layer('fx', SVG_FRONT));
  const eyes = [...SVG_FRONT.querySelectorAll('.eh-bfeye')];
  ANIM.push((t) => eyes.forEach((e, i) => e.setAttribute('r', f1(3 + .6 * Math.sin(t * 2 + i)))));
  buildGrid();
  hudInit();
}

build();
fit();
new ResizeObserver(fit).observe(stage);
if (DEV) devInit();
resetGame();
$('again').addEventListener('click', () => { resetGame(); stage.focus({ preventScroll: true }); });
$('end').addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); $('again').focus(); } });  // one control: keep focus in the card
stage.focus({ preventScroll: true });

// Main loop: the player moves every frame; idle machine animations run at about 30 fps to save painting.
// Walking uses a step capped at 50 ms; the clocks use real time capped at 250 ms (a hidden tab pauses the game).
let last = performance.now(), T = 0, animDt = 0, frameNo = 0;
function frame(now) {
  const raw = (now - last) / 1000, dt = Math.min(.05, raw);
  last = now; T += dt; animDt += dt;
  movePlayer(dt);
  posePlayer(T);
  updateDoors(dt);
  tickGame(Math.min(.25, raw));
  hudTick();
  uiTick();
  if (++frameNo % 2 === 0 || animDt > .05) {
    for (let i = 0; i < ANIM.length; i++) ANIM[i](T, animDt);
    animDt = 0;
  }
  if (DEV) devTick();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Test hooks for automated checks, only with ?dev
if (DEV) {
  window.__eh = { PL, DOORS, keys, setDoor, free, areaAt, posePlayer, SETTINGS, ANIM,
    GAME, SYS, ROOMS, FX, failSystem, startRepair, interact, machineNear, resetGame, endGame, devSetHyper, toStage };
}
})();
