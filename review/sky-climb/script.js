// Sky Climb — a platformer quiz: climb 500 ft of floating islands and answer a question at each lantern ledge.
// Questions: ../../shared/data/questions.js; topic groups: ../../shared/data/topics.js;
// topic dialog: ../../shared/topic-picker.js.
// URL options: ?groups=memory,thinking or ?ced=2.3,2.4 (topics), ?debug or ?dev (test tools), ?seed=7 (repeat a layout).
//
// Question rule: the climb is split into ten 50 ft bands. The first time the hero lands on a platform in a band,
// that band's question is asked (once, even if the hero falls and comes back). The top band (450–500 ft) saves
// its question for the summit island, so the tenth question is the one that unlocks the treasure.
(function () {
"use strict";

/* ==== SECTION: Setup ==== */
const W = 512, H = 320;                 // scene size in world pixels (drawn 1:1, then scaled up)
const PPF = 16;                         // pixels per foot
const TOP_FT = 500, BAND_FT = 50, NQ = 10;
const GROUND = 48, TOPY = GROUND + TOP_FT * PPF;
const EDGE = 16;                        // the hero stops this far from the left and right edges
const UP = 3;                           // rows of grass blades drawn above a platform's surface
const CAM_MAX = TOPY - Math.round(.36 * H);   // highest camera position (world y at the bottom of the screen)
const SKY_P = 1 / 3;                    // the sky scrolls at a third of the climb, so one screen spans 60 ft of sunset
const $ = (id) => document.getElementById(id);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const DEV = params.has('debug') || params.has('dev') || document.documentElement.hasAttribute('data-dev');

/* ==== SECTION: CONFIG (physics and difficulty) ==== */
const CONFIG = {
  STEP: 1 / 120,
  RUN: 184, WALK: 84,                   // px/s
  ACC_G: 3400, FRIC_G: 4200,            // ground: full speed in ~0.05 s, stop in ~0.04 s
  ACC_A: 2800, DRAG_A: 2000, TURN: 1.6, // air: nearly as responsive, so landings can be corrected
  JUMP: 700, G_UP: 2000, G_DOWN: 2900,  // full jump is about 124 px (7.7 ft)
  APEX_V: 90, APEX_G: .55,              // lighter gravity near the top of a held jump
  CUT: .4,                              // releasing jump early keeps this much upward speed
  MAXFALL: 780, COYOTE: .09, BUFFER: .12,
  BOXW: 20, BOXH: 36,
  // Difficulty runs from the first value (ground) to the second (summit).
  DIFF: {
    RISE: [70, 98],                     // average height between platforms, px
    RISE_CAP: .87,                      // no rise is more than this share of a full jump
    GAP_MIN: [0, .58],                  // sideways gap, as a share of the farthest standing-start jump
    GAP_MAX: [.45, .98],
    WIDTH: [100, 40],                   // platform width, px
    LEDGE: [136, 84],                   // lantern ledge width, px
    TURN: [.3, .5]                      // chance the path doubles back
  }
};

/* ==== SECTION: Color and pixel helpers ==== */
const NAMES = ('sky0 sky1 sky2 sky3 sky4 sky5 sky6 sky7 sky8 sky9 sky10 sky11 sky12 sky13 sky14 ' +
  'suncore sunmid sunrim sunglow moonlit moonmid moonshade moonglow star starwarm starcool ' +
  'mfarlit mfar mfarshade mnearlit mnear mnearshade snow snowshade mist ' +
  'f1 f1lit f2 f2lit f3 f3lit f4 f4lit f5 f5lit f6 f6lit ' +
  'pinehi pinelit pine pinedark pinedeep trunk trunklit trunkdark dirt dirtlit dirtdark flowera flowerb ' +
  'turf0 turf1 turf2 turf3 turf4 rock0 rock1 rock2 rock3 rock4 cloud0 cloud1 cloud2 cloud3 cloudlight isle ' +
  'lampmetal lampoff lampcore lampglow wood woodlit wooddark gold goldlit golddark dust rim firefly shadow hitbox').split(' ');
const cs = getComputedStyle(document.documentElement);
const P = {}, S = {};                   // P: [r, g, b] for mixing; S: CSS strings for drawing
const css = (c) => 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
NAMES.forEach((n) => {
  const h = cs.getPropertyValue('--px-' + n).trim().replace('#', '');
  P[n] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  S[n] = css(P[n]);
});

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function ramp(st) { return (a) => { if (a <= st[0][0]) return st[0][1]; for (let i = 1; i < st.length; i++) { if (a <= st[i][0]) { const p = st[i - 1], q = st[i]; return mix(p[1], q[1], (a - p[0]) / (q[0] - p[0])); } } return st[st.length - 1][1]; }; }
// Position hash (0..1) for textures, and a 4x4 ordered-dither threshold (0..1)
function h2(x, y) { let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; }
function n1(x, seed) { const i = Math.floor(x), f = x - i, a = h2(i, seed), b = h2(i + 1, seed); return a + (b - a) * f * f * (3 - 2 * f); }
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16;

// Pixel buffer for art built at load time (one 32-bit value per pixel; 0 = transparent)
const pk = (c) => ((255 << 24) | (clamp(Math.round(c[2]), 0, 255) << 16) | (clamp(Math.round(c[1]), 0, 255) << 8) | clamp(Math.round(c[0]), 0, 255)) >>> 0;
function Ras(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
Ras.prototype.set = function (x, y, v) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = v; };
Ras.prototype.rect = function (x, y, w, h, v) {
  const x0 = Math.max(0, x), x1 = Math.min(this.w, x + w), y1 = Math.min(this.h, y + h);
  for (let j = Math.max(0, y); j < y1; j++) for (let i = x0; i < x1; i++) this.d[j * this.w + i] = v;
};
Ras.prototype.canvas = function () {
  const c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
  c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(this.d.buffer), this.w, this.h), 0, 0);
  return c;
};

const skyAt = ramp([0, 25, 55, 90, 130, 170, 210, 250, 290, 330, 370, 410, 450, 500, 540].map((ft, i) => [ft, P['sky' + i]]));
const cloudAt = ramp([[0, P.cloud0], [150, P.cloud1], [300, P.cloud2], [450, P.cloud3]]);
const turfAt = ramp([0, 125, 250, 375, 500].map((ft, i) => [ft, P['turf' + i]]));
const rockAt = ramp([0, 125, 250, 375, 500].map((ft, i) => [ft, P['rock' + i]]));
// The light that falls on things: warm sun low down, cool moonlight high up
const lightAt = ramp([[0, P.sunmid], [250, P.cloud1], [420, P.moonmid]]);

/* ==== SECTION: Art — sky, sun, moon, stars ==== */
const SKY_H = Math.ceil((CAM_MAX + 48) * SKY_P) + H + 8;
const skyFt = (cam, y) => (cam * SKY_P + H - y) / (PPF * SKY_P);   // the sky's altitude at a screen row
// The sky is a stack of flat color bands with dithered seams: a strip 4 px wide, tiled across the screen
function buildSky() {
  const R = new Ras(4, SKY_H), BAND = 40, SEAM = 24, FT = 1 / (PPF * SKY_P);
  for (let row = 0; row < SKY_H; row++) {
    const wy = SKY_H - 1 - row, b = Math.floor(wy / BAND), f = wy - b * BAND;
    const c0 = pk(skyAt((b + .5) * BAND * FT)), c1 = pk(skyAt((b + 1.5) * BAND * FT));
    const t = f > BAND - SEAM ? (f - (BAND - SEAM)) / SEAM : 0;
    for (let x = 0; x < 4; x++) R.d[row * 4 + x] = t > bayer(x, row) ? c1 : c0;
  }
  return R.canvas();
}

// Returns [disc, glow]; the glow is drawn first and fades as the sky reddens
function buildSun() {
  const N = 168, c = N / 2, R = new Ras(N, N), G = new Ras(N, N);
  const core = pk(P.suncore), mid = pk(P.sunmid), rim = pk(P.sunrim), glow = pk(P.sunglow);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x + .5 - c, y + .5 - c), b = bayer(x, y);
    if (d < 32) R.d[y * N + x] = d < 19 ? core : d < 27 ? mid : rim;      // three clean rings
    if (d < 48 ? .78 - Math.max(0, d - 32) / 16 * .34 > b : d < 82 && .44 * Math.pow(1 - (d - 48) / 34, 1.2) > b) G.d[y * N + x] = glow;
  }
  return [R.canvas(), G.canvas()];
}

function buildMoon() {
  const N = 96, c = N / 2, R = new Ras(N, N), rad = 21;
  const tones = [pk(P.moonlit), pk(P.moonmid), pk(P.moonshade)], glow = pk(P.moonglow);
  const craters = [[-7, -6, 4], [5, 3, 5], [-3, 9, 3], [9, -9, 2.5], [-12, 4, 2]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = x + .5 - c, dy = y + .5 - c, d = Math.hypot(dx, dy); let v = 0;
    if (d < rad) {
      const side = (dx * .62 + dy * .78) / rad;                // shaded toward the lower right
      let k = side > .52 ? 2 : side > .1 ? 1 : 0;
      for (const q of craters) if (Math.hypot(dx - q[0], dy - q[1]) < q[2]) k = Math.min(2, k + 1);
      v = tones[k];
    } else if (d < rad + 22) v = .42 * Math.pow(1 - (d - rad) / 22, 1.4) > bayer(x, y) ? glow : 0;
    R.d[y * N + x] = v;
  }
  return R.canvas();
}

