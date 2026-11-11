/* RS filter row: multi-select overlays (same behaviour as rs_dashboard.html).
   Period starts with every option checked and applies live: it shows/hides the Sep FY27 Act group
   (every column except Line, QTD/YTD/ROY/FY and BUs), QTD, YTD, ROY and FY columns in each table.pl
   that has those headers. Product / Geography / Channel apply with the Apply button. */
(function () {
  'use strict';
  var row = document.getElementById('filterrow');
  if (!row) return;
  var DATA = {
    prod: ['401K Small', '401K Mid', '401K Large', 'Custom (Core K)', 'Simple', 'SEP', 'EDC', 'Easy Pay', 'All other'],
    geo:  ['APAC', 'Americas', 'EMEA', 'Japan'],
    ch:   ['Direct sales', 'Inside sales', 'Channel partners', 'Digital / self-serve', 'Existing-client cross-sell'],
    period: ['Current Period (September)', 'QTD', 'YTD', 'ROY', 'FY']
  };
  var NS = 'http://www.w3.org/2000/svg';
  var filters = [];
  var openF = null;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function same(a, b) {
    if (a.size !== b.size) return false;
    var ok = true;
    a.forEach(function (v) { if (!b.has(v)) ok = false; });
    return ok;
  }
  function defaultSet(key) { return key === 'period' ? new Set(DATA.period) : new Set(); }

  /* Period options -> table columns, read from each table's header row */
  var periodTables = [];
  Array.prototype.forEach.call(document.querySelectorAll('table.pl'), function (t, i) {
    var hr = t.tHead && t.tHead.rows[t.tHead.rows.length - 1];
    if (!hr) return;
    var map = { 'Current Period (September)': [], 'QTD': [], 'YTD': [], 'ROY': [], 'FY': [] }, found = false;
    Array.prototype.forEach.call(hr.cells, function (th, c) {
      var txt = th.textContent.trim();
      if (map[txt] && txt !== 'Current Period (September)') { map[txt].push(c + 1); found = true; }
      else if (c > 0 && !th.classList.contains('bus')) map['Current Period (September)'].push(c + 1);
    });
    if (!found) return;
    t.setAttribute('data-rs-period', i);
    periodTables.push({ id: i, map: map });
  });
  var periodStyle = document.createElement('style');
  document.head.appendChild(periodStyle);
  function applyPeriod(f) {
    var sels = [];
    DATA.period.forEach(function (opt) {
      if (f.committed.has(opt)) return;
      periodTables.forEach(function (pt) {
        var t = 'table[data-rs-period="' + pt.id + '"]';
        pt.map[opt].forEach(function (c) { sels.push(t + ' th:nth-child(' + c + ')', t + ' td:nth-child(' + c + ')'); });
      });
    });
    periodStyle.textContent = sels.length ? sels.join(',') + '{display:none}' : '';
  }

  function paintBtn(f) {
    var n = f.committed.size;
    var active = !same(f.committed, defaultSet(f.key));
    f.lab.textContent = active ? f.name + ' (' + n + ')' : f.name;
    f.x.hidden = !active;
    f.pill.classList.toggle('fr-has', active);
    if (f.key === 'period') applyPeriod(f);
  }
  function paintDone(f) {
    var changed = !same(f.pending, f.committed);
    f.done.classList.toggle('fr-ready', changed);
    f.done.setAttribute('aria-disabled', changed ? 'false' : 'true');
  }
  function live(f) { if (f.key === 'period') { f.committed = new Set(f.pending); paintBtn(f); } }
  function paintList(f) {
    var q = f.search.value.trim().toLowerCase();
    f.list.textContent = '';
    var shown = 0;
    DATA[f.key].forEach(function (v) {
      if (q && v.toLowerCase().indexOf(q) === -1) return;
      shown++;
      var lb = el('label', 'fr-opt');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = f.pending.has(v);
      cb.addEventListener('change', function () {
        if (cb.checked) f.pending.add(v); else f.pending.delete(v);
        live(f);
        paintDone(f);
      });
      lb.appendChild(cb);
      lb.appendChild(el('span', null, v));
      f.list.appendChild(lb);
    });
    if (!shown) f.list.appendChild(el('div', 'fr-empty', 'No matches'));
  }
  function close(f, restoreFocus) {
    if (!f) return;
    f.panel.hidden = true;
    f.btn.setAttribute('aria-expanded', 'false');
    f.wrap.classList.remove('fr-open');
    if (openF === f) openF = null;
    if (restoreFocus) f.btn.focus();
  }
  function open(f) {
    if (openF && openF !== f) close(openF, false);
    f.pending = new Set(f.committed);
    f.search.value = '';
    paintList(f);
    paintDone(f);
    f.panel.hidden = false;
    f.btn.setAttribute('aria-expanded', 'true');
    f.wrap.classList.add('fr-open');
    openF = f;
    f.search.focus();
  }
  function clearOne(f) {
    f.committed = defaultSet(f.key);
    f.pending = defaultSet(f.key);
    paintBtn(f);
  }

  Array.prototype.forEach.call(row.querySelectorAll('.fr-wrap[data-f]'), function (wrap) {
    var key = wrap.getAttribute('data-f');
    var f = {
      key: key, wrap: wrap,
      pill: wrap.querySelector('.fr-pill'), btn: wrap.querySelector('.fr-btn'),
      lab: wrap.querySelector('.fr-lab'), x: wrap.querySelector('.fr-x'),
      committed: defaultSet(key), pending: defaultSet(key)
    };
    f.name = f.lab.textContent;

    var panel = el('div', 'fr-panel');
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', f.name + ' filter');

    var sw = el('div', 'fr-search');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16'); svg.setAttribute('width', '14'); svg.setAttribute('height', '14');
    svg.setAttribute('aria-hidden', 'true');
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', '6.5'); c.setAttribute('cy', '6.5'); c.setAttribute('r', '4.5');
    c.setAttribute('fill', 'none'); c.setAttribute('stroke', 'currentColor'); c.setAttribute('stroke-width', '1.6');
    var ln = document.createElementNS(NS, 'path');
    ln.setAttribute('d', 'M10 10l4.5 4.5'); ln.setAttribute('stroke', 'currentColor'); ln.setAttribute('stroke-width', '1.6');
    ln.setAttribute('fill', 'none');
    svg.appendChild(c); svg.appendChild(ln);
    var search = document.createElement('input');
    search.type = 'search'; search.placeholder = 'Search'; search.autocomplete = 'off';
    search.setAttribute('aria-label', 'Search ' + f.name);
    sw.appendChild(svg); sw.appendChild(search);

    var list = el('div', 'fr-list');
    var links = el('div', 'fr-links');
    var clr = el('button', null, 'Clear all'); clr.type = 'button';
    var inv = el('button', null, 'Invert'); inv.type = 'button';
    links.appendChild(clr); links.appendChild(inv);

    var foot = el('div', 'fr-foot');
    var cancel = el('button', 'fr-cancel', 'Cancel'); cancel.type = 'button';
    var done = el('button', 'fr-done', 'Apply'); done.type = 'button';
    foot.appendChild(cancel); foot.appendChild(done);

    panel.appendChild(sw); panel.appendChild(list); panel.appendChild(links); panel.appendChild(foot);
    wrap.appendChild(panel);
    f.panel = panel; f.search = search; f.list = list; f.done = done;

    f.btn.addEventListener('click', function () { if (f.panel.hidden) open(f); else close(f, false); });
    f.x.addEventListener('click', function () {
      clearOne(f);
      if (openF === f) close(f, false);
      f.btn.focus();
    });
    search.addEventListener('input', function () { paintList(f); });
    clr.addEventListener('click', function () { f.pending = new Set(); live(f); paintList(f); paintDone(f); });
    inv.addEventListener('click', function () {
      var next = new Set();
      DATA[f.key].forEach(function (v) { if (!f.pending.has(v)) next.add(v); });
      f.pending = next; live(f); paintList(f); paintDone(f);
    });
    cancel.addEventListener('click', function () { close(f, true); });
    done.addEventListener('click', function () {
      if (same(f.pending, f.committed)) { if (f.key === 'period') close(f, true); return; }
      f.committed = new Set(f.pending);
      paintBtn(f);
      close(f, true);
    });
    filters.push(f);
  });

  document.getElementById('fr-clear').addEventListener('click', function (e) {
    e.preventDefault();
    filters.forEach(clearOne);
    if (openF) close(openF, false);
  });
  document.addEventListener('click', function (e) {
    if (openF && !openF.wrap.contains(e.target)) close(openF, false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openF) close(openF, true);
  });
})();
