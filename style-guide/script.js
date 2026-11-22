// Style guide: builds color swatches from the live values in theme.css
(function () {
  var rootStyle = getComputedStyle(document.documentElement);

  document.querySelectorAll('.swatches').forEach(function (box) {
    box.dataset.tokens.trim().split('\n').forEach(function (line) {
      var parts = line.trim().split('|');
      var name = parts[0], use = parts[1];
      var value = rootStyle.getPropertyValue('--' + name).trim().toUpperCase() || '(not defined)';

      var sw = document.createElement('div');
      sw.className = 'swatch';
      sw.innerHTML =
        '<span class="chip" style="background:var(--' + name + ')"></span>' +
        '<div class="info"><code>--' + name + '</code>' +
        '<span class="hex">' + value + '</span>' +
        '<span class="use">' + use + '</span></div>';
      box.appendChild(sw);
    });
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
