/* Polaris global header: Global navigation (P01–P07), sticky Context bar, Fiscal period, Time view,
   Comparison, Product / Function filters + chips, Data status, Breadcrumbs, Dashboard/Report toggle.
   Vanilla JS, no dependencies. All text is written with textContent / setAttribute (no innerHTML).
   Prototype first applied to rs_dashboard_3.html. Sample data below is a stand-in for OneData services. */
(function () {
  'use strict';

  var body = document.body;

  /* ============================================================ configuration */
  var CONFIG = {
    timeViewControl: body.getAttribute('data-pf-timeview-control') === 'dropdown' ? 'dropdown' : 'segmented',
    chipsVisible: 4,          // desktop / tablet
    chipsVisibleNarrow: 2,    // <= 768px
    loadingMs: 500,           // simulated refresh duration (prototype)
    helpUrl: 'index.html',    // OPEN QUESTION: help destination not defined
    storageKey: 'polaris.ctx.v1',
    roleKey: 'polaris.role.v1',
    trailKey: 'polaris.trail.v1',
    pendingKey: 'polaris.drill.v1',
    simKey: 'polaris.sim.working.v1'
  };

  /* ============================================================ reference data (prototype) */
  var PAGES = [
    { code: 'P01', label: 'CFO Dashboard',     area: 'corp',   file: { ALL: 'index.html' }, cfoOnly: true, product: false, func: false, toggle: true,  views: ['month', 'ytd', 'fy'] },
    // SEC P&L link hidden for now (uncomment to restore):
    // { code: 'P02', label: 'SEC P&L',           area: 'corp',   file: { ALL: 'sec_report.html' },       cfoOnly: true, product: false, func: false, toggle: false, views: null },
    { code: 'P03', label: 'BU Dashboard',      area: 'bu',     file: { RS: 'Rs_Dashboord_3_Simple.html', NAS: 'nas_dashboard_2.html' }, product: true, func: false, toggle: true,  views: null },
    { code: 'P08', label: 'RS Dashboard (Draft)', area: 'bu', file: { RS: 'rs_dashboard_draft.html' }, product: true, func: false, toggle: true, views: null },
    { code: 'P04', label: 'Revenue Analysis',  area: 'bu',     file: { RS: 'revenue_analysis_RS_2.html', NAS: 'revenue_analysis_NAS_2.html' }, product: true, func: false, toggle: true, views: null },
    { code: 'P05', label: 'Expense P&L',       area: 'bu',     file: { RS: 'expense_pl_RS_2.html', NAS: 'expense_pl_NAS_2.html' }, product: true, func: true, toggle: true, views: null },
    { code: 'P06', label: 'NPI P&L',           area: 'bu',     file: { NAS: 'NAS_npi_2.html' },        product: true, func: false, toggle: true,  views: null, hidden: true },
    { code: 'P07', label: 'Transaction Detail', area: 'detail', file: { RS: 'rs_transaction_detail_2.html', NAS: 'NAS_transaction_detail_2.html' }, product: true, func: false, toggle: false, views: null }
  ];

  var BUS = {
    RS: {
      short: 'RS', name: 'Retirement Services',
      products: [
        { id: '401k-small', label: '401K Small' }, { id: '401k-mid', label: '401K Mid' }, { id: '401k-large', label: '401K Large' },
        { id: 'custom', label: 'Custom' }, { id: 'simple', label: 'Simple' }, { id: 'sep', label: 'SEP' },
        { id: 'edc', label: 'EDC' }, { id: 'easy-pay', label: 'Easy Pay' }, { id: 'all-other', label: 'All other' }
      ],
      functions: [
        { id: 'service', label: 'Service' }, { id: 'implementation', label: 'Implementation' }, { id: 'production', label: 'Production' },
        { id: 'product-direct-costs', label: 'Product Direct Costs' }, { id: 'gen-mgmt-sec-reporting', label: 'General Management and SEC Reporting' },
        { id: 'other-sec', label: 'Other SEC' }, { id: 'bd-strategy', label: 'Business Development and Strategy' },
        { id: 'non-nde-marketing', label: 'Non-NDE Marketing' }
      ]
    },
    NAS: {
      short: 'NAS', name: 'NAS (Lyric)',
      products: [
        { id: 'payroll', label: 'Payroll' }, { id: 'tlm', label: 'TLM' }, { id: 'benefits', label: 'Benefits' }, { id: 'talent', label: 'Talent' },
        { id: 'unresolved', label: '\u201C-ric COS\u201D (unresolved)', disabled: true, note: 'Open question' }
      ],
      functions: [{ id: 'base-department', label: 'Base Department' }, { id: 'implementation', label: 'Implementation' }]
    }
  };

  // OPEN QUESTION: how the Corporate CFO role / BU entitlements are resolved in production.
  var ROLES = {
    cfo: { label: 'Corporate CFO', corp: true,  bus: ['RS', 'NAS'] },
    rs:  { label: 'RS BU user',    corp: false, bus: ['RS'] },
    nas: { label: 'NAS BU user',   corp: false, bus: ['NAS'] }
  };

  var TIME_VIEWS = [
    { id: 'month', label: 'Month' }, { id: 'qtd', label: 'QTD' }, { id: 'ytd', label: 'YTD' },
    { id: 'roy', label: 'ROY', oq: 'ROY calculation logic is unresolved (OQ-28)' }, { id: 'fy', label: 'FY' }
  ];
  var COMPARES = [{ id: 'plan', label: 'Plan' }, { id: 'forecast', label: 'Forecast' }, { id: 'py', label: 'Prior year' }];
  var FORMATS = [{ id: 'both', label: '$ + %' }, { id: 'val', label: '$ only' }];
  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var WEEKS_454 = [4, 5, 4];
  var PER_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

  // Stand-in for the OneData availability service. Fiscal year = July–June.
  var DATA = { first: '2024-07', latest: '2026-09', refreshed: 'Oct 5, 2026 6:15 AM ET', simWorking: false };

  /* ============================================================ helpers */
  function $(id) { return document.getElementById(id); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function h(tag, attrs, kids) {
    var e = document.createElement(tag), k, v;
    if (attrs) for (k in attrs) {
      v = attrs[k];
      if (v === false || v === null || v === undefined) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ICON = {
    chev: 'M6 9l6 6 6-6', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12l5 5L20 7', menu: 'M4 6h16M4 12h16M4 18h16',
    help: 'M9.5 9a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 4M12 17.5v.01', warn: 'M12 3l10 18H2zM12 10v5M12 18v.01', lock: 'M6 11h12v9H6zM8 11V8a4 4 0 018 0v3'
  };
  function svg(name, size, sw) {
    var s = document.createElementNS(SVGNS, 'svg'), p = document.createElementNS(SVGNS, 'path');
    s.setAttribute('width', size || 10); s.setAttribute('height', size || 10); s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', sw || 2.5);
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('class', 'pf-ico');
    p.setAttribute('d', ICON[name]); s.appendChild(p);
    return s;
  }
  function tip(el, text) {
    if (text) { el.setAttribute('data-pf-tt', text); el.setAttribute('aria-description', text); }
    else { el.removeAttribute('data-pf-tt'); el.removeAttribute('aria-description'); }
  }
  function store(key, val) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage unavailable: URL params still carry state */ } }
  function load(key) { try { return JSON.parse(sessionStorage.getItem(key)); } catch (e) { return null; } }
  function toArr(v) { return Array.isArray(v) ? v : (typeof v === 'string' && v ? v.split(',') : []); }
  function inList(list, v) { return list.indexOf(v) > -1; }
  function ids(list) { return list.map(function (o) { return o.id; }); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  /* ---- fiscal calendar ---- */
  function fiscalYearOf(key) { var y = +key.slice(0, 4), m = +key.slice(5, 7); return m >= 7 ? y + 1 : y; }
  function fyLabel(fy) { return 'FY' + String(fy).slice(2); }
  function fyMonths(fy) {
    var out = [], i, m, y;
    for (i = 0; i < 12; i++) { m = 7 + i; y = fy - 1; if (m > 12) { m -= 12; y = fy; } out.push(y + '-' + pad(m)); }
    return out;
  }
  function monthName(key) { return MONTH_NAMES[+key.slice(5, 7) - 1]; }
  function hasActual(key) { return PER_RE.test(key) && key >= DATA.first && key <= DATA.latest; }
  function versionOf(key) { return (key === DATA.latest && DATA.simWorking) ? 'working' : 'final'; }
  function fyList() { var out = [], fy; for (fy = fiscalYearOf(DATA.latest); fy >= fiscalYearOf(DATA.first); fy--) out.push(fy); return out; } // newest first

  /* ============================================================ page / role / state */
  var PAGE = null, i0;
  for (i0 = 0; i0 < PAGES.length; i0++) if (PAGES[i0].code === body.getAttribute('data-pf-page')) PAGE = PAGES[i0];
  if (!PAGE) return;
  var PBU = BUS[body.getAttribute('data-pf-bu')] ? body.getAttribute('data-pf-bu') : null;

  var rs0 = load(CONFIG.roleKey);
  var ROLE_KEY = ROLES[rs0] ? rs0 : 'cfo';          // prototype default so reviewers see all pages
  var ROLE = ROLES[ROLE_KEY];
  var stored0 = load(CONFIG.storageKey) || {};
  var CUR_BU = PBU || (BUS[stored0.bu] && inList(ROLE.bus, stored0.bu) ? stored0.bu : ROLE.bus[0]);
  var BUCFG = BUS[CUR_BU];
  DATA.simWorking = load(CONFIG.simKey) === true;

  function canAccess(p, bu) {
    if (p.cfoOnly) return ROLE.corp;
    return !bu || ROLE.corp || inList(ROLE.bus, bu);
  }
  function pageFile(p, bu) { return p.file[bu] || p.file.ALL || null; }
  function viewsOf(p) { return p.views || ids(TIME_VIEWS); }

  var state = defaults();
  function defaults() { return { per: DATA.latest, tv: 'month', cmp: 'plan', fmt: 'both', prod: [], fn: [] }; }
  function allow(list, cfg) { return cfg.filter(function (o) { return !o.disabled && inList(list, o.id); }).map(function (o) { return o.id; }); }
  function applySrc(s, src, trustFilters) {
    if (!src || typeof src !== 'object') return;
    if (typeof src.per === 'string' && hasActual(src.per)) s.per = src.per;
    if (inList(ids(TIME_VIEWS), src.tv)) s.tv = src.tv;
    if (inList(ids(COMPARES), src.cmp)) s.cmp = src.cmp;
    if (inList(ids(FORMATS), src.fmt)) s.fmt = src.fmt;
    if (trustFilters && BUCFG) {
      if (src.prod !== undefined) s.prod = allow(toArr(src.prod), BUCFG.products);
      if (src.fn !== undefined) s.fn = allow(toArr(src.fn), BUCFG.functions);
    }
  }
  function loadState() {
    var s = defaults(), q = {}, p;
    applySrc(s, stored0, stored0.bu === CUR_BU);
    try {
      p = new URLSearchParams(location.search);
      ['per', 'tv', 'cmp', 'fmt', 'prod', 'fn'].forEach(function (k) { if (p.has(k)) q[k] = p.get(k); });
    } catch (e) { q = {}; }
    applySrc(s, q, true);
    return s;
  }
  state = loadState();

  function effTV() { return inList(viewsOf(PAGE), state.tv) ? state.tv : 'month'; }
  function snapshot() { return { per: state.per, tv: state.tv, cmp: state.cmp, fmt: state.fmt, prod: state.prod.slice(), fn: state.fn.slice() }; }
  function toQuery(s) {
    var q = ['per=' + s.per, 'tv=' + s.tv, 'cmp=' + s.cmp, 'fmt=' + s.fmt];
    if (s.prod.length) q.push('prod=' + s.prod.map(encodeURIComponent).join(','));
    if (s.fn.length) q.push('fn=' + s.fn.map(encodeURIComponent).join(','));
    return q.join('&');
  }
  function withState(file, snap) { return file + '?' + toQuery(snap || state); }
  function persist() { var s = snapshot(); s.bu = CUR_BU; store(CONFIG.storageKey, s); }
  function syncURL() { try { var ln = new URLSearchParams(location.search).get('line'); history.replaceState(null, '', location.pathname + '?' + toQuery(state) + (ln && /^[A-Za-z0-9_-]+$/.test(ln) ? '&line=' + ln : '')); } catch (e) { /* file:// restrictions */ } }

  /* ============================================================ shared UI plumbing */
  var live, tt, activePanel = null, loadTimer = null;
  function say(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }
  function narrow() { return window.matchMedia('(max-width: 768px)').matches; }

  // tooltip (hover + keyboard focus)
  function showTT(el) {
    var r = el.getBoundingClientRect();
    tt.textContent = el.getAttribute('data-pf-tt'); tt.hidden = false;
    var w = tt.offsetWidth, x = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    tt.style.left = x + 'px'; tt.style.top = (r.bottom + 6) + 'px';
  }
  function hideTT() { tt.hidden = true; }

  // popover / bottom-sheet manager (one at a time)
  function closePanel(returnFocus) {
    if (!activePanel) return;
    var p = activePanel; activePanel = null;
    p.el.remove(); if (p.backdrop) p.backdrop.remove();
    p.anchor.setAttribute('aria-expanded', 'false');
    if (returnFocus) p.anchor.focus();
  }
  function openPanel(anchor, title, content, opts) {
    opts = opts || {};
    closePanel(false);
    var sheet = narrow();
    var close = h('button', { type: 'button', class: 'pf-close' }, ['Done']);
    // opts.hideTitle: no visible title; the desktop panel drops its title bar, the mobile sheet keeps an empty one for the Done button. The aria-label still names the dialog.
    var hdr = (opts.hideTitle && !sheet) ? null : h('div', { class: 'pf-panel-hdr' }, [h('span', { text: opts.hideTitle ? '' : title }), close]);
    var el = h('div', { class: 'pf-panel' + (sheet ? ' pf-sheet' : ''), role: 'dialog', 'aria-label': title, tabindex: '-1' }, [hdr, content]);
    if (opts.footer) el.appendChild(opts.footer);
    var backdrop = sheet ? h('div', { class: 'pf-backdrop' }) : null;
    if (backdrop) { body.appendChild(backdrop); backdrop.addEventListener('click', function () { closePanel(true); }); }
    body.appendChild(el);
    anchor.setAttribute('aria-expanded', 'true');
    if (!sheet) {
      var r = anchor.getBoundingClientRect();
      el.style.top = (r.bottom + 4) + 'px';
      el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8)) + 'px';
    }
    close.addEventListener('click', function () { closePanel(true); });
    activePanel = { el: el, anchor: anchor, backdrop: backdrop };
    var f = opts.focus ? opts.focus() : null;
    (f || el).focus({ preventScroll: true });
  }

  document.addEventListener('mousedown', function (e) {
    if (activePanel && !activePanel.el.contains(e.target) && !activePanel.anchor.contains(e.target)) closePanel(false);
  });
  document.addEventListener('focusin', function (e) {
    if (activePanel && !activePanel.el.contains(e.target) && e.target !== activePanel.anchor) closePanel(false);
    var t = e.target.closest && e.target.closest('[data-pf-tt]'); if (t) showTT(t);
  });
  document.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest('[data-pf-tt]')) hideTT(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hideTT(); if (activePanel) { e.preventDefault(); closePanel(true); } }
    else if (e.key === 'Tab' && activePanel && activePanel.el.contains(e.target)) {
      // at either edge of the panel, hand focus back to the trigger so the browser then advances from there
      var el = activePanel.el, tabs = Array.prototype.filter.call(el.querySelectorAll('a[href],button,select,[tabindex="0"]'), function (n) { return n.offsetParent !== null; });
      var after = tabs.filter(function (n) { return n !== e.target && (e.target.compareDocumentPosition(n) & 4); });
      var before = tabs.filter(function (n) { return n !== e.target && (e.target.compareDocumentPosition(n) & 2); });
      if ((!e.shiftKey && !after.length) || (e.shiftKey && !before.length)) closePanel(true);
    }
  });
  document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('[data-pf-tt]'); if (t) showTT(t); });
  document.addEventListener('mouseout', function (e) { if (e.target.closest && e.target.closest('[data-pf-tt]')) hideTT(); });
  window.addEventListener('resize', function () { closePanel(false); hideTT(); });
  window.addEventListener('scroll', function () { if (activePanel && !activePanel.backdrop) closePanel(false); hideTT(); updateStuck(); }, { passive: true });

  /* ---- listbox (single or multi select) ---- */
  function buildList(label, items, multi, getSel, onPick) {
    var el = h('div', { class: 'pf-list', role: 'listbox', 'aria-label': label, 'aria-multiselectable': multi ? 'true' : 'false' });
    var rows = items.map(function (it) {
      var row = h('div', { class: 'pf-opt', role: 'option', tabindex: '-1', 'aria-selected': 'false', 'aria-disabled': it.disabled ? 'true' : 'false', 'data-id': it.id });
      row.appendChild(multi ? h('span', { class: 'pf-cb', 'aria-hidden': 'true' }, [svg('check', 10, 3.5)]) : h('span', { class: 'pf-radio-mark', 'aria-hidden': 'true' }));
      row.appendChild(h('span', { class: 'pf-grow' }, [h('span', { class: 'pf-main', text: it.label }), it.sub ? h('span', { class: 'pf-sub', text: it.sub }) : null]));
      if (it.note) row.appendChild(h('span', { class: 'pf-right', text: it.note }));
      function pick() { if (!it.disabled) onPick(it.id); }
      row.addEventListener('click', pick);
      row._pick = pick;
      return row;
    });
    rows.forEach(function (r) { el.appendChild(r); });
    function update() {
      var sel = getSel();
      rows.forEach(function (r) {
        var on = inList(sel, r.getAttribute('data-id'));
        r.setAttribute('aria-selected', on ? 'true' : 'false');
        if (!multi) r.querySelector('.pf-radio-mark').textContent = on ? '\u2713' : '';
      });
    }
    el.addEventListener('keydown', function (e) {
      var i = rows.indexOf(document.activeElement), n = rows.length;
      if (e.key === 'ArrowDown') i = Math.min(n - 1, i + 1);
      else if (e.key === 'ArrowUp') i = Math.max(0, i - 1);
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = n - 1;
      else if (e.key === ' ' || e.key === 'Enter') { if (i > -1) { e.preventDefault(); rows[i]._pick(); } return; }
      else return;
      e.preventDefault(); rows[i].focus();
    });
    update();
    return { el: el, update: update, first: function () { var s = getSel(), k; for (k = 0; k < rows.length; k++) if (inList(s, rows[k].getAttribute('data-id'))) return rows[k]; return rows[0]; } };
  }

  /* ---- segmented radiogroup ---- */
  function buildSeg(lblId, items, get, set) {
    var el = h('div', { class: 'pf-seg', role: 'radiogroup', 'aria-labelledby': lblId }), btns = {};
    items.forEach(function (it) {
      var b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', tabindex: '-1' }, [it.label]);
      if (it.oq) b.appendChild(h('span', { class: 'pf-oq', 'aria-hidden': 'true' }));
      b.addEventListener('click', function () { if (!it.disabled) set(it.id); });
      btns[it.id] = b; el.appendChild(b);
    });
    el.addEventListener('keydown', function (e) {
      var en = items.filter(function (it) { return !it.disabled; }).map(function (it) { return it.id; }), i = en.indexOf(get()), n;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % en.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + en.length) % en.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = en.length - 1; else return;
      e.preventDefault(); set(en[n]); btns[en[n]].focus();
    });
    function update() {
      var cur = get();
      items.forEach(function (it) {
        var b = btns[it.id], on = cur === it.id;
        b.setAttribute('aria-checked', on ? 'true' : 'false'); b.setAttribute('tabindex', on ? '0' : '-1');
        b.setAttribute('aria-disabled', it.disabled ? 'true' : 'false');
        tip(b, it.disabled ? it.tip : it.oq);
      });
    }
    return { el: el, update: update };
  }

  /* ============================================================ GLOBAL NAVIGATION */
  var navLinks = [];
  function buildNav() {
    var nav = $('pf-nav'); if (!nav) return;
    nav.setAttribute('aria-label', 'Polaris pages');
    var ul = h('ul', { class: 'gn-list' });
    var groups = [['corp', 'Corporate'], ['bu', CUR_BU + ' business unit'], ['detail', 'Detail']];
    var current = null;
    groups.forEach(function (g) {
      var items = PAGES.filter(function (p) { return p.area === g[0] && (!p.cfoOnly || ROLE.corp) && !p.hidden; });
      if (!items.length) return;
      ul.appendChild(h('li', { class: 'gn-group', text: g[1] }));
      items.forEach(function (p) { ul.appendChild(h('li', null, [navItem(p, 'gn-item')])); });
    });
    PAGES.forEach(function (p) { if (p.code === PAGE.code) current = p; });
    var menuBtn = h('button', { type: 'button', class: 'gn-menu-btn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false' }, [svg('menu', 14, 2.2), 'Menu', h('span', { class: 'gn-code', text: PAGE.code })]);
    menuBtn.addEventListener('click', function () {
      var list = h('div', { role: 'list' });
      groups.forEach(function (g) {
        var items = PAGES.filter(function (p) { return p.area === g[0] && (!p.cfoOnly || ROLE.corp) && !p.hidden; });
        if (!items.length) return;
        list.appendChild(h('div', { class: 'gn-menu-grp', text: g[1] }));
        items.forEach(function (p) { list.appendChild(navItem(p, 'gn-menu-link')); });
      });
      openPanel(menuBtn, 'Pages', list, { focus: function () { return list.querySelector('[aria-current="page"]') || list.querySelector('a'); } });
    });
    nav.appendChild(menuBtn);
    nav.appendChild(ul);
  }
  function navItem(p, cls) {
    var file = pageFile(p, CUR_BU), code = h('span', { class: 'gn-code', text: p.code }), el;
    if (!file) {
      el = h('span', { class: cls, role: 'link', tabindex: '0', 'aria-disabled': 'true' }, [code, p.label]);
      tip(el, 'Not available for ' + CUR_BU + ' in this prototype');
      return el;
    }
    el = h('a', { class: cls, href: withState(file) }, [code, p.label]);
    if (p.code === PAGE.code) el.setAttribute('aria-current', 'page');
    navLinks.push({ a: el, file: file });
    return el;
  }
  function updateHrefs() { navLinks.forEach(function (n) { n.a.setAttribute('href', withState(n.file)); }); }

  /* ============================================================ CONTEXT BAR */
  var ui = {};
  function field(lbl, id, control) { return h('div', { class: 'ctx-field' }, [h('span', { class: 'ctx-lbl', id: id, text: lbl }), control]); }
  function pfButton(lblId, id, text) {
    var v = h('span', { class: 'pf-v', text: text });
    var b = h('button', { type: 'button', class: 'pf-btn', id: id, 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-labelledby': lblId + ' ' + id }, [v, svg('chev')]);
    b._v = v; return b;
  }

  function buildContext() {
    var ctx = $('pf-context'); if (!ctx) return;
    ui.ctx = ctx;
    ctx.setAttribute('role', 'region'); ctx.setAttribute('aria-label', 'Context');

    ui.summary = h('button', { type: 'button', class: 'ctx-summary', 'aria-expanded': 'false', 'aria-controls': 'pf-ctx-body' }, [h('span', { id: 'pf-sum-t' }), svg('chev', 12)]);
    ui.summary.addEventListener('click', function () {
      var open = !ctx.classList.contains('is-open');
      ctx.classList.toggle('is-open', open); ui.summary.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Row 1: BU, (Function if Expense P&L), Fiscal period
    ui.bu = pfButton('pf-l-bu', 'pf-bu', ''); ui.bu.addEventListener('click', openBU);
    ui.per = pfButton('pf-l-per', 'pf-per', ''); ui.per.addEventListener('click', function () { openPeriod(); });

    var row1Items = [field('Business unit', 'pf-l-bu', ui.bu)];
    if (PAGE.func) {
      ui.fnBtn = h('button', { type: 'button', class: 'pf-btn', id: 'pf-fn', 'aria-haspopup': 'dialog', 'aria-expanded': 'false', 'aria-labelledby': 'pf-l-fn pf-fn' }, [h('span', { class: 'pf-v', text: 'All' }), h('span', { class: 'pf-badge', hidden: true }), svg('chev')]);
      ui.fnBtn.addEventListener('click', function () { openFilter('fn'); });
      row1Items.push(field('Function', 'pf-l-fn', ui.fnBtn));
    }
    row1Items.push(field('Fiscal period', 'pf-l-per', ui.per));

    var help = h('a', { class: 'ctx-help', href: CONFIG.helpUrl, target: '_blank', rel: 'noopener' }, [svg('help', 13, 2), 'Help']);

    // Help sits in the top bar, to the left of the person icon; falls back to the filter row if a page has no avatar
    var avatar = document.querySelector('.chrome .avatar');
    if (avatar && avatar.parentNode) avatar.parentNode.insertBefore(help, avatar);

    var row1 = h('div', { class: 'ctx-row' }, row1Items);

    // Row 2: chips, clear, data status
    ui.chips = h('ul', { class: 'pf-chips', 'aria-label': 'Active filters' });
    ui.clear = h('button', { type: 'button', class: 'pf-link', text: 'Clear all', hidden: true });
    ui.clear.addEventListener('click', function () { state.fn = []; commit('All filters cleared'); if (ui.fnBtn) ui.fnBtn.focus(); });
    ui.ds = h('div', { class: 'ds', role: 'group', 'aria-label': 'Data status' });
    var row2Items = [ui.chips, ui.clear];
    if (!avatar) row2Items.push(help);
    // Data status ("Refreshed ...") sits in the top bar, left of the Cycle text; falls back to the filter row if there is no top bar
    var chromeR = document.querySelector(".chrome .chrome-r");
    if (chromeR) chromeR.insertBefore(ui.ds, chromeR.firstChild); else row2Items.push(ui.ds);
    var row2 = h('div', { class: 'ctx-row ctx-row2' }, row2Items);
    if (!PAGE.func) row2.hidden = true;

    ui.banner = h('div', { class: 'ctx-banner', role: 'status', hidden: true }, [svg('warn', 14, 2), h('span', { text: 'Close in progress: figures may change.' })]);
    ctx.appendChild(ui.summary);
    ctx.appendChild(h('div', { class: 'ctx-body', id: 'pf-ctx-body' }, [row1, row2]));
    ctx.appendChild(ui.banner);
    window.matchMedia('(max-width: 768px)').addEventListener('change', function () { updateChips(); closePanel(false); });
  }

  /* ---- BU selector ---- */
  var CORP_ID = 'CORP';
  function openBU() {
    if (ui.bu.getAttribute('aria-disabled') === 'true') return;
    var items = ROLE.bus.map(function (k) { return { id: k, label: BUS[k].short, sub: BUS[k].name }; });
    // Corporate pages span all BUs: "Corporate" is the default selection and each BU option opens that BU's dashboard
    if (!PBU) items.unshift({ id: CORP_ID, label: 'Corporate', sub: 'All business units' });
    var list = buildList('Business unit', items, false, function () { return [PBU ? CUR_BU : CORP_ID]; }, function (k) {
      closePanel(true);
      if (k === CORP_ID || (PBU && k === CUR_BU)) return;
      var tgt = PBU ? (pageFile(PAGE, k) || pageFile(pageByCode('P03'), k)) // fall back to that BU's dashboard when the page has no counterpart
                    : pageFile(pageByCode('P03'), k);                      // from a corporate page, go to that BU's dashboard
      var snap = snapshot(); snap.prod = []; snap.fn = [];   // product/function values are BU-specific
      var s = snapshot(); s.bu = k; s.prod = []; s.fn = []; store(CONFIG.storageKey, s);
      if (tgt) location.href = withState(tgt, snap);
    });
    openPanel(ui.bu, 'Business unit', list.el, { focus: list.first });
  }

  /* ---- fiscal period selector ---- */
  // anchor is optional: the context-bar button by default, or any element marked data-pf-open="period"
  function openPeriod(anchor) {
    anchor = anchor && anchor.nodeType === 1 ? anchor : ui.per;
    var viewFY = fiscalYearOf(state.per), cells = [];
    var sel = h('select', { class: 'pf-sel', 'aria-label': 'Fiscal year' });
    fyList().forEach(function (fy) { sel.appendChild(h('option', { value: String(fy), text: fyLabel(fy) + (fy === fiscalYearOf(DATA.latest) ? ' (current)' : '') })); });
    sel.value = String(viewFY);
    var grid = h('div', { class: 'pf-months', role: 'listbox', 'aria-label': 'Fiscal months, 4-5-4 calendar' });
    function pick(key) { closePanel(true); state.per = key; commit('Period: ' + monthName(key) + ' ' + key.slice(0, 4)); }
    function draw() {
      grid.textContent = ''; cells = [];
      var months = fyMonths(viewFY), q, c;
      for (q = 0; q < 4; q++) {
        var row = h('div', { class: 'pf-q', role: 'presentation' }, [h('span', { class: 'pf-q-lbl', 'aria-hidden': 'true', text: 'Q' + (q + 1) })]);
        for (c = 0; c < 3; c++) (function (key, pos) {
          var ok = hasActual(key), ver = versionOf(key), wk = WEEKS_454[pos];
          var cell = h('div', { class: 'pf-cell', role: 'option', tabindex: '-1', 'aria-selected': key === state.per ? 'true' : 'false', 'aria-disabled': ok ? 'false' : 'true',
            'aria-label': monthName(key) + ' ' + key.slice(0, 4) + ', ' + wk + ' weeks' + (ok ? ', ' + (ver === 'final' ? 'Final' : 'Working') : ', no Actual data available') }, [
            h('span', { class: 'pf-m', text: monthName(key).slice(0, 3) }),
            h('span', { class: 'pf-y', text: key.slice(0, 4) }),
            h('span', { class: 'pf-wk', text: wk + ' wks' }),
            ok ? h('span', { class: 'pf-tag ' + ver, text: ver === 'final' ? 'Final' : 'Working' }) : h('span', { class: 'pf-tag', text: 'No Actual' })
          ]);
          cell._key = key; cell._ok = ok;
          cell.addEventListener('click', function () { if (ok) pick(key); });
          cells.push(cell); row.appendChild(cell);
        })(months[q * 3 + c], c);
        grid.appendChild(row);
      }
    }
    draw();
    sel.addEventListener('change', function () { viewFY = +sel.value; draw(); });
    grid.addEventListener('keydown', function (e) {
      var i = cells.indexOf(document.activeElement), n = i;
      if (e.key === 'ArrowRight') n = Math.min(11, i + 1); else if (e.key === 'ArrowLeft') n = Math.max(0, i - 1);
      else if (e.key === 'ArrowDown') n = Math.min(11, i + 3); else if (e.key === 'ArrowUp') n = Math.max(0, i - 3);
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = 11;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i > -1 && cells[i]._ok) pick(cells[i]._key); return; }
      else return;
      e.preventDefault(); cells[n].focus();
    });
    var wrap = h('div', null, [h('div', { class: 'pf-panel-hdr', style: 'border-radius:0;text-transform:none;letter-spacing:0' }, [h('span', null, ['Fiscal year ', sel]), h('small', { text: 'Jul\u2013Jun \u00B7 4-5-4' })]), grid]);
    openPanel(anchor, 'Fiscal period', wrap, { hideTitle: true, focus: function () {
      var f = null; cells.forEach(function (c) { if (c._key === state.per) f = c; }); return f || cells.filter(function (c) { return c._ok; })[0];
    } });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-pf-open="period"]');
    if (t) openPeriod(t);
  });

  /* ---- time view ---- */
  function setTV(id) { state.tv = id; commit('Time view: ' + byId(TIME_VIEWS, id).label); }

  /* ---- Product / Function filters ---- */
  function filterCfg(kind) { return { name: 'Function', items: BUCFG.functions, btn: ui.fnBtn }; }
  function openFilter(kind) {
    var cfg = filterCfg(kind);
    var list = buildList(cfg.name, cfg.items, true, function () { return state.fn; }, function (id) {
      var i = state.fn.indexOf(id);
      if (i > -1) state.fn.splice(i, 1); else state.fn.push(id);
      state.fn = cfg.items.filter(function (o) { return inList(state.fn, o.id); }).map(function (o) { return o.id; });
      list.update(); commit(cfg.name + ': ' + byId(cfg.items, id).label + (i > -1 ? ' removed' : ' added'));
    });
    var clear = h('button', { type: 'button', class: 'pf-link', text: 'Clear ' + cfg.name.toLowerCase() + ' selection' });
    clear.addEventListener('click', function () { state.fn = []; list.update(); commit(cfg.name + ' filter cleared'); });
    openPanel(cfg.btn, cfg.name + ' (multi-select)', list.el, { footer: h('div', { class: 'pf-panel-foot' }, [clear]), focus: list.first });
  }

  var chipsExpanded = false;
  function chipData() {
    var out = [];
    if (PAGE.func) {
      state.fn.forEach(function (id) {
        var item = byId(BUCFG.functions, id);
        if (item) out.push({ kind: 'fn', key: 'Function', id: id, label: item.label, inactive: false });
      });
    }
    return out;
  }
  function updateChips(focusIdx) {
    if (!ui.chips) return;
    var data = chipData(), max = narrow() ? CONFIG.chipsVisibleNarrow : CONFIG.chipsVisible;
    ui.chips.textContent = '';
    if (data.length) {
      var shown = chipsExpanded ? data : data.slice(0, max);
      shown.forEach(function (c, i) {
        var x = h('button', { type: 'button', class: 'pf-chip-x', 'aria-label': 'Remove filter ' + c.key + ': ' + c.label, 'aria-disabled': 'false' }, [svg('x', 10, 3)]);
        var li = h('li', { class: 'pf-chip pf-chip-function' }, [
          h('span', { class: 'pf-chip-k', text: c.key + ':' }), h('span', { class: 'pf-chip-v', text: c.label }), x]);
        x.addEventListener('click', function () {
          state.fn = state.fn.filter(function (v) { return v !== c.id; });
          commit(c.key + ' filter removed: ' + c.label);
          var xs = ui.chips.querySelectorAll('.pf-chip-x');
          (xs.length ? xs[Math.min(i, xs.length - 1)] : ui.fnBtn).focus();
        });
        ui.chips.appendChild(li);
      });
      if (data.length > max) {
        var more = h('button', { type: 'button', class: 'pf-more', 'aria-expanded': chipsExpanded ? 'true' : 'false', text: chipsExpanded ? 'Show fewer' : '+' + (data.length - max) + ' more' });
        more.addEventListener('click', function () { chipsExpanded = !chipsExpanded; updateChips(); ui.chips.querySelector('.pf-more').focus(); });
        ui.chips.appendChild(h('li', null, [more]));
      }
      ui.clear.hidden = false;
      if (ui.ctx && ui.ctx.querySelector('.ctx-row2')) ui.ctx.querySelector('.ctx-row2').hidden = false;
    } else {
      ui.clear.hidden = true;
      if (!PAGE.func && ui.ctx && ui.ctx.querySelector('.ctx-row2')) ui.ctx.querySelector('.ctx-row2').hidden = true;
    }
  }

  /* ---- data status ---- */
  function updateStatus() {
    var ver = versionOf(state.per), loading = !!loadTimer;
    ui.ds.textContent = '';
    ui.ds.classList.toggle('is-loading', loading);
    ui.ds.appendChild(h('span', { class: 'pf-spin', 'aria-hidden': 'true' }));
    if (loading) { ui.ds.appendChild(h('span', { text: 'Refreshing data\u2026' })); }
    else {
      ui.ds.appendChild(h('span', { class: 'ds-ref', text: 'Refreshed ' + DATA.refreshed }));
    }
    ui.banner.hidden = ver === 'final';
  }

  /* ---- sync every control with state ---- */
  var DENIED = false;
  function updateAll() {
    ui.bu._v.textContent = CUR_BU && PBU ? BUS[CUR_BU].short : 'Corporate';
    var buDisabled = PBU ? ROLE.bus.length < 2 : !ROLE.corp;
    ui.bu.setAttribute('aria-disabled', buDisabled ? 'true' : 'false');
    tip(ui.bu, buDisabled ? (PBU ? 'Your access is limited to ' + CUR_BU : 'Corporate pages span all business units') : (PBU ? '' : 'Choose a business unit to open its dashboard'));
    ui.per._v.textContent = monthName(state.per).slice(0, 3) + ' ' + state.per.slice(0, 4) + ' \u00B7 ' + fyLabel(fiscalYearOf(state.per));
    if (PAGE.func && ui.fnBtn) {
      var n = state.fn.length, badge = ui.fnBtn.querySelector('.pf-badge'), vSpan = ui.fnBtn.querySelector('.pf-v');
      badge.hidden = !n;
      badge.textContent = String(n);
      if (vSpan) vSpan.textContent = n ? (n === 1 ? byId(BUCFG.functions, state.fn[0]).label : n + ' selected') : 'All';
      ui.fnBtn.setAttribute('aria-label', 'Function filter, ' + (n ? n + ' selected' : 'All'));
    }
    updateChips(); updateStatus(); updateHrefs();
    var nF = PAGE.func ? state.fn.length : 0;
    var sumEl = document.getElementById('pf-sum-t');
    if (sumEl) sumEl.textContent = (PBU ? CUR_BU : 'Corporate') + ' \u00B7 ' + monthName(state.per).slice(0, 3) + ' ' + state.per.slice(0, 4) + (nF ? ' \u00B7 ' + nF + (nF === 1 ? ' filter' : ' filters') : '');
    if (trail) renderCrumbs(trail);
  }

  /* ============================================================ UNSUPPORTED / LOADING STATES */
  // A component declares dimensions it cannot be filtered by via data-pf-unsupported="product function".
  // OPEN QUESTION: the component x dimension support matrix is not defined; the two KPI tiles below are placeholders.
  function setMask(c, reasons) {
    var old = c.querySelector(':scope > .pf-unsup');
    if (old) old.remove();
    if (!reasons.length) {
      c.classList.remove('pf-masked');
      if (c.hasAttribute('data-pf-tip-stash')) { c.setAttribute('data-tip', c.getAttribute('data-pf-tip-stash')); c.removeAttribute('data-pf-tip-stash'); }
      return;
    }
    if (c.hasAttribute('data-tip')) { c.setAttribute('data-pf-tip-stash', c.getAttribute('data-tip')); c.removeAttribute('data-tip'); } // never leak unfiltered values via tooltip
    c.classList.add('pf-masked');
    var msg = reasons[0].time ? 'Not available for this time view' : 'Not available for this filter';
    var dims = reasons.map(function (r) { return r.dim; }).join(', ');
    var box = h('div', { class: 'pf-unsup', tabindex: '0', role: 'note' }, [h('span', null, [msg, h('small', { text: reasons[0].time ? dims : 'Unsupported: ' + dims })])]);
    tip(box, (reasons[0].time ? 'Unsupported time view: ' : 'Unsupported dimension: ') + dims);
    c.appendChild(box);
  }
  function applyMasks() {
    var main = document.querySelector('main'); if (!main) return;
    var roy = effTV() === 'roy';
    main.querySelectorAll('.kpi, .epm-box').forEach(function (c) {
      var dims = (c.getAttribute('data-pf-unsupported') || '').split(' '), r = [];
      if (roy) r.push({ dim: 'ROY (calculation pending, OQ-28)', time: true });
      else {
        if (PAGE.product && state.prod.length && inList(dims, 'product')) r.push({ dim: 'Product' });
        if (PAGE.func && state.fn.length && inList(dims, 'function')) r.push({ dim: 'Function' });
      }
      setMask(c, r);
    });
  }
  function startLoading() {
    var main = document.querySelector('main');
    clearTimeout(loadTimer);
    if (main) { main.classList.add('pf-loading'); main.setAttribute('aria-busy', 'true'); }
    loadTimer = setTimeout(function () {
      loadTimer = null;
      if (main) { main.classList.remove('pf-loading'); main.removeAttribute('aria-busy'); }
      updateStatus();
      document.dispatchEvent(new CustomEvent('polaris:ready', { detail: snapshot() }));
    }, CONFIG.loadingMs);
    updateStatus();
  }
  function commit(announce) {
    persist(); syncURL(); updateAll(); applyMasks(); startLoading();
    if (trail && trail.length) trail[trail.length - 1].snap = snapshot(), store(CONFIG.trailKey, trail);
    say((announce || 'Context changed') + '. Refreshing page data.');
    document.dispatchEvent(new CustomEvent('polaris:contextchange', { detail: snapshot() })); // page components subscribe here
  }
  var stuckEl = null;
  function updateStuck() { var m = stuckEl && stuckEl.closest("main"); if (stuckEl) stuckEl.classList.toggle("is-stuck", m ? m.scrollTop > 0 : (stuckEl.getBoundingClientRect().top <= 0 && window.scrollY > 0)); }

  /* ============================================================ BREADCRUMBS */
  var trail = null, previewTrail = null;
  var KNOWN_FILES = (function () { var s = []; PAGES.forEach(function (p) { for (var k in p.file) s.push(p.file[k]); }); return s; })();
  function crumbLabel(p) { return p.code === 'P03' ? CUR_BU + ' Dashboard' : p.code === 'P01' ? 'Corporate CFO Dashboard' : p.label; }
  // Hierarchy: Corporate CFO (P01) > BU Dashboard (P03) > Revenue / Expense / NPI (P04–P06) > Transaction Detail (P07, under Revenue Analysis)
  var PARENT = { P08: 'P01', P03: 'P01', P04: 'P03', P05: 'P03', P06: 'P03', P07: 'P04' };
  function pageByCode(c) { for (var i = 0; i < PAGES.length; i++) if (PAGES[i].code === c) return PAGES[i]; return null; }
  function crumbFor(p) { return { code: p.code, label: crumbLabel(p), file: pageFile(p, CUR_BU), snap: snapshot() }; }
  function defaultChain(p) {
    var out = [], c = PARENT[p.code], q;
    while (c) {
      q = pageByCode(c); if (!q) break;
      if ((!q.cfoOnly || ROLE.corp) && pageFile(q, CUR_BU)) out.unshift(crumbFor(q));
      c = PARENT[c];
    }
    return out;
  }
  function cleanTrail(t) {
    if (!Array.isArray(t)) return [];
    return t.filter(function (c) { return c && typeof c.label === 'string' && c.label.length < 80 && (c.ctx || (/^P0[1-7]$/.test(c.code) && inList(KNOWN_FILES, c.file))); })
      .map(function (c) { var s = defaults(); applySrc(s, c.snap, true); return { code: c.code, label: c.label, file: c.file, ctx: !!c.ctx, snap: s }; });
  }
  function resolveTrail() {
    var t = cleanTrail(load(CONFIG.trailKey)), pending = load(CONFIG.pendingKey), i, idx = -1;
    var here = crumbFor(PAGE);
    // a stored trail from another BU (or a role that cannot see P01) is not reused
    if (!t.every(function (c) { var q = pageByCode(c.code); return c.ctx || !q || q.area === 'corp' || c.file === pageFile(q, CUR_BU); })) t = [];
    if (!ROLE.corp) t = t.filter(function (c) { return c.code !== 'P01'; });
    for (i = 0; i < t.length; i++) if (!t[i].ctx && t[i].code === PAGE.code) { idx = i; break; }
    if (idx > -1) t = t.slice(0, idx);                                   // back-navigation: drop everything after this level
    else if (pending && t.length && t[t.length - 1].code === pending.from && typeof pending.label === 'string') t.push({ ctx: true, label: pending.label.slice(0, 79), code: '' });
    else t = defaultChain(PAGE);
    // Hierarchy root: BU pages sit under the Corporate CFO Dashboard (only shown to users who can open it)
    if (!PAGE.cfoOnly && ROLE.corp && (!t.length || t[0].code !== 'P01')) t.unshift({ code: 'P01', label: 'Corporate CFO Dashboard', file: pageFile(PAGES[0], CUR_BU), snap: snapshot() });
    store(CONFIG.pendingKey, null);
    t.push(here); store(CONFIG.trailKey, t);
    return t;
  }
  function renderCrumbs(t) {
    var host = $('pf-breadcrumb'); if (!host) return;
    t = previewTrail || t;
    host.textContent = ''; host.setAttribute('aria-label', 'Breadcrumb');
    var ol = h('ol'), prevLink = null, hasMid = t.length > 3;
    t.forEach(function (c, i) {
      var last = i === t.length - 1, li = h('li', { class: (i > 0 && i < t.length - 2) ? 'pf-bc-mid' : '' });
      if (hasMid && i === 1) ol.appendChild(h('li', { class: 'pf-bc-ell', 'aria-hidden': 'true', text: '\u2026' }));
      if (last) li.appendChild(h('span', { 'aria-current': 'page', title: c.label, text: c.label }));
      else if (c.ctx) li.appendChild(h('span', { title: c.label, text: c.label }));
      else { var a = h('a', { href: withState(c.file, c.snap), title: 'Return to ' + c.label + ' (restores its filters and period)', text: c.label }); li.appendChild(a); prevLink = { a: a, label: c.label }; }
      ol.appendChild(li);
    });
    if (prevLink && t.length > 1) host.appendChild(h('a', { class: 'pf-bc-back', href: prevLink.a.getAttribute('href') }, ['\u2190 Back to ' + prevLink.label]));
    host.appendChild(ol);
  }

  /* ---- links: carry context, remember drill source ---- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.hasAttribute('data-pf-skip')) return;
    var href = a.getAttribute('href');
    if (!/^[A-Za-z0-9_\-]+\.html$/.test(href) || !inList(KNOWN_FILES, href)) return;
    a.setAttribute('href', withState(href) + (/^[a-z]+=[A-Za-z0-9_-]+$/.test(a.getAttribute('data-pf-q') || '') ? '&' + a.getAttribute('data-pf-q') : ''));
    var line = a.getAttribute('data-pf-line');
    if (line) store(CONFIG.pendingKey, { from: PAGE.code, label: line.slice(0, 79) });
  }, true);

  /* ============================================================ RESTRICTED STATE */
  function applyAccess() {
    if (canAccess(PAGE, PBU)) return;
    DENIED = true;
    var main = document.querySelector('main'); if (!main) return;
    var msg = PAGE.cfoOnly ? 'This page is available to Corporate CFO users only.' : 'You do not have access to this business unit\u2019s dashboard.';
    var home = null; PAGES.forEach(function (p) { if (!home && !p.cfoOnly && p.code === 'P03') { var bu = ROLE.bus[0]; home = { file: pageFile(p, bu), label: bu + ' Dashboard' }; } });
    var h2 = h('h2', { tabindex: '-1', text: 'Access restricted' });
    var box = h('section', { class: 'pf-restricted', role: 'alert' }, [svg('lock', 28, 1.8), h2, h('p', { text: msg })]);
    if (home && home.file) box.appendChild(h('a', { href: withState(home.file), text: 'Go to ' + home.label }));
    Array.prototype.forEach.call(main.children, function (c) { if (c !== ui.ctx) c.hidden = true; });
    main.appendChild(box); h2.focus();
    ui.ctx.classList.add('is-restricted'); $('pf-ctx-body').setAttribute('inert', '');
    $('pf-breadcrumb') && ($('pf-breadcrumb').hidden = true);
  }

  /* ============================================================ PROTOTYPE REVIEW PANEL */
  function buildProto() {
    var roleSel = h('select', { id: 'pf-proto-role' });
    Object.keys(ROLES).forEach(function (k) { roleSel.appendChild(h('option', { value: k, text: ROLES[k].label })); });
    roleSel.value = ROLE_KEY;
    roleSel.addEventListener('change', function () { store(CONFIG.roleKey, roleSel.value); location.reload(); });
    function btn(text, fn) { var b = h('button', { type: 'button', text: text }); b.addEventListener('click', fn); return b; }
    var body_ = h('div', { class: 'pf-proto-body' }, [
      h('p', { text: 'Prototype review controls. Not part of the production header.' }),
      h('label', null, ['Signed-in role', roleSel]),
      btn('Replay loading state', function () { startLoading(); say('Refreshing page data.'); }),
      btn('Toggle latest month Working / Final', function () { DATA.simWorking = !DATA.simWorking; store(CONFIG.simKey, DATA.simWorking); updateAll(); say('Latest month marked ' + (DATA.simWorking ? 'Working' : 'Final')); }),
      btn('Preview example drill breadcrumb', function () {
        previewTrail = [
          { code: 'P01', label: 'Corporate CFO Dashboard', file: pageFile(PAGES[0], CUR_BU), snap: snapshot() },
          { code: 'P03', label: CUR_BU + ' Dashboard', file: pageFile(pageByCode('P03'), CUR_BU), snap: snapshot() },
          { code: 'P04', label: 'Revenue Analysis', file: pageFile(pageByCode('P04'), CUR_BU), snap: snapshot() },
          { ctx: true, label: 'Revenue: 401K Small' },
          { code: 'P07', label: 'Transaction Detail', file: pageFile(pageByCode('P07'), CUR_BU), snap: snapshot() }];
        renderCrumbs(trail);
      }),
      btn('Reset saved context', function () { [CONFIG.storageKey, CONFIG.trailKey, CONFIG.pendingKey, CONFIG.simKey, CONFIG.roleKey].forEach(function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }); location.href = location.pathname; }),
      h('p', { text: 'Sample figures on this page are static and do not recompute when filters change.' })
    ]);
    body.appendChild(h('details', { class: 'pf-proto' }, [h('summary', { text: 'Prototype review' }), body_]));
  }

  /* ============================================================ init */
  function init() {
    live = h('div', { class: 'pf-sr', 'aria-live': 'polite', role: 'status' });
    tt = h('div', { class: 'pf-tt', role: 'tooltip', hidden: true });
    body.appendChild(live); body.appendChild(tt);
    var main = document.querySelector('main');
    if (main) { if (!main.id) main.id = 'pf-main'; main.setAttribute('tabindex', '-1'); body.insertBefore(h('a', { class: 'pf-skip', href: '#' + main.id, text: 'Skip to main content' }), body.firstChild); }
    buildNav(); buildContext();
    if (!ui.ctx) return;
    stuckEl = ui.ctx;
    var scroller = stuckEl.closest("main"); if (scroller) scroller.addEventListener("scroll", function () { if (activePanel && !activePanel.backdrop) closePanel(false); hideTT(); updateStuck(); }, { passive: true });
    trail = resolveTrail();
    updateAll(); applyMasks(); persist(); syncURL();
    applyAccess(); buildProto();
    window.addEventListener('pageshow', function (e) { if (e.persisted) { state = loadState(); trail = resolveTrail(); updateAll(); applyMasks(); } });
    window.PolarisHeader = { getState: snapshot, access: function () { return !DENIED; } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
