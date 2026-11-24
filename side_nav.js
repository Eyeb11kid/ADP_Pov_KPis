/* Collapsible side nav: adds a "Menu" handle that slides the nav in and out. Pairs with the collapse rules in side_nav.css.
   Load in <head> right after side_nav.css so the closed state is applied before first paint (no flash).
   The nav always starts closed on every page load; opening it lasts until the page is left. */
(function () {
  var root = document.documentElement;
  root.classList.add('nav-collapsed');

  function init() {
    var shell = document.querySelector('.shell'), nav = document.querySelector('.sidebar.side-nav');
    if (!shell || !nav) return;
    if (!nav.id) nav.id = 'side-nav';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sn-handle';
    btn.setAttribute('aria-controls', nav.id);
    btn.innerHTML = '<span class="sn-handle-chev" aria-hidden="true"></span><span class="sn-handle-label">Menu</span>';
    shell.appendChild(btn);
    function sync() {
      var open = !root.classList.contains('nav-collapsed');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.title = open ? 'Hide menu' : 'Show menu';
    }
    btn.addEventListener('click', function () {
      root.classList.toggle('nav-collapsed');
      sync();
    });
    sync();
    // enable the slide animation only after the first paint, so the saved state does not animate on load
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { root.classList.add('nav-ready'); }); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