const starRng = rng(99);
const stars = Array.from({ length: 200 }, () => ({
  x: Math.floor(starRng() * W), y: Math.floor(starRng() * (H + 8)),
  k: starRng() < .07 ? 2 : starRng() < .3 ? 1 : 0,             // 2 = large four-point star
  th: starRng() * .9, ph: starRng() * 6.28, sp: 1.2 + starRng() * 2.2,
  c: starRng() < .2 ? 'starwarm' : starRng() < .35 ? 'starcool' : 'star'
}));

/* ==== SECTION: Art — mountains and forest ==== */
// Texture without speckle: a small block in some cells of a coarse grid
function clump(x, y, seed, cw, ch, chance, bw, bh) {
  const gx = Math.floor(x / cw), gy = Math.floor(y / ch);
  if (h2(gx + seed, gy) >= chance) return false;
  const lx = x - gx * cw - Math.floor(h2(gx, gy + seed + 3) * (cw - bw + 1)), ly = y - gy * ch - Math.floor(h2(gx + 5, gy + seed) * (ch - bh + 1));
  return lx >= 0 && lx < bw && ly >= 0 && ly < bh;
}

// peaks: [x, height, left half-width, right half-width]; C: { lit, base, shade, mist }.
// Each peak is its own smooth mountain with long, slightly hollow slopes and flat sunlit and shaded faces.
// The tallest (farthest) is drawn first so lower peaks overlap the ones behind. Peaks at least snowMin tall
// get a snow cap, and the foot of the range fades into mist in four flat steps.
function mountainLayer(seed, peaks, C, snowMin, layerH) {
  const r = rng(seed), mh = Math.max.apply(null, peaks.map((q) => q[1])), R = new Ras(W, layerH);
  const order = peaks.map((q, i) => i).sort((a, b) => peaks[b][1] - peaks[a][1]);
  const FOG = 4, fogTop = mh - 72;
  const steps = (c) => { const a = []; for (let k = 0; k <= FOG; k++) a.push(pk(mix(c, C.mist, k / FOG))); return a; };
  const snowS = steps(P.snow), snowShS = steps(P.snowshade), baseS = steps(C.base), edgeS = steps(mix(C.lit, P.snow, .5));
  order.forEach((pi, rank) => {
    const q = peaks[pi], cx = q[0], h = q[1], pTop = mh - h, haze = (1 - rank / Math.max(1, order.length - 1)) * .18;
    const litS = steps(mix(C.lit, C.mist, haze)), shadeS = steps(mix(C.shade, C.mist, haze));
    const curve = 1.18 + r() * .22;                              // above 1: slopes sweep outward toward the foot
    // The ridge where the sunlit face meets the shaded face: one smooth line swinging down from the summit
    const lean = (r() - .3) * .45, amp = 5 + r() * 9, wave = 26 + r() * 22, ph = r() * 6.28, ridge = new Float32Array(layerH + 1);
    for (let d = 0; d <= layerH; d++) ridge[d] = cx + lean * d + amp * (Math.sin(d / wave + ph) - Math.sin(ph)) * Math.min(1, d / 30);
    // Gullies: long tapered streaks, shaded on the sunlit face and half-lit on the shaded face
    const streaks = [];
    for (let j = 0; j < 6; j++) {
      const sunny = j < 3, d0 = Math.round(h * (.1 + .16 * (j % 3) + r() * .07)), side = sunny ? -1 : 1;
      streaks.push({ sunny: sunny, d0: d0, len: h * (.34 + r() * .24), x0: ridge[d0] + side * (8 + r() * 16 + (j % 3) * 13),
        run: side * (.5 + r() * .5), thick: 4 + r() * 7 });
    }
    for (let x = Math.max(0, Math.ceil(cx - q[2])); x <= Math.min(W - 1, Math.floor(cx + q[3])); x++) {
      const u0 = Math.abs(x - cx) / (x < cx ? q[2] : q[3]), u = Math.sqrt(u0 * u0 + .0009) - .03;   // rounds the very tip
      const f = Math.pow(Math.max(0, 1 - u), curve);
      const roll = (n1(x / 34, seed + pi * 9) - .5) * 12 * (1 - f) * Math.min(1, f * 6);             // gentle swells, no jitter
      const top = Math.round(mh - Math.max(0, h * f + roll));
      const cap = h >= snowMin ? (h - snowMin) * .5 + 12 - Math.abs(x - cx) * .42 + Math.abs((x + pi * 3) % 10 - 5) * .9 : -1;
      const drift = Math.round(Math.sin(x / 31 + seed) * 3 + Math.sin(x / 13 + seed * 2) * 1.5);    // mist edges roll a little
      for (let y = Math.max(0, top); y < layerH; y++) {
        const d = y - pTop, sunny = x < ridge[Math.max(0, d)];
        let gully = false;
        for (const s of streaks) {
          const k = (d - s.d0) / s.len; if (k <= 0 || k >= 1 || s.sunny !== sunny) continue;
          const sx = s.x0 + s.run * (d - s.d0), th = s.thick * Math.sin(Math.PI * k);
          if (s.sunny ? x <= sx && x > sx - th : x >= sx && x < sx + th) gully = true;
        }
        let S;
        if (d < cap) S = sunny && !gully ? snowS : snowShS;
        else if (sunny) S = gully ? shadeS : y - top < 2 && d < h * .8 ? edgeS : litS;
        else S = gully ? baseS : shadeS;
        R.d[y * W + x] = S[clamp(Math.floor((y - fogTop + drift) / 18) + 1, 0, FOG)];
      }
    }
  });
  return R.canvas();
}

// Distant pine: stacked tiers in two flat tones, lit from the left
function pineSil(R, cx, by, h, w, dk, lt) {
  const n = Math.max(3, Math.round(h / 9)), top = by - h;
  for (let i = 0; i < n; i++) {
    const y0 = Math.round(top + h * i / n), y1 = Math.round(top + h * (i + 1) / n);
    const e1 = w / 2 * Math.pow((i + 1) / n, .9), e0 = i ? w / 2 * Math.pow(i / n, .9) * .55 : 0;
    for (let y = y0; y < y1; y++) {
      const hw = Math.max(1, Math.round(e0 + (e1 - e0) * (y - y0 + 1) / (y1 - y0)));
      R.rect(cx - hw, y, hw * 2, 1, dk);
      if (y - top < h * .62) R.rect(cx - hw, y, Math.max(1, Math.round(hw * .36)), 1, lt);
    }
  }
}
function forestLayer(seed, layerH, hMin, hMax, gap, dark, lit) {
  const r = rng(seed), R = new Ras(W, layerH), base = hMax + 4, dk = pk(dark), lt = pk(lit);
  R.rect(0, base - Math.round(hMin * .6), W, layerH, dk);
  for (let x = -16; x < W + 16; x += Math.max(3, Math.round(gap * (.5 + r() * .9)))) {
    const h = Math.round(hMin + r() * (hMax - hMin));
    pineSil(R, x, base, h, Math.round(h * (.4 + r() * .16)), dk, lt);
  }
  return R.canvas();
}

// Giant foreground pine: stacked tiers with scalloped skirts, each overlapping the one below.
// Flat shading with no dither: lit on the sunny left, dark on the right, a two-step shadow under each tier,
// and clumps of needles for texture. T = { tone: [highlight, lit, mid, dark, deep], trunk, trunklit, trunkdark } (packed pixels)
function pineBig(R, cx, by, h, w, extra, T, seed) {
  const n = Math.max(4, Math.round(h / 34)), top = by - extra - h, tw = Math.max(3, Math.round(w * .045));
  for (let y = top + Math.round(h * .35); y < by; y++) {
    const hw = tw + (y > by - 10 ? Math.round((y - (by - 10)) * .5) : 0);
    for (let x = cx - hw; x <= cx + hw; x++) {
      const u = (x - cx + hw) / (2 * hw);
      R.set(x, y, u < .25 ? T.trunklit : u > .68 || h2(x, (y + x * 3) >> 4) < .3 ? T.trunkdark : T.trunk);
    }
  }
  const th = h * .96 / n;
  for (let i = n - 1; i >= 0; i--) {                             // lower tiers first; each tier overlaps the one below
    const y0 = Math.round(top + th * i - (i ? th * .55 : 0)), y1 = Math.round(top + th * (i + 1));
    const e1 = w / 2 * Math.pow((i + 1) / n, .8), e0 = i ? w / 2 * Math.pow(i / n, .8) * .4 : 0;
    const prevE = i ? w / 2 * Math.pow(i / n, .8) : 0, prevBot = Math.round(top + th * i);
    for (let y = y0; y <= y1 + 3; y++) {
      const f = Math.min(1, (y - y0) / (y1 - y0)), hw = Math.max(1, Math.round(e0 + (e1 - e0) * Math.pow(f, .85)));
      for (let x = cx - hw; x <= cx + hw; x++) {
        // Scalloped skirt: boughs droop in points along the tier's bottom edge
        const droop = Math.abs(((x + i * 5) % 12 + 12) % 12 - 6) * .7 + (h2(x, seed + i) < .25 ? 1 : 0);
        if (y > y1 + 3 - droop) continue;
        const u = (x - cx) / hw, tooth = Math.abs((y + i * 3) % 6 - 3) - 1.5;   // tone edges are serrated like needles
        let k = x - cx < -.35 * hw + tooth ? 1 : x - cx < .575 * hw + tooth ? 2 : 3;
        if (i && Math.abs(x - cx) < prevE + 2) {                 // shadow cast by the tier above, echoing its skirt
          const s = y - prevBot + Math.abs(((x + i * 5 - 5) % 12 + 12) % 12 - 6) * .4;
          if (s < 7) k = 4; else if (s < 12) k = Math.max(k, 3);
        }
        if (k < 4) {                                             // needle clumps: a lighter tuft or a darker gap
          if (clump(x, y, seed, 8, 5, .4, 3, 2)) k = Math.max(k === 1 ? 0 : 1, k - 1);
          else if (k > 1 && clump(x, y, seed + 17, 8, 5, .3, 3, 2)) k++;
        }
        if (x <= cx - hw + 1 && u < -.3 && f > .15) k = 0;       // sunlit edge
        R.set(x, y, T.tone[k]);
      }
    }
  }
}

