/* Big Five Reunion
 *
 * Test options (URL):
 *   ?dev   debug tools: the guest gallery (every guest in every pose)
 *
 * Step 2: the room (scene, guests and their activity loops, badges, guest list,
 * stats). The profile dialog is a stub; sliders and scoring come in step 3
 * (see "Big Five Reunion - Plan.md").
 *
 * Character rig (local coordinates: feet at 0,0, y up is negative):
 *   g.guest[data-base=stand|sit|lean][data-pose=idle|wave|shrug|cheer|cross][data-act=...]
 *     ellipse.shadow
 *     g.hop > g.lean
 *       g.legs-stand (g.legL, g.legR) / g.legs-sit (shins, then knee fronts under the hem)
 *       g.seat (--sit) > g.upper (breathing)
 *         torso and outfit, neck extras, head (g.headPose > g.head), g.armL, g.armR
 *   Arms have two segments: g.arm (rotates at the shoulder) > g.fore (rotates at the
 *   elbow). Each arm is drawn in two passes (all outlines, then all fills) so the
 *   elbow stays seamless; both g.fore copies share the same CSS. Poses and room
 *   activities (data-act, from guests.js "activity") live in style.css.
 */
(function () {
  'use strict';

  var DEV = new URLSearchParams(location.search).has('dev');
  var GUESTS = window.APPSYCH_REUNION_GUESTS || [];
  var NS = 'http://www.w3.org/2000/svg';
  var LEVEL = ['', 'VL', 'L', 'M', 'H', 'VH'];
  var TRAITS = [['o', 'O'], ['c', 'C'], ['e', 'E'], ['a', 'A'], ['s', 'ES']];
  var U = 36, F = 36;          // upper arm and forearm lengths
  var HEAD_R = 62;

  /* ---------- SVG helpers ---------- */
  // Art palette names become var(--a-name); url(#...) and "none" pass through.
  function paint(v) {
    if (!v || v === 'none') return 'none';
    if (v.indexOf('url(') === 0) return v;
    return 'var(--a-' + v + ')';
  }
  // f / s = fill / stroke (palette names), sw = stroke width, op = opacity,
  // fo = fill-opacity, st = extra inline style, cls = class
  function el(parent, tag, a) {
    var n = document.createElementNS(NS, tag), style = '';
    a = a || {};
    Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (k === 'f') style += 'fill:' + paint(v) + ';';
      else if (k === 's') style += 'stroke:' + paint(v) + ';';
      else if (k === 'sw') style += 'stroke-width:' + v + ';';
      else if (k === 'op') style += 'opacity:' + v + ';';
      else if (k === 'fo') style += 'fill-opacity:' + v + ';';
      else if (k === 'st') style += v;
      else if (k === 'cls') n.setAttribute('class', v);
      else n.setAttribute(k, v);
    });
    if (style) n.setAttribute('style', style);
    if (parent) parent.appendChild(n);
    return n;
  }
  // Group with an optional transform origin (local px) and extra style
  function grp(parent, cls, origin, style) {
    var st = '';
    if (origin) st += 'transform-origin:' + r(origin[0]) + 'px ' + r(origin[1]) + 'px;';
    if (style) st += style;
    var a = {};
    if (cls) a.cls = cls;
    if (st) a.st = st;
    return el(parent, 'g', a);
  }
  function r(n) { return Math.round(n * 10) / 10; }
  function pt(x, y) { return r(x) + ' ' + r(y); }
  function seg(p, x1, y1, x2, y2, color, w) {
    return el(p, 'line', { x1: r(x1), y1: r(y1), x2: r(x2), y2: r(y2), s: color, sw: w, 'stroke-linecap': 'round' });
  }
  function stroke(p, d, color, w) {
    return el(p, 'path', { d: d, f: 'none', s: color, sw: w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  }
  function has(L, extra) { return (L.extras || []).indexOf(extra) >= 0; }
  // A round shape with a scalloped (curly) edge
  function scallop(cx, cy, R, n, b) {
    var d = '', i, a;
    for (i = 0; i <= n; i++) {
      a = (i / n) * Math.PI * 2 - Math.PI / 2;
      d += (i === 0 ? 'M' : ' A' + b + ' ' + b + ' 0 0 1 ') + pt(cx + R * Math.cos(a), cy + R * Math.sin(a));
    }
    return d + ' Z';
  }

  // An open bumpy (curly) outline along a circle, from angle a0 to a1 (degrees, clockwise).
  // Every other point sits `jitter` further out so the curls look uneven.
  function bumpy(cx, cy, R, a0, a1, n, b, jitter) {
    var d = '', i, a, rr;
    for (i = 0; i <= n; i++) {
      a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      rr = R + (i % 2 ? jitter || 0 : 0);
      d += (i === 0 ? 'M' : ' A' + b + ' ' + b + ' 0 0 1 ') + pt(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
    }
    return d;
  }

  // A jagged (messy) outline along a boxy arc from angle a0 to a1 (degrees, clockwise).
  // Valleys sit on the arc; tufts poke out by amps[i], scaled down toward the sides
  // and leaning toward +x by `lean` so the hair looks swept.
  function jagged(cx, cy, rx, ry, a0, a1, amps, lean) {
    var n = amps.length, d = '', i, a, c, sn, bx, by, k;
    for (i = 0; i <= n * 2; i++) {
      a = (a0 + (a1 - a0) * i / (n * 2)) * Math.PI / 180;
      c = Math.cos(a); sn = Math.sin(a);
      bx = cx + rx * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 0.67);   // squarer than a circle
      by = cy + ry * (sn < 0 ? -1 : 1) * Math.pow(Math.abs(sn), 0.67);
      if (i % 2) {
        k = amps[(i - 1) / 2] * (0.3 + 0.7 * Math.abs(sn));
        bx += c * k + lean * k; by += sn * k;
      }
      d += (i === 0 ? 'M' : ' L') + pt(bx, by);
    }
    return d;
  }

  /* ---------- Shared defs (patterns, head clip), added once per page ---------- */
  function ensureDefs() {
    if (document.getElementById('rb-floral')) return;
    var svg = el(null, 'svg', { 'class': 'rb-defs', 'aria-hidden': 'true', focusable: 'false' });
    var defs = el(svg, 'defs'), p, i;

    p = el(defs, 'pattern', { id: 'rb-floral', patternUnits: 'userSpaceOnUse', width: 32, height: 32 });
    el(p, 'rect', { width: 32, height: 32, f: 'tropic' });
    [[9, 9, 'flower-1'], [24, 23, 'flower-2']].forEach(function (fl) {
      for (i = 0; i < 5; i++) {
        var a = i * 72 * Math.PI / 180;
        el(p, 'circle', { cx: r(fl[0] + 3.6 * Math.cos(a)), cy: r(fl[1] + 3.6 * Math.sin(a)), r: 2.8, f: fl[2] });
      }
      el(p, 'circle', { cx: fl[0], cy: fl[1], r: 1.8, f: 'mustard' });
    });

    p = el(defs, 'pattern', { id: 'rb-argyle', patternUnits: 'userSpaceOnUse', width: 24, height: 32 });
    el(p, 'rect', { width: 24, height: 32, f: 'vest' });
    el(p, 'path', { d: 'M12 1 L23 16 L12 31 L1 16 Z', f: 'vest-dk' });
    el(p, 'path', { d: 'M0 0 L24 32 M24 0 L0 32', f: 'none', s: 'cream', sw: 1, op: .7 });

    p = el(defs, 'pattern', { id: 'rb-stars', patternUnits: 'userSpaceOnUse', width: 18, height: 18 });
    el(p, 'rect', { width: 18, height: 18, f: 'midnight' });
    el(p, 'circle', { cx: 4, cy: 5, r: 1.7, f: 'star' });
    el(p, 'circle', { cx: 13, cy: 13, r: 1.2, f: 'star' });

    p = el(defs, 'pattern', { id: 'rb-stripes', patternUnits: 'userSpaceOnUse', width: 12, height: 12 });
    el(p, 'rect', { width: 12, height: 12, f: 'cream' });
    el(p, 'rect', { width: 12, height: 6, f: 'mustard' });

    p = el(defs, 'clipPath', { id: 'rb-headclip', clipPathUnits: 'userSpaceOnUse' });
    el(p, 'circle', { cx: 0, cy: 0, r: HEAD_R });

    document.body.insertBefore(svg, document.body.firstChild);
  }

  /* ---------- Geometry ---------- */
  function geo(L) {
    var b = L.build || {}, h = b.h || 1, w = b.w || 1;
    var legH = Math.round(92 * h), hipY = -(legH + 14), B = hipY + 18, T = B - 109;
    var tw = 48 * w, bw = 56 * w;
    return {
      w: w, legH: legH, hipY: hipY, B: B, T: T, tw: tw, bw: bw,
      legX: 16 * w,            // leg centers
      sx: tw - 8, sy: T + 21,  // shoulder
      headY: T - 65,           // head center
      sit: legH - 58           // how far the upper body drops when sitting (hem lands on the seat)
    };
  }
  function sideX(G, y) {
    var y1 = G.T + 17, y2 = G.B - 14;
    return G.tw + (G.bw - G.tw) * (y - y1) / (y2 - y1);
  }
  // Torso outline; with y0, only the part below y0
  function torsoD(G, y0) {
    var T = G.T, B = G.B, tw = G.tw, bw = G.bw;
    var bot = ' L' + pt(bw, B - 14) + ' Q' + pt(bw + 1, B) + ' ' + pt(bw - 13, B) +
              ' L' + pt(-bw + 13, B) + ' Q' + pt(-bw - 1, B) + ' ' + pt(-bw, B - 14);
    if (y0 == null) {
      return 'M' + pt(-tw, T + 17) + ' Q' + pt(-tw, T) + ' ' + pt(-tw + 18, T) +
             ' L' + pt(tw - 18, T) + ' Q' + pt(tw, T) + ' ' + pt(tw, T + 17) + bot + ' Z';
    }
    var x = sideX(G, y0);
    return 'M' + pt(-x, y0) + ' L' + pt(x, y0) + bot + ' Z';
  }
  function col(L, c) { return c === 'skin' ? L.skin : c; }

  /* ---------- Legs and shoes ---------- */
  function drawShoe(p, G, bt, side) {
    var boot = bt.shoe === 'boot', hgt = boot ? 30 : 22, wid = boot ? 40 : 43;
    var inner = Math.max(G.legX - 14, 1);
    var x = side < 0 ? -inner - wid : inner;
    el(p, 'rect', { cls: 'o', x: r(x), y: -hgt, width: wid, height: hgt, rx: 11, f: bt.shoeColor });
    if (bt.shoe === 'sneaker') seg(p, x + 9, -5, x + wid - 9, -5, bt.sole || 'white', 4);
  }
  function drawLegs(p, G, L, sit) {
    var bt = L.bottom, top = sit ? -60 : G.hipY, hgt = sit ? 46 : G.legH;
    [-1, 1].forEach(function (side) {
      var lg = side > 0 && !sit ? grp(p, 'legR', [G.legX, G.hipY]) : grp(p, side < 0 ? 'legL' : 'legR-sit');
      el(lg, 'rect', { cls: 'o', x: r(side * G.legX - 12), y: top, width: 24, height: hgt, rx: 12, f: bt.pants });
      if (bt.stripe) seg(lg, side * (G.legX + 6), top + 16, side * (G.legX + 6), -24, 'white', 3);
      drawShoe(lg, G, bt, side);
    });
    if (sit) {
      // Thighs point at the viewer: only the knee fronts show below the hem, shaded for a little depth
      [-1, 1].forEach(function (side) {
        var kx = side * (G.legX + 1) - 16;
        el(p, 'rect', { cls: 'o', x: r(kx), y: -64, width: 32, height: 28, rx: 10, f: bt.pants });
        el(p, 'rect', { x: r(kx + 2.5), y: -49, width: 27, height: 10.5, rx: 8, f: 'ink', op: .18 });
      });
    }
  }

  /* ---------- Torso and outfits ---------- */
  function collar(p, T, color, spread) {
    // Shirt collar points that fold down from the neck
    [-1, 1].forEach(function (s) {
      el(p, 'path', { cls: 'o', sw: 2.5, f: color,
        d: 'M' + pt(s * 2, T + 12) + ' L' + pt(s * spread, T - 2) + ' L' + pt(s * (spread - 4), T + 18) + ' Z' });
    });
  }
  function buttons(p, x, ys, color) {
    ys.forEach(function (y) { el(p, 'circle', { cx: x, cy: r(y), r: 2.8, f: color || 'ink' }); });
  }

  var TOPS = {
    vest: function (p, G, L, c) {               // quarter-zip vest over a shirt
      var T = G.T;
      el(p, 'rect', { cls: 'o', x: -22, y: T - 6, width: 44, height: 14, rx: 7, f: c.main });
      seg(p, 0, T + 8, 0, T + 52, 'ink', 2.5);
      el(p, 'rect', { cls: 'o', x: -3, y: T + 46, width: 6, height: 11, rx: 2, f: 'silver', sw: 2 });
    },
    hawaiian: function (p, G, L, c) {
      var T = G.T, B = G.B;
      el(p, 'path', { cls: 'o', sw: 3, f: L.skin, d: 'M' + pt(-14, T) + ' L' + pt(0, T + 22) + ' L' + pt(14, T) + ' Z' });
      seg(p, 0, T + 22, 0, B - 2, 'ink', 2);
      buttons(p, 4, [T + 40, T + 64, T + 88], 'white');
      [-1, 1].forEach(function (s) {
        el(p, 'path', { cls: 'o', sw: 2.5, f: c.main,
          d: 'M' + pt(s * 13, T) + ' L' + pt(s * 38, T + 4) + ' L' + pt(s * 19, T + 26) + ' Z' });
      });
    },
    scrubs: function (p, G, L, c) {
      var T = G.T;
      el(p, 'path', { cls: 'o', sw: 3, f: L.skin, d: 'M' + pt(-17, T) + ' L' + pt(0, T + 28) + ' L' + pt(17, T) + ' Z' });
      var pw = Math.min(22, G.tw - 20);
      el(p, 'rect', { x: 15, y: r(T + 46), width: r(pw), height: 18, rx: 3, f: 'none', s: 'ink', sw: 2.5 });
    },
    overalls: function (p, G, L, c) {
      var T = G.T;
      el(p, 'path', { cls: 'o', d: torsoD(G, T + 62), f: 'denim' });
      // Bib (open at the bottom so it joins the lower part without a seam)
      el(p, 'path', { cls: 'o', f: 'denim', d: 'M' + pt(-28, T + 66) + ' L' + pt(-28, T + 34) + ' Q' + pt(-28, T + 30) + ' ' +
        pt(-24, T + 30) + ' L' + pt(24, T + 30) + ' Q' + pt(28, T + 30) + ' ' + pt(28, T + 34) + ' L' + pt(28, T + 66) });
      [-1, 1].forEach(function (s) {
        seg(p, s * 22, T + 32, s * (G.tw - 14), T + 1, 'ink', 11);
        seg(p, s * 22, T + 32, s * (G.tw - 14), T + 1, 'denim', 6);
        el(p, 'circle', { cls: 'o', sw: 1.5, cx: s * 22, cy: r(T + 36), r: 3.5, f: 'silver' });
      });
      el(p, 'rect', { x: -12, y: r(T + 44), width: 24, height: 14, rx: 3, f: 'none', s: 'ink', sw: 2 });
      [[-14, 80, 3, 'paint-1'], [18, 92, 2.6, 'paint-2'], [8, 52, 2.2, 'paint-3'], [-30, 98, 2.6, 'paint-3'], [32, 74, 2.2, 'paint-1']]
        .forEach(function (d) { el(p, 'circle', { cx: d[0], cy: r(T + d[1]), r: d[2], f: d[3] }); });
    },
    sweatervest: function (p, G, L, c) {
      var T = G.T;
      var v = Math.min(20, G.tw * .45);
      el(p, 'path', { cls: 'o', sw: 3, f: 'white', d: 'M' + pt(-v, T) + ' L' + pt(0, T + 36) + ' L' + pt(v, T) + ' Z' });
      el(p, 'path', { f: 'navy', s: 'ink', sw: 2, 'stroke-linejoin': 'round',
        d: 'M' + pt(-4, T + 8) + ' L' + pt(4, T + 8) + ' L' + pt(6, T + 28) + ' L' + pt(0, T + 34) + ' L' + pt(-6, T + 28) + ' Z' });
      el(p, 'rect', { x: -5, y: r(T + 2), width: 10, height: 7, rx: 2, f: 'navy', s: 'ink', sw: 2 });
      collar(p, T, 'white', v);
    },
    track: function (p, G, L, c) {
      var T = G.T, B = G.B;
      seg(p, 0, T + 6, 0, B - 2, 'ink', 2.5);
      el(p, 'rect', { cls: 'o', x: -20, y: T - 6, width: 40, height: 14, rx: 6, f: c.main });
      el(p, 'rect', { cls: 'o', x: -3, y: T + 10, width: 6, height: 10, rx: 2, f: 'silver', sw: 2 });
    },
    workshirt: function (p, G, L, c) {
      var T = G.T, B = G.B;
      seg(p, 0, T + 12, 0, B - 2, 'ink', 2);
      buttons(p, 4, [T + 30, T + 54, T + 78]);
      collar(p, T, c.main, 24);
      el(p, 'rect', { x: -40, y: r(T + 34), width: 22, height: 20, rx: 3, f: 'none', s: 'ink', sw: 2 });
      seg(p, -40, T + 40, -18, T + 40, 'ink', 2);
      if (c.patch) {
        var px = r(Math.min(28, G.tw - 30));   // clear of the arm on narrow builds
        el(p, 'ellipse', { cls: 'o', sw: 2, cx: px, cy: r(T + 42), rx: 14, ry: 9, f: 'white' });
        var t = el(p, 'text', { x: px, y: r(T + 45.5), 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700,
          'font-family': 'Lato, system-ui, sans-serif', f: 'ink' });
        t.textContent = c.patch;
      }
    },
    blazer: function (p, G, L, c) {
      var T = G.T;
      el(p, 'path', { cls: 'o', sw: 3, f: 'white', d: 'M' + pt(-20, T) + ' L' + pt(0, T + 58) + ' L' + pt(20, T) + ' Z' });
      [-1, 1].forEach(function (s) {
        stroke(p, 'M' + pt(s * 20, T + 1) + ' L' + pt(s * 31, T + 16) + ' L' + pt(s * 23, T + 21) + ' L' + pt(s * 7, T + 44), 'ink', 2.5);
      });
      el(p, 'circle', { cx: 0, cy: r(T + 70), r: 3.5, f: 'ink' });
    },
    coat: function (p, G, L, c) {
      var T = G.T;
      el(p, 'path', { cls: 'o', sw: 3, f: 'cream', d: 'M' + pt(-18, T) + ' L' + pt(0, T + 40) + ' L' + pt(18, T) + ' Z' });
      [-1, 1].forEach(function (s) {
        stroke(p, 'M' + pt(s * 18, T + 1) + ' L' + pt(s * 32, T + 18) + ' L' + pt(s * 24, T + 22) + ' L' + pt(s * 4, T + 44), 'ink', 2.5);
        buttons(p, s * 13, [T + 58, T + 80]);
      });
    },
    leather: function (p, G, L, c) {
      var T = G.T, B = G.B;
      el(p, 'path', { cls: 'o', sw: 3, f: 'white', d: 'M' + pt(-18, T) + ' L' + pt(-15, B) + ' L' + pt(15, B) + ' L' + pt(18, T) + ' Z' });
      el(p, 'rect', { x: -14, y: r(T + 38), width: 28, height: 8, f: 'red' });
      [-1, 1].forEach(function (s) {
        el(p, 'path', { cls: 'o', sw: 3, f: c.main, d: 'M' + pt(s * 18, T) + ' L' + pt(s * 37, T + 8) + ' L' + pt(s * 25, T + 32) + ' Z' });
        stroke(p, 'M' + pt(s * 30, T + 10) + ' L' + pt(s * 25, T + 22), 'white', 2).style.opacity = .35;
      });
    },
    qzip: function (p, G, L, c) {               // quarter-zip sweater, unzipped over a shirt and tie
      var T = G.T, B = G.B, x;
      seg(p, -sideX(G, B - 12) + 3, B - 12, sideX(G, B - 12) - 3, B - 12, 'ink', 2);
      for (x = -G.bw + 10; x <= G.bw - 10; x += 7) seg(p, x, B - 9, x, B - 3, 'ink', 1.5).style.opacity = .3;
      var v = Math.min(18, G.tw * .42);
      el(p, 'path', { cls: 'o', sw: 3, f: c.under, d: 'M' + pt(-v, T) + ' L' + pt(0, T + 40) + ' L' + pt(v, T) + ' Z' });
      el(p, 'path', { f: c.tie, s: 'ink', sw: 2, 'stroke-linejoin': 'round',
        d: 'M' + pt(-4, T + 9) + ' L' + pt(4, T + 9) + ' L' + pt(6, T + 31) + ' L' + pt(0, T + 37) + ' L' + pt(-6, T + 31) + ' Z' });
      el(p, 'rect', { x: -5, y: r(T + 3), width: 10, height: 7, rx: 2, f: c.tie, s: 'ink', sw: 2 });
      collar(p, T, c.under, v + 1);
      [-1, 1].forEach(function (s) {
        el(p, 'path', { cls: 'o', sw: 3, f: c.main, d: 'M' + pt(s * (v - 1), T - 1) + ' L' + pt(s * Math.min(36, G.tw - 5), T - 5) +
          ' L' + pt(s * Math.min(30, G.tw - 9), T + 15) + ' Z' });
      });
      seg(p, 0, T + 40, 0, T + 58, 'ink', 2.5);
      el(p, 'rect', { cls: 'o', sw: 2, x: -3, y: r(T + 41), width: 6, height: 11, rx: 2, f: 'silver' });
    },
    buttonshirt: function (p, G, L, c) {
      var T = G.T, B = G.B;
      seg(p, 0, T + 12, 0, B - 2, 'ink', 2);
      buttons(p, 4, [T + 30, T + 54, T + 78]);
      el(p, 'rect', { x: 14, y: r(T + 34), width: 20, height: 18, rx: 3, f: 'none', s: 'ink', sw: 2 });
      [-1, 1].forEach(function (s) {
        seg(p, s * (G.tw - 17), T + 1, s * (G.bw - 24), G.B - 1, 'ink', 11);
        seg(p, s * (G.tw - 17), T + 1, s * (G.bw - 24), G.B - 1, 'brown', 6);
      });
      collar(p, T, c.main, 24);
    }
  };

  function drawTop(up, G, L) {
    var c = L.top, B = G.B, bw = G.bw;
    if (c.style === 'coat') {
      var sk = grp(up, 'coat-skirt');
      el(sk, 'path', { cls: 'o', f: c.main, d: 'M' + pt(-bw, B - 12) + ' L' + pt(bw, B - 12) + ' L' + pt(bw + 8, B + 44) +
        ' Q' + pt(bw + 8, B + 50) + ' ' + pt(bw + 2, B + 50) + ' L' + pt(-bw - 2, B + 50) + ' Q' + pt(-bw - 8, B + 50) + ' ' +
        pt(-bw - 8, B + 44) + ' Z' });
      seg(sk, 0, B, 0, B + 48, 'ink', 2.5);
    }
    el(up, 'path', { cls: 'o', d: torsoD(G), f: c.main });
    if (TOPS[c.style]) TOPS[c.style](up, G, L, c);
  }

  // Things worn around the neck or on the chest, drawn before the head
  function drawNeck(up, G, L) {
    var T = G.T;
    if (has(L, 'scarf')) {
      el(up, 'path', { cls: 'o', sw: 3, f: 'url(#rb-stars)',
        d: 'M' + pt(-31, T + 6) + ' L' + pt(-12, T + 6) + ' L' + pt(-10, T + 80) + ' L' + pt(-33, T + 80) + ' Z' });
      [-29, -24, -19, -14].forEach(function (x) { seg(up, x, T + 82, x, T + 89, 'midnight', 2.5); });
      var sh = Math.min(44, G.tw + 4);
      el(up, 'rect', { cls: 'o', sw: 3, x: r(-sh), y: T - 10, width: r(sh * 2), height: 24, rx: 12, f: 'url(#rb-stars)' });
    }
    if (has(L, 'headphones')) {
      var band = 'M' + pt(-39, T + 6) + ' Q' + pt(-48, T - 62) + ' ' + pt(0, T - 66) + ' Q' + pt(48, T - 62) + ' ' + pt(39, T + 6);
      stroke(up, band, 'ink', 11);
      stroke(up, band, 'phone', 6);
      [-1, 1].forEach(function (s) {
        el(up, 'rect', { cls: 'o', sw: 3, x: s < 0 ? -49 : 31, y: T - 4, width: 18, height: 25, rx: 7, f: 'phone' });
        el(up, 'rect', { x: s < 0 ? -45 : 35, y: T + 1, width: 10, height: 15, rx: 4, f: 'red' });
      });
    }
    if (has(L, 'lanyard')) {
      seg(up, -15, T - 2, -3, T + 50, 'lanyard', 4);
      seg(up, 15, T - 2, 3, T + 50, 'lanyard', 4);
      el(up, 'rect', { cls: 'o', sw: 2.5, x: -12, y: T + 48, width: 24, height: 30, rx: 3, f: 'white' });
      el(up, 'rect', { x: -10.5, y: T + 49.5, width: 21, height: 7, f: 'lanyard' });
      el(up, 'rect', { x: -6, y: T + 60, width: 12, height: 12, rx: 2, f: 'sky' });
    }
    if (has(L, 'whistle')) {
      seg(up, -14, T, 0, T + 40, 'white', 2.5);
      seg(up, 14, T, 0, T + 40, 'white', 2.5);
      el(up, 'rect', { cls: 'o', sw: 2, x: -4, y: T + 38, width: 16, height: 9, rx: 4, f: 'silver' });
      el(up, 'circle', { cls: 'o', sw: 2, cx: 12, cy: T + 42.5, r: 5.5, f: 'silver' });
    }
    if (has(L, 'nametag')) {
      var nx = -Math.min(37, G.tw - 4);
      el(up, 'rect', { cls: 'o', sw: 2, x: r(nx), y: T + 38, width: 26, height: 20, rx: 2, f: 'white' });
      el(up, 'rect', { x: r(nx + 1), y: T + 39, width: 24, height: 6, f: 'tag' });
      stroke(up, 'M' + pt(nx + 5, T + 52) + ' q3 -3 6 0 t6 0 t5 0', 'ink', 1.5);
    }
  }

  /* ---------- Head ---------- */
  var BROWS = {
    soft:    ['M-35 -11 Q-24 -17 -12 -12', 'M12 -12 Q24 -17 35 -11'],
    worried: ['M-35 -10 Q-24 -12 -13 -19', 'M13 -19 Q24 -12 35 -10'],
    grumpy:  ['M-36 -17 Q-24 -15 -12 -8', 'M12 -8 Q24 -15 36 -17'],
    cocky:   ['M-35 -11 Q-24 -17 -12 -12', 'M12 -18 Q24 -26 35 -19']
  };

  function hairPath(p, d, color, sw) { return el(p, 'path', { cls: 'o', d: d, f: color, sw: sw || 4 }); }

  // Each style draws a back layer (behind the head) and/or a front layer (over it)
  var HAIR = {
    fade: {
      front: function (p, c) {
        hairPath(p, 'M-61 -2 Q-66 -68 0 -67 Q66 -68 61 -2 Q56 -30 36 -36 Q0 -46 -36 -36 Q-56 -30 -61 -2 Z', c);
      }
    },
    sidepart: {
      front: function (p, c) {
        hairPath(p, 'M-61 -4 Q-67 -70 2 -68 Q67 -68 61 -4 Q58 -30 42 -36 Q22 -46 -8 -44 Q-20 -40 -26 -30 Q-44 -36 -61 -4 Z', c);
        stroke(p, 'M-14 -66 Q-18 -54 -22 -45', 'ink', 2.5);
      }
    },
    tall: {
      front: function (p, c) {
        hairPath(p, 'M-60 -6 C-76 -36 -66 -72 -40 -78 C-40 -110 -6 -116 8 -98 C26 -122 66 -102 54 -76 C76 -66 76 -32 60 -6 Q44 -36 0 -40 Q-44 -36 -60 -6 Z', c);
        ['M-30 -62 q8 -8 16 0', 'M8 -78 q8 -8 16 0', 'M28 -56 q8 -8 16 0', 'M-12 -88 q6 -6 12 0']
          .forEach(function (d) { stroke(p, d, 'ink', 2.5).style.opacity = .35; });
      }
    },
    messybun: {
      back: function (p, c) {
        hairPath(p, 'M20 -62 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0', c);
        stroke(p, 'M6 -74 q12 -10 26 2', 'ink', 2.5).style.opacity = .4;
      },
      front: function (p, c) {
        hairPath(p, 'M-61 -2 Q-66 -70 4 -68 Q66 -66 61 0 Q56 -22 40 -30 Q10 -24 -14 -38 Q-34 -24 -52 -26 Q-58 -18 -61 -2 Z', c);
        stroke(p, 'M-57 -18 Q-66 2 -58 20', c, 3);
      }
    },
    bunpencil: {
      back: function (p, c) {
        hairPath(p, scallop(0, -80, 28, 11, 9), c);
        var pen = el(p, 'g', { transform: 'rotate(-24 0 -82)' });
        el(pen, 'rect', { cls: 'o', sw: 2.5, x: -40, y: -86.5, width: 66, height: 9, f: 'pencil' });
        el(pen, 'rect', { cls: 'o', sw: 2.5, x: 26, y: -86.5, width: 11, height: 9, rx: 2, f: 'eraser' });
        el(pen, 'path', { cls: 'o', sw: 2.5, d: 'M-40 -86.5 L-52 -82 L-40 -77.5 Z', f: 'cream' });
      },
      front: function (p, c) {
        hairPath(p, 'M-62 2 Q-68 -70 0 -68 Q68 -70 62 2 Q60 -20 48 -28 Q40 -40 24 -34 Q12 -44 0 -36 Q-12 -44 -24 -34 Q-40 -40 -48 -28 Q-60 -20 -62 2 Z', c);
      }
    },
    ponytail: {
      back: function (p, c) {
        hairPath(p, 'M14 -70 Q60 -98 80 -50 Q90 -10 70 28 Q74 -14 56 -40 Q40 -58 18 -58 Z', c);
      },
      front: function (p, c) {
        hairPath(p, 'M-61 -4 Q-66 -70 0 -68 Q66 -70 61 -4 Q54 -34 30 -40 Q0 -46 -30 -40 Q-54 -34 -61 -4 Z', c);
        el(p, 'circle', { cls: 'o', sw: 2.5, cx: 18, cy: -64, r: 7, f: 'red' });
      }
    },
    cap: {
      front: function (p, c, hat) {
        [-1, 1].forEach(function (s) { hairPath(p, 'M' + (s * 61) + ' -12 Q' + (s * 63) + ' 8 ' + (s * 57) + ' 18 L' + (s * 52) + ' -10 Z', c, 3); });
        hairPath(p, 'M-63 -30 Q-64 -80 0 -80 Q64 -80 63 -30 Z', hat);
        el(p, 'circle', { cls: 'o', sw: 2.5, cx: 0, cy: -80, r: 4.5, f: hat });
        hairPath(p, 'M-65 -32 Q0 -40 65 -32 Q75 -24 62 -19 Q0 -13 -62 -19 Q-75 -24 -65 -32 Z', hat);
      }
    },
    straw: {
      front: function (p, c, hat) {
        [-1, 1].forEach(function (s) { hairPath(p, 'M' + (s * 61) + ' -16 Q' + (s * 63) + ' 4 ' + (s * 58) + ' 12 L' + (s * 53) + ' -14 Z', c, 3); });
        el(p, 'ellipse', { cls: 'o', cx: 0, cy: -42, rx: 100, ry: 17, f: hat });
        stroke(p, 'M-84 -40 Q0 -28 84 -40', 'kraft', 2).style.opacity = .6;
        hairPath(p, 'M-48 -44 Q-50 -104 0 -104 Q50 -104 48 -44 Z', hat);
        el(p, 'path', { d: 'M-48.8 -58 L48.8 -58 L48.3 -46 L-48.3 -46 Z', f: 'brown' });
      }
    },
    bob: {
      back: function (p, c) {
        hairPath(p, 'M-74 34 Q-82 -74 0 -74 Q82 -74 74 34 Q62 42 50 32 L-50 32 Q-62 42 -74 34 Z', c);
      },
      front: function (p, c) {
        hairPath(p, 'M-62 -10 Q-66 -72 0 -72 Q66 -72 62 -10 Q58 -22 48 -24 L-48 -24 Q-58 -22 -62 -10 Z', c);
        [-1, 1].forEach(function (s) {
          hairPath(p, 'M' + (s * 62) + ' -14 Q' + (s * 68) + ' 14 ' + (s * 64) + ' 32 L' + (s * 52) + ' 32 Q' + (s * 56) + ' 8 ' + (s * 52) + ' -18 Z', c);
        });
      }
    },
    locbun: {
      back: function (p, c) {
        hairPath(p, 'M0 -80 m-36 0 a36 24 0 1 0 72 0 a36 24 0 1 0 -72 0', c);
        [-20, -6, 8, 22].forEach(function (x) { stroke(p, 'M' + x + ' -100 Q' + (x + 6) + ' -80 ' + x + ' -60', 'hair-dkbrown', 2.5); });
      },
      front: function (p, c) {
        hairPath(p, 'M-61 0 Q-66 -70 0 -68 Q66 -70 61 0 Q56 -28 36 -36 Q0 -44 -36 -36 Q-56 -28 -61 0 Z', c);
        [-44, -22, 0, 22, 44].forEach(function (x) { stroke(p, 'M' + x + ' ' + (x === 0 ? -42 : -38) + ' L' + r(x * 0.55) + ' -64', 'hair-dkbrown', 2.5); });
        [[-56, -26, -64, 42], [56, -26, 62, 30]].forEach(function (l) {
          seg(p, l[0], l[1], l[2], l[3], 'ink', 12);
          seg(p, l[0], l[1], l[2], l[3], c, 6);
        });
      }
    },
    curly: {
      // Short and messy: jagged tufts over a flat-ish top, one curl on the forehead
      front: function (p, c) {
        var line = ' L61 4 Q58 -18 48 -24 Q42 -36 28 -31 Q18 -42 6 -34 Q-6 -43 -18 -32 Q-30 -40 -40 -27 Q-54 -23 -61 4 Z';
        hairPath(p, jagged(0, -8, 64, 62, 175, 365, [7, 11, 9, 14, 10, 13, 8, 12, 10, 7], 0.45) + line, c);
        stroke(p, 'M8 -34 q-8 5 -3 11 q5 4 8 -3', c, 4.5);
        ['M-36 -52 l8 -7', 'M-6 -58 l9 -8', 'M22 -52 l8 -7']
          .forEach(function (d) { stroke(p, d, 'ink', 2.5).style.opacity = .35; });
      }
    },
    spiky: {
      front: function (p, c) {
        hairPath(p, 'M-60 -6 L-72 -44 L-52 -48 L-58 -86 L-30 -68 L-20 -104 L2 -74 L22 -102 L32 -68 L60 -84 L52 -46 L72 -42 L60 -6 Q30 -40 0 -42 Q-30 -40 -60 -6 Z', c);
      }
    }
  };

  function drawHead(up, G, L) {
    var face = L.face || {}, hair = L.hair || {}, H = HAIR[hair.style] || HAIR.fade;
    var pos = el(up, 'g', { cls: 'headWrap', transform: 'translate(0 ' + G.headY + ')' });
    var hp = grp(pos, 'headPose', [0, 58]);
    var hd = grp(hp, 'head', [0, 58]);

    if (H.back) H.back(hd, hair.color, hair.hat);
    if (face.ears !== false) {
      [-1, 1].forEach(function (s) { el(hd, 'circle', { cls: 'o', cx: s * 61, cy: 12, r: 12, f: L.skin }); });
    }
    el(hd, 'circle', { cls: 'o', cx: 0, cy: 0, r: HEAD_R, f: L.skin });

    if (face.beard === 'stubble') {
      el(hd, 'path', { 'clip-path': 'url(#rb-headclip)', f: hair.color, op: .22,
        d: 'M-64 14 Q-60 66 0 66 Q60 66 64 14 Q52 40 34 46 Q16 52 0 50 Q-16 52 -34 46 Q-52 40 -64 14 Z' });
    } else if (face.beard === 'trim') {
      hairPath(hd, 'M-61 6 Q-60 62 0 66 Q60 62 61 6 Q57 30 42 37 Q28 54 0 55 Q-28 54 -42 37 Q-57 30 -61 6 Z', hair.color, 3);
    } else if (face.beard === 'circle') {
      // Trimmed beard joined to the mustache, with an opening around the mouth
      el(hd, 'path', { cls: 'o', sw: 3, f: hair.color, 'fill-rule': 'evenodd',
        d: 'M-61 6 Q-60 62 0 66 Q60 62 61 6 Q57 30 42 37 L22 37 Q12 26 0 31 Q-12 26 -22 37 L-42 37 Q-57 30 -61 6 Z ' +
           'M-15 41 Q0 36 15 41 Q14 52 0 52 Q-14 52 -15 41 Z' });
    } else if (face.beard === 'full') {
      hairPath(hd, 'M-60 6 Q-62 68 0 72 Q62 68 60 6 Q54 34 36 36 Q24 56 0 56 Q-24 56 -36 36 Q-54 34 -60 6 Z', hair.color, 3);
    }

    if (face.blush !== false) {
      [-1, 1].forEach(function (s) { el(hd, 'ellipse', { cx: s * 40, cy: 34, rx: 10, ry: 6, f: 'cheek', op: .55 }); });
    }

    var look = grp(grp(grp(hd, 'eyes-open'), 'blink'), 'look');
    var happy = grp(hd, 'eyes-happy');
    [-1, 1].forEach(function (s) {
      el(look, 'circle', { cx: s * 23, cy: 10, r: 5.5, f: 'ink' });
      el(look, 'circle', { cx: s * 23 + 2, cy: 8, r: 1.8, f: 'white' });
      stroke(happy, 'M' + (s * 23 - 7) + ' 13 Q' + (s * 23) + ' 3 ' + (s * 23 + 7) + ' 13', 'ink', 3.5);
    });

    var brows = grp(hd, 'brows');
    (BROWS[face.brows] || BROWS.soft).forEach(function (d) { stroke(brows, d, 'ink', face.brows === 'grumpy' ? 5 : 3.5); });

    if (face.glasses) {
      var thick = face.glasses === 'thick';
      [thick ? -45 : -42, thick ? 5 : 4].forEach(function (x) {
        el(hd, 'rect', { x: x, y: thick ? -6 : -4, width: thick ? 40 : 38, height: thick ? 30 : 28, rx: thick ? 4 : 9,
          f: 'white', fo: .3, s: thick ? 'black' : 'ink', sw: thick ? 6 : 3.5 });
      });
      stroke(hd, 'M-5 8 Q0 4 5 8', thick ? 'black' : 'ink', thick ? 5 : 3.5);
    }

    // Mouths: the default expression, plus the shrug and cheer versions
    var md = grp(hd, 'm-def'), m = face.mouth || 'smile';
    if (m === 'grin') {
      el(md, 'path', { cls: 'o', sw: 3.5, d: 'M-16 37 Q0 60 16 37 Z', f: 'mouth' });
      el(md, 'path', { d: 'M-13.5 39 L13.5 39 L12 43 Q0 45 -12 43 Z', f: 'white' });
    } else {
      stroke(md, {
        smile: 'M-13 39 Q0 51 13 39',
        small: 'M-8 41 Q0 47 8 41',
        smirk: 'M-12 42 Q2 46 14 36',
        flat:  'M-11 43 L11 42'
      }[m] || 'M-13 39 Q0 51 13 39', 'ink', 4);
    }
    el(grp(hd, 'm-open'), 'path', { cls: 'o', sw: 3.5, d: 'M-14 37 Q0 62 14 37 Z', f: 'mouth' });
    stroke(grp(hd, 'm-wavy'), 'M-11 44 Q-5.5 39 0 44 Q5.5 49 11 44', 'ink', 3.5);

    if (face.mustache) {
      hairPath(hd, 'M-22 38 Q-12 27 0 32 Q12 27 22 38 Q12 37 0 36 Q-12 37 -22 38 Z', hair.color, 2.5);
    }
    if (H.front) H.front(hd, hair.color, hair.hat);

    if (has(L, 'earbud')) el(hd, 'circle', { cls: 'o', sw: 2, cx: 61, cy: 16, r: 5, f: 'white' });
    if (has(L, 'hoops')) {
      [-1, 1].forEach(function (s) { el(hd, 'circle', { cx: s * 61, cy: 31, r: 7, f: 'none', s: 'gold', sw: 3 }); });
    }
    if (has(L, 'bandage')) {
      var bd = el(hd, 'g', { transform: 'rotate(-20 33 -27)' });
      el(bd, 'rect', { cls: 'o', sw: 2, x: 21, y: -32, width: 24, height: 10, rx: 4, f: 'bandage' });
      el(bd, 'rect', { x: 29, y: -30, width: 8, height: 6, rx: 1, f: 'white' });
    }
  }

  /* ---------- Arms and hand props ---------- */
  function drawProp(p, type, x, y) {
    var pr = grp(p, 'prop');
    if (type === 'phone') {
      el(pr, 'rect', { cls: 'o', sw: 3, x: x - 9, y: y - 4, width: 18, height: 30, rx: 4, f: 'phone' });
      el(pr, 'rect', { x: x - 5.5, y: y + 8, width: 11, height: 14, rx: 2, f: 'screen' });
    } else if (type === 'cup') {
      el(pr, 'path', { cls: 'o', sw: 3, f: 'cup', d: 'M' + pt(x - 11, y - 8) + ' L' + pt(x + 11, y - 8) + ' L' + pt(x + 8, y + 26) + ' L' + pt(x - 8, y + 26) + ' Z' });
      el(pr, 'path', { f: 'kraft', d: 'M' + pt(x - 10, y + 4) + ' L' + pt(x + 10, y + 4) + ' L' + pt(x + 8.8, y + 16) + ' L' + pt(x - 8.8, y + 16) + ' Z' });
      el(pr, 'rect', { cls: 'o', sw: 2.5, x: x - 13, y: y - 13, width: 26, height: 6, rx: 3, f: 'white' });
    } else if (type === 'clipboard') {
      el(pr, 'rect', { cls: 'o', sw: 3, x: x - 19, y: y - 6, width: 38, height: 48, rx: 4, f: 'board' });
      el(pr, 'rect', { x: x - 14, y: y + 3, width: 28, height: 34, rx: 1, f: 'paper' });
      [12, 19, 26].forEach(function (d) { seg(pr, x - 9, y + d, x + 9, y + d, 'gray', 1.5); });
      el(pr, 'rect', { cls: 'o', sw: 2, x: x - 7, y: y - 10, width: 14, height: 8, rx: 2, f: 'silver' });
    } else if (type === 'book') {
      el(pr, 'rect', { cls: 'o', sw: 3, x: x - 14, y: y - 4, width: 28, height: 36, rx: 2, f: 'teal' });
      el(pr, 'rect', { x: x + 9, y: y - 2, width: 3, height: 32, f: 'paper' });
      el(pr, 'rect', { x: x - 9, y: y + 14, width: 15, height: 4, rx: 1, f: 'paper' });
    } else if (type === 'honey') {
      el(pr, 'rect', { cls: 'o', sw: 3, x: x - 15, y: y - 2, width: 30, height: 32, rx: 8, f: 'honey' });
      el(pr, 'rect', { cls: 'o', sw: 2.5, x: x - 13, y: y - 8, width: 26, height: 8, rx: 3, f: 'brown' });
      el(pr, 'rect', { x: x - 9, y: y + 12, width: 18, height: 10, rx: 2, f: 'paper' });
    }
  }

  function drawArm(up, G, L, side) {
    var key = side < 0 ? 'L' : 'R', c = L.top;
    var sx = side * G.sx, sy = G.sy, ey = sy + U, hy = ey + F + 3;
    var sleeve = c.sleeve || c.main, fore = col(L, c.fore || sleeve);
    var arm = grp(up, 'arm arm' + key, [sx, sy]);
    // Pass 1: outlines
    seg(arm, sx, sy, sx, ey, 'ink', 27);
    seg(grp(arm, 'fore', [sx, ey]), sx, ey, sx, ey + F, 'ink', 27);
    // Pass 2: fills and details
    seg(arm, sx, sy, sx, ey, sleeve, 19);
    if (c.stripe) seg(arm, sx, sy + 6, sx, ey, 'white', 3);
    var ff = grp(arm, 'fore', [sx, ey]);
    seg(ff, sx, ey, sx, ey + F, fore, 19);
    if (c.stripe) seg(ff, sx, ey, sx, ey + F - 6, 'white', 3);
    if (c.fore === 'skin') el(ff, 'ellipse', { cls: 'o', sw: 3, cx: sx, cy: ey + 3, rx: 13, ry: 7, f: sleeve });
    if (key === 'L' && has(L, 'watch')) {
      el(ff, 'rect', { x: sx - 12.5, y: ey + F - 14, width: 25, height: 8, rx: 2, f: 'brown' });
      el(ff, 'circle', { cls: 'o', sw: 2, cx: sx, cy: ey + F - 10, r: 5.5, f: 'silver' });
    }
    if (L.hold && L.hold[key]) drawProp(ff, L.hold[key], sx, hy);
    el(ff, 'circle', { cls: 'o hand', sw: 3.5, cx: sx, cy: hy, r: 12, f: L.skin });
  }

  // Drawn over the arms
  function drawFront(up, G, L) {
    if (has(L, 'sling')) {
      var a = 6 * Math.PI / 180, sx = -G.sx, sy = G.sy, T = G.T;
      var ex = sx - U * Math.sin(a), ey = sy + U * Math.cos(a), hx = ex + F + 3;
      [[hx + 4, ey - 8, 13, T + 2], [ex - 6, ey - 8, -15, T + 2]].forEach(function (s) {
        seg(up, s[0], s[1], s[2], s[3], 'ink', 10);
        seg(up, s[0], s[1], s[2], s[3], 'white', 5);
      });
      el(up, 'path', { cls: 'o', sw: 3, f: 'white',
        d: 'M' + pt(ex - 13, ey - 2) + ' Q' + pt(ex - 8, ey + 30) + ' ' + pt(hx + 4, ey + 20) + ' L' + pt(hx + 13, ey) + ' Z' });
    }
  }

  /* ---------- Build one guest ---------- */
  // opts: base (stand|sit|lean), pose (idle|wave|shrug|cheer|cross), act (room activity),
  //       delay (s, negative)
  function buildGuest(guest, opts) {
    opts = opts || {};
    ensureDefs();
    var L = guest.look, G = geo(L);
    var delay = opts.delay != null ? opts.delay : -Math.random() * 6;
    var root = el(null, 'g', { cls: 'guest', 'data-id': guest.id, 'data-base': opts.base || 'stand',
      'data-pose': opts.pose || 'idle', st: '--d:' + delay.toFixed(2) + 's;' });
    if (opts.act) root.setAttribute('data-act', opts.act);
    if (has(L, 'sling')) root.setAttribute('data-sling', '');
    root.__geo = G;

    el(root, 'ellipse', { cls: 'shadow', cx: 0, cy: 1, rx: r(66 * G.w), ry: 9, f: 'ink', fo: .15 });
    var lean = grp(grp(root, 'hop'), 'lean', [0, 0]);
    drawLegs(grp(lean, 'legs-stand'), G, L, false);
    drawLegs(grp(lean, 'legs-sit'), G, L, true);
    var up = grp(grp(lean, 'seat', null, '--sit:' + G.sit + 'px;'), 'upper');

    drawTop(up, G, L);
    drawNeck(up, G, L);
    drawHead(up, G, L);
    drawArm(up, G, L, -1);
    drawArm(up, G, L, 1);
    drawFront(up, G, L);
    return root;
  }

  /* ---------- Chair (seated guests, local coordinates) ---------- */
  function drawChair(parent) {
    var c = el(parent, 'g', { 'class': 'g-chair' });
    el(c, 'rect', { x: -54, y: -196, width: 108, height: 140, rx: 12, f: 'chair', s: 'ink', sw: 4 });
    [-1, 1].forEach(function (s) { seg(c, s * 62, -58, s * 62, 0, 'ink', 9); seg(c, s * 62, -58, s * 62, 0, 'chair-dk', 4); });
    el(c, 'rect', { x: -72, y: -70, width: 144, height: 14, rx: 6, f: 'chair-dk', s: 'ink', sw: 4 });
  }

  /* ---------- Room scene (1600 x 800) ---------- */
  // Feet position, scale and body base for each guest. List order doesn't matter;
  // keyboard and guest-list order go left to right by x.
  var SPOTS = {
    kim:     { x: 322,  y: 672, s: .48 },
    benny:   { x: 560,  y: 436, s: .44 },
    jax:     { x: 540,  y: 752, s: .50 },
    june:    { x: 762,  y: 692, s: .50 },
    marcus:  { x: 900,  y: 602, s: .47 },
    theo:    { x: 990,  y: 712, s: .48, base: 'sit' },
    hannah:  { x: 1080, y: 712, s: .48, base: 'sit' },
    sam:     { x: 1170, y: 712, s: .48, base: 'sit' },
    teacher: { x: 1260, y: 712, s: .48, base: 'sit' },
    gil:     { x: 1312, y: 528, s: .45, base: 'lean', pose: 'cross' },
    amara:   { x: 1500, y: 672, s: .50 }
  };
  var TABLE = { cx: 1125, cy: 706, rx: 190, ry: 30 };
  // Drawing order, back to front: scene parts (strings) and guests (ids)
  var LAYERS = ['back', 'benny', 'booth', 'gil', 'marcus', 'amara', 'june', 'checkin', 'kim',
                'theo', 'hannah', 'sam', 'teacher', 'table', 'jax'];
  var DOING = {
    greet: 'greeting people by the check-in table',
    dj: 'DJing on the stage',
    'dance-wild': 'dancing', 'free-dance': 'dancing',
    pitch: 'talking by the snack table',
    watch: 'sitting at the round table', sip: 'sitting at the round table',
    nod: 'sitting at the round table', 'people-watch': 'sitting at the round table',
    'lean-cross': 'leaning against the bleachers',
    stargaze: 'standing by the window'
  };

  function txt(p, x, y, str, size, color) {
    var t = el(p, 'text', { x: x, y: y, 'text-anchor': 'middle', 'font-size': size, 'font-weight': 700,
      'font-family': 'Lato, system-ui, sans-serif', f: color });
    t.textContent = str;
    return t;
  }
  function balloon(p, x, y, color, ax, ay) {
    stroke(p, 'M' + pt(x, y + 28) + ' Q' + pt((x + ax) / 2 + 10, (y + ay) / 2) + ' ' + pt(ax, ay), 'ink', 1.5);
    el(p, 'path', { d: 'M' + pt(x - 5, y + 30) + ' L' + pt(x + 5, y + 30) + ' L' + pt(x, y + 23) + ' Z', f: color, s: 'ink', sw: 2 });
    el(p, 'ellipse', { cls: 'o', sw: 3, cx: x, cy: y, rx: 21, ry: 26, f: color });
    el(p, 'ellipse', { cx: x - 7, cy: y - 10, rx: 4, ry: 7, f: 'white', op: .45 });
  }
  function bunting(p, x0, y0, x1, y1, sag, n) {
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + sag, cols = ['maroon', 'gold', 'teal'], i, t, u, x, y;
    stroke(p, 'M' + pt(x0, y0) + ' Q' + pt(mx, my) + ' ' + pt(x1, y1), 'ink', 2);
    for (i = 0; i < n; i++) {
      t = (i + 0.5) / n; u = 1 - t;
      x = u * u * x0 + 2 * u * t * mx + t * t * x1;
      y = u * u * y0 + 2 * u * t * my + t * t * y1;
      el(p, 'path', { cls: 'o', sw: 2, f: cols[i % 3], d: 'M' + pt(x - 14, y - 1) + ' L' + pt(x + 14, y - 1) + ' L' + pt(x, y + 26) + ' Z' });
    }
  }

  var SCENE = {
    back: function (g) {
      var i, x, y;
      // Wall, wainscot and floor
      el(g, 'rect', { x: 0, y: 0, width: 1600, height: 470, f: 'wall' });
      el(g, 'rect', { x: 0, y: 398, width: 1600, height: 72, f: 'wall-trim' });
      seg(g, 0, 398, 1600, 398, 'wall-line', 3);
      el(g, 'rect', { x: 0, y: 470, width: 1600, height: 330, f: 'floor' });
      [492, 518, 548, 583, 624, 671, 724, 784].forEach(function (yy) { seg(g, 0, yy, 1600, yy, 'floor-line', 2); });
      seg(g, 0, 470, 1600, 470, 'ink', 3);
      stroke(g, 'M140 800 Q800 556 1460 800', 'court', 6).style.opacity = .75;

      // Doors and EXIT sign
      el(g, 'rect', { cls: 'o', x: 36, y: 238, width: 198, height: 232, f: 'wall-line' });
      [46, 136].forEach(function (dx) {
        el(g, 'rect', { cls: 'o', sw: 3, x: dx, y: 248, width: 88, height: 222, f: 'door' });
        el(g, 'rect', { cls: 'o', sw: 3, x: dx + 20, y: 268, width: 48, height: 70, rx: 3, f: 'door-glass' });
        seg(g, dx + 10, 382, dx + 78, 382, 'silver', 7);
      });
      el(g, 'rect', { cls: 'o', sw: 3, x: 95, y: 198, width: 80, height: 32, rx: 4, f: 'red' });
      txt(g, 135, 221, 'EXIT', 21, 'white');

      // Night window above the bleachers
      el(g, 'rect', { cls: 'o', x: 1336, y: 106, width: 208, height: 178, rx: 6, f: 'white' });
      el(g, 'rect', { x: 1348, y: 118, width: 184, height: 154, f: 'midnight' });
      [[1370, 142, 2.6], [1410, 172, 2], [1394, 234, 2.4], [1452, 136, 2], [1516, 214, 2.6], [1470, 252, 2], [1428, 208, 1.6], [1508, 252, 1.8], [1372, 194, 1.6]]
        .forEach(function (st) { el(g, 'circle', { cx: st[0], cy: st[1], r: st[2], f: 'star' }); });
      el(g, 'circle', { cx: 1494, cy: 152, r: 17, f: 'moon' });
      el(g, 'circle', { cx: 1502, cy: 146, r: 15, f: 'midnight' });
      seg(g, 1440, 118, 1440, 272, 'white', 8);
      seg(g, 1348, 195, 1532, 195, 'white', 8);
      el(g, 'rect', { cls: 'o', sw: 3, x: 1326, y: 280, width: 228, height: 12, rx: 3, f: 'white' });

      // School pennant on the wall
      seg(g, 852, 138, 852, 272, 'brown', 6);
      el(g, 'path', { cls: 'o', d: 'M856 150 L1236 205 L856 260 Z', f: 'maroon' });
      el(g, 'rect', { cls: 'o', sw: 3, x: 856, y: 150, width: 22, height: 110, f: 'gold' });
      txt(g, 986, 212, 'McCRAE HILL', 28, 'cream');
      txt(g, 974, 234, 'HIGH SCHOOL', 14, 'gold');

      // Stage: curtain, valance, speakers, platform
      el(g, 'rect', { x: 360, y: 170, width: 400, height: 262, f: 'curtain' });
      for (x = 384; x < 760; x += 36) seg(g, x, 186, x, 428, 'curtain-dk', 6).style.opacity = .7;
      var val = 'M350 158 L770 158 L770 192';
      for (i = 0; i < 10; i++) val += ' A21 13 0 0 1 ' + (770 - (i + 1) * 42) + ' 192';
      el(g, 'path', { cls: 'o', sw: 3, d: val + ' Z', f: 'curtain-dk' });
      [372, 686].forEach(function (sx) {
        el(g, 'rect', { cls: 'o', sw: 3, x: sx, y: 316, width: 62, height: 114, rx: 5, f: 'speaker' });
        el(g, 'circle', { cx: sx + 31, cy: 348, r: 15, f: 'deck', s: 'ink', sw: 3 });
        el(g, 'circle', { cx: sx + 31, cy: 396, r: 22, f: 'deck', s: 'ink', sw: 3 });
        el(g, 'circle', { cx: sx + 31, cy: 396, r: 8, f: 'speaker' });
      });
      el(g, 'rect', { cls: 'o', sw: 3, x: 340, y: 428, width: 440, height: 16, f: 'stage' });
      el(g, 'rect', { cls: 'o', sw: 3, x: 340, y: 444, width: 440, height: 48, f: 'stage-dk' });
      for (x = 395; x < 780; x += 55) seg(g, x, 446, x, 490, 'ink', 1.5).style.opacity = .3;

      // Banner, bunting, disco ball
      seg(g, 700, 0, 700, 160, 'ink', 2);
      seg(g, 470, 40, 440, 0, 'ink', 2);
      seg(g, 1130, 40, 1160, 0, 'ink', 2);
      el(g, 'rect', { x: 470, y: 30, width: 660, height: 70, rx: 6, f: 'cream', s: 'gold', sw: 5 });
      txt(g, 800, 77, 'WELCOME BACK, CLASS OF 2007!', 34, 'maroon');
      bunting(g, 0, 16, 440, 28, 54, 9);
      bunting(g, 1160, 28, 1600, 16, 54, 9);
      el(g, 'circle', { cls: 'o', cx: 700, cy: 186, r: 30, f: 'silver' });
      for (i = -2; i <= 2; i++) {
        stroke(g, 'M' + pt(670 + 2, 186 + i * 11) + ' Q700 ' + r(186 + i * 11 + 4) + ' ' + pt(730 - 2, 186 + i * 11), 'gray', 1.5);
        stroke(g, 'M' + pt(700 + i * 11, 158) + ' Q' + r(700 + i * 13) + ' 186 ' + pt(700 + i * 11, 214), 'gray', 1.5);
      }
      el(g, 'rect', { x: 684, y: 168, width: 9, height: 9, f: 'white' });
      el(g, 'rect', { x: 707, y: 194, width: 7, height: 7, f: 'white', op: .8 });

      // Dance floor (checkered, in perspective) with moving light spots
      var rows = 5, cols = 8, y0 = 560, rh = 46;
      function lx(yy) { return 440 - (yy - y0) * 0.25; }
      function rx(yy) { return 900 + (yy - y0) * 0.25; }
      for (i = 0; i < rows; i++) {
        var ya = y0 + i * rh, yb = ya + rh;
        for (var c = 0; c < cols; c++) {
          var xa1 = lx(ya) + (rx(ya) - lx(ya)) * c / cols, xa2 = lx(ya) + (rx(ya) - lx(ya)) * (c + 1) / cols;
          var xb1 = lx(yb) + (rx(yb) - lx(yb)) * c / cols, xb2 = lx(yb) + (rx(yb) - lx(yb)) * (c + 1) / cols;
          el(g, 'path', { f: (i + c) % 2 ? 'tile-1' : 'tile-2',
            d: 'M' + pt(xa1, ya) + ' L' + pt(xa2, ya) + ' L' + pt(xb2, yb) + ' L' + pt(xb1, yb) + ' Z' });
        }
      }
      el(g, 'path', { f: 'none', s: 'ink', sw: 3, d: 'M' + pt(lx(y0), y0) + ' L' + pt(rx(y0), y0) + ' L' + pt(rx(y0 + rows * rh), y0 + rows * rh) +
        ' L' + pt(lx(y0 + rows * rh), y0 + rows * rh) + ' Z' });
      [[520, 600, 'light-1', 0], [700, 640, 'light-2', -1.6], [830, 700, 'light-3', -3.1], [600, 740, 'light-2', -2.2], [760, 590, 'light-3', -4]]
        .forEach(function (sp) {
          el(g, 'ellipse', { cls: 'spot', cx: sp[0], cy: sp[1], rx: 40, ry: 13, f: sp[2], st: 'animation-delay:' + sp[3] + 's;' });
        });

      // Bleachers (top tier first so lower tiers overlap it)
      el(g, 'rect', { cls: 'o', sw: 3, x: 1270, y: 342, width: 14, height: 128, f: 'bleacher-dk' });
      for (i = 3; i >= 0; i--) {
        y = 440 - i * 32;
        el(g, 'rect', { x: 1280, y: y + 10, width: 330, height: 24, f: 'bleacher-dk' });
        el(g, 'rect', { cls: 'o', sw: 3, x: 1276, y: y, width: 334, height: 12, rx: 3, f: 'bleacher' });
      }

      // Balloons tied to the left speaker and the top of the bleachers
      balloon(g, 382, 252, 'gold', 403, 316);
      balloon(g, 424, 238, 'teal', 403, 316);
      balloon(g, 452, 262, 'cream', 403, 316);
      balloon(g, 1548, 300, 'maroon', 1570, 344);
      balloon(g, 1576, 278, 'gold', 1570, 344);

      // Snack table against the wall
      el(g, 'rect', { cls: 'o', sw: 3, x: 800, y: 506, width: 220, height: 52, f: 'gold' });
      for (x = 830; x < 1020; x += 30) seg(g, x, 510, x, 556, 'ink', 1.5).style.opacity = .25;
      el(g, 'rect', { cls: 'o', sw: 3, x: 796, y: 496, width: 228, height: 12, rx: 3, f: 'gold' });
      el(g, 'path', { cls: 'o', sw: 2.5, d: 'M822 474 Q826 497 850 497 Q874 497 878 474 Z', f: 'glass' });
      el(g, 'path', { d: 'M825 482 Q850 488 875 482 Q871 495 850 495 Q829 495 825 482 Z', f: 'punch', op: .9 });
      el(g, 'ellipse', { cx: 850, cy: 474, rx: 28, ry: 5, f: 'punch', s: 'ink', sw: 2.5 });
      [[892, 'red'], [910, 'white'], [928, 'red']].forEach(function (cp) {
        el(g, 'path', { cls: 'o', sw: 2, f: cp[1], d: 'M' + (cp[0] - 7) + ' 480 L' + (cp[0] + 7) + ' 480 L' + (cp[0] + 5) + ' 496 L' + (cp[0] - 5) + ' 496 Z' });
      });
      el(g, 'ellipse', { cls: 'o', sw: 2, cx: 975, cy: 494, rx: 30, ry: 5, f: 'white' });
      [[962, 487], [978, 485], [992, 488], [970, 480]].forEach(function (ck) {
        el(g, 'circle', { cx: ck[0], cy: ck[1], r: 6.5, f: 'kraft', s: 'ink', sw: 1.5 });
      });
    },

    // DJ booth on the stage, drawn in front of Benny
    booth: function (g) {
      var i;
      el(g, 'rect', { cls: 'o', sw: 3, x: 466, y: 384, width: 188, height: 56, f: 'deck' });
      el(g, 'rect', { cls: 'o', sw: 3, x: 458, y: 374, width: 204, height: 14, rx: 3, f: 'speaker' });
      el(g, 'ellipse', { cx: 515, cy: 374, rx: 30, ry: 6, f: 'record', s: 'ink', sw: 2 });
      el(g, 'ellipse', { cx: 605, cy: 374, rx: 30, ry: 6, f: 'record', s: 'ink', sw: 2 });
      var hs = [14, 26, 20, 32, 18, 28, 12];
      for (i = 0; i < hs.length; i++) {
        el(g, 'rect', { x: 498 + i * 18, y: 430 - hs[i], width: 10, height: hs[i], rx: 2, f: i % 2 ? 'light-1' : 'light-3' });
      }
    },

    // Check-in table with name tags and balloons
    checkin: function (g) {
      balloon(g, 74, 506, 'maroon', 92, 592);
      balloon(g, 108, 490, 'gold', 92, 592);
      balloon(g, 138, 512, 'cream', 92, 592);
      el(g, 'rect', { cls: 'o', sw: 3, x: 80, y: 602, width: 210, height: 52, f: 'maroon' });
      el(g, 'rect', { cls: 'o', sw: 3, x: 76, y: 592, width: 218, height: 12, rx: 3, f: 'maroon' });
      txt(g, 185, 637, 'CHECK-IN', 20, 'cream');
      [[150, 584, -8], [176, 583, 4], [204, 585, -2]].forEach(function (t) {
        var tg = el(g, 'g', { transform: 'rotate(' + t[2] + ' ' + t[0] + ' ' + t[1] + ')' });
        el(tg, 'rect', { cls: 'o', sw: 1.5, x: t[0] - 12, y: t[1] - 8, width: 24, height: 15, rx: 2, f: 'white' });
        el(tg, 'rect', { x: t[0] - 11, y: t[1] - 7, width: 22, height: 5, f: 'tag' });
      });
      seg(g, 236, 588, 262, 582, 'ink', 3);
    },

    // Round table: tablecloth, centerpiece, Sam's honey jar, Alex's open book
    table: function (g) {
      var T = TABLE, x0 = T.cx - T.rx, x1 = T.cx + T.rx;
      el(g, 'path', { cls: 'o', f: 'cream', d: 'M' + x0 + ' ' + T.cy + ' L' + x0 + ' ' + (T.cy + 50) + ' Q' + T.cx + ' ' + (T.cy + 82) + ' ' +
        x1 + ' ' + (T.cy + 50) + ' L' + x1 + ' ' + T.cy + ' Z' });
      el(g, 'ellipse', { cls: 'o', cx: T.cx, cy: T.cy, rx: T.rx, ry: T.ry, f: 'cream' });
      stroke(g, 'M' + (x0 + 2) + ' ' + (T.cy + 14) + ' Q' + T.cx + ' ' + (T.cy + 46) + ' ' + (x1 - 2) + ' ' + (T.cy + 14), 'gold', 4);
      el(g, 'rect', { cls: 'o', sw: 2.5, x: T.cx - 8, y: T.cy - 20, width: 16, height: 20, rx: 4, f: 'glass' });
      [[-10, -34, 'maroon'], [0, -40, 'gold'], [10, -33, 'maroon']].forEach(function (fl) {
        seg(g, T.cx, T.cy - 16, T.cx + fl[0], T.cy + fl[1], 'forest', 2);
        el(g, 'circle', { cx: T.cx + fl[0], cy: T.cy + fl[1], r: 6, f: fl[2], s: 'ink', sw: 2 });
      });
      var hx = SPOTS.sam.x + 14, bx = SPOTS.teacher.x, by = T.cy + 8;
      el(g, 'rect', { cls: 'o', sw: 2.5, x: hx - 9, y: T.cy - 6, width: 18, height: 20, rx: 5, f: 'honey' });
      el(g, 'rect', { cls: 'o', sw: 2, x: hx - 10, y: T.cy - 11, width: 20, height: 6, rx: 2, f: 'brown' });
      el(g, 'path', { cls: 'o', sw: 2.5, f: 'paper', d: 'M' + (bx - 28) + ' ' + by + ' L' + bx + ' ' + (by + 4) + ' L' + (bx + 28) + ' ' + by +
        ' L' + (bx + 28) + ' ' + (by - 10) + ' L' + bx + ' ' + (by - 6) + ' L' + (bx - 28) + ' ' + (by - 10) + ' Z' });
      seg(g, bx, by - 6, bx, by + 4, 'ink', 2);
    }
  };

  /* ---------- Room state and UI ---------- */
  var room = {
    svg: null, list: null, dialog: null,
    items: {},       // id -> { guest, gst, ov, badge, btn }
    order: [],       // ids, left to right
    rated: {},       // id -> true
    current: 0,      // roving tab stop
    openId: null
  };

  function guestById(id) {
    for (var i = 0; i < GUESTS.length; i++) if (GUESTS[i].id === id) return GUESTS[i];
    return null;
  }
  function ariaFor(it) {
    var gu = it.guest;
    return gu.name + ', ' + gu.job + ', ' + (DOING[gu.activity] || 'at the reunion') + '. ' +
      (room.rated[gu.id] ? 'Rated.' : 'Not rated yet.');
  }

  function placeGuest(parent, gu) {
    var sp = SPOTS[gu.id];
    var gst = el(parent, 'g', { cls: 'gst', 'data-id': gu.id, role: 'button', tabindex: -1 });
    var hit = el(gst, 'rect', { cls: 'hit' });
    var pos = el(gst, 'g', { transform: 'translate(' + sp.x + ' ' + sp.y + ') scale(' + sp.s + ')' });
    if (sp.base === 'sit') drawChair(pos);
    var gEl = buildGuest(gu, { base: sp.base || 'stand', pose: sp.pose || 'idle', act: gu.activity });
    pos.appendChild(gEl);
    return { guest: gu, sp: sp, gst: gst, hit: hit, gEl: gEl };
  }

  // Ring, name label and status badge for one guest, drawn in the top overlay layer
  function addOverlay(ovLayer, it) {
    var sp = it.sp, G = it.gEl.__geo, hb = it.gEl.querySelector('.headWrap').getBBox();
    var topLocal = G.headY + hb.y + (sp.base === 'sit' ? G.sit : 0);
    var top = sp.y + sp.s * topLocal, half = 74 * sp.s * (G.w || 1) + 8;
    var bottom = sp.base === 'sit' ? TABLE.cy - TABLE.ry : sp.y + 10;

    it.hit.setAttribute('x', r(sp.x - half)); it.hit.setAttribute('y', r(top - 6));
    it.hit.setAttribute('width', r(half * 2)); it.hit.setAttribute('height', r(bottom - top + 6));

    var ov = el(ovLayer, 'g', { cls: 'ov-item', 'aria-hidden': 'true' });
    var ring = el(ov, 'g', { cls: 'ring' });
    [['ring-out'], ['ring-in']].forEach(function (c) {
      el(ring, 'rect', { cls: c[0], x: r(sp.x - half), y: r(top - 10), width: r(half * 2), height: r(bottom - top + 16), rx: 18 });
    });
    var bwrap = el(ov, 'g', { transform: 'translate(' + sp.x + ' ' + r(top - 30) + ')' });
    var badge = el(bwrap, 'g', { cls: 'badge badge-bob', st: 'animation-delay:' + (-Math.random() * 2).toFixed(2) + 's;' });
    el(badge, 'circle', { r: 19 });
    var bt = el(badge, 'text', { y: 9, 'text-anchor': 'middle' });
    bt.textContent = '?';
    var label = el(ov, 'g', { cls: 'label', transform: 'translate(' + sp.x + ' ' + r(top - 72) + ')' });
    var lw = it.guest.name.length * 12.5 + 28;
    el(label, 'rect', { x: r(-lw / 2), y: -18, width: r(lw), height: 36, rx: 10 });
    var lt = el(label, 'text', { y: 8, 'text-anchor': 'middle' });
    lt.textContent = it.guest.name;
    it.ov = ov; it.badge = badge; it.badgeText = bt;
  }

  function highlight(id, on) {
    var it = room.items[id];
    if (it) it.ov.classList.toggle('on', on);
  }

  function setCurrent(i, focus) {
    room.current = (i + room.order.length) % room.order.length;
    room.order.forEach(function (id, k) { room.items[id].gst.setAttribute('tabindex', k === room.current ? 0 : -1); });
    if (focus) room.items[room.order[room.current]].gst.focus();
  }

  function refresh(id) {
    var it = room.items[id], done = !!room.rated[id];
    it.badge.classList.toggle('done', done);
    it.badgeText.textContent = done ? '✓' : '?';
    it.gst.setAttribute('aria-label', ariaFor(it));
    it.btn.classList.toggle('done', done);
    it.btn.querySelector('.gl-mark').textContent = done ? '✓' : '?';
    it.btn.setAttribute('aria-label', it.guest.name + ', ' + (done ? 'rated' : 'not rated yet'));
  }
  function refreshStats() {
    var n = room.order.filter(function (id) { return room.rated[id]; }).length;
    document.getElementById('statMet').textContent = n + ' / ' + room.order.length;
  }
  function markRated(id, on) {
    if (on) room.rated[id] = true; else delete room.rated[id];
    refresh(id);
    refreshStats();
  }

  /* Profile dialog: a stub until step 3 (name, job, close) */
  function openProfile(id) {
    var gu = guestById(id);
    room.openId = id;
    document.getElementById('pfName').textContent = gu.name;
    document.getElementById('pfJob').textContent = gu.job;
    room.svg.classList.add('paused');
    room.dialog.showModal();
  }

  function initRoom() {
    room.svg = document.getElementById('room');
    room.list = document.getElementById('guestList');
    room.dialog = document.getElementById('profile');
    var svg = room.svg;

    LAYERS.forEach(function (name) {
      if (SCENE[name]) {
        SCENE[name](el(svg, 'g', { 'aria-hidden': 'true', cls: 'scene' }));
      } else {
        var gu = guestById(name);
        if (gu && SPOTS[gu.id]) room.items[gu.id] = placeGuest(svg, gu);
      }
    });
    var ovLayer = el(svg, 'g', { cls: 'overlay' });
    room.order = Object.keys(room.items).sort(function (a, b) {
      return (SPOTS[a].x - SPOTS[b].x) || (SPOTS[a].y - SPOTS[b].y);
    });

    room.order.forEach(function (id, k) {
      var it = room.items[id];
      addOverlay(ovLayer, it);

      // Guest list button
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn ghost gl-btn';
      btn.innerHTML = '<span class="gl-mark" aria-hidden="true">?</span><span class="gl-name"></span>';
      btn.querySelector('.gl-name').textContent = it.guest.name;
      btn.addEventListener('click', function () { openProfile(id); });
      li.appendChild(btn);
      room.list.appendChild(li);
      it.btn = btn;

      // Room guest: pointer, focus and keyboard
      it.gst.addEventListener('click', function () { setCurrent(k); openProfile(id); });
      it.gst.addEventListener('pointerenter', function () { highlight(id, true); });
      it.gst.addEventListener('pointerleave', function () { if (document.activeElement !== it.gst) highlight(id, false); });
      it.gst.addEventListener('focus', function () { setCurrent(k); highlight(id, true); });
      it.gst.addEventListener('blur', function () { highlight(id, false); });
      refresh(id);
    });
    setCurrent(0);
    refreshStats();

    svg.addEventListener('keydown', function (e) {
      var k = e.key, i = room.current;
      if (k === 'ArrowRight' || k === 'ArrowDown') setCurrent(i + 1, true);
      else if (k === 'ArrowLeft' || k === 'ArrowUp') setCurrent(i - 1, true);
      else if (k === 'Home') setCurrent(0, true);
      else if (k === 'End') setCurrent(room.order.length - 1, true);
      else if (k === 'Enter' || k === ' ') openProfile(room.order[i]);
      else return;
      e.preventDefault();
    });

    document.getElementById('pfClose').addEventListener('click', function () { room.dialog.close(); });
    room.dialog.addEventListener('close', function () { room.svg.classList.remove('paused'); room.openId = null; });

    if (DEV) {
      document.getElementById('pfDev').hidden = false;
      document.getElementById('devBar').hidden = false;
      document.getElementById('pfMark').addEventListener('click', function () {
        markRated(room.openId, true);
        room.dialog.close();
      });
      document.getElementById('devRateAll').addEventListener('click', function () {
        room.order.forEach(function (id) { markRated(id, true); });
      });
      document.getElementById('devClear').addEventListener('click', function () {
        room.order.forEach(function (id) { markRated(id, false); });
      });
    }
  }

  /* ---------- Dev gallery ---------- */
  function initGallery() {
    var sec = document.getElementById('gallery'), gal = document.getElementById('gal');
    sec.hidden = false;

    GUESTS.forEach(function (gu) {
      var card = document.createElement('div');
      card.className = 'card gcard';
      var svg = el(null, 'svg', { viewBox: '-140 -420 280 440', role: 'img', 'aria-label': gu.name + ', ' + gu.job });
      el(svg, 'rect', { x: -140, y: 0, width: 280, height: 20, st: 'fill:var(--card);' });
      drawChair(svg);
      svg.appendChild(buildGuest(gu));
      card.appendChild(svg);
      var h = document.createElement('h3'); h.textContent = gu.name; card.appendChild(h);
      var j = document.createElement('p'); j.className = 'job'; j.textContent = gu.job; card.appendChild(j);
      var t = document.createElement('p'); t.className = 'traits';
      t.textContent = TRAITS.map(function (tr) { return tr[1] + ' ' + LEVEL[gu.answers[tr[0]]]; }).join(' · ');
      card.appendChild(t);
      gal.appendChild(card);
    });

    function bindGroup(attr) {
      var btns = sec.querySelectorAll('button[data-' + attr + ']');
      Array.prototype.forEach.call(btns, function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-' + attr);
          Array.prototype.forEach.call(btns, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          Array.prototype.forEach.call(gal.querySelectorAll('.guest'), function (gEl) { gEl.setAttribute('data-' + attr, v); });
          if (attr === 'base') gal.setAttribute('data-base', v);
        });
      });
    }
    bindGroup('base');
    bindGroup('pose');
    document.getElementById('galAnim').addEventListener('change', function (e) {
      gal.classList.toggle('paused', !e.target.checked);
    });
  }

  initRoom();
  if (DEV) initGallery();
})();
