/* Big Five Reunion
 *
 * Test options (URL):
 *   ?dev   debug tools: the guest gallery (every guest in every pose)
 *
 * Step 1: character builder + dev gallery. The room, profile dialog and scoring
 * come in later steps (see "Big Five Reunion - Plan.md").
 *
 * Character rig (local coordinates: feet at 0,0, y up is negative):
 *   g.guest[data-base=stand|sit|lean][data-pose=idle|wave|shrug|cheer|cross]
 *     ellipse.shadow
 *     g.hop > g.lean
 *       g.legs-stand (g.legL, g.legR) / g.legs-sit
 *       g.seat (--sit) > g.upper (breathing)
 *         torso and outfit, neck extras, head (g.headPose > g.head), g.armL, g.armR
 *   Arms have two segments: g.arm (rotates at the shoulder) > g.fore (rotates at the
 *   elbow). Each arm is drawn in two passes (all outlines, then all fills) so the
 *   elbow stays seamless; both g.fore copies share the same CSS. Poses live in style.css.
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
    var x = side < 0 ? -G.legX - (wid - 14) : G.legX - 14;
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
      el(p, 'path', { d: 'M' + pt(16, T + 46) + ' L' + pt(38, T + 46), f: 'none', s: 'ink', sw: 2.5 });
      el(p, 'rect', { x: 16, y: r(T + 46), width: 22, height: 18, rx: 3, f: 'none', s: 'ink', sw: 2.5 });
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
      el(p, 'path', { cls: 'o', sw: 3, f: 'white', d: 'M' + pt(-20, T) + ' L' + pt(0, T + 36) + ' L' + pt(20, T) + ' Z' });
      el(p, 'path', { f: 'navy', s: 'ink', sw: 2, 'stroke-linejoin': 'round',
        d: 'M' + pt(-4, T + 8) + ' L' + pt(4, T + 8) + ' L' + pt(6, T + 28) + ' L' + pt(0, T + 34) + ' L' + pt(-6, T + 28) + ' Z' });
      el(p, 'rect', { x: -5, y: r(T + 2), width: 10, height: 7, rx: 2, f: 'navy', s: 'ink', sw: 2 });
      collar(p, T, 'white', 20);
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
        el(p, 'ellipse', { cls: 'o', sw: 2, cx: 28, cy: r(T + 42), rx: 16, ry: 9.5, f: 'white' });
        var t = el(p, 'text', { x: 28, y: r(T + 45.5), 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700,
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
      el(up, 'rect', { cls: 'o', sw: 3, x: -44, y: T - 10, width: 88, height: 24, rx: 12, f: 'url(#rb-stars)' });
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
      el(up, 'rect', { cls: 'o', sw: 2, x: -42, y: T + 38, width: 28, height: 20, rx: 2, f: 'white' });
      el(up, 'rect', { x: -41, y: T + 39, width: 26, height: 6, f: 'tag' });
      stroke(up, 'M' + pt(-37, T + 52) + ' q3 -3 6 0 t6 0 t6 0', 'ink', 1.5);
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
    spiky: {
      front: function (p, c) {
        hairPath(p, 'M-60 -6 L-72 -44 L-52 -48 L-58 -86 L-30 -68 L-20 -104 L2 -74 L22 -102 L32 -68 L60 -84 L52 -46 L72 -42 L60 -6 Q30 -40 0 -42 Q-30 -40 -60 -6 Z', c);
      }
    }
  };

  function drawHead(up, G, L) {
    var face = L.face || {}, hair = L.hair || {}, H = HAIR[hair.style] || HAIR.fade;
    var pos = el(up, 'g', { transform: 'translate(0 ' + G.headY + ')' });
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
    } else if (face.beard === 'full') {
      hairPath(hd, 'M-60 6 Q-62 68 0 72 Q62 68 60 6 Q54 34 36 36 Q24 56 0 56 Q-24 56 -36 36 Q-54 34 -60 6 Z', hair.color, 3);
    }

    [-1, 1].forEach(function (s) { el(hd, 'ellipse', { cx: s * 40, cy: 34, rx: 10, ry: 6, f: 'cheek', op: .55 }); });

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
      [-42, 4].forEach(function (x) {
        el(hd, 'rect', { x: x, y: -4, width: 38, height: 28, rx: 9, f: 'white', fo: .3, s: 'ink', sw: 3.5 });
      });
      stroke(hd, 'M-4 8 Q0 4 4 8', 'ink', 3.5);
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
  // opts: base (stand|sit|lean), pose (idle|wave|shrug|cheer|cross), delay (s, negative)
  function buildGuest(guest, opts) {
    opts = opts || {};
    ensureDefs();
    var L = guest.look, G = geo(L);
    var delay = opts.delay != null ? opts.delay : -Math.random() * 6;
    var root = el(null, 'g', { cls: 'guest', 'data-id': guest.id, 'data-base': opts.base || 'stand',
      'data-pose': opts.pose || 'idle', st: '--d:' + delay.toFixed(2) + 's;' });
    if (has(L, 'sling')) root.setAttribute('data-sling', '');

    el(root, 'ellipse', { cls: 'shadow', cx: 0, cy: 1, rx: r(66 * G.w), ry: 9, f: 'ink', fo: .15 });
    var lean = grp(grp(root, 'hop'), 'lean', [0, 0]);
    drawLegs(grp(lean, 'legs-stand'), G, L, false);
    drawLegs(grp(lean, 'legs-sit'), G, L, true);
    var up = grp(grp(lean, 'seat', null, '--sit:' + G.sit + 'px;'), 'upper');
    var knees = grp(lean, 'knees');   // seated thighs, seen end-on in front of the lap
    [-1, 1].forEach(function (s) {
      el(knees, 'rect', { cls: 'o', x: r(s * G.legX - 14), y: -68, width: 28, height: 26, rx: 13, f: L.bottom.pants });
    });
    drawTop(up, G, L);
    drawNeck(up, G, L);
    drawHead(up, G, L);
    drawArm(up, G, L, -1);
    drawArm(up, G, L, 1);
    drawFront(up, G, L);
    return root;
  }

  /* ---------- Dev gallery ---------- */
  function drawChair(svg) {
    var c = el(svg, 'g', { 'class': 'g-chair' });
    el(c, 'rect', { x: -54, y: -196, width: 108, height: 140, rx: 12, f: 'chair', s: 'ink', sw: 4 });
    [-1, 1].forEach(function (s) { seg(c, s * 62, -58, s * 62, 0, 'ink', 9); seg(c, s * 62, -58, s * 62, 0, 'chair-dk', 4); });
    el(c, 'rect', { x: -72, y: -70, width: 144, height: 14, rx: 6, f: 'chair-dk', s: 'ink', sw: 4 });
  }

  function initGallery() {
    document.getElementById('soon').hidden = true;
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

  if (DEV) initGallery();
})();