// Foreground layer: ground strip plus giant pines. Tree = [x, width, height, bare trunk below the boughs, shade 0..1]
const FG_H = 1140;
const FG_TREES = [
  [300, 150, 250, 430, .5], [-6, 200, 380, 520, .42], [524, 190, 360, 300, .34], [196, 110, 170, 0, .55],
  [404, 130, 210, 0, .3], [92, 170, 290, 250, .12], [446, 200, 330, 110, .08], [22, 150, 250, 0, 0], [506, 130, 220, 0, .16]
];
function buildForeground() {
  const R = new Ras(W, FG_H), gy = FG_H - GROUND, r = rng(5);
  FG_TREES.forEach((q, i) => {
    const sh = (c) => pk(mix(c, P.pinedeep, q[4]));
    pineBig(R, q[0], gy + 4, q[2], q[1], q[3], {
      tone: [sh(P.pinehi), sh(P.pinelit), sh(P.pine), sh(P.pinedark), pk(mix(P.pinedeep, P.shadow, q[4] * .3))],
      trunk: sh(P.trunk), trunklit: sh(P.trunklit), trunkdark: sh(P.trunkdark)
    }, 40 + i * 13);
  });
  const hi = pk(P.pinehi), lit = pk(P.pinelit), mid = pk(P.pine), dirt = pk(P.dirt), dLit = pk(P.dirtlit), dDark = pk(P.dirtdark);
  for (let x = 0; x < W; x++) {
    const fringe = 6 + (h2(x >> 1, 3) < .4 ? 1 : 0) + ((x % 11) < 2 ? 2 : 0), deep = 30 + Math.round(Math.sin(x / 17) * 3 + Math.sin(x / 7) * 1.5);
    for (let y = gy; y < FG_H; y++) {
      const d = y - gy; let v;
      if (d < 2) v = hi; else if (d < fringe - 1) v = lit; else if (d < fringe) v = mid;
      else if (d >= deep) v = dDark;                                                       // darker soil lower down
      else v = clump(x, d, 3, 12, 7, .5, 4, 2) ? dLit : clump(x, d - 1, 3, 12, 7, .5, 4, 2) ? dDark : dirt;   // pebbles
      R.d[y * W + x] = v;
    }
    const g = h2(x, 21);                                         // blades of grass
    if (g < .3) { R.set(x, gy - 1, lit); if (g < .12) R.set(x, gy - 2, hi); if (g < .04) R.set(x, gy - 3, hi); }
  }
  for (let i = 0; i < 16; i++) {                                 // flowers
    const x = 8 + Math.floor(r() * (W - 16)), c = pk(i % 3 ? P.flowera : P.flowerb);
    R.rect(x, gy - 4, 1, 4, mid); R.rect(x - 1, gy - 6, 3, 2, c); R.set(x, gy - 7, c); R.set(x, gy - 5, pk(P.suncore));
  }
  for (let i = 0; i < 7; i++) {                                  // stones
    const x = Math.floor(r() * (W - 12)), w = 4 + Math.floor(r() * 6);
    R.rect(x, gy - 2, w, 3, dLit); R.rect(x + 1, gy - 3, w - 2, 1, dLit); R.rect(x + 1, gy, w - 1, 1, dDark); R.set(x + w - 1, gy - 1, dDark);
  }
  return R.canvas();
}

/* ==== SECTION: Art — clouds and distant islands ==== */
// Puffy cloud in three flat tones: light along the tops of the bumps, shadow along the flat base
function cloudSprite(r, w, ft) {
  const body = cloudAt(ft), hiC = pk(mix(body, P.cloudlight, .62)), bodyC = pk(body), shC = pk(mix(body, skyAt(ft + 30), .6));
  const n = 3 + Math.floor(r() * 3) + (w > 130 ? 2 : 0), maxR = clamp(Math.round(w * .2), 9, 36), bumps = [];
  for (let j = 0; j < n; j++) {
    const u = (j + .5) / n;
    bumps.push([Math.round(w * (.14 + u * .72) + (r() - .5) * 8), Math.max(4, Math.round((.55 + .45 * r()) * maxR * (1 - .45 * Math.abs(u - .5) * 2)))]);
  }
  const slab = 7, base = maxR + slab + 1, R = new Ras(w, base + 1);
  for (let x = 0; x < w; x++) {
    const end = Math.min(x, w - 1 - x), round = end < 4 ? 4 - end : 0, bot = base - (round > 1 ? round - 1 : 0);
    let top = base - slab + round;
    for (const b of bumps) { const dx = x - b[0]; if (Math.abs(dx) <= b[1]) top = Math.min(top, base - slab + 2 - Math.round(Math.sqrt(b[1] * b[1] - dx * dx))); }
    const colH = bot - top, hz = colH > 26 ? 5 : colH > 12 ? 3 : 2, shz = Math.max(2, Math.round(colH * .26));
    for (let y = top; y <= bot; y++) R.d[y * w + x] = bot - y < shz ? shC : y - top < hz ? hiC : bodyC;
  }
  return R.canvas();
}
// Small faraway floating island with a few pines, tinted by the sky around it
function isleSprite(r, w, ft, near) {
  const sky = skyAt(ft + 30), dark = mix(P.isle, P.shadow, sstep(260, 420, ft) * .7);
  const body = pk(mix(sky, dark, .45 + near * .3)), top = pk(mix(sky, lightAt(ft), .4 + near * .25)), tree = pk(mix(sky, dark, .62 + near * .3));
  const TH = 12, d = Math.round(w * .42 + r() * 6), R = new Ras(w, TH + d + 3), seed = Math.floor(r() * 999);
  for (let x = 0; x < w; x++) {
    const e = Math.abs(x - (w - 1) / 2) / (w / 2);
    const depth = Math.max(2, Math.round(d * (1 - Math.pow(e, 1.5)) * (.7 + .3 * n1(x / 6, seed)) + (h2(x >> 1, seed) - .5) * 3));
    for (let y = TH; y <= TH + depth; y++) R.d[y * w + x] = y < TH + 2 ? top : body;
  }
  for (let i = 0, n = 1 + Math.floor(w / 22 + r() * 2); i < n; i++) {
    const tx = 4 + Math.floor(r() * (w - 8)), th = 5 + Math.floor(r() * 7);
    for (let y = 0; y < th; y++) { const hw = Math.round((y + 1) * 2.6 / th * ((y % 3) / 4 + .6)); R.rect(tx - hw, TH - th + y, hw * 2 + 1, 1, tree); }
  }
  return R.canvas();
}
// Things that drift in the sky, sorted far to near. q = parallax (higher = nearer).
// Clouds thin out with altitude and stop at CLOUD_TOP, so the night sky above about 420 ft is clear.
const CLOUD_TOP = 384;
function buildSkyThings() {
  const r = rng(7), list = [];
  for (let ft = 30; ft < CLOUD_TOP; ft += 5 + 13 * sstep(110, CLOUD_TOP, ft) + r() * 5) {
    const q = lerp(.26, .4, sstep(300, CLOUD_TOP, ft)) + r() * .3, w = Math.round((46 + r() * 70) * (.55 + q));
    list.push({ ft: ft, q: q, x: r() * (W + w), c: cloudSprite(r, w, ft), s: reduce ? 0 : 3 + r() * 7 });
  }
  for (let i = 0; i < 7; i++) {                                  // a few big cloud banks, far off, through the sunset
    const ft = 70 + i * 40 + r() * 16, q = .17 + r() * .09, w = Math.round(150 + r() * 90);
    list.push({ ft: ft, q: q, x: r() * (W + w), c: cloudSprite(r, w, ft), s: reduce ? 0 : 1.5 + r() * 2 });
  }
  for (let i = 0; i < 13; i++) {
    const ft = 150 + i * 26 + r() * 14, q = .3 + r() * .22, w = Math.round((26 + r() * 40) * (.6 + q));
    list.push({ ft: ft, q: q, x: 20 + r() * (W - 40 - w), c: isleSprite(r, w, ft, (q - .3) / .22), s: 0, isle: true });
  }
  return list.sort((a, b) => a.q - b.q);
}

