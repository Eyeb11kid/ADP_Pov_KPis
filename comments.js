/* Page and component comments for the Polaris pages.
   Add with: <script src="comments.js"></script> before </body>.
   Storage: browser localStorage, optionally mirrored to a CSV file the user links from the
   comments panel (Chrome/Edge), or exported/imported as CSV. To share comments between
   viewers at the same time, replace load() and save() with calls to a server API. */
(function () {
  'use strict';

  var KEY = 'polaris.comments.v1';
  var NAME_KEY = 'polaris.comments.name';
  var PAGE = location.pathname.split('/').pop() || 'index.html';
  var MAX_NAME = 60;
  var MAX_TEXT = 2000;
  // Elements a viewer can pick as "a component"
  var PICKABLE = '.kcard,.kpi,.panel,.chart-tile,.section,.note,.row-disc,.bot-link,.titlebar,.filterbar,.card';
  var LABEL_SEL = 'h1,h2,h3,.chart-title,.section-title,.page-title,.lab,.kpi-label,.card-title';

  var filter = 'open';
  var scope = 'page'; // 'page' or 'site'
  var picking = false;
  var target = null; // {sel, label} or null for the whole page

  /* ---------- storage ---------- */
  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && typeof d.seq === 'number' && Array.isArray(d.items)) return d;
    } catch (e) { /* fall through */ }
    return { seq: 0, items: [] };
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { return false; }
    scheduleWrite();
    return true;
  }

  /* ---------- helpers ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'class') el.className = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function inUi(el) { return el.closest && el.closest('[data-cm]'); }

  function pathTo(el) {
    var parts = [];
    while (el && el !== document.body && el.nodeType === 1) {
      if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) { parts.unshift('#' + el.id); break; }
      var i = 1, s = el;
      while ((s = s.previousElementSibling)) i++;
      parts.unshift(el.tagName.toLowerCase() + ':nth-child(' + i + ')');
      el = el.parentElement;
    }
    return (parts[0] && parts[0].charAt(0) === '#' ? '' : 'body > ') + parts.join(' > ');
  }
  function labelOf(el) {
    var t = el.querySelector(LABEL_SEL);
    var txt = t ? t.textContent.replace(/\s+/g, ' ').trim() : '';
    if (!txt) txt = el.textContent.replace(/\s+/g, ' ').trim();
    if (!txt) txt = el.tagName.toLowerCase();
    return txt.length > 60 ? txt.slice(0, 57) + '...' : txt;
  }
  function find(sel) {
    try { return sel ? document.querySelector(sel) : null; } catch (e) { return null; }
  }
  function fmt(ts) {
    try { return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return ''; }
  }

  /* ---------- styles ---------- */
  var css = [
    '[data-cm]{font-family:"IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif;font-size:12px;line-height:1.5;color:#161616;box-sizing:border-box}',
    '[data-cm] *{box-sizing:border-box}',
    '[data-cm][hidden],[data-cm] [hidden]{display:none!important}',
    '.cm-fab{position:fixed;right:20px;bottom:20px;z-index:2000;background:#161616;color:#fff;border:0;border-radius:2px;padding:9px 14px;font-weight:600;font-size:12px;cursor:pointer;display:flex;align-items:center;gap:8px}',
    '.cm-fab:hover{background:#0f62fe}',
    '.cm-fab .cm-count{background:#fff;color:#161616;border-radius:10px;padding:0 7px;font-size:11px}',
    '.cm-drawer{position:fixed;top:0;right:0;bottom:0;width:360px;max-width:100vw;background:#fff;border-left:1px solid #e0e0e0;box-shadow:-2px 0 8px rgba(0,0,0,.12);z-index:2001;display:flex;flex-direction:column}',
    '.cm-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e0e0e0}',
    '.cm-title{font-size:14px;font-weight:700}',
    '.cm-x{font:inherit;font-size:20px;line-height:1;width:28px;height:28px;border:0;background:transparent;color:#525252;cursor:pointer}',
    '.cm-x:hover{background:#e8e8e8;color:#161616}',
    '.cm-form{padding:12px 14px;border-bottom:1px solid #e0e0e0;background:#f4f4f4}',
    '.cm-form label{display:block;font-size:11px;font-weight:600;color:#525252;margin:8px 0 3px}',
    '.cm-form label:first-child{margin-top:0}',
    '.cm-form input,.cm-form textarea{width:100%;font:inherit;font-size:12px;color:#161616;background:#fff;border:1px solid #e0e0e0;padding:6px 8px}',
    '.cm-form textarea{height:84px;resize:vertical}',
    '.cm-form input:focus,.cm-form textarea:focus{outline:2px solid #0f62fe;outline-offset:-1px}',
    '.cm-target{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px}',
    '.cm-target .cm-on{flex:1;min-width:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.cm-btn{font:inherit;font-size:12px;padding:5px 11px;cursor:pointer;border-radius:2px;border:1px solid #e0e0e0;background:#fff;color:#161616}',
    '.cm-btn:hover{background:#e8e8e8}',
    '.cm-btn.cm-primary{background:#0f62fe;border-color:#0f62fe;color:#fff}',
    '.cm-btn.cm-primary:hover{background:#0050e6}',
    '.cm-btn.cm-danger{color:#da1e28}',
    '.cm-err{color:#da1e28;font-size:11px;margin-top:6px;min-height:14px}',
    '.cm-scope{display:flex;gap:0;padding:8px 14px;border-bottom:1px solid #e0e0e0}',
    '.cm-scope button{flex:1;font:inherit;font-size:12px;padding:5px 8px;border:1px solid #e0e0e0;background:#f4f4f4;color:#525252;cursor:pointer}',
    '.cm-scope button+button{border-left:0}',
    '.cm-scope button[aria-pressed="true"]{background:#161616;border-color:#161616;color:#fff}',
    '.cm-io{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:8px 14px;border-bottom:1px solid #e0e0e0}',
    '.cm-io-msg{flex-basis:100%;font-size:11px;line-height:1.4;color:#525252}',
    '.cm-tabs{display:flex;border-bottom:1px solid #e0e0e0}',
    '.cm-tabs button{flex:1;font:inherit;font-size:12px;height:34px;background:transparent;color:#525252;border:0;border-bottom:2px solid transparent;cursor:pointer}',
    '.cm-tabs button[aria-selected="true"]{color:#161616;font-weight:600;border-bottom-color:#0f62fe}',
    '.cm-tabs button:hover{background:#e8e8e8}',
    '.cm-list{flex:1;overflow-y:auto;padding:10px 14px}',
    '.cm-empty{color:#525252;font-style:italic;padding:12px 0}',
    '.cm-item{border:1px solid #e0e0e0;border-left:3px solid #0f62fe;padding:8px 10px;margin-bottom:10px;background:#fff}',
    '.cm-item.cm-done{border-left-color:#198038;background:#f7f8fa}',
    '.cm-item.cm-done .cm-text{color:#525252}',
    '.cm-meta{display:flex;align-items:baseline;gap:6px;flex-wrap:wrap}',
    '.cm-num{font-weight:700;color:#0f62fe}',
    '.cm-done .cm-num{color:#198038}',
    '.cm-who{font-weight:600}',
    '.cm-when{color:#525252;font-size:11px;margin-left:auto}',
    '.cm-where{font-size:11px;color:#525252;margin:2px 0 4px}',
    '.cm-where button,.cm-where a{font:inherit;font-size:11px;color:#0f62fe;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline}',
    '.cm-text{white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}',
    '.cm-status{font-size:11px;color:#198038;font-weight:600;margin-top:4px}',
    '.cm-acts{display:flex;gap:6px;margin-top:8px}',
    '.cm-pins{position:absolute;top:6px;right:6px;z-index:5;display:flex;gap:4px}',
    '.cm-pin{font:700 10px/1 "IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif;background:#0f62fe;color:#fff;border:0;border-radius:10px;padding:4px 7px;cursor:pointer}',
    '.cm-pin:hover{background:#0050e6}',
    '.cm-hover{outline:2px solid #0f62fe!important;outline-offset:-2px}',
    '.cm-flash{outline:3px solid #f1c21b!important;outline-offset:-3px}',
    'body.cm-picking,body.cm-picking *{cursor:crosshair!important}',
    '.cm-banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2002;background:#161616;color:#fff;padding:8px 14px;border-radius:2px;display:flex;align-items:center;gap:12px}',
    '.cm-banner .cm-btn{padding:3px 9px}',
    '@media print{[data-cm],.cm-pins{display:none!important}}'
  ].join('\n');
  document.head.appendChild(h('style', { text: css }));

  /* ---------- UI ---------- */
  var fab = h('button', { type: 'button', class: 'cm-fab', 'data-cm': '', 'aria-haspopup': 'dialog' });
  var fabCount = h('span', { class: 'cm-count', text: '0' });
  fab.appendChild(h('span', { text: 'Comments' }));
  fab.appendChild(fabCount);

  var nameIn = h('input', { type: 'text', id: 'cm-name', maxlength: String(MAX_NAME), autocomplete: 'name' });
  var textIn = h('textarea', { id: 'cm-text', maxlength: String(MAX_TEXT) });
  var onLabel = h('span', { class: 'cm-on' });
  var pickBtn = h('button', { type: 'button', class: 'cm-btn', text: 'Pick component' });
  var pageBtn = h('button', { type: 'button', class: 'cm-btn', text: 'Whole page' });
  var errEl = h('div', { class: 'cm-err', role: 'alert' });
  var saveBtn = h('button', { type: 'button', class: 'cm-btn cm-primary', text: 'Save comment' });

  var form = h('div', { class: 'cm-form' }, [
    h('label', { for: 'cm-name', text: 'Your name' }), nameIn,
    h('label', { text: 'Comment on' }),
    h('div', { class: 'cm-target' }, [onLabel, pickBtn, pageBtn]),
    h('label', { for: 'cm-text', text: 'Comment' }), textIn,
    errEl,
    h('div', { style: 'margin-top:8px' }, [saveBtn])
  ]);

  var scopeBar = h('div', { class: 'cm-scope' });
  var scopeBtns = {};
  [['page', 'This page'], ['site', 'All site comments']].forEach(function (s) {
    var b = h('button', { type: 'button', text: s[1] });
    b.addEventListener('click', function () { scope = s[0]; render(); });
    scopeBtns[s[0]] = b;
    scopeBar.appendChild(b);
  });

  var linkBtn = h('button', { type: 'button', class: 'cm-btn', text: 'Link CSV file' });
  var exportBtn = h('button', { type: 'button', class: 'cm-btn', text: 'Export CSV' });
  var importBtn = h('button', { type: 'button', class: 'cm-btn', text: 'Import CSV' });
  var fileIn = h('input', { type: 'file', accept: '.csv,text/csv', hidden: '', 'aria-label': 'Choose a comments CSV file to import' });
  var ioMsg = h('div', { class: 'cm-io-msg', role: 'status' });
  var ioBar = h('div', { class: 'cm-io' }, [linkBtn, exportBtn, importBtn, fileIn, ioMsg]);

  var tabs = h('div', { class: 'cm-tabs', role: 'tablist' });
  var tabBtns = {};
  [['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].forEach(function (t) {
    var b = h('button', { type: 'button', role: 'tab', text: t[1] });
    b.addEventListener('click', function () { filter = t[0]; render(); });
    tabBtns[t[0]] = b;
    tabs.appendChild(b);
  });

  var list = h('div', { class: 'cm-list' });
  var titleEl = h('div', { class: 'cm-title', text: 'Comments' });
  var closeBtn = h('button', { type: 'button', class: 'cm-x', 'aria-label': 'Close comments', text: '\u00d7' });
  var drawer = h('div', { class: 'cm-drawer', 'data-cm': '', role: 'dialog', 'aria-label': 'Comments', hidden: '' }, [
    h('div', { class: 'cm-head' }, [titleEl, closeBtn]),
    form, scopeBar, ioBar, tabs, list
  ]);

  var banner = h('div', { class: 'cm-banner', 'data-cm': '', hidden: '' });
  banner.appendChild(h('span', { text: 'Click a component to comment on it.' }));
  var cancelPick = h('button', { type: 'button', class: 'cm-btn', text: 'Cancel (Esc)' });
  banner.appendChild(cancelPick);

  document.body.appendChild(fab);
  document.body.appendChild(drawer);
  document.body.appendChild(banner);

  try { nameIn.value = (localStorage.getItem(NAME_KEY) || '').slice(0, MAX_NAME); } catch (e) { /* ignore */ }

  /* ---------- rendering ---------- */
  function pageItems(d) {
    return d.items.filter(function (c) { return c.page === PAGE; });
  }

  function render() {
    var d = load();
    var mine = pageItems(d);
    var openN = mine.filter(function (c) { return c.status === 'open'; }).length;
    fabCount.textContent = String(openN);
    fab.setAttribute('aria-label', 'Comments, ' + openN + ' open on this page');

    Object.keys(tabBtns).forEach(function (k) { tabBtns[k].setAttribute('aria-selected', String(k === filter)); });
    Object.keys(scopeBtns).forEach(function (k) { scopeBtns[k].setAttribute('aria-pressed', String(k === scope)); });
    titleEl.textContent = scope === 'site' ? 'Comments on all pages' : 'Comments on this page';
    onLabel.textContent = target ? target.label : 'Whole page';
    onLabel.title = onLabel.textContent;
    pageBtn.hidden = !target;

    var pool = scope === 'site' ? d.items : mine;
    var shown = pool.filter(function (c) { return filter === 'all' || c.status === filter; })
      .sort(function (a, b) { return b.n - a.n; });
    list.textContent = '';
    if (!shown.length) {
      list.appendChild(h('div', { class: 'cm-empty', text: filter === 'resolved' ? 'No resolved comments.' : filter === 'open' ? 'No open comments.' : 'No comments yet.' }));
    }
    shown.forEach(function (c) { list.appendChild(itemEl(c)); });
    renderPins(mine);
  }

  function itemEl(c) {
    var done = c.status === 'resolved';
    var where = h('div', { class: 'cm-where' });
    if (c.page !== PAGE) {
      // Comment lives on another page: link to it, and that page opens the comment
      var pg = h('a', { href: encodeURIComponent(c.page) + '#cm-' + c.n, text: c.page });
      where.appendChild(document.createTextNode('Page: '));
      where.appendChild(pg);
      where.appendChild(document.createTextNode(' \u00b7 ' + (c.sel ? (c.label || 'Component') : 'Whole page')));
    } else if (c.sel) {
      var loc = h('button', { type: 'button', text: c.label || 'Component' });
      loc.addEventListener('click', function () { locate(c); });
      where.appendChild(document.createTextNode('On: '));
      where.appendChild(loc);
    } else {
      where.textContent = 'On: Whole page';
    }
    var resolveBtn = h('button', { type: 'button', class: 'cm-btn', text: done ? 'Reopen' : 'Resolve' });
    resolveBtn.addEventListener('click', function () { setStatus(c.n, done ? 'open' : 'resolved'); });
    var delBtn = h('button', { type: 'button', class: 'cm-btn cm-danger', text: 'Delete' });
    delBtn.addEventListener('click', function () {
      if (window.confirm('Delete comment #' + c.n + '? This cannot be undone.')) remove(c.n);
    });
    var kids = [
      h('div', { class: 'cm-meta' }, [
        h('span', { class: 'cm-num', text: '#' + c.n }),
        h('span', { class: 'cm-who', text: c.name }),
        h('span', { class: 'cm-when', text: fmt(c.at) })
      ]),
      where,
      h('div', { class: 'cm-text', text: c.text })
    ];
    if (done) kids.push(h('div', { class: 'cm-status', text: 'Resolved' + (c.resolvedAt ? ' ' + fmt(c.resolvedAt) : '') }));
    kids.push(h('div', { class: 'cm-acts' }, [resolveBtn, delBtn]));
    return h('div', { class: 'cm-item' + (done ? ' cm-done' : ''), id: 'cm-item-' + c.n }, kids);
  }

  function renderPins(mine) {
    Array.prototype.forEach.call(document.querySelectorAll('.cm-pins'), function (p) { p.remove(); });
    var byEl = [];
    mine.forEach(function (c) {
      if (c.status !== 'open' || !c.sel) return;
      var el = find(c.sel);
      if (!el || inUi(el)) return;
      var slot = byEl.filter(function (x) { return x.el === el; })[0];
      if (!slot) { slot = { el: el, items: [] }; byEl.push(slot); }
      slot.items.push(c);
    });
    byEl.forEach(function (slot) {
      if (getComputedStyle(slot.el).position === 'static') slot.el.style.position = 'relative';
      var box = h('div', { class: 'cm-pins' });
      slot.items.sort(function (a, b) { return a.n - b.n; }).forEach(function (c) {
        var pin = h('button', { type: 'button', class: 'cm-pin', 'aria-label': 'Open comment ' + c.n, text: '#' + c.n });
        pin.addEventListener('click', function (e) { e.stopPropagation(); openDrawer(); focusItem(c.n); });
        box.appendChild(pin);
      });
      slot.el.appendChild(box);
    });
  }

  /* ---------- actions ---------- */
  function setStatus(n, status) {
    var d = load();
    d.items.forEach(function (c) {
      if (c.n === n) { c.status = status; c.resolvedAt = status === 'resolved' ? Date.now() : null; }
    });
    save(d); render();
  }
  function remove(n) {
    var d = load();
    d.items = d.items.filter(function (c) { return c.n !== n; });
    save(d); render();
  }
  function locate(c) {
    var el = find(c.sel);
    if (!el) { window.alert('This component is not on the page right now.'); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('cm-flash');
    setTimeout(function () { el.classList.remove('cm-flash'); }, 1800);
  }
  function focusItem(n) {
    filter = 'open'; render();
    var it = document.getElementById('cm-item-' + n);
    if (it) it.scrollIntoView({ block: 'nearest' });
  }

  function onSave() {
    var name = nameIn.value.trim();
    var text = textIn.value.trim();
    errEl.textContent = '';
    if (!name) { errEl.textContent = 'Enter your name.'; nameIn.focus(); return; }
    if (!text) { errEl.textContent = 'Enter a comment.'; textIn.focus(); return; }
    if (name.length > MAX_NAME || text.length > MAX_TEXT) { errEl.textContent = 'Name or comment is too long.'; return; }
    var d = load();
    d.seq += 1; // numbers are never reused, even after a delete
    d.items.push({
      n: d.seq, page: PAGE, name: name, text: text, at: Date.now(),
      sel: target ? target.sel : null, label: target ? target.label : null,
      status: 'open', resolvedAt: null
    });
    if (!save(d)) { errEl.textContent = 'Could not save. Browser storage may be full or disabled.'; return; }
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignore */ }
    textIn.value = '';
    target = null;
    filter = 'open';
    render();
  }

  /* ---------- CSV storage: link a file, or export / import ---------- */
  var COLS = ['id', 'page', 'name', 'comment', 'created', 'status', 'resolved', 'selector', 'label'];
  var MAX_FILE = 2 * 1024 * 1024; // 2 MB
  var MAX_ROWS = 5000;
  var FSA = typeof window.showSaveFilePicker === 'function';
  var CSV_TYPES = [{ description: 'Comments CSV', accept: { 'text/csv': ['.csv'] } }];
  var fsHandle = null;
  var fsReady = false; // a file is linked and we have permission to write it
  var writeTimer = null;

  function setMsg(s) { ioMsg.textContent = s; }

  function csvCell(v) {
    var s = v == null ? '' : String(v);
    if (/^'*[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheets running a cell as a formula
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function csvUnescape(s) { return /^'+[=+\-@\t\r]/.test(s) ? s.slice(1) : s; }
  function isoOf(ms) { try { return new Date(ms).toISOString(); } catch (e) { return ''; } }

  function toCsv(d) {
    var lines = [COLS.join(',')];
    d.items.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (c) {
      lines.push([c.n, c.page, c.name, c.text, isoOf(c.at), c.status, c.resolvedAt ? isoOf(c.resolvedAt) : '', c.sel || '', c.label || ''].map(csvCell).join(','));
    });
    return '\ufeff' + lines.join('\r\n') + '\r\n';
  }

  function parseCsv(t) {
    if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1);
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < t.length; i++) {
      var ch = t.charAt(i);
      if (q) {
        if (ch === '"') { if (t.charAt(i + 1) === '"') { f += '"'; i++; } else q = false; }
        else f += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(f); f = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && t.charAt(i + 1) === '\n') i++;
        row.push(f); f = ''; rows.push(row); row = [];
        if (rows.length > MAX_ROWS + 1) return rows;
      } else f += ch;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows;
  }

  // Rebuild every row from known fields only, with type and length checks
  function cleanItem(c) {
    var name = String(c.name || '').trim(), text = String(c.text || '').trim(), page = String(c.page || '');
    if (!/^[A-Za-z0-9_.\-]{1,100}$/.test(page) || !name || !text || name.length > MAX_NAME || text.length > MAX_TEXT) return null;
    var status = c.status === 'resolved' ? 'resolved' : 'open';
    var at = isFinite(c.at) && c.at > 0 && c.at < 8.64e15 ? c.at : Date.now();
    var ra = isFinite(c.resolvedAt) && c.resolvedAt > 0 && c.resolvedAt < 8.64e15 ? c.resolvedAt : null;
    return {
      n: c.n > 0 && c.n < 1e9 && Math.floor(c.n) === c.n ? c.n : 0,
      page: page, name: name, text: text, at: at,
      sel: typeof c.sel === 'string' && c.sel.length <= 500 ? c.sel : null,
      label: typeof c.label === 'string' ? c.label.slice(0, 100) : null,
      status: status, resolvedAt: status === 'resolved' ? ra : null
    };
  }

  // Returns {items, bad} or null if the text is not a Polaris comments CSV
  function fromCsv(text) {
    var rows = parseCsv(text).filter(function (r) { return !(r.length === 1 && r[0] === ''); });
    if (!rows.length) return { items: [], bad: 0 };
    if (rows.length > MAX_ROWS + 1) return null;
    var idx = Object.create(null);
    rows[0].forEach(function (name, i) { idx[name.trim().toLowerCase()] = i; });
    if (idx.page === undefined || idx.name === undefined || idx.comment === undefined) return null;
    function cell(r, k) { return idx[k] === undefined ? '' : csvUnescape(String(r[idx[k]] || '')); }
    var out = [];
    rows.slice(1).forEach(function (r) {
      var c = cleanItem({
        n: parseInt(cell(r, 'id'), 10), page: cell(r, 'page').trim(), name: cell(r, 'name'), text: cell(r, 'comment'),
        at: Date.parse(cell(r, 'created')), status: cell(r, 'status').trim().toLowerCase(),
        resolvedAt: Date.parse(cell(r, 'resolved')), sel: cell(r, 'selector') || null, label: cell(r, 'label') || null
      });
      if (c) out.push(c);
    });
    return { items: out, bad: rows.length - 1 - out.length };
  }

  // Adds items that are not already present (same page, time, name and text). Returns how many were added.
  function mergeItems(d, list) {
    var seen = Object.create(null), used = Object.create(null), added = 0;
    function key(c) { return c.page + '|' + c.at + '|' + c.name + '|' + c.text; }
    d.items.forEach(function (x) { seen[key(x)] = true; used[x.n] = true; });
    list.forEach(function (c) {
      if (seen[key(c)]) return;
      seen[key(c)] = true;
      if (!c.n || used[c.n]) { do { d.seq += 1; } while (used[d.seq]); c.n = d.seq; }
      used[c.n] = true;
      if (c.n > d.seq) d.seq = c.n;
      d.items.push(c); added += 1;
    });
    return added;
  }

  function exportCsv() {
    var d = load();
    var blob = new Blob([toCsv(d)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: 'polaris-comments.csv' });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    setMsg('Exported ' + d.items.length + ' comment(s) to polaris-comments.csv.');
  }

  function importFile(file) {
    if (!file) return;
    if (file.size > MAX_FILE) { setMsg('File is too large (max 2 MB).'); return; }
    var reader = new FileReader();
    reader.onerror = function () { setMsg('Could not read that file.'); };
    reader.onload = function () {
      var res = fromCsv(String(reader.result));
      if (!res) { setMsg('That file is not a Polaris comments CSV.'); return; }
      var d = load(), added = mergeItems(d, res.items);
      if (!save(d)) { setMsg('Could not save. Browser storage may be full or disabled.'); return; }
      setMsg('Imported ' + added + ' new comment(s); skipped ' + (res.items.length - added + res.bad) + ' duplicate or invalid.');
      render();
    };
    reader.readAsText(file);
  }

  /* Linked file (File System Access API). The handle is kept in IndexedDB so the link survives reloads. */
  function idbOpen() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('polaris-comments-fs', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('h'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idbGet() {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var q = db.transaction('h').objectStore('h').get('csv');
        q.onsuccess = function () { res(q.result || null); };
        q.onerror = function () { rej(q.error); };
      });
    }).catch(function () { return null; });
  }
  function idbPut(v) {
    return idbOpen().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction('h', 'readwrite');
        tx.objectStore('h').put(v, 'csv');
        tx.oncomplete = res;
        tx.onerror = function () { rej(tx.error); };
      });
    }).catch(function () { return null; });
  }

  function updateIo() {
    linkBtn.hidden = !FSA;
    linkBtn.textContent = !fsHandle ? 'Link CSV file' : fsReady ? 'CSV: ' + fsHandle.name : 'Reconnect CSV';
  }

  function scheduleWrite() {
    if (!fsHandle || !fsReady) return;
    clearTimeout(writeTimer);
    writeTimer = setTimeout(writeNow, 300);
  }
  function writeNow() {
    if (!fsHandle || !fsReady) return;
    var target = fsHandle;
    target.createWritable().then(function (w) {
      return w.write(new Blob([toCsv(load())], { type: 'text/csv' })).then(function () { return w.close(); });
    }).then(function () {
      setMsg('Saved to ' + target.name + ' at ' + new Date().toLocaleTimeString() + '.');
    }).catch(function () {
      fsReady = false; updateIo();
      setMsg('Could not write to the CSV file. Click "Reconnect CSV" to try again.');
    });
  }

  // Load what is in the linked file into this browser, then write the merged result back
  function syncFromFile() {
    return fsHandle.getFile().then(function (f) {
      if (f.size > MAX_FILE) throw new Error('too large');
      return f.text();
    }).then(function (text) {
      var res = fromCsv(text);
      if (!res) {
        fsHandle = null; fsReady = false; idbPut(null); updateIo();
        setMsg('That file is not a Polaris comments CSV, so it was left unchanged and not linked.');
        return;
      }
      fsReady = true;
      var d = load(), added = mergeItems(d, res.items);
      save(d);
      updateIo(); render();
      setMsg('Linked to ' + fsHandle.name + '. ' + (added ? 'Loaded ' + added + ' comment(s) from it. ' : '') + 'Changes now save to it automatically.');
    }).catch(function () {
      fsReady = false; updateIo();
      setMsg('Could not read the CSV file. Click "Reconnect CSV" or choose the file again.');
    });
  }

  function onLink() {
    if (fsHandle && !fsReady) {
      fsHandle.requestPermission({ mode: 'readwrite' }).then(function (p) {
        if (p === 'granted') return syncFromFile();
        setMsg('Permission was not granted.');
      }).catch(function () { fsHandle = null; updateIo(); setMsg('Could not reconnect. Choose the file again.'); });
      return;
    }
    window.showSaveFilePicker({ suggestedName: 'polaris-comments.csv', types: CSV_TYPES }).then(function (hd) {
      fsHandle = hd; fsReady = false;
      return idbPut(hd).then(syncFromFile);
    }).catch(function (e) { if (!e || e.name !== 'AbortError') setMsg('Could not open that file.'); });
  }

  function initFile() {
    updateIo();
    if (!FSA) { setMsg('This browser cannot link a file. Use Export CSV and Import CSV to back up and restore.'); return; }
    setMsg('Link a CSV file to keep comments across file updates and browsers. To reload an existing file, pick it in the dialog.');
    idbGet().then(function (hd) {
      if (!hd || typeof hd.queryPermission !== 'function') return;
      fsHandle = hd; updateIo();
      return hd.queryPermission({ mode: 'readwrite' }).then(function (p) {
        if (p === 'granted') return syncFromFile();
        setMsg('Click "Reconnect CSV" to keep saving to ' + hd.name + '.');
      });
    }).catch(function () { /* ignore */ });
  }

  /* ---------- drawer + pick mode ---------- */
  function openDrawer() { drawer.hidden = false; fab.hidden = true; render(); }
  function closeDrawer() { drawer.hidden = true; fab.hidden = false; }

  var hoverEl = null;
  function clearHover() { if (hoverEl) { hoverEl.classList.remove('cm-hover'); hoverEl = null; } }
  function startPick() {
    picking = true;
    document.body.classList.add('cm-picking');
    drawer.hidden = true;
    banner.hidden = false;
  }
  function stopPick(reopen) {
    picking = false;
    document.body.classList.remove('cm-picking');
    clearHover();
    banner.hidden = true;
    if (reopen) openDrawer();
  }

  document.addEventListener('mouseover', function (e) {
    if (!picking || inUi(e.target)) return;
    var el = e.target.closest(PICKABLE);
    if (el === hoverEl) return;
    clearHover();
    if (el) { hoverEl = el; el.classList.add('cm-hover'); }
  }, true);

  document.addEventListener('click', function (e) {
    if (!picking || inUi(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target.closest(PICKABLE);
    if (!el) return;
    el.classList.remove('cm-hover');
    target = { sel: pathTo(el), label: labelOf(el) };
    stopPick(true);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (picking) stopPick(true);
    else if (!drawer.hidden) closeDrawer();
  });

  fab.addEventListener('click', openDrawer);
  closeBtn.addEventListener('click', closeDrawer);
  pickBtn.addEventListener('click', startPick);
  cancelPick.addEventListener('click', function () { stopPick(true); });
  pageBtn.addEventListener('click', function () { target = null; render(); });
  saveBtn.addEventListener('click', onSave);
  linkBtn.addEventListener('click', onLink);
  exportBtn.addEventListener('click', exportCsv);
  importBtn.addEventListener('click', function () { fileIn.value = ''; fileIn.click(); });
  fileIn.addEventListener('change', function () { importFile(fileIn.files && fileIn.files[0]); });
  window.addEventListener('storage', function (e) { if (e.key === KEY) render(); });

  // Arrive from the "All site comments" list: open that comment on this page
  function openFromHash() {
    var m = /^#cm-(\d+)$/.exec(location.hash);
    if (!m) return;
    scope = 'page'; filter = 'all';
    openDrawer();
    var it = document.getElementById('cm-item-' + m[1]);
    if (it) { it.scrollIntoView({ block: 'nearest' }); it.classList.add('cm-flash'); }
  }
  window.addEventListener('hashchange', openFromHash);

  render();
  initFile();
  openFromHash();
})();
