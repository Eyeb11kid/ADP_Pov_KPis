/* RS pages: row rollover (Highlight + Comment), row commentary and add-to-insights stars.
   Loaded by the RS, NAS and corporate pages (rs_dashboard has the same logic inline). Other pages set window.SC_DETAIL_PAGE first (the page a row click opens; set it to the current page to disable navigation).
   Needs from the page: window.openDrawer, window.wireMentionTextarea and the commentary drawer ids. */
(function () {
  'use strict';

  var tables = Array.prototype.slice.call(document.querySelectorAll('table.pl'));
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.chart-tile'));
  if (!tables.length && !tiles.length) return;

  var DETAIL_PAGE = window.SC_DETAIL_PAGE || 'rs_transaction_detail.html';
  var onDetail = location.pathname.slice(-DETAIL_PAGE.length) === DETAIL_PAGE;

  var NAMES = ['Marcus Vance', 'Jordan Lee', 'Maya Chen', 'Sarah Jenkins', 'Derek Osman'];
  var tagRe = new RegExp('(@(?:' + NAMES.join('|') + '))', 'g');
  var PERSONAS = [
    { name: 'Jordan Lee',    role: 'FP&A Lead',                      initials: 'JL', color: '#4066C8' },
    { name: 'Maya Chen',     role: 'Sr. Financial Analyst, RS FP&A', initials: 'MC', color: '#2e7d32' },
    { name: 'Marcus Vance',  role: 'RS BU CFO',                      initials: 'MV', color: '#141E50' },
    { name: 'Sarah Jenkins', role: 'Revenue Operations Lead',        initials: 'SJ', color: '#7B68B0' }
  ];
  var STAR_SVG = '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><path d="M8 1.3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 12l-4.2 2.3.8-4.7L1.2 6.3l4.7-.7L8 1.3z"/></svg>';

  function persona(name) { return PERSONAS.filter(function (p) { return p.name === name; })[0] || PERSONAS[0]; }
  function now() { return new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function mk(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function avatar(p, small) {
    var a = mk('span', 'sc-av' + (small ? ' sm' : ''), p.initials);
    a.style.background = p.color; a.title = p.name + ' · ' + p.role; a.setAttribute('aria-hidden', 'true');
    return a;
  }
  function textBtn(label, fn, cls) {
    var b = mk('button', cls || 'sc-link', label); b.type = 'button'; b.addEventListener('click', fn); return b;
  }
  function fill(el, text) {
    text.split(tagRe).forEach(function (part) {
      if (!part) return;
      if (part.charAt(0) === '@' && NAMES.indexOf(part.slice(1)) !== -1) {
        var s = document.createElement('span'); s.className = 'sc-tag'; s.textContent = part; el.appendChild(s);
      } else el.appendChild(document.createTextNode(part));
    });
  }
  function rowLabel(r) {
    var c = r.cells[0].cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.row-subtext, .sc-badge'), function (n) { n.remove(); });
    return c.textContent.trim();
  }
  function makeStar(kind, label, inline) {
    var b = mk('button', 'snap-star' + (inline ? ' inline' : ''));
    b.type = 'button'; b.setAttribute('data-snap', kind);
    b.title = 'Add to insights'; b.setAttribute('aria-label', label);
    b.innerHTML = STAR_SVG;
    return b;
  }

  /* ───────────── Stars: add a star to every table title and chart tile that lacks one ───────────── */
  tables.forEach(function (table) {
    var section = table.closest('.section');
    var ti = section && section.querySelector('.section-title');
    if (!ti || ti.querySelector('.snap-star')) return;
    ti.appendChild(makeStar('table', 'Add ' + ti.textContent.trim() + ' table to insights', true));
  });
  tiles.forEach(function (tile) {
    if (tile.querySelector(':scope > .snap-star')) return;
    tile.insertBefore(makeStar('chart', 'Add chart to insights', false), tile.firstChild);
  });

  /* ───────────── Row rollover: Highlight + Comment ───────────── */
  var ov = mk('div'); ov.id = 'sc-overlay'; ov.setAttribute('role', 'toolbar'); ov.setAttribute('aria-label', 'Row actions');
  ov.innerHTML = '<label class="sc-ov-opt"><input type="checkbox" id="sc-ov-hl"> Highlight</label>' +
                 '<label class="sc-ov-opt"><input type="checkbox" id="sc-ov-cm"> Comment</label>';
  document.body.appendChild(ov);
  var hl = document.getElementById('sc-ov-hl');
  var cm = document.getElementById('sc-ov-cm');

  var curRow = null, curCfg = null, hideTimer = null, seq = 0;

  function showOverlay(r, cfg) {
    clearTimeout(hideTimer);
    curRow = r; curCfg = cfg;
    cm.checked = (cfg.editing === r);
    hl.checked = r.classList.contains('sc-hl');
    ov.classList.add('on');
    var rr = r.getBoundingClientRect(), wr = cfg.wrap.getBoundingClientRect();
    ov.style.top = (rr.top + rr.height / 2 - ov.offsetHeight / 2) + 'px';
    ov.style.left = (Math.min(wr.right, window.innerWidth) - ov.offsetWidth - 8) + 'px';
  }
  function hideOverlay() { ov.classList.remove('on'); }
  function scheduleHide() { clearTimeout(hideTimer); hideTimer = setTimeout(hideOverlay, 120); }

  ov.addEventListener('mouseenter', function () { clearTimeout(hideTimer); });
  ov.addEventListener('mouseleave', scheduleHide);
  document.addEventListener('scroll', hideOverlay, true);

  hl.addEventListener('change', function () {
    if (!curRow) return;
    curRow.classList.toggle('sc-hl', hl.checked);
  });
  cm.addEventListener('change', function () {
    if (!curRow || !curCfg) return;
    if (cm.checked) curCfg.openEditor(curRow); else curCfg.closeEditor();
  });

  tables.forEach(function (table, idx) {
    if (!table.tBodies.length) return;
    var wrap = table.parentNode;
    var section = table.closest('.section');
    var titleEl = section && section.querySelector('.section-title');
    var title = titleEl ? titleEl.childNodes[0].textContent.trim() : 'Table';
    var isTxn = table.classList.contains('pl-txn');
    var pid = 'rs-cmt-' + idx;

    /* commentary editor + saved list, placed under the table */
    var area = mk('div', 'sc-cmt-area');
    area.innerHTML =
      '<div class="sc-cmt-editor" hidden>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">' +
          '<div class="sc-cmt-target">Commenting on: <b></b></div>' +
          '<div class="sc-cmt-as"><label for="' + pid + '-persona"><b>Commenting as:</b></label><select id="' + pid + '-persona"></select></div>' +
        '</div>' +
        '<textarea class="sc-cmt-text" placeholder="Add commentary. Type @ to tag a colleague." aria-label="Row commentary"></textarea>' +
        '<div class="sc-cmt-actions">' +
          '<button type="button" class="btn-sm btn-cancel-reply">Cancel</button>' +
          '<button type="button" class="btn-sm btn-save-reply">Save commentary</button>' +
        '</div>' +
      '</div>' +
      '<div class="sc-cmt-list"></div>';
    wrap.parentNode.insertBefore(area, wrap.nextSibling);

    var editor = area.querySelector('.sc-cmt-editor');
    var target = area.querySelector('.sc-cmt-target b');
    var ta = area.querySelector('.sc-cmt-text');
    var list = area.querySelector('.sc-cmt-list');
    var cancelBtn = area.querySelector('.btn-cancel-reply');
    var saveBtn = area.querySelector('.btn-save-reply');
    var personaSel = area.querySelector('select');

    PERSONAS.forEach(function (p) {
      var o = document.createElement('option'); o.value = p.name; o.textContent = p.name + ' (' + p.role + ')';
      personaSel.appendChild(o);
    });
    if (window.wireMentionTextarea) window.wireMentionTextarea(ta);

    var cfg = {
      table: table, wrap: wrap, comments: [], editing: null, rows: [],
      insightsPrefix: title + ' · '
    };

    cfg.openEditor = function (r) {
      cfg.editing = r;
      target.textContent = r.dataset.scLabel;
      ta.value = '';
      editor.hidden = false;
      ta.focus();
      editor.scrollIntoView({ block: 'nearest' });
    };
    cfg.closeEditor = function () {
      cfg.editing = null;
      editor.hidden = true;
      ta.value = '';
      if (curCfg === cfg) cm.checked = false;
    };

    function updateBadges() {
      cfg.rows.forEach(function (r) {
        var n = cfg.comments.filter(function (c) { return c.row === r; }).length;
        var b = r.cells[0].querySelector('.sc-badge');
        if (!n) { if (b) b.remove(); return; }
        if (!b) { b = document.createElement('span'); b.className = 'sc-badge'; r.cells[0].appendChild(b); }
        b.textContent = n;
        b.title = n + (n === 1 ? ' comment' : ' comments');
      });
    }

    function toInsights(c) {
      var save = document.getElementById('commentary-save-btn'), inp = document.getElementById('commentary-input');
      var tit = document.getElementById('commentary-title-input'), sel = document.getElementById('commentary-author-select');
      if (!save || !inp) return;
      var p = persona(c.p), prev = sel ? sel.value : '';
      if (sel) sel.value = p.name + ' (' + p.role + ')';
      if (tit) tit.value = cfg.insightsPrefix + c.label;
      inp.value = c.text + (c.replies.length ? '\n\nReplies:\n' + c.replies.map(function (r) { return '— ' + r.p + ': ' + r.text; }).join('\n') : '');
      save.click();
      if (sel && prev) sel.value = prev;
      c.added = true;
      renderList();
      if (window.openDrawer) window.openDrawer('commentary');
    }

    function renderList() {
      while (list.firstChild) list.removeChild(list.firstChild);
      cfg.comments.forEach(function (c) {
        var p = persona(c.p), item = mk('div', 'sc-cmt-item');

        var head = mk('div', 'sc-cmt-head');
        head.appendChild(avatar(p));
        var who = mk('div', 'sc-cmt-who');
        who.appendChild(mk('b', null, p.name));
        who.appendChild(mk('span', 'sc-role', p.role));
        head.appendChild(who);
        head.appendChild(mk('span', 'sc-chip', c.label));
        head.appendChild(mk('span', 'sc-ts', c.ts));
        var del = textBtn('Delete', function () {
          cfg.comments.splice(cfg.comments.indexOf(c), 1);
          renderList();
          updateBadges();
        }, 'sc-link sc-del');
        del.setAttribute('aria-label', 'Delete comment on ' + c.label);
        head.appendChild(del);
        item.appendChild(head);

        var body = mk('div', 'sc-cmt-body'); fill(body, c.text); item.appendChild(body);

        var acts = mk('div', 'sc-cmt-acts');
        acts.appendChild(textBtn('↩ Reply' + (c.replies.length ? ' (' + c.replies.length + ')' : ''), function () {
          c.replying = true; renderList();
          var t = list.querySelector('.sc-reply-ta[data-id="' + c.id + '"]'); if (t) t.focus();
        }));
        if (c.added) acts.appendChild(mk('span', 'sc-added', 'Added to insights ✓'));
        else acts.appendChild(textBtn('Add to insights', function () { toInsights(c); }));
        item.appendChild(acts);

        if (c.replies.length) {
          var rl = mk('div', 'sc-replies');
          c.replies.forEach(function (r) {
            var rp = persona(r.p), re = mk('div', 'sc-reply');
            re.appendChild(avatar(rp, true));
            var rb = mk('div', 'sc-reply-main');
            var rm = mk('div', 'sc-reply-meta');
            rm.appendChild(mk('b', null, rp.name)); rm.appendChild(document.createTextNode(' · ' + r.ts));
            var rt = mk('div', 'sc-cmt-body'); fill(rt, r.text);
            rb.appendChild(rm); rb.appendChild(rt); re.appendChild(rb); rl.appendChild(re);
          });
          item.appendChild(rl);
        }

        if (c.replying) {
          var form = mk('div', 'sc-reply-form');
          var replyBar = mk('div', null);
          replyBar.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:12px;gap:8px;';
          var repLab = mk('label', null);
          repLab.innerHTML = '<b>Replying as:</b>';
          var repSel = mk('select', null);
          repSel.style.cssText = 'font:inherit;font-size:12px;font-weight:600;color:var(--navy);background:#fff;border:1px solid var(--line);padding:3px 8px;border-radius:2px;';
          PERSONAS.forEach(function (pp) {
            var o = document.createElement('option'); o.value = pp.name; o.textContent = pp.name + ' (' + pp.role + ')';
            if (personaSel.value === pp.name) o.selected = true;
            repSel.appendChild(o);
          });
          replyBar.appendChild(repLab); replyBar.appendChild(repSel);
          form.appendChild(replyBar);

          var rta = mk('textarea', 'sc-cmt-text sc-reply-ta');
          rta.setAttribute('data-id', c.id); rta.placeholder = 'Add a reply. Type @ to tag a colleague.';
          if (window.wireMentionTextarea) window.wireMentionTextarea(rta);
          form.appendChild(rta);

          var ra = mk('div', 'sc-cmt-actions');
          var cancel = mk('button', 'btn-sm btn-cancel-reply', 'Cancel'); cancel.type = 'button';
          cancel.addEventListener('click', function () { c.replying = false; renderList(); });
          var post = mk('button', 'btn-sm btn-save-reply', 'Post reply'); post.type = 'button';
          post.addEventListener('click', function () {
            var t = rta.value.trim(); if (!t) { rta.focus(); return; }
            var curP = persona(repSel.value);
            c.replies.push({ p: curP.name, text: t, ts: now() });
            c.replying = false; c.added = false; renderList();
          });
          ra.appendChild(cancel); ra.appendChild(post);
          form.appendChild(ra); item.appendChild(form);
        }
        list.appendChild(item);
      });
    }

    saveBtn.addEventListener('click', function () {
      var text = ta.value.trim();
      if (!text || !cfg.editing) return;
      var activeP = persona(personaSel.value);
      cfg.comments.push({
        id: ++seq, row: cfg.editing, label: cfg.editing.dataset.scLabel, text: text,
        p: activeP.name, ts: now(), replies: [], replying: false, added: false
      });
      cfg.closeEditor();
      renderList();
      updateBadges();
    });
    cancelBtn.addEventListener('click', cfg.closeEditor);

    var rows = Array.prototype.filter.call(table.tBodies[0].rows, function (r) {
      return r.cells.length > 1 && !r.classList.contains('section-gap') && r.cells[0].textContent.trim().length > 0;
    });
    cfg.rows = rows;

    rows.forEach(function (r) {
      if (!r.dataset.scLabel) {
        r.dataset.scLabel = isTxn
          ? 'Period ' + r.cells[0].textContent.trim() + (r.cells[5] ? ' · Acct ' + r.cells[5].textContent.trim() : '')
          : rowLabel(r);
      }
      r.style.cursor = onDetail ? '' : 'pointer';
      r.addEventListener('mouseenter', function () { showOverlay(r, cfg); });
      r.addEventListener('click', function (e) {
        if (onDetail) return;
        if (e.target.closest('a, button, input, textarea, select')) return;
        window.location.href = DETAIL_PAGE;
      });
    });
    table.addEventListener('mouseleave', scheduleHide);

    table.__scSnapshot = function () {
      return cfg.comments.map(function (c) {
        var p = persona(c.p);
        return {
          label: c.label, text: c.text, ts: c.ts,
          p: { name: p.name, role: p.role, initials: p.initials, color: p.color },
          replies: c.replies.map(function (r) { var rp = persona(r.p); return { name: rp.name, initials: rp.initials, color: rp.color, text: r.text, ts: r.ts }; })
        };
      });
    };
  });

  /* ───────────── Add to insights: snapshot a table or chart into the narrative panel ───────────── */
  var dlist = document.getElementById('commentary-list-drawer');
  if (!dlist) return;
  var FONT = '-apple-system,Segoe UI,Helvetica,Arial,sans-serif';
  var DEL_SVG = '<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/></svg>';
  var PROPS = ['display', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'color', 'background-color',
    'text-align', 'vertical-align', 'white-space', 'box-shadow', 'border-collapse', 'height',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
  ['top', 'right', 'bottom', 'left'].forEach(function (s) {
    PROPS.push('border-' + s + '-width', 'border-' + s + '-style', 'border-' + s + '-color');
  });

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function uri(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }

  /* copy computed styles onto a clone so it renders the same with no stylesheet (keeps row highlights) */
  function inline(src, dst) {
    var cs = getComputedStyle(src), css = '';
    PROPS.forEach(function (p) { css += p + ':' + cs.getPropertyValue(p) + ';'; });
    dst.setAttribute('style', css);
    if (src.tagName === 'TD' || src.tagName === 'TH') {
      dst.style.width = src.getBoundingClientRect().width + 'px';
      dst.style.boxSizing = 'border-box';
    }
    for (var i = 0; i < src.children.length; i++) inline(src.children[i], dst.children[i]);
  }

  function tableImage(table) {
    var r = table.getBoundingClientRect(), w = Math.ceil(r.width), h = Math.ceil(r.height);
    var clone = table.cloneNode(true);
    inline(table, clone);
    clone.style.width = w + 'px';
    clone.style.tableLayout = 'fixed';
    var holder = document.createElement('div');
    holder.appendChild(clone);
    var html = new XMLSerializer().serializeToString(holder);
    return uri('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<rect width="100%" height="100%" fill="#fff"/><foreignObject x="0" y="0" width="' + w + '" height="' + h + '">' + html + '</foreignObject></svg>');
  }

  function chartImage(tile) {
    var svg = tile.querySelector(':scope > svg');
    if (!svg) return null;
    var vb = svg.viewBox.baseVal, W = 360, pad = 12, cw = W - 2 * pad, ch = Math.round(vb.height * cw / vb.width);
    var ct = tile.querySelector('.chart-title'), sub = tile.querySelector('.chart-sub');
    var parts = '', y = 24;
    parts += '<text x="' + pad + '" y="' + y + '" font-size="13" font-weight="700" fill="#161616">' + esc(ct ? ct.textContent.trim() : '') + '</text>';
    if (sub) { y += 16; parts += '<text x="' + pad + '" y="' + y + '" font-size="11" fill="#525252">' + esc(sub.textContent.trim()) + '</text>'; }
    var spans = tile.querySelectorAll('.legend span');
    if (spans.length) {
      y += 20;
      var x = pad;
      Array.prototype.forEach.call(spans, function (sp) {
        var i = sp.querySelector('i'), label = sp.textContent.trim(), need = 14 + label.length * 6 + 14;
        if (x + need > W - pad && x > pad) { x = pad; y += 16; }
        parts += '<rect x="' + x + '" y="' + (y - 9) + '" width="10" height="10" rx="2" fill="' + esc(i ? getComputedStyle(i).backgroundColor : '#999') + '"/>' +
          '<text x="' + (x + 14) + '" y="' + y + '" font-size="11" fill="#525252">' + esc(label) + '</text>';
        x += need;
      });
    }
    var top = y + 12, H = top + ch + pad;
    var c = svg.cloneNode(true);
    ['width', 'height', 'role', 'aria-label', 'style', 'class'].forEach(function (a) { c.removeAttribute(a); });
    c.setAttribute('x', pad); c.setAttribute('y', top); c.setAttribute('width', cw); c.setAttribute('height', ch);
    c.setAttribute('font-family', FONT);
    var inner = new XMLSerializer().serializeToString(c);
    return uri('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="' + FONT + '">' +
      '<rect x=".5" y=".5" width="' + (W - 1) + '" height="' + (H - 1) + '" fill="#fff" stroke="#e0e0e0"/>' + parts + inner + '</svg>');
  }

  function commentsBlock(cmts) {
    var box = mk('div', 'commentary-item-snapcmts');
    box.appendChild(mk('div', 'snapcmts-hdr', 'Row commentary (' + cmts.length + ')'));
    cmts.forEach(function (c) {
      var it = mk('div', 'snapcmt');
      var head = mk('div', 'sc-cmt-head');
      head.appendChild(avatar(c.p));
      var who = mk('div', 'sc-cmt-who'); who.appendChild(mk('b', null, c.p.name)); who.appendChild(mk('span', 'sc-role', c.p.role));
      head.appendChild(who);
      head.appendChild(mk('span', 'sc-chip', c.label));
      head.appendChild(mk('span', 'sc-ts', c.ts));
      it.appendChild(head);
      var body = mk('div', 'sc-cmt-body'); fill(body, c.text); it.appendChild(body);
      if (c.replies.length) {
        var rl = mk('div', 'sc-replies');
        c.replies.forEach(function (r) {
          var re = mk('div', 'sc-reply'); re.appendChild(avatar(r, true));
          var m = mk('div', 'sc-reply-main');
          var rm = mk('div', 'sc-reply-meta'); rm.appendChild(mk('b', null, r.name)); rm.appendChild(document.createTextNode(' · ' + r.ts));
          var rt = mk('div', 'sc-cmt-body'); fill(rt, r.text);
          m.appendChild(rm); m.appendChild(rt); re.appendChild(m); rl.appendChild(re);
        });
        it.appendChild(rl);
      }
      box.appendChild(it);
    });
    return box;
  }

  function setStar(btn, on) {
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('title', on ? 'Added to commentary tracker' : 'Add to insights');
  }

  function addSnapshot(kind, title, src, cmts, star) {
    var item = document.createElement('div');
    item.className = 'commentary-item';
    item.__star = star;
    var del = document.createElement('button');
    del.type = 'button'; del.className = 'commentary-del-btn';
    del.setAttribute('aria-label', 'Delete commentary'); del.setAttribute('title', 'Delete commentary');
    del.innerHTML = DEL_SVG;
    var top = document.createElement('div'); top.className = 'commentary-item-top';
    var pill = document.createElement('span'); pill.className = 'insight-pill user'; pill.textContent = kind + ' snapshot';
    top.appendChild(pill);
    var t = document.createElement('div'); t.className = 'commentary-item-title'; t.textContent = title;
    var snap = document.createElement('div'); snap.className = 'commentary-item-snap';
    var img = document.createElement('img'); img.src = src; img.alt = title + ' (' + kind.toLowerCase() + ' snapshot)';
    snap.appendChild(img);
    var d = new Date();
    var meta = document.createElement('div'); meta.className = 'commentary-item-meta';
    meta.textContent = 'Snapshot added ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    [del, top, t, snap].forEach(function (n) { item.appendChild(n); });
    if (cmts && cmts.length) {
      item.appendChild(commentsBlock(cmts));
      item.setAttribute('data-sc-cmts', JSON.stringify(cmts));
    }
    item.appendChild(meta);
    dlist.appendChild(item);
    if (window.openDrawer) window.openDrawer('commentary');
    item.scrollIntoView({ block: 'nearest' });
  }

  Array.prototype.forEach.call(document.querySelectorAll('.snap-star'), function (btn) {
    btn.addEventListener('click', function () {
      if (btn.classList.contains('on')) { if (window.openDrawer) window.openDrawer('commentary'); return; }
      var src, title, kind, cmts = null;
      if (btn.dataset.snap === 'table') {
        var section = btn.closest('.section');
        var table = section ? section.querySelector('table.pl') : null;
        if (!table) return;
        var ti = section.querySelector('.section-title');
        kind = 'Table'; title = ti ? ti.childNodes[0].textContent.trim() : 'Table'; src = tableImage(table);
        cmts = table.__scSnapshot ? table.__scSnapshot() : null;
      } else {
        var tile = btn.closest('.chart-tile'), tt = tile && tile.querySelector('.chart-title');
        if (!tile) return;
        kind = 'Chart'; title = tt ? tt.textContent.trim() : 'Chart'; src = chartImage(tile);
      }
      if (!src) return;
      addSnapshot(kind, title, src, cmts, btn);
      setStar(btn, true);
    });
  });
  /* un-check the star when its snapshot is deleted from the commentary list */
  new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.removedNodes, function (n) { if (n.__star) setStar(n.__star, false); });
    });
  }).observe(dlist, { childList: true });
})();