/* ==== SECTION: Art — platforms, lantern glow, treasure light ==== */
function platSprite(p, seed) {
  const w = p.w, ft = (p.y - GROUND) / PPF, th = p.kind === 'summit' ? 36 : clamp(Math.round(8 + w * .14), 12, 22);
  const R = new Ras(w, UP + th + 13), light = lightAt(ft), tf = turfAt(ft), rk = rockAt(ft);
  const TL = pk(mix(tf, light, .5)), TB = pk(tf), TD = pk(mix(tf, P.shadow, .34));
  // Rock in four flat tones: sunlit shoulder, body, shaded side and belly, dark underside
  const rock = [pk(mix(rk, light, .32)), pk(rk), pk(mix(rk, P.shadow, .36)), pk(mix(rk, P.shadow, .62))];
  const bottoms = [];
  for (let x = 0; x < w; x++) {
    const e = Math.abs(x - (w - 1) / 2) / (w / 2), u = x / (w - 1);
    const depth = Math.max(3, Math.round(th * (1 - Math.pow(e, 2.4)) * (.7 + .3 * n1(x / 9, seed)) + (h2(x >> 1, seed) - .5) * 2));
    const yTop = UP + (x === 0 || x === w - 1 ? 1 : 0), yBot = UP + 4 + depth;
    bottoms.push(yBot);
    for (let y = UP + 3; y <= yBot; y++) {
      const v = (y - UP) / (th + 4);
      let k = u < .3 - v * .22 ? 0 : u > .82 - v * .3 || v > .72 ? 2 : 1;
      if (clump(x, y, seed, 8, 5, .4, 3, 2)) k++;                // stones set into the rock
      if (y >= yBot - (depth > 5 ? 1 : 0)) k = 3;
      R.d[y * w + x] = rock[Math.min(3, k)];
    }
    // Turf cap, with a fringe that drips over the rock
    const drip = UP + 5 + (h2(x >> 1, seed + 3) < .4 ? 1 : 0) + ((x + seed) % 9 < 2 ? 2 : 0);
    for (let y = yTop; y <= Math.min(drip, yBot); y++) R.d[y * w + x] = y < UP + 2 ? TL : y >= drip ? TD : TB;
    const g = h2(x, seed + 11);                                  // blades of grass
    if (g < .2 && x > 0 && x < w - 1) { R.d[(UP - 1) * w + x] = TL; if (g < .07) R.d[(UP - 2) * w + x] = TL; }
  }
  for (let i = 0, n = w > 70 ? 3 : w > 44 ? 2 : 1; i < n; i++) { // hanging roots
    const x = Math.round(w * (.25 + .5 * h2(i, seed + 17))), len = 3 + Math.floor(h2(i, seed + 19) * 6);
    for (let k = 0; k < len; k++) R.set(x + (k > 2 && h2(k, seed) < .3 ? 1 : 0), bottoms[x] + 1 + k, TD);
  }
  return R.canvas();
}
function glowSprite(rad, color, strength) {
  const N = rad * 2 + 2, R = new Ras(N, N), c = pk(color);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const d = Math.hypot(x + .5 - N / 2, y + .5 - N / 2);
    if (d < rad && strength * Math.pow(1 - d / rad, 1.3) > bayer(x, y)) R.d[y * N + x] = c;
  }
  return R.canvas();
}
// Light rising from the open chest: a dithered beam that widens and thins toward the top
function beamSprite(shift) {
  const w = 56, h = 84, R = new Ras(w, h), c = pk(P.goldlit);
  for (let y = 0; y < h; y++) {
    const up = h - 1 - y, hw = 9 + up * .2;
    for (let x = 0; x < w; x++) {
      const dx = Math.abs(x + .5 - w / 2);
      if (dx < hw && .62 * (1 - up / h) * (1 - dx / hw * .6) > bayer(x + shift, y + shift * 2)) R.d[y * w + x] = c;
    }
  }
  return R.canvas();
}

/* ==== SECTION: Art — assembled background ==== */
const art = {};
const FOREST_DEFS = [   // palette name, seed, layer height, tree heights, spacing, treeline y at ground level, parallax
  ['f1', 11, 250, 26, 44, 9, 150, .12], ['f2', 21, 250, 30, 52, 10, 166, .16], ['f3', 31, 240, 36, 62, 12, 180, .22],
  ['f4', 47, 230, 44, 76, 14, 190, .3], ['f5', 63, 220, 56, 92, 17, 196, .42], ['f6', 71, 210, 70, 112, 21, 198, .58]
];
function buildArt() {
  art.sky = g.createPattern(buildSky(), 'repeat');
  art.sun = buildSun();
  art.moon = buildMoon();
  art.mfar = mountainLayer(3, [[-46, 150, 220, 240], [72, 172, 230, 240], [262, 220, 300, 300], [404, 152, 200, 210], [530, 198, 280, 260]],
    { lit: P.mfarlit, base: P.mfar, shade: P.mfarshade, mist: P.mist }, 165, 300);
  art.mnear = mountainLayer(8, [[-60, 118, 200, 220], [150, 92, 170, 180], [330, 140, 230, 240], [466, 100, 170, 180], [566, 128, 220, 200]],
    { lit: P.mnearlit, base: P.mnear, shade: P.mnearshade, mist: mix(P.mist, P.mnear, .35) }, 999, 220);
  art.forest = FOREST_DEFS.map((d) => ({ c: forestLayer(d[1], d[2], d[3], d[4], d[5], P[d[0]], P[d[0] + 'lit']), y: d[6], p: d[7] }));
  art.fg = buildForeground();
  art.things = buildSkyThings();
  art.lamp = [glowSprite(15, P.lampglow, .6), glowSprite(17, P.lampglow, .5)];
  art.beam = [beamSprite(0), beamSprite(1)];
}

/* ==== SECTION: World (platform layout) ==== */
// Measures a full, held jump with the live physics: its height, and how far the hero travels sideways
// from a standing start before coming back down to a given height.
function jumpProfile() {
  const h = { vx: 0, vy: CONFIG.JUMP, onGround: false }, dt = CONFIG.STEP, pts = []; let x = 0, y = 0, apex = 0;
  for (let i = 0; i < 600 && y > -400; i++) {
    runX(h, 1, CONFIG.RUN, dt); fallY(h, true, dt); x += h.vx * dt; y += h.vy * dt;
    apex = Math.max(apex, y); pts.push([x, y, h.vy]);
  }
  return { apex: apex, reach: (dy) => { for (const q of pts) if (q[2] < 0 && q[1] <= dy) return q[0]; return pts[pts.length - 1][0]; } };
}

let plats = [], ledges = [], summit = null, groundPlat = null, worldSeed = 0;
function buildWorld(seed) {
  const r = rng(seed), J = jumpProfile(), D = CONFIG.DIFF, list = [];
  const diff = (y) => clamp((y - GROUND) / (TOPY - GROUND), 0, 1);
  const even = (v) => Math.round(v / 2) * 2;
  groundPlat = { x: W / 2, y: GROUND, w: W, kind: 'ground', band: 0 };
  let prev = groundPlat, dir = r() < .5 ? -1 : 1;

  function place(y, w, kind) {
    const t = diff(y), minX = EDGE - 4 + w / 2, maxX = W - EDGE + 4 - w / 2; let x;
    if (prev === groundPlat) x = W / 2 + dir * (70 + r() * 50);   // the ground reaches everywhere, so any spot works
    else {
      // Edge-to-edge gap, as a share of the farthest standing-start jump to this height (6 px kept in reserve)
      const share = lerp(D.GAP_MIN[0], D.GAP_MIN[1], t) + r() * (lerp(D.GAP_MAX[0], D.GAP_MAX[1], t) - lerp(D.GAP_MIN[0], D.GAP_MIN[1], t));
      const gap = share * J.reach(y - prev.y) - 6;
      const at = () => prev.x + dir * (prev.w / 2 + gap + w / 2);
      if (r() < lerp(D.TURN[0], D.TURN[1], t)) dir = -dir;
      x = at();
      if (x < minX || x > maxX) { dir = -dir; x = at(); }
      if (x < minX || x > maxX) { dir = prev.x < W / 2 ? 1 : -1; x = clamp(at(), minX, maxX); }   // no room: shorten the gap
    }
    const p = { x: Math.round(x), y: y, w: w, kind: kind, band: Math.min(NQ - 1, Math.floor((y - GROUND) / PPF / BAND_FT)) };
    list.push(p); prev = p; return p;
  }

  ledges = [];
  const ledgeY = (k) => (k === 0 ? GROUND + 72 : GROUND + k * BAND_FT * PPF);
  const cap = J.apex * D.RISE_CAP, endMin = Math.ceil(J.apex * .56);  // two "end" rises together are more than one jump
  for (let k = 0; k < NQ; k++) {
    const y0 = ledgeY(k), y1 = k === NQ - 1 ? TOPY : ledgeY(k + 1), total = y1 - y0;
    ledges.push(place(y0, even(lerp(D.LEDGE[0], D.LEDGE[1], diff(y0))), 'ledge'));
    const n = Math.max(2, Math.round(total / lerp(D.RISE[0], D.RISE[1], diff((y0 + y1) / 2))));
    // Start with equal rises, then trade height between random pairs so the band's total stays exact.
    // The first and last rise stay tall enough that a lantern ledge can't be jumped past.
    const rise = new Array(n).fill(total / n), min = (i) => (i === 0 || i === n - 1 ? endMin : 52);
    for (let i = 0; i < n * 4; i++) {
      const a = Math.floor(r() * n), b = Math.floor(r() * n), d = r() * .2 * total / n;
      if (a !== b && rise[a] + d <= cap && rise[b] - d >= min(b)) { rise[a] += d; rise[b] -= d; }
    }
    let y = y0;
    for (let i = 0; i < n - 1; i++) {
      y += rise[i];
      const t = diff(y);
      place(Math.round(y), Math.max(36, even(lerp(D.WIDTH[0], D.WIDTH[1], t) + (r() - .5) * 14)), 'step');
    }
  }
  summit = place(TOPY, 176, 'summit');
  list.forEach((p, i) => { p.spr = platSprite(p, seed % 1000 + i * 7); });
  plats = list; worldSeed = seed;
}

