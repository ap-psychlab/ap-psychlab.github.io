// Style guide: color swatches and the color-pair table, built from the live values in theme.css
(function () {
  // Read a token's value in each mode from a hidden element with data-theme set.
  function probe(mode) {
    var p = document.createElement('div');
    p.setAttribute('data-theme', mode);
    p.hidden = true;
    document.body.appendChild(p);
    return getComputedStyle(p);
  }
  var modes = { light: probe('light'), dark: probe('dark') };
  function val(mode, name) { return modes[mode].getPropertyValue('--' + name).trim().toUpperCase(); }

  document.querySelectorAll('.swatches[data-tokens]').forEach(function (box) {
    box.dataset.tokens.trim().split('\n').forEach(function (line) {
      var parts = line.trim().split('|');
      var name = parts[0], use = parts[1];
      var lv = val('light', name) || '(not defined)', dv = val('dark', name) || '(not defined)';
      var sw = document.createElement('div');
      sw.className = 'swatch';
      sw.innerHTML =
        '<span class="chip"><span style="background:' + lv + '"></span><span style="background:' + dv + '"></span></span>' +
        '<div class="info"><code>--' + name + '</code>' +
        '<span class="hex">' + lv + ' · ' + dv + '</span>' +
        '<span class="use">' + use + '</span></div>';
      box.appendChild(sw);
    });
  });

  // Contrast (WCAG 2): relative luminance of a #RRGGBB color
  function lum(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex);
    if (!m) return null;
    var n = parseInt(m[1], 16);
    return [n >> 16, (n >> 8) & 255, n & 255].map(function (c) {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce(function (sum, c, i) { return sum + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function ratio(a, b) {
    var x = lum(a), y = lum(b);
    if (x == null || y == null) return null;
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  // [front, back, needs, label]; needs 4.5 = small text, 3 = graphics and borders
  var T = 4.5, G = 3;
  var PAIRS = [
    ['heading', 'bg', T, 'Headings on the page'], ['heading', 'bg-alt', T, 'Headings on panels'], ['heading', 'card', T, 'Headings on cards'],
    ['text', 'bg', T, 'Body text on the page'], ['text', 'bg-alt', T, 'Body text on panels'], ['text', 'card', T, 'Body text on cards'],
    ['muted', 'bg', T, 'Helper text on the page'], ['muted', 'bg-alt', T, 'Helper text on panels'], ['muted', 'card', T, 'Helper text on cards'],
    ['link', 'bg', T, 'Links on the page'], ['link', 'bg-alt', T, 'Links on panels'], ['link', 'card', T, 'Links on cards'],
    ['error', 'bg', T, 'Warning text on the page'], ['error', 'card', T, 'Warning text on cards'],
    ['bg', 'btn', T, 'Primary button'], ['bg', 'btn-hover', T, 'Primary button, hover'], ['heading', 'btn2', T, 'Secondary button'],
    ['bg', 'error', T, 'Text on --error'],
    ['on-accent', 'accent', T, 'Text on --accent'], ['on-accent', 'sage', T, 'Text on --sage'], ['on-accent', 'honey', T, 'Text on --honey'],
    ['on-accent', 'blue', T, 'Text on --blue'], ['on-accent', 'plum', T, 'Text on --plum'], ['on-accent', 'teal', T, 'Text on --teal'],
    ['sitebar-text', 'sitebar', T, 'Site bar text'], ['banner-text', 'banner', T, 'Banner title'], ['banner-sub', 'banner', T, 'Banner subheading'],
    ['accent', 'card', G, '--accent graphic on cards'], ['sage', 'card', G, '--sage graphic on cards'], ['honey', 'card', G, '--honey graphic on cards'],
    ['blue', 'card', G, '--blue graphic on cards'], ['plum', 'card', G, '--plum graphic on cards'], ['teal', 'card', G, '--teal graphic on cards'],
    ['error', 'card', G, '--error graphic on cards'], ['btn', 'bg', G, 'Icon-button border on the page'], ['psi', 'sitebar', G, 'Ψ on the site bar']
  ];
  var tbody = document.querySelector('#pairsTable tbody');
  if (tbody) {
    PAIRS.forEach(function (p) {
      var tr = document.createElement('tr');
      var html = '<td>' + p[3] + '<br><code>--' + p[0] + '</code> on <code>--' + p[1] + '</code></td>';
      ['light', 'dark'].forEach(function (mode) {
        var r = ratio(val(mode, p[0]), val(mode, p[1]));
        var ok = r != null && r >= p[2];
        var sample = p[2] === G
          ? '<span class="pair-sample graphic" style="background:var(--' + p[1] + ');color:var(--' + p[0] + ')"><i></i></span>'
          : '<span class="pair-sample" style="background:var(--' + p[1] + ');color:var(--' + p[0] + ')">Aa</span>';
        html += '<td data-theme="' + mode + '"><span class="pair-cell">' + sample +
          '<span class="pair-result' + (ok ? '' : ' low') + '">' + (r == null ? '?' : r.toFixed(2)) + (ok ? ' ✓' : ' ✗ low') + '</span></span></td>';
      });
      html += '<td>' + p[2] + ':1</td>';
      tr.innerHTML = html;
      tbody.appendChild(tr);
    });
  }

  // Example icon from APPSYCH_UI.icons
  var UI = window.APPSYCH_UI;
  document.querySelectorAll('[data-icon]').forEach(function (b) {
    if (UI && UI.icons[b.dataset.icon]) b.innerHTML = UI.icons[b.dataset.icon];
  });

  // Keep the focus example outlined so the style is always visible
  var f = document.getElementById('focusDemo');
  if (f) f.classList.add('show-focus');

  // Example mode pills and segmented controls: pressing one marks it pressed.
  document.querySelectorAll('#ui .modes, #ui .segmented').forEach(function (group) {
    group.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      group.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
})();
