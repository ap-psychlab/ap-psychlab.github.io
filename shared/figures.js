/* Shared figure renderer for question figures: window.APPSYCH_FIGURES
 *
 * APPSYCH_FIGURES.mount(container, figure)
 *   Shows a question's `figure` in `container` (or empties and hides the container when
 *   the question has none). Calling it again with the same figure keeps the current drawing,
 *   so games can call it on every re-render. The SVG is drawn at the container's real pixel
 *   width, so labels stay readable on phones, and it redraws when the width changes.
 *   Every figure gets a caption, its alt text, and a "Show data as a table" toggle.
 *   Text sizes follow the container's font size (figures.css uses em), so a game can
 *   enlarge a figure with one rule, e.g. .q-figure { font-size: 1.3rem } for projection.
 * APPSYCH_FIGURES.correlation(points)  Pearson r of [[x, y], ...] (used by validators).
 *
 * Figure data (stored in the question; colors come from theme tokens via figures.css):
 *   Common:  type, title, alt (one or two sentences describing the graph),
 *            x: { label, min, max, step, decimals? }, y: { label, min, max, step, decimals? }
 *            (bar graphs use x: { label } only, with categories)
 *   scatter: points: [[x, y], ...]
 *   bar:     categories: ["...", ...], series: [{ name, values: [one per category] }, ...],
 *            showValues?: true to print each bar's value above it
 *   line:    series: [{ name, points: [[x, y], ...] }, ...]
 *   Up to 3 series. Each series has its own fill pattern (bars) or marker and dash style
 *   (lines), so meaning never depends on color alone.
 */