/* ==== SECTION: Input ==== */
const Input = {
  state: { left: 0, right: 0, jumpHeld: 0, jumpPressed: 0, walk: 0 }, keys: {}, touch: {},
  clear() { this.keys = {}; this.touch = {}; const s = this.state; s.left = s.right = s.jumpHeld = s.jumpPressed = s.walk = 0; }
};
const KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ' ': 'jump', ArrowUp: 'jump', w: 'jump', W: 'jump', Shift: 'walk' };
function sync() {
  const k = Input.keys, t = Input.touch, s = Input.state;
  s.left = k.left || t.left ? 1 : 0; s.right = k.right || t.right ? 1 : 0;
  const j = k.jump || t.jump ? 1 : 0; if (j && !s.jumpHeld) s.jumpPressed = 1; s.jumpHeld = j; s.walk = k.walk ? 1 : 0;
}

/* ==== SECTION: Physics ==== */
const hero = { x: W / 2, y: GROUND, vx: 0, vy: 0, onGround: true, plat: null, face: 1, coyote: 0, buffer: 0, cut: false,
  lock: 0, landT: 0, animT: 0, anim: 'idle', takeoff: GROUND, peak: GROUND, measured: 0 };

function runX(h, dir, cap, dt) {
  const C = CONFIG;
  if (dir) {
    let a = h.onGround ? C.ACC_G : C.ACC_A; if (dir * h.vx < 0) a *= C.TURN;
    const v0 = Math.abs(h.vx); h.vx += dir * a * dt;
    // Over the cap (switching from run to walk): ease down instead of snapping
    const lim = v0 > cap ? Math.max(cap, v0 - (h.onGround ? C.FRIC_G : C.DRAG_A) * dt) : cap;
    h.vx = clamp(h.vx, -lim, lim);
  } else {
    const d = (h.onGround ? C.FRIC_G : C.DRAG_A) * dt;
    h.vx = Math.abs(h.vx) <= d ? 0 : h.vx - Math.sign(h.vx) * d;
  }
}
function fallY(h, held, dt) {
  const C = CONFIG; let a = h.vy > 0 ? C.G_UP : C.G_DOWN;
  if (held && Math.abs(h.vy) < C.APEX_V) a *= C.APEX_G;
  h.vy = Math.max(-C.MAXFALL, h.vy - a * dt);
}
const overlaps = (p, x) => Math.abs(x - p.x) < p.w / 2 + CONFIG.BOXW / 2;

function step(dt) {
  const C = CONFIG, s = Input.state, h = hero;
  let dir = s.right - s.left, held = s.jumpHeld;
  if (h.lock > 0) { h.lock -= dt; dir = 0; held = 0; s.jumpPressed = 0; }
  if (dir) h.face = dir;
  runX(h, dir, s.walk ? C.WALK : C.RUN, dt);
  if (s.jumpPressed) { h.buffer = C.BUFFER; s.jumpPressed = 0; } else h.buffer = Math.max(0, h.buffer - dt);
  h.coyote = h.onGround ? C.COYOTE : Math.max(0, h.coyote - dt);
  if (h.buffer > 0 && h.coyote > 0) {
    h.vy = C.JUMP; h.buffer = h.coyote = 0; h.onGround = false; h.cut = false; h.takeoff = h.peak = h.y;
    puff(h.x, h.y, 3, 'dust', 60, 30);
  }
  if (!held && h.vy > 0 && !h.cut) { h.vy *= C.CUT; h.cut = true; }
  fallY(h, held, dt);
  // The left and right edges are walls
  const nx = h.x + h.vx * dt; h.x = clamp(nx, EDGE, W - EDGE); if (h.x !== nx) h.vx = 0;
  const prevY = h.y; h.y += h.vy * dt; if (h.y > h.peak) h.peak = h.y;
  const was = h.onGround; h.onGround = false;
  if (h.vy <= 0) {
    let on = null;
    if (h.y <= GROUND) { h.y = GROUND; on = groundPlat; }
    else for (const p of plats) { if (prevY >= p.y && h.y <= p.y && overlaps(p, h.x)) { h.y = p.y; on = p; break; } }
    if (on) {
      h.onGround = true; h.plat = on;
      if (!was) {
        const impact = -h.vy; h.measured = h.peak - h.takeoff;
        if (impact > 420) { h.landT = .15; puff(h.x, h.y, 5, 'dust', 110, 40); }
        landed(on);
      }
      h.vy = 0;
    }
  }
}

/* ==== SECTION: Hero sprite and animation (sheet unchanged) ==== */
const CW = 33, CH = 41, AX = 20, AY = 41;                         // cell size and anchor (face column, bottom of feet)
const ANIM = { idle: { f: [0], fps: 1 }, walk: { f: [0, 1, 2, 3], fps: 7 }, run: { f: [4, 5, 6, 7], fps: 12 },
  jump: { f: [8] }, fall: { f: [9] }, land: { f: [10, 11], fps: 14 } };
const img = new Image();
let rimSheet = null;
function animate(dt) {
  const h = hero; let a;
  if (!h.onGround) a = h.vy > 60 ? 'jump' : 'fall';
  else if (h.landT > 0 && Math.abs(h.vx) < 120) { h.landT -= dt; a = 'land'; }
  else if (Math.abs(h.vx) > 5) { h.landT = 0; a = Math.abs(h.vx) > CONFIG.WALK + 10 ? 'run' : 'walk'; }
  else { h.landT = 0; a = 'idle'; }
  if (a !== h.anim) { h.anim = a; h.animT = 0; }
  h.animT += dt * (a === 'run' ? Math.max(.5, Math.abs(h.vx) / CONFIG.RUN) : 1);   // run cadence follows speed
}
function frameOf(name, t) {
  const A = ANIM[name]; if (A.f.length === 1) return A.f[0];
  const i = Math.floor(t * A.fps); return name === 'land' ? A.f[Math.min(i, A.f.length - 1)] : A.f[i % A.f.length];
}
function drawSprite(f, x, y, face, src) {
  g.save(); g.translate(x, y); g.scale(face, 1);
  g.drawImage(src || img, (f % 4) * CW, Math.floor(f / 4) * CH, CW, CH, -AX, -AY, CW, CH); g.restore();
}
// Moonlit rim: a light-tinted copy of the sheet, drawn 1 px out in four directions behind the hero at night
function buildRim() {
  rimSheet = document.createElement('canvas'); rimSheet.width = img.width; rimSheet.height = img.height;
  const x = rimSheet.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in';
  x.fillStyle = S.rim; x.fillRect(0, 0, img.width, img.height);
}

/* ==== SECTION: Effects ==== */
const fx = [];
function puff(x, y, n, col, spread, up) {
  if (reduce) return;
  for (let i = 0; i < n; i++) fx.push({ x: x, y: y, vx: (Math.random() - .5) * spread, vy: up * (.4 + Math.random() * .8),
    life: .25 + Math.random() * .35, grav: col === 'dust' ? 260 : 120, c: col, s: Math.random() < .4 ? 2 : 1 });
}
function tickFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const p = fx[i]; p.life -= dt; if (p.life <= 0) { fx.splice(i, 1); continue; }
    p.vy -= p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
}
const flyRng = rng(41);
const fireflies = Array.from({ length: 18 }, () => ({ x: flyRng() * W, y: GROUND + 14 + flyRng() * 560, ph: flyRng() * 6.28, sp: .4 + flyRng() * .6 }));

/* ==== SECTION: Camera ==== */
// The camera holds still while the hero's feet stay inside a band of the screen: it rises when they pass
// CAM_HIGH (standing or mid-jump) and moves down only to keep them out of the CAM_LOW buffer zone.
const CAM_LOW = 64;                                               // buffer zone: the view moves down only to keep the feet this far above the bottom edge
const CAM_HIGH = Math.round(.36 * H) + 14;                        // the view rises until the feet are no more than this far above the bottom edge
let camY = 0;                                                     // world y at the bottom of the screen
function updateCam(dt, snap) {
  if (snap) camY = clamp(hero.y - .36 * H, 0, CAM_MAX);
  else {
    const up = Math.min(hero.y - CAM_HIGH, CAM_MAX - 14);        // (the cap keeps the summit framed the same during a jump there)
    if (up > camY) camY += (up - camY) * Math.min(1, 7 * dt);
  }
  camY = clamp(Math.max(Math.min(camY, hero.y - CAM_LOW), hero.y - H + 64), 0, CAM_MAX + 40);   // keep the feet out of the buffer zone and the head on screen
}

/* ==== SECTION: Game state ==== */
// lamps[b]: lantern lit on band b's ledge (the hero's checkpoints). lamps[9] is the last camp at 450 ft.
const game = { lamps: new Array(NQ).fill(false), pending: null, time: 0, won: false, win: null };
function checkpoint() { for (let b = NQ - 1; b >= 0; b--) if (game.lamps[b]) return ledges[b]; return null; }
function putHero(p) {
  hero.x = p ? p.x : W / 2; hero.y = p ? p.y : GROUND; hero.vx = hero.vy = 0; hero.onGround = true; hero.plat = p || groundPlat;
  hero.lock = 0; hero.buffer = 0; hero.peak = hero.takeoff = hero.y; game.pending = null; updateCam(0, true);
}
function warp() {
  if (anyDialogOpen() || game.pending) return;
  const p = checkpoint();
  puff(hero.x, hero.y + 16, 8, 'lampcore', 90, 60);
  putHero(p); puff(hero.x, hero.y + 16, 10, 'lampcore', 120, 80);
  say(p ? 'Back at the lantern at ' + ftOf(p) + ' feet.' : 'Back on the forest floor.');
}
function lightLamp(b) {
  if (game.lamps[b]) return;
  game.lamps[b] = true;
  const p = ledges[b]; puff(lampX(p), p.y + 18, 12, 'lampglow', 110, 70);
}
const ftOf = (p) => Math.round((p.y - GROUND) / PPF);
const lampX = (p) => Math.round(p.x - p.w / 2 + 10);

