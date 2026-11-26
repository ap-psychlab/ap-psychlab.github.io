/* AP Psych Lab — sets light or dark mode before the page paints.
 *
 * Load it first in <head>, right after the title, NOT deferred (so there's no flash of the
 * wrong mode):
 *   <script src="../../shared/theme-init.js"></script>
 *
 * It sets <html data-theme="light|dark"> from the saved choice (localStorage "appsych.theme",
 * saved by APPSYCH_UI.theme as { v: 1, data: "dark" }), or from the device's setting when
 * nothing is saved. Everything after that (the switch, following the device, other tabs,
 * printing, the phone browser's bar color) is in shared/ui.js. Creates no globals.
 */
(function () {
  var theme = null;
  try {
    var saved = JSON.parse(localStorage.getItem('appsych.theme'));
    // The store wraps every value, so unwrap it; a plain "dark" (or anything else) is ignored.
    if (saved && saved.v === 1 && (saved.data === 'light' || saved.data === 'dark')) theme = saved.data;
  } catch (e) { /* storage blocked or unreadable: follow the device */ }
  if (!theme) {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();