window.APPSYCH_FIGURES = (function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var MARKERS = ["circle", "square", "triangle"];
  var uid = 0;

  function el(name, attrs, parent, text) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function ticks(ax) {
    var out = [];
    for (var i = 0, v = ax.min; v <= ax.max + 1e-9; i++, v = ax.min + i * ax.step) out.push(+v.toFixed(6));
    return out;
  }
  function fmt(v, ax) { return ax && ax.decimals != null ? Number(v).toFixed(ax.decimals) : String(v); }

  // Gridlines, axes, tick labels and axis titles; returns the scales for the data layer
  function frame(svg, fig, W, H, cats, k) {
    var small = W < 420;
    var m = { l: (small ? 50 : 62) * k, r: (small ? 10 : 16) * k, t: 14 * k, b: (small ? 50 : 56) * k };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var y = fig.y;
    var ys = function (v) { return m.t + ph - (v - y.min) / (y.max - y.min) * ph; };
    var g = el("g", { "class": "fig-axes" }, svg);
    ticks(y).forEach(function (v) {
      var yy = ys(v);
      el("line", { x1: m.l, x2: m.l + pw, y1: yy, y2: yy, "class": "fig-grid" }, g);
      el("text", { x: m.l - 8 * k, y: yy + 4 * k, "text-anchor": "end", "class": "fig-tick" }, g, fmt(v, y));
    });
    var xs;
    if (cats) {
      var band = pw / cats.length;
      xs = function (i) { return m.l + band * (i + 0.5); };
      xs.band = band;
      cats.forEach(function (c, i) {
        el("text", { x: xs(i), y: m.t + ph + 20 * k, "text-anchor": "middle", "class": "fig-tick" }, g, c);
      });
    } else {
      var x = fig.x;
      xs = function (v) { return m.l + (v - x.min) / (x.max - x.min) * pw; };
      ticks(x).forEach(function (v) {
        el("text", { x: xs(v), y: m.t + ph + 20 * k, "text-anchor": "middle", "class": "fig-tick" }, g, fmt(v, x));
      });
    }
    el("line", { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, "class": "fig-axis" }, g);
    el("line", { x1: m.l, x2: m.l, y1: m.t, y2: m.t + ph, "class": "fig-axis" }, g);
    el("text", { x: m.l + pw / 2, y: H - 10 * k, "text-anchor": "middle", "class": "fig-axis-title" }, g, fig.x.label);
    el("text", { x: 0, y: 0, "text-anchor": "middle", "class": "fig-axis-title",
      transform: "translate(" + (small ? 14 : 18) * k + "," + (m.t + ph / 2) + ") rotate(-90)" }, g, y.label);
    return { x: xs, y: ys, m: m, pw: pw, ph: ph, small: small, r: (small ? 4 : 5) * Math.min(k, 1.5) };
  }

  function marker(parent, shape, cx, cy, r, cls) {
    if (shape === "square") return el("rect", { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, "class": cls }, parent);
    if (shape === "triangle") {
      var h = r * 1.25;
      return el("polygon", { points: [cx, cy - h, cx + h, cy + h * 0.8, cx - h, cy + h * 0.8].join(" "), "class": cls }, parent);
    }
    return el("circle", { cx: cx, cy: cy, r: r, "class": cls }, parent);
  }

  var draw = {
    scatter: function (svg, fig, W, H, id, k) {
      var f = frame(svg, fig, W, H, null, k);
      var g = el("g", { "class": "fig-points" }, svg);
      fig.points.forEach(function (p) { marker(g, "circle", f.x(p[0]), f.y(p[1]), f.r, "fig-dot"); });
    },
    bar: function (svg, fig, W, H, id, k) {
      var f = frame(svg, fig, W, H, fig.categories, k);
      var n = fig.series.length, inner = f.x.band * (n > 1 ? 0.78 : 0.5), bw = inner / n;
      fig.series.forEach(function (s, si) {
        var g = el("g", { "class": "fig-s" + si }, svg);
        s.values.forEach(function (v, ci) {
          var x0 = f.x(ci) - inner / 2 + si * bw, y0 = f.y(v), base = f.m.t + f.ph;
          el("rect", { x: x0 + 2, y: y0, width: Math.max(1, bw - 4), height: Math.max(0, base - y0),
            fill: si ? "url(#fig-pat" + si + "-" + id + ")" : null, "class": "fig-bar" }, g);
          if (fig.showValues) el("text", { x: x0 + bw / 2, y: y0 - 6 * k, "text-anchor": "middle", "class": "fig-val" }, g, fmt(v, fig.y));
        });
      });
    },
    line: function (svg, fig, W, H, id, k) {
      var f = frame(svg, fig, W, H, null, k);
      fig.series.forEach(function (s, si) {
        var g = el("g", { "class": "fig-s" + si }, svg);
        el("polyline", { points: s.points.map(function (p) { return f.x(p[0]) + "," + f.y(p[1]); }).join(" "), "class": "fig-line" }, g);
        s.points.forEach(function (p) { marker(g, MARKERS[si], f.x(p[0]), f.y(p[1]), f.r, "fig-mark"); });
      });
    }
  };

  function legend(fig, id) {
    if (!fig.series || fig.series.length < 2) return null;
    var ul = document.createElement("ul");
    ul.className = "fig-legend";
    fig.series.forEach(function (s, i) {
      var li = document.createElement("li");
      var svg = el("svg", { viewBox: "0 0 30 16", width: 30, height: 16, "aria-hidden": "true", focusable: "false" }, li);
      var g = el("g", { "class": "fig-s" + i }, svg);
      if (fig.type === "bar") {
        var key = "lg" + id + "-" + i;
        if (i) patterns(svg, key);
        el("rect", { x: 3, y: 1, width: 24, height: 14, fill: i ? "url(#fig-pat" + i + "-" + key + ")" : null, "class": "fig-bar" }, g);
      } else {
        el("line", { x1: 1, x2: 29, y1: 8, y2: 8, "class": "fig-line" }, g);
        marker(g, MARKERS[i], 15, 8, 4, "fig-mark");
      }
      li.appendChild(document.createTextNode(s.name));
      ul.appendChild(li);
    });
    return ul;
  }

  // Hatch patterns for bar series 2 and 3 (series 1 is a solid fill)
  function patterns(svg, id) {
    var defs = el("defs", {}, svg);
    [[1, 45], [2, -45]].forEach(function (a) {
      var p = el("pattern", { id: "fig-pat" + a[0] + "-" + id, width: 7, height: 7, patternUnits: "userSpaceOnUse",
        patternTransform: "rotate(" + a[1] + ")" }, defs);
      el("rect", { width: 7, height: 7, "class": "fig-pat-bg fig-pat-bg" + a[0] }, p);
      el("line", { x1: 0, y1: 0, x2: 0, y2: 7, "class": "fig-pat-line" }, p);
    });
  }

  function table(fig) {
    var t = document.createElement("table"), head, rows;
    if (fig.type === "scatter") {
      head = [fig.x.label, fig.y.label];
      rows = fig.points.map(function (p) { return [fmt(p[0], fig.x), fmt(p[1], fig.y)]; });
    } else if (fig.type === "bar") {
      head = [fig.x.label].concat(fig.series.map(function (s) { return s.name; }));
      rows = fig.categories.map(function (c, i) {
        return [c].concat(fig.series.map(function (s) { return fmt(s.values[i], fig.y); }));
      });
    } else {
      var xsSeen = [];
      fig.series.forEach(function (s) { s.points.forEach(function (p) { if (xsSeen.indexOf(p[0]) < 0) xsSeen.push(p[0]); }); });
      xsSeen.sort(function (a, b) { return a - b; });
      head = [fig.x.label].concat(fig.series.map(function (s) { return s.name || fig.y.label; }));
      rows = xsSeen.map(function (xv) {
        return [fmt(xv, fig.x)].concat(fig.series.map(function (s) {
          var hit = s.points.filter(function (p) { return p[0] === xv; })[0];
          return hit ? fmt(hit[1], fig.y) : "–";
        }));
      });
    }
    var tr = t.createTHead().insertRow();
    head.forEach(function (h) { var th = document.createElement("th"); th.scope = "col"; th.textContent = h; tr.appendChild(th); });
    var body = t.createTBody();
    rows.forEach(function (r) {
      var row = body.insertRow();
      r.forEach(function (v) { row.insertCell().textContent = v; });
    });
    return t;
  }

  function build(fig) {
    var id = ++uid;
    var wrap = document.createElement("figure");
    wrap.className = "fig";
    if (fig.title) {
      var cap = document.createElement("figcaption");
      cap.textContent = fig.title;
      wrap.appendChild(cap);
    }
    var box = document.createElement("div");
    box.className = "fig-box";
    wrap.appendChild(box);
    var lg = legend(fig, id);
    if (lg) wrap.appendChild(lg);
    var det = document.createElement("details");
    det.className = "fig-data";
    var sum = document.createElement("summary");
    sum.textContent = "Show data as a table";
    det.appendChild(sum);
    det.appendChild(table(fig));
    wrap.appendChild(det);

    var lastW = 0;
    function paint() {
      var W = Math.round(box.clientWidth);
      if (!W || W === lastW) return;
      lastW = W;
      var k = Math.min(2, Math.max(.85, (parseFloat(getComputedStyle(box).fontSize) || 16) / 16));
      var H = Math.round(Math.max(230 * k, Math.min(360 * k, W * 0.6)));
      box.textContent = "";
      var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", role: "img", "aria-label": fig.alt || fig.title || "Graph" }, box);
      patterns(svg, id);
      draw[fig.type](svg, fig, W, H, id, k);
    }
    return { node: wrap, paint: paint, box: box };
  }

  function mount(container, figure) {
    if (!container) return;
    if (container.__figData === figure && figure) { if (container.__fig) container.__fig.paint(); return; }
    if (container.__obs) { container.__obs.disconnect(); container.__obs = null; }
    container.__figData = figure || null;
    container.__fig = null;
    container.textContent = "";
    if (!figure || !draw[figure.type]) { container.hidden = true; return; }
    container.hidden = false;
    var f = build(figure);
    container.__fig = f;
    container.appendChild(f.node);
    f.paint();
    if (window.ResizeObserver) {
      container.__obs = new ResizeObserver(function () { f.paint(); });
      container.__obs.observe(f.box);
    } else {
      window.addEventListener("resize", f.paint);
    }
  }

  function correlation(points) {
    var n = points.length, mx = 0, my = 0, sxy = 0, sxx = 0, syy = 0;
    points.forEach(function (p) { mx += p[0] / n; my += p[1] / n; });
    points.forEach(function (p) {
      sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) * (p[0] - mx); syy += (p[1] - my) * (p[1] - my);
    });
    return sxy / Math.sqrt(sxx * syy);
  }

  return { mount: mount, correlation: correlation };
})();
