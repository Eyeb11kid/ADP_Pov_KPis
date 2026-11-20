/* GL transaction ledger behaviour: sort on any column, pagination at 100 rows, row count.
   Markup contract: table#glTable with a single header row. filterTable() (in each page) marks filtered-out rows with
   class "gl-f" and then calls glRender(true). This file only decides which of the remaining rows are on the current page. */
(function () {
  'use strict';
  var PAGE_SIZE = 100;
  var tbl = document.getElementById('glTable');
  if (!tbl) return;
  var body = tbl.tBodies[0], heads = Array.prototype.slice.call(tbl.tHead.rows[0].cells);
  var page = 1, sortCol = -1, sortDir = 1;

  var bar = document.createElement('div');
  bar.className = 'gl-pager';
  bar.setAttribute('role', 'navigation');
  bar.setAttribute('aria-label', 'Ledger pagination');
  bar.innerHTML = '<span class="gl-count" id="glRowCount" aria-live="polite"></span><span class="gl-nav" id="glNav"></span>';
  tbl.parentNode.insertAdjacentElement('afterend', bar);
  var countEl = bar.querySelector('#glRowCount'), navEl = bar.querySelector('#glNav');

  var MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function keyOf(text) {
    var t = text.trim();
    var d = /^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/.exec(t);
    if (d && MON[d[2].toLowerCase()] !== undefined) {
      var y = +d[3]; if (y < 100) y += 2000;
      return { n: Date.UTC(y, MON[d[2].toLowerCase()], +d[1]) };
    }
    var neg = /^\(.*\)$/.test(t) || /^-/.test(t);
    var num = t.replace(/[,$()\s]/g, '').replace(/^-/, '');
    if (/^\d+(\.\d+)?$/.test(num)) return { n: (neg ? -1 : 1) * parseFloat(num) };
    var lead = /^(\d+)\b/.exec(t);          /* e.g. "1 (FY27)" */
    if (lead) return { n: +lead[1], s: t.toLowerCase() };
    return { s: t.toLowerCase() };
  }
  function cmp(a, b) {
    if (a.n !== undefined && b.n !== undefined && a.n !== b.n) return a.n < b.n ? -1 : 1;
    if (a.n !== undefined && b.n !== undefined && a.s === undefined) return 0;
    var as = a.s === undefined ? '' : a.s, bs = b.s === undefined ? '' : b.s;
    return as.localeCompare(bs, undefined, { numeric: true });
  }

  function sortBy(i) {
    sortDir = (sortCol === i) ? -sortDir : 1;
    sortCol = i;
    var rows = Array.prototype.slice.call(body.rows).map(function (r, idx) {
      return { r: r, k: keyOf(r.cells[i] ? r.cells[i].textContent : ''), i: idx };
    });
    rows.sort(function (x, y) { return (cmp(x.k, y.k) * sortDir) || (x.i - y.i); });
    rows.forEach(function (o) { body.appendChild(o.r); });
    heads.forEach(function (h, j) { h.setAttribute('aria-sort', j === i ? (sortDir > 0 ? 'ascending' : 'descending') : 'none'); });
    render(true);
  }
  heads.forEach(function (h, i) {
    h.setAttribute('tabindex', '0');
    h.setAttribute('aria-sort', 'none');
    h.addEventListener('click', function () { sortBy(i); });
    h.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy(i); } });
  });

  function btn(label, p, opts) {
    opts = opts || {};
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    if (opts.aria) b.setAttribute('aria-label', opts.aria);
    if (opts.disabled) b.disabled = true;
    if (opts.active) { b.classList.add('active'); b.setAttribute('aria-current', 'page'); }
    b.addEventListener('click', function () { page = p; render(false); });
    return b;
  }

  function render(resetPage) {
    if (resetPage) page = 1;
    var all = Array.prototype.slice.call(body.rows);
    var shown = all.filter(function (r) { return !r.classList.contains('gl-f'); });
    var pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    if (page > pages) page = pages;
    var start = (page - 1) * PAGE_SIZE, end = Math.min(start + PAGE_SIZE, shown.length);
    all.forEach(function (r) { r.style.display = 'none'; });
    shown.forEach(function (r, i) { r.style.display = (i >= start && i < end) ? '' : 'none'; });

    countEl.textContent = shown.length
      ? 'Rows ' + (start + 1) + '\u2013' + end + ' of ' + shown.length + (shown.length !== all.length ? ' (filtered from ' + all.length + ')' : '')
      : 'Rows 0 of ' + all.length;

    navEl.innerHTML = '';
    navEl.appendChild(btn('\u2039', page - 1, { aria: 'Previous page', disabled: page === 1 }));
    var last = 0;
    for (var p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - page) <= 1) {
        if (last && p - last > 1) { var g = document.createElement('span'); g.className = 'gl-gap'; g.textContent = '\u2026'; navEl.appendChild(g); }
        navEl.appendChild(btn(String(p), p, { aria: 'Page ' + p, active: p === page }));
        last = p;
      }
    }
    navEl.appendChild(btn('\u203A', page + 1, { aria: 'Next page', disabled: page === pages }));
  }

  window.glRender = render;
  render(true);
})();