// Called once when the hero touches down on a platform
function landed(p) {
  if (p === groundPlat) return;
  if (p === summit) {
    if (quizOn() && !quiz.results[NQ - 1]) askSoon(NQ - 1, p); else if (!game.won) startVictory();
    return;
  }
  const b = p.band;
  if (b === NQ - 1) { lightLamp(b); return; }                     // 450–500 ft: last camp, question waits at the summit
  if (quizOn() && !quiz.results[b]) askSoon(b, p); else lightLamp(b);
}
function askSoon(b, p) { game.pending = { b: b, p: p, t: .3 }; hero.lock = 1; }
function startVictory() {
  game.won = true;
  game.win = { t: 0, open: false, shown: false, stars: quiz.results.filter((it) => it && isRight(it)).length };
  $('resultsBtn').hidden = false;
}
function tickGame(dt) {
  game.time += dt;
  const q = game.pending;
  if (q) {
    q.t -= dt;
    if (q.t <= 0) { game.pending = null; if (hero.onGround && hero.plat === q.p) openQuestion(q.b); else hero.lock = 0; }
  }
}
function tickWin(dt) {
  const w = game.win; if (!w) return;
  w.t += dt;
  if (!w.open && w.t > .7) { w.open = true; puff(summit.x, summit.y + 14, 26, 'goldlit', 190, 150); say('The chest opens.'); }
  if (w.open && !reduce && Math.random() < dt * 9) puff(summit.x + (Math.random() - .5) * 26, summit.y + 12, 1, 'goldlit', 20, 70);
  if (!w.shown && w.t > 2.6 && !anyDialogOpen()) { w.shown = true; showWin(); }
}
function newClimb() {
  const s = Number(params.get('seed'));
  buildWorld(params.has('seed') && Number.isFinite(s) ? s : Math.floor(Math.random() * 1e6));
  game.lamps.fill(false); game.pending = null; game.time = 0; game.won = false; game.win = null;
  quiz.results = new Array(NQ).fill(null); quiz.deck = new Array(NQ).fill(null); dealDeck();
  fx.length = 0; putHero(null); hero.face = 1; $('resultsBtn').hidden = true; shownHud = '';
}

/* ==== SECTION: Questions ==== */
const BANK = (window.APPSYCH_QUESTIONS || []).filter((q) => q.status !== "omitted"), TOPICS = window.APPSYCH_TOPICS, PICKER = window.APPSYCH_TOPIC_PICKER;
const LETTERS = ['A', 'B', 'C', 'D'];
const quiz = { deck: new Array(NQ).fill(null), results: new Array(NQ).fill(null), cur: -1, openedAt: 0 };
let picker = null;
const quizOn = () => BANK.length > 0 && !(DEV && $('devNoQ').checked);
const isRight = (it) => it.pick === it.q.answer;
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// item = { q, order, pick, hintUsed, seen }
//   order: original choice indexes in display order; pick: original index of the answer
//   seen: choices whose feedback is open (after answering)
function makeItem(q) {
  const order = [0, 1, 2, 3];
  return { q: q, order: q.shuffle === false ? order : shuffle(order), pick: null, hintUsed: false, seen: new Set() };
}
// Deals a question to every band that hasn't been answered yet, from the chosen topics.
// Questions repeat only when the topics have fewer questions than the climb needs.
function dealDeck() {
  if (!BANK.length) return;
  const pool = picker ? picker.pool() : BANK, used = new Set(quiz.results.filter(Boolean).map((it) => it.q.id));
  let fresh = shuffle(pool.filter((q) => !used.has(q.id))), repeats = false;
  for (let b = 0; b < NQ; b++) {
    if (quiz.results[b]) continue;
    if (!fresh.length) { fresh = shuffle(pool.length ? pool : BANK); repeats = true; }
    quiz.deck[b] = makeItem(fresh.pop());
  }
  setNote(repeats ? 'These topics have only ' + pool.length + (pool.length === 1 ? ' question' : ' questions') + ', so some will repeat on the climb.' : '');
}
function setNote(text, warn) { const n = $('note'); n.textContent = text; n.classList.toggle('warn', !!warn); }

const qDialog = $('qDialog'), winDialog = $('winDialog');
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
function say(msg) { const live = $('live'); live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); }
function showDlg(d) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
function closeDlg(d) { if (typeof d.close === 'function') d.close(); else { d.removeAttribute('open'); d.dispatchEvent(new Event('close')); } }
const anyDialogOpen = () => !!document.querySelector('dialog[open]');

