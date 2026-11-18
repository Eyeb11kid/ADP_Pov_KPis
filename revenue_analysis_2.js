/* Revenue Analysis 2 — shared behaviour (Dashboard Experience 2)
   Used by revenue_analysis_RS_2.html and revenue_analysis_NAS_2.html.

   Markup contract
   - Right-column tabs and main tabs:   [data-pane="<pane id>"]   (shows .right-tab-pane#<id>)
   - Main tab that jumps to a left box: [data-scroll="<element id>"]
   - Filter-strip pills:                .ef-pill[data-group="<name>"] (radio per group),
                                        optional data-pane, data-scroll and data-open="<child-row class> ..."
   - Row expanders:                     .exp-toggle[data-rows="<child-row class>"]
   - Expand/collapse all:               [data-expand-all="<pane id>"]
   - Headline toggles:                  #cfo-toggles .cfo-tg[data-k="fmt|cmp"] button[data-v]
   - GL filter pills:                   .pane-filter .ef-pill[data-glcat]
*/
(function () {
  'use strict';

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function $all(sel, root) { return (root || document).querySelectorAll(sel); }

  /* ---------- Tooltips ---------- */
  (function initTooltips() {
    var tip = document.getElementById('tip');
    if (!tip) return;
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest('[data-tip]');
      if (!t) return;
      tip.innerHTML = t.getAttribute('data-tip');
      tip.classList.add('on');
    });
    document.addEventListener('mousemove', function (e) {
      if (!tip.classList.contains('on')) return;
      var x = e.clientX + 14, y = e.clientY + 14;
      if (x + tip.offsetWidth > window.innerWidth - 12) x = e.clientX - tip.offsetWidth - 14;
      if (y + tip.offsetHeight > window.innerHeight - 12) y = e.clientY - tip.offsetHeight - 14;
      tip.style.left = Math.max(8, x) + 'px';
      tip.style.top = Math.max(8, y) + 'px';
    });
    document.addEventListener('mouseout', function (e) {
      if (e.target.closest('[data-tip]')) tip.classList.remove('on');
    });
  })();

  /* ---------- Tabs (right column + main tab strip stay in sync) ---------- */
  function setActive(list, isActive) {
    each(list, function (t) {
      var on = isActive(t);
      t.classList.toggle('active', on);
      if (t.tagName === 'BUTTON') t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function showPane(paneId) {
    var target = document.getElementById(paneId);
    if (!target) return;
    each($all('.right-tab-pane'), function (p) { p.classList.toggle('active', p === target); });
    setActive($all('.right-tab, #mainTabStrip .epm-tab[data-pane]'), function (t) {
      return t.getAttribute('data-pane') === paneId;
    });
    /* Main-tab scroll entries are only highlighted when clicked directly */
    each($all('#mainTabStrip .epm-tab[data-scroll]'), function (t) {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
  }

  function scrollToBox(id, tab) {
    var el = document.getElementById(id);
    if (!el) return;
    if (tab) setActive($all('#mainTabStrip .epm-tab'), function (t) { return t === tab; });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('flash');
    setTimeout(function () { el.classList.remove('flash'); }, 1200);
  }

  document.addEventListener('click', function (e) {
    var tab = e.target.closest('.right-tab[data-pane], #mainTabStrip .epm-tab[data-pane]');
    if (tab) { showPane(tab.getAttribute('data-pane')); return; }
    var jump = e.target.closest('#mainTabStrip .epm-tab[data-scroll]');
    if (jump) scrollToBox(jump.getAttribute('data-scroll'), jump);
  });

  /* ---------- Expand / collapse rows ---------- */
  function setRows(rowClass, open) {
    each($all('tr.' + rowClass), function (r) { r.classList.toggle('open', open); });
    each($all('.exp-toggle[data-rows="' + rowClass + '"]'), function (t) { t.textContent = open ? '\u2212' : '+'; });
  }

  document.addEventListener('click', function (e) {
    var tg = e.target.closest('.exp-toggle[data-rows]');
    if (tg) {
      setRows(tg.getAttribute('data-rows'), tg.textContent.trim() !== '\u2212');
      return;
    }
    var all = e.target.closest('[data-expand-all]');
    if (!all) return;
    var pane = document.getElementById(all.getAttribute('data-expand-all'));
    if (!pane) return;
    var anyClosed = false;
    each($all('tr.child-row', pane), function (r) { if (!r.classList.contains('open')) anyClosed = true; });
    each($all('.exp-toggle[data-rows]', pane), function (t) { setRows(t.getAttribute('data-rows'), anyClosed); });
  });

  /* ---------- Filter-strip pills ---------- */
  each($all('.epm-filter-strip .ef-pill'), function (pill) {
    pill.addEventListener('click', function () {
      var group = pill.getAttribute('data-group');
      if (group) {
        each($all('.epm-filter-strip .ef-pill[data-group="' + group + '"]'), function (p) {
          p.classList.toggle('active', p === pill);
        });
      }
      var pane = pill.getAttribute('data-pane');
      if (pane) showPane(pane);
      var scroll = pill.getAttribute('data-scroll');
      if (scroll) scrollToBox(scroll, null);
      var open = pill.getAttribute('data-open');
      if (open) open.split(/\s+/).forEach(function (c) { if (c) setRows(c, true); });
    });
  });

  /* ---------- Headline KPI toggles ---------- */
  (function initHeadlineToggles() {
    var wrap = document.getElementById('cfo-toggles');
    var hk = document.getElementById('headline-kpis');
    if (!wrap || !hk) return;
    each($all('.cfo-tg button', wrap), function (b) {
      b.addEventListener('click', function () {
        var key = b.parentNode.getAttribute('data-k');
        hk.setAttribute('data-' + key, b.getAttribute('data-v'));
        each(b.parentNode.querySelectorAll('button'), function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
      });
    });
  })();

  /* ---------- GL journal inspector (pages that include #tab-gltxn) ---------- */
  function filterGlTab(cat) {
    each($all('#tabGlTable tbody tr'), function (r) {
      r.style.display = (cat === 'all' || r.getAttribute('data-glcat') === cat) ? '' : 'none';
    });
    each($all('#tab-gltxn .pane-filter .ef-pill'), function (p) {
      p.classList.toggle('active', p.getAttribute('data-glcat') === cat);
    });
  }

  each($all('#tab-gltxn .pane-filter .ef-pill[data-glcat]'), function (p) {
    p.addEventListener('click', function () { filterGlTab(p.getAttribute('data-glcat')); });
  });

  window.inspectGlCategory = function (cat, label) {
    showPane('tab-gltxn');
    if (cat) filterGlTab(cat);
    var sub = document.getElementById('glInspectorSub');
    if (sub && label) sub.textContent = 'Filtered: ' + label;
  };
})();
