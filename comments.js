/* Page and component comments for the Polaris pages.
   Add with: <script src="comments.js"></script> before </body>.
   Storage: browser localStorage. To share comments between viewers at the same time,
   replace load() and save() with calls to a server API. */
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
    form, scopeBar, tabs, list
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
  openFromHash();
})();