function openQuestion(b) {
  quiz.cur = b; quiz.openedAt = performance.now();
  Input.clear(); renderQuestion(); showDlg(qDialog);
  qDialog.querySelector('.sc-dlg-body').scrollTop = 0;
  $('qTitle').focus({ preventScroll: true });
}
function renderQuestion() {
  const it = quiz.deck[quiz.cur], q = it.q, answered = it.pick != null, last = quiz.cur === NQ - 1;
  $('qTitle').textContent = 'Question ' + (quiz.cur + 1) + ' of ' + NQ;
  $('qWhere').textContent = last ? 'Summit · ' + TOP_FT + ' ft' : 'Lantern ledge · ' + ftOf(ledges[quiz.cur]) + ' ft';
  $('stem').textContent = q.stem;
  if (window.APPSYCH_FIGURES) APPSYCH_FIGURES.mount($('qFigure'), q.figure);
  const list = $('choices'); list.innerHTML = '';
  it.order.forEach((orig, pos) => {
    const li = el('li'), c = el('button', 'choice'), isAns = orig === q.answer, isPick = orig === it.pick;
    c.type = 'button'; c.setAttribute('data-orig', orig);
    const letter = el('span', 'letter', LETTERS[pos]); letter.setAttribute('aria-hidden', 'true'); c.appendChild(letter);
    const body = el('span', 'cbody');
    body.appendChild(el('span', 'sr-only', 'Choice ' + LETTERS[pos] + ': '));
    body.appendChild(el('span', 'ctext', q.choices[orig]));
    if (answered && (isAns || isPick)) {
      const tag = el('span', 'tag'), icon = el('span', 'icon', isAns ? '✓' : '✗');
      icon.setAttribute('aria-hidden', 'true'); tag.appendChild(icon);
      tag.appendChild(document.createTextNode(isAns ? (isPick ? 'Your answer: correct' : 'Correct answer') : 'Your answer: incorrect'));
      body.appendChild(tag); c.classList.add(isAns ? 'is-answer' : 'is-wrong');
    }
    c.appendChild(body); li.appendChild(c);
    const open = answered && it.seen.has(orig);
    if (answered) c.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { const fb = el('p', 'fb ' + (isAns ? 'good' : 'bad'), q.feedback[orig]); fb.id = 'fb-' + pos; c.setAttribute('aria-controls', fb.id); li.appendChild(fb); }
    list.appendChild(li);
  });
  const hintBox = $('hintBox'); hintBox.hidden = !(it.hintUsed && !answered); hintBox.textContent = 'Hint: ' + q.hint;
  const ex = $('explain'); ex.hidden = !answered; ex.innerHTML = '';
  if (answered) { const p = el('p'); p.appendChild(el('strong', null, 'Explanation: ')); p.appendChild(document.createTextNode(q.explanation)); ex.appendChild(p); }
  // "What's this?" definitions, only once the answer is shown
  if (window.APPSYCH_TERM_HELP) APPSYCH_TERM_HELP.mount($('termHelp'), q, answered ? it.order.map((orig, pos) => ({ letter: LETTERS[pos], orig: orig })) : null);
  const hint = $('hintBtn'); hint.hidden = answered; hint.disabled = it.hintUsed;
  hint.setAttribute('aria-expanded', it.hintUsed ? 'true' : 'false'); hint.textContent = it.hintUsed ? 'Hint shown' : 'Show hint';
  const cont = $('contBtn'); cont.disabled = !answered; cont.textContent = last ? 'Open the chest' : 'Keep climbing';
  $('qTip').textContent = answered ? 'Select the other choices to read their feedback.' : 'Pick an answer with a click or tap, or press 1–4.';
}
function choose(orig) {
  const it = quiz.deck[quiz.cur];
  if (it.pick == null) {                                         // the first pick is final
    it.pick = orig; it.seen.add(orig); it.seen.add(it.q.answer); quiz.results[quiz.cur] = it;
    renderQuestion(); shownHud = '';
    say(isRight(it) ? 'Correct. ' + it.q.feedback[orig]
      : 'Incorrect. The correct answer is ' + LETTERS[it.order.indexOf(it.q.answer)] + '. ' + it.q.feedback[orig]);
    $('contBtn').focus({ preventScroll: true });
  } else {                                                       // afterwards, choices open and close their feedback
    if (it.seen.has(orig) && orig !== it.pick) it.seen.delete(orig); else it.seen.add(orig);
    renderQuestion();
    if (it.seen.has(orig)) say(it.q.feedback[orig]);
    const again = $('choices').querySelector('[data-orig="' + orig + '"]'); if (again) again.focus({ preventScroll: true });
  }
}
$('choices').addEventListener('click', (e) => { const b = e.target.closest('button.choice'); if (b) choose(Number(b.getAttribute('data-orig'))); });
$('hintBtn').addEventListener('click', () => {
  const it = quiz.deck[quiz.cur]; it.hintUsed = true; renderQuestion(); say('Hint: ' + it.q.hint);
  const first = $('choices').querySelector('button.choice'); if (first) first.focus({ preventScroll: true });
});
$('contBtn').addEventListener('click', () => closeDlg(qDialog));
// Esc can't skip a question; once it's answered, Esc works like "Keep climbing"
qDialog.addEventListener('cancel', (e) => { const it = quiz.deck[quiz.cur]; if (!it || it.pick == null) e.preventDefault(); });
qDialog.addEventListener('close', () => {
  const b = quiz.cur, it = quiz.deck[b]; quiz.cur = -1; hero.lock = 0; Input.clear();
  if (it && it.pick != null) { if (b === NQ - 1) startVictory(); else lightLamp(b); }
  view.focus({ preventScroll: true });
});
// Number keys answer. Letters are left out on purpose: A and D also steer the hero.
document.addEventListener('keydown', (e) => {
  if (!qDialog.open || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
  const pos = '1234'.indexOf(e.key);
  if (pos < 0 || performance.now() - quiz.openedAt < 350) return;
  const b = $('choices').querySelectorAll('button.choice')[pos];
  if (b) { e.preventDefault(); b.click(); }
});

/* ==== SECTION: Summit results ==== */
function fmtTime(s) { const r = Math.round(s); return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0'); }
function showWin() {
  const items = quiz.results.filter(Boolean), right = items.filter(isRight).length, hints = items.filter((it) => it.hintUsed).length;
  $('winText').textContent = !items.length ? 'You climbed all ' + TOP_FT + ' feet and opened the chest.'
    : right === items.length ? 'A perfect climb: the chest held a star for every question.'
    : 'The chest held ' + right + (right === 1 ? ' star' : ' stars') + ', one for each question you answered correctly.';
  const stats = $('winStats'); stats.innerHTML = '';
  [['Correct', right + ' / ' + items.length], ['Climb time', fmtTime(game.time)], ['Hints used', String(hints)]].forEach((t) => {
    const d = el('div', 'stat'); d.appendChild(el('span', null, t[0])); d.appendChild(el('strong', null, t[1])); stats.appendChild(d);
  });
  const list = $('winList'); list.innerHTML = '';
  quiz.results.forEach((it, i) => {
    if (!it) return;
    const li = el('li'), d = el('details'), s = el('summary'), ok = isRight(it);
    s.appendChild(el('span', 'res-n', String(i + 1)));
    s.appendChild(el('span', 'res-stem', it.q.stem));
    const badge = el('span', 'badge ' + (ok ? 'correct' : 'wrong')), icon = el('span', null, ok ? '✓' : '✗');
    icon.setAttribute('aria-hidden', 'true'); badge.appendChild(icon); badge.appendChild(document.createTextNode(ok ? 'Correct' : 'Incorrect'));
    s.appendChild(badge); d.appendChild(s);
    const more = el('div', 'res-more');
    const line = (label, text) => { const p = el('p'); p.appendChild(el('strong', null, label)); p.appendChild(document.createTextNode(text)); more.appendChild(p); };
    if (!ok) line('Your answer: ', it.q.choices[it.pick]);
    line('Correct answer: ', it.q.choices[it.q.answer]);
    line('Explanation: ', it.q.explanation);
    d.appendChild(more); li.appendChild(d); list.appendChild(li);
  });
  Input.clear(); showDlg(winDialog);
  winDialog.querySelector('.sc-dlg-body').scrollTop = 0;
  $('winH').focus({ preventScroll: true });
  say('You reached the summit. ' + right + ' of ' + items.length + ' correct.');
}
$('stayBtn').addEventListener('click', () => closeDlg(winDialog));
$('againBtn').addEventListener('click', () => { closeDlg(winDialog); newClimb(); });
winDialog.addEventListener('click', (e) => { if (e.target === winDialog) closeDlg(winDialog); });
winDialog.addEventListener('close', () => { Input.clear(); view.focus({ preventScroll: true }); });
$('resultsBtn').addEventListener('click', () => { if (game.won && !anyDialogOpen()) showWin(); });

/* ==== SECTION: Render ==== */
const cv = $('cv'), out = cv.getContext('2d'), view = $('view');
const buf = document.createElement('canvas'); buf.width = W; buf.height = H;
const g = buf.getContext('2d'); g.imageSmoothingEnabled = false;
// The scene is drawn at 512x320, then copied to the visible canvas at a whole-number scale so every
// world pixel is the same size on screen. The browser smooths the small remaining resize.
function fit() {
  const k = clamp(Math.ceil(view.clientWidth * (window.devicePixelRatio || 1) / W), 1, 6);
  if (cv.width !== W * k) { cv.width = W * k; cv.height = H * k; }
  out.imageSmoothingEnabled = false;
}
window.addEventListener('resize', fit);
const px = (c, x, y, w, h) => { g.fillStyle = S[c]; g.fillRect(x, y, w, h); };

function drawStars(cam, t) {
  const off = Math.floor(cam * .04);
  for (const s of stars) {
    const y = (s.y + off) % (H + 8) - 4;
    if (sstep(270, 470, skyFt(cam, y)) <= s.th) continue;  // stars come out one by one with altitude
    const tw = reduce ? 0 : Math.sin(t * s.sp + s.ph);
    if (s.k === 0) { if (tw > -.82) px(s.c, s.x, y, 1, 1); }
    else if (s.k === 1) { px(s.c, s.x, y, 2, 2); if (tw > .55) { px(s.c, s.x - 1, y, 4, 1); px(s.c, s.x, y - 1, 1, 4); } }
    else { const a = tw > .3 ? 3 : 2; px(s.c, s.x - a, y, a * 2 + 1, 1); px(s.c, s.x, y - a, 1, a * 2 + 1); px('suncore', s.x - 1, y - 1, 3, 3); }
  }
}
function layer(c, y0, p, cam) { const y = Math.round(y0 + cam * p); if (y < H) g.drawImage(c, 0, y); }

function drawLantern(x, wy, lit, t) {
  const y = H - (wy - Math.round(camY));
  if (lit) { const gl = art.lamp[reduce ? 0 : Math.floor(t * 5) % 2]; g.drawImage(gl, x + 1 - gl.width / 2, y - 17 - gl.height / 2); }
  px('lampmetal', x, y - 12, 2, 12); px('lampmetal', x - 1, y - 1, 4, 1);
  px('lampmetal', x - 2, y - 21, 6, 9); px('lampmetal', x - 1, y - 23, 4, 2); px('lampmetal', x, y - 24, 2, 1);
  px(lit ? 'lampglow' : 'lampoff', x - 1, y - 20, 4, 7);
  if (lit) px('lampcore', x, y - 19, 2, 5); else px('lampmetal', x, y - 17, 2, 1);
}
function drawStar(x, y) { px('gold', x - 3, y, 7, 1); px('gold', x, y - 3, 1, 7); px('gold', x - 1, y - 1, 3, 3); px('goldlit', x, y - 1, 1, 3); px('goldlit', x - 1, y, 3, 1); }
function drawChest(p, t) {
  const x = p.x, y = H - (p.y - Math.round(camY)), w = game.win, open = w && w.open;
  const shake = w && !w.open && !reduce ? Math.round(Math.sin(w.t * 60) * Math.min(1.5, w.t * 3)) : 0, cx = x + shake;
  if (open) { const b = art.beam[reduce ? 0 : Math.floor(t * 6) % 2]; g.drawImage(b, x - b.width / 2, y - 14 - b.height); }
  px('wooddark', cx - 14, y - 11, 28, 11);                        // body
  px('wood', cx - 13, y - 10, 26, 9); px('woodlit', cx - 13, y - 10, 26, 1); px('wooddark', cx - 13, y - 2, 26, 1);
  px('gold', cx - 10, y - 10, 3, 9); px('gold', cx + 7, y - 10, 3, 9); px('goldlit', cx - 10, y - 10, 1, 9); px('goldlit', cx + 7, y - 10, 1, 9);
  if (open) {
    px('wooddark', cx - 14, y - 26, 28, 9); px('wood', cx - 13, y - 25, 26, 7);            // lid thrown back
    px('golddark', cx - 10, y - 25, 3, 7); px('golddark', cx + 7, y - 25, 3, 7); px('gold', cx - 14, y - 26, 28, 1);
    px('golddark', cx - 12, y - 16, 24, 6); px('gold', cx - 11, y - 17, 22, 4); px('gold', cx - 8, y - 19, 15, 2);   // treasure
    px('goldlit', cx - 9, y - 17, 3, 1); px('goldlit', cx - 2, y - 19, 4, 1); px('goldlit', cx + 5, y - 16, 3, 1); px('suncore', cx, y - 18, 1, 1);
    // One star for each correct answer rises out and hovers in an arc
    for (let j = 0; j < w.stars; j++) {
      const u = clamp((w.t - .8 - j * .09) / .7, 0, 1), e = 1 - Math.pow(1 - u, 3), a = Math.PI * (j + .5) / w.stars;
      if (u <= 0) continue;
      const bob = reduce ? 0 : Math.sin(t * 2.6 + j) * 1.5;
      drawStar(Math.round(x - Math.cos(a) * 52 * e), Math.round(y - 22 - (18 + Math.sin(a) * 34) * e + bob));
    }
  } else {
    px('wooddark', cx - 14, y - 18, 28, 8); px('wood', cx - 13, y - 17, 26, 6); px('woodlit', cx - 13, y - 17, 26, 1);   // lid
    px('gold', cx - 10, y - 17, 3, 6); px('gold', cx + 7, y - 17, 3, 6); px('goldlit', cx - 10, y - 17, 1, 6); px('goldlit', cx + 7, y - 17, 1, 6);
    px('golddark', cx - 3, y - 13, 6, 6); px('gold', cx - 2, y - 13, 4, 5); px('wooddark', cx - 1, y - 11, 2, 2);         // lock
  }
}

function render(t) {
  const cam = Math.round(camY), camFt = cam / PPF;
  const oy = Math.round(cam * SKY_P) + H - SKY_H; g.save(); g.translate(0, oy); g.fillStyle = art.sky; g.fillRect(0, -oy, W, H); g.restore();
  drawStars(cam, t);
  const moonY = Math.round(34 - (CAM_MAX - cam) * .035); if (moonY > -96) g.drawImage(art.moon, 372, moonY);
  const sunY = Math.round(34 + cam * .07);
  if (sunY < H) {
    g.globalAlpha = .75 - .45 * sstep(60, 190, camFt); g.drawImage(art.sun[1], 42, sunY); g.globalAlpha = 1;
    g.drawImage(art.sun[0], 42, sunY);
  }
  layer(art.mfar, 64, .05, cam); layer(art.mnear, 142, .08, cam);
  for (const o of art.things) {
    const y = Math.round(H * .5 + (camFt - o.ft) * PPF * o.q - o.c.height / 2);
    if (y > H || y < -o.c.height) continue;
    g.drawImage(o.c, Math.round(o.isle ? o.x : (o.x + t * o.s) % (W + o.c.width) - o.c.width), y);
  }
  for (const L of art.forest) layer(L.c, L.y, L.p, cam);
  layer(art.fg, H - FG_H, 1, cam);
  if (cam < 640) for (const f of fireflies) {                     // fireflies among the pines
    const fy = H - (f.y - cam) + Math.round(Math.sin(t * f.sp + f.ph) * 6), fxx = Math.round(f.x + Math.sin(t * f.sp * .7 + f.ph * 2) * 14);
    if (fy < 0 || fy > H || (!reduce && Math.sin(t * 1.7 + f.ph) < -.2)) continue;
    px('firefly', fxx, fy, 1, 1); if (Math.sin(t * 3 + f.ph) > .4) px('firefly', fxx - 1, fy, 3, 1);
  }
  for (const p of plats) {
    const y = H - (p.y - cam); if (y - UP + p.spr.height <= 0 || y > H + 44) continue;   // skip only when wholly off screen (the rock hangs below the surface)
    g.drawImage(p.spr, Math.round(p.x - p.w / 2), y - UP);
    if (p.kind === 'ledge') drawLantern(lampX(p), p.y, game.lamps[p.band], t);
    else if (p === summit) { drawLantern(p.x - 44, p.y, true, t); drawLantern(p.x + 42, p.y, true, t + .1); drawChest(p, t); }
  }
  const hx = Math.round(hero.x), hy = H - (Math.round(hero.y) - cam), f = frameOf(hero.anim, hero.animT);
  const rim = DEV && !$('devRim').checked ? 0 : sstep(230, 330, (hero.y - GROUND) / PPF) * .6;
  if (rim > 0) { g.globalAlpha = rim; for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]]) drawSprite(f, hx + d[0], hy + d[1], hero.face, rimSheet); g.globalAlpha = 1; }
  drawSprite(f, hx, hy, hero.face);
  for (const p of fx) px(p.c, Math.round(p.x), H - (Math.round(p.y) - cam), p.s, p.s);
  if (DEV && $('devBox').checked) { g.strokeStyle = S.hitbox; g.lineWidth = 1; g.strokeRect(hx - CONFIG.BOXW / 2 + .5, hy - CONFIG.BOXH + .5, CONFIG.BOXW - 1, CONFIG.BOXH - 1); }
  out.drawImage(buf, 0, 0, cv.width, cv.height);
}

/* ==== SECTION: UI ==== */
const gate = $('gate'), gateText = $('gateText'), altEl = $('alt'), zoneEl = $('zone'), pips = $('pips');
const ZONES = [[0, 'Forest floor'], [35, 'Golden hour'], [110, 'Sunset'], [210, 'Dusk'], [310, 'Twilight'], [410, 'Starry night']];
for (let i = 0; i < NQ; i++) pips.appendChild(el('li', null, String(i + 1)));
let shownHud = '', ready = false;
function hud() {
  const ft = clamp(Math.round((hero.y - GROUND) / PPF), 0, TOP_FT); let z = ZONES[0][1]; for (const q of ZONES) if (ft >= q[0]) z = q[1];
  const marks = quiz.results.map((it) => (it ? (isRight(it) ? 'c' : 'w') : '-')).join('');
  const s = ft + '|' + z + '|' + marks;
  if (s !== shownHud) {
    shownHud = s; altEl.textContent = ft + ' ft'; zoneEl.textContent = z;
    let done = 0, right = 0;
    quiz.results.forEach((it, i) => {
      const li = pips.children[i]; if (it) { done++; if (isRight(it)) right++; }
      li.className = it ? (isRight(it) ? 'correct' : 'wrong') : ''; li.textContent = it ? (isRight(it) ? '✓' : '✗') : String(i + 1);
    });
    pips.setAttribute('aria-label', 'Questions: ' + (done ? done + ' of ' + NQ + ' answered, ' + right + ' correct' : 'none answered yet'));
  }
  if (DEV) {
    $('devOut').textContent = $('devBox').checked ? 'vx ' + hero.vx.toFixed(0) + '  vy ' + hero.vy.toFixed(0) + '  ground ' + (hero.onGround ? 'yes' : 'no') +
      '  last jump ' + hero.measured.toFixed(0) + ' px  seed ' + worldSeed : 'seed ' + worldSeed;
  }
}

view.addEventListener('keydown', (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = KEYS[e.key];
  if (k) { Input.keys[k] = 1; e.preventDefault(); }
  else if ((e.key === 'r' || e.key === 'R') && !e.repeat) warp();
  else if (e.key === 'Escape') view.blur();
});
view.addEventListener('keyup', (e) => { const k = KEYS[e.key]; if (k) { Input.keys[k] = 0; e.preventDefault(); } });
view.addEventListener('pointerdown', () => view.focus({ preventScroll: true }));
view.addEventListener('blur', () => Input.clear());
window.addEventListener('blur', () => Input.clear());
document.addEventListener('visibilitychange', () => { if (document.hidden) Input.clear(); });
function touchBtn(id, k) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault(); view.focus({ preventScroll: true });       // the scene keeps focus, so the game keeps running
    Input.touch[k] = 1; b.classList.add('on');
    try { b.setPointerCapture(e.pointerId); } catch (err) { /* the pointer is already gone */ }
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, () => { Input.touch[k] = 0; b.classList.remove('on'); }));
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
touchBtn('tl', 'left'); touchBtn('tr', 'right'); touchBtn('tj', 'jump');

$('warpBtn').addEventListener('click', () => { if (ready) warp(); view.focus({ preventScroll: true }); });
// "Start over" asks for a second click, so a stray click can't throw away a climb
const restartBtn = $('restartBtn'); let restartArmed = 0;
function disarmRestart() { clearTimeout(restartArmed); restartArmed = 0; restartBtn.textContent = 'Start over'; }
restartBtn.addEventListener('click', () => {
  if (!ready) return;
  if (!restartArmed) { restartBtn.textContent = 'Click again to start over'; restartArmed = setTimeout(disarmRestart, 4000); return; }
  disarmRestart(); newClimb(); say('New climb started.'); view.focus({ preventScroll: true });
});
restartBtn.addEventListener('blur', disarmRestart);

if (BANK.length && TOPICS && PICKER) {
  picker = PICKER.create({
    items: BANK, noun: ['question', 'questions'], openButton: $('topicsBtn'), summary: $('topicSummary'),
    intro: 'Questions on the climb are drawn from the topics you check. Questions you have already answered stay as they are.',
    onChange: dealDeck
  });
} else {
  $('topicsBtn').disabled = true; $('topicSummary').textContent = BANK.length ? 'All topics' : 'No questions';
  if (!BANK.length) setNote("The question bank didn't load, so this climb has no questions. Check that shared/data/questions.js exists.", true);
}

if (DEV) {
  $('dev').hidden = false;
  [0, 45, 95, 145, 195, 245, 295, 345, 395, 445, 495].forEach((ft) => {
    const b = el('button', 'btn ghost', ft + ' ft'); b.type = 'button';
    b.addEventListener('click', () => { putHero(ft ? plats.find((q) => q.y >= GROUND + ft * PPF) || summit : null); view.focus({ preventScroll: true }); });
    $('devJumps').appendChild(b);
  });
}

/* ==== SECTION: Main loop ==== */
let last = 0, acc = 0;
function frame(now) {
  const t = now / 1000, dt = Math.min(.1, (now - last) / 1000); last = now;
  const busy = anyDialogOpen(), live = !busy && document.activeElement === view;   // the game waits unless the scene has focus
  gate.hidden = live || busy;
  if (live) {
    gateText.textContent = 'Click to keep climbing';
    sync(); acc += dt; let n = 0;
    while (acc >= CONFIG.STEP && n < 14) { step(CONFIG.STEP); acc -= CONFIG.STEP; n++; }
    if (n === 14) acc = 0;
    tickGame(dt); animate(dt); tickWin(dt);
  } else Input.state.jumpPressed = 0;
  updateCam(dt); tickFx(dt); render(t); hud();
  requestAnimationFrame(frame);
}
function start() {
  buildArt(); buildRim(); newClimb(); fit(); ready = true;
  gateText.textContent = 'Click to play';
  last = performance.now(); requestAnimationFrame(frame);
}
img.onload = () => requestAnimationFrame(() => setTimeout(start, 0));
img.onerror = () => { gateText.textContent = 'Could not load assets/hero-sheet.png'; };
img.src = 'assets/hero-sheet.png';
})();
