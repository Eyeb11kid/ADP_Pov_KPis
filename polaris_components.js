/* Polaris components: small, dependency-free render helpers for the dashboard layout.
   Rendering only: no calculations, no network. All figures arrive pre-formatted from a data file
   (see nas_dashboard_2.data.js). Markup and class names match rs_dashboard_3.html so polaris_theme.css,
   polaris_components.css and variance.css style it identically.
   Cell convention: a table cell is either a string, or [text, cssClass] where cssClass is fav / unf / neu. */
(function (root) {
  'use strict';

  var VAR_NOTE = '<div class="var-note" role="note"><b>Variance key</b> <span class="fav">+1,000 / +5.0%</span> favorable ' +
    '<span class="unf">(1,000) / \u22125.0%</span> unfavorable ' +
    '<span class="var-note-t">Positive variance = favorable. $ and % are always shown together.</span></div>';

  function attr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;'); }
  function span(v) { return v instanceof Array ? '<span class="' + v[1] + '">' + v[0] + '</span>' : v; }

  /* ---------- section header + panel (.epm-box) ---------- */
  function sectionHeader(title, opts) {
    opts = opts || {};
    var tag = opts.tag ? ' <span class="draft-tag">' + opts.tag + '</span>' : '';
    var tools = opts.tools ? (opts.light ? '<span style="font-size:12px;color:#726c66;">' + opts.tools + '</span>'
                                         : '<div class="tools"><span>' + opts.tools + '</span></div>') : '';
    return '<div class="epm-box-hdr' + (opts.light ? ' light' : '') + '"><span>' + title + tag + '</span>' + (opts.star || '') + tools + '</div>';
  }
  function panel(opts) {
    return '<div class="epm-box"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
      sectionHeader(opts.title, opts) + (opts.body || '') + '</div>';
  }
  function scroller(inner) { return '<div style="overflow-x:auto;">' + inner + '</div>'; }
  function footnote(text) {
    return '<div class="chart-cap" style="margin:0;padding:6px 14px 8px;border-top:1px solid #e3dfda;">' + text + '</div>';
  }

  /* ---------- KPI card + strip ---------- */
  function kpiCard(k) {
    var h = '<a class="kpi nd" id="' + k.id + '" href="' + k.href + '"' + (k.attrs ? ' ' + k.attrs : '') +
      ' data-tip="' + attr(k.tip) + '">';
    h += '<div class="kpi-val"><span class="m-pva">' + k.val + '</span><span class="m-plan">' + k.planVal + '</span></div>';
    h += '<div class="kpi-label">' + k.label + '</div><div class="kpi-desc">' + k.desc + '</div>';
    h += '<div class="kpi-var m-pva"><span class="' + k['var'][1] + '">' + k['var'][0] + '</span> vs plan</div>';
    h += '<div class="kpi-var m-plan">Plan \u00b7 September</div>';
    h += '<div class="kpi-row m-pva"><span>Plan</span><b>' + k.plan + '</b></div>';
    if (k.yoy) h += '<div class="kpi-row m-pva"><span>YoY</span><b>' + span(k.yoy) + '</b></div>';
    if (k.yoyPlan) h += '<div class="kpi-row m-plan"><span>YoY (plan)</span><b>' + span(k.yoyPlan) + '</b></div>';
    (k.secs || []).forEach(function (s) {
      h += '<div class="kpi-sec m-pva"><span>' + s.label + '</span><span class="kpi-sec-v"><b>' + s.val + '</b> ' + span(s['var']) + '</span></div>';
      h += '<div class="kpi-sec m-plan"><span>' + s.label + '</span><span class="kpi-sec-v"><b>' + s.planVal + '</b></span></div>';
    });
    return h + '<span class="kpi-link">' + k.link + ' &rarr;</span></a>';
  }
  function kpiStrip(list) { return list.map(kpiCard).join(''); }

  /* ---------- tables ---------- */
  function dataRow(r, ncols) {
    if (r.group) return '<tr class="group-hdr"><td colspan="' + ncols + '">' + r.group + '</td></tr>';
    var lbl = r.indent ? ' class="indent' + (r.indent > 1 ? r.indent : '') + '"' : '';
    return '<tr' + (r.cls ? ' class="' + r.cls + '"' : '') + (r.style ? ' style="' + r.style + '"' : '') + '><td' + lbl + '>' + r.label + '</td>' +
      r.cells.map(function (c) { return '<td' + (c instanceof Array ? ' class="' + c[1] + '"' : '') + '>' + (c instanceof Array ? c[0] : c) + '</td>'; }).join('') + '</tr>';
  }

  /* Plain table card: { title, tools, cols[], rows[] } */
  function tableCard(d) {
    var t = '<table class="epm-table"><thead><tr>' + d.cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') +
      '</tr></thead><tbody>' + d.rows.map(function (r) { return dataRow(r, d.cols.length); }).join('') + '</tbody></table>';
    return panel({ title: d.title, tools: d.tools, light: true, body: VAR_NOTE + scroller(t) });
  }

  /* Time-view table with expand/collapse column groups: { title, tag, tools, groups[], rows[], cap } */
  function timeViewCard(d) {
    var closed = '', r1 = '<th rowspan="2">Line</th>', r2 = '';
    d.groups.forEach(function (g, i) {
      var n = i + 1, open = !!g.open;
      if (!open) closed += ' c' + n;
      r1 += '<th colspan="' + (open ? g.cols.length : 4) + '" class="grp" data-grp="' + n + '" data-cols="' + g.cols.length + '">' +
        '<button type="button" class="grp-tg"' + (g.title ? ' title="' + g.title + '"' : '') + ' aria-expanded="' + open + '">' +
        '<span class="grp-chev" aria-hidden="true"></span>' + g.label + '</button></th>';
      g.cols.forEach(function (c, j) { r2 += '<th class="g' + n + (j === 0 ? ' gk' : (j === 1 ? ' gp' : (j === 2 || j === 3 ? ' gv' : ''))) + (j === g.cols.length - 1 ? ' ge' : '') + (j === 3 ? ' gz' : '') + '">' + c + '</th>'; });
    });
    var sizes = d.groups.map(function (g) { return g.cols.length; });
    /* Row hierarchy: r.indent is the level (0 = top); a row is a parent when the next row is deeper */
    var lv = d.rows.map(function (r) { return r.indent || 0; }), stack = [], ids = [], pars = [];
    d.rows.forEach(function (r, i) {
      while (stack.length && stack[stack.length - 1].lv >= lv[i]) stack.pop();
      pars[i] = stack.length ? stack[stack.length - 1].id : '';
      ids[i] = 'r' + i;
      stack.push({ lv: lv[i], id: ids[i] });
    });
    var body = d.rows.map(function (r, ri) {
      var isParent = ri + 1 < lv.length && lv[ri + 1] > lv[ri];
      var kind = lv[ri] === 0 ? 'xk-total' : (isParent ? 'xk-parent' : 'xk-child');
      var ctl = isParent
        ? '<button type="button" class="exp-toggle xt" aria-expanded="true" aria-label="Expand or collapse ' + attr(r.label) + '">\u2212</button>'
        : '<span class="xt-sp"></span>';
      var gi = 0, left = sizes[0], pos = 0;
      var tds = r.cells.map(function (c) {
        if (pos === left) { gi++; left += sizes[gi]; }
        var first = pos === left - sizes[gi];
        pos++;
        var idx = pos - 1 - (left - sizes[gi]);
        var cls = 'g' + (gi + 1) + (first ? ' gk' : (idx === 1 ? ' gp' : (idx === 2 || idx === 3 ? ' gv' : ''))) + (idx === sizes[gi] - 1 ? ' ge' : '') + (idx === 3 ? ' gz' : '') + (c instanceof Array ? ' ' + c[1] : '');
        return '<td class="' + cls + '">' + (c instanceof Array ? c[0] : c) + '</td>';
      }).join('');
      return '<tr class="xr ' + kind + ' xl' + lv[ri] + (r.cls ? ' ' + r.cls : '') + '" data-id="' + ids[ri] + '" data-parent="' + pars[ri] + '"' + (r.style ? ' style="' + r.style + '"' : '') + '><td><span class="xlab">' + ctl + r.label + '</span></td>' + tds + '</tr>';
    }).join('');
    var t = '<table class="epm-table pl-draft' + closed + '" id="pl-draft-table"><thead><tr>' + r1 + '</tr><tr>' + r2 +
      '</tr></thead><tbody>' + body + '</tbody></table>';
    return panel({ id: 'pl-draft-box', title: d.title, tag: d.tag,
      tools: d.tools + '<span class="expand-ctrls" id="plToggleAll" style="margin-left:12px;">Expand / Collapse All</span>', body: VAR_NOTE + scroller(t) + (d.cap ? footnote(d.cap) : '') });
  }

  /* Waypoint time-view grid (same markup, classes and behaviour as the RS dashboard P&L SUMMARY BY TIME VIEW ($K) table):
     { title, groups[{label,title,open,cols[{t,c,tip}]}], rows[{id,parent,kind,lvl,label,btn,open,hidden,cells}] } */
  function wpTimeViewCard(d) {
    var closed = '', r1 = '<th rowspan="2">Line</th><th rowspan="2" class="wp-cc" title="Row commentary"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="var(--text-secondary)" stroke-width="1.4" stroke-linejoin="round" style="vertical-align:middle;" aria-hidden="true"><path d="M2.5 2.5h11v8h-6.2L4 13.5v-3H2.5z"/></svg></th>', r2 = '';
    d.groups.forEach(function (g, i) {
      var n = i + 1, open = !!g.open;
      if (!open) closed += ' c' + n;
      r1 += '<th colspan="' + (open ? g.cols.length : 4) + '" class="wp-grp" data-grp="' + n + '" data-cols="' + g.cols.length + '">' +
        '<button type="button" class="wp-gt"' + (g.title ? ' title="' + attr(g.title) + '"' : '') + ' aria-expanded="' + open + '">' +
        '<span class="wp-chev" aria-hidden="true"></span>' + g.label + '</button></th>';
      g.cols.forEach(function (c) {
        r2 += '<th class="g' + n + (c.c ? ' ' + c.c : '') + '"' + (c.tip ? ' title="' + attr(c.tip) + '"' : '') + '>' + c.t + '</th>';
      });
    });
    var sizes = d.groups.map(function (g) { return g.cols.length; });
    var body = d.rows.map(function (r) {
      var open = r.open !== false;
      var ctl = r.btn
        ? '<button type="button" class="wp-xt" aria-expanded="' + open + '" aria-label="Expand or collapse ' + attr(r.label) + '">' + (open ? '\u2212' : '+') + '</button>'
        : '<span class="wp-sp"></span>';
      var gi = 0, left = sizes[0], pos = 0;
      var tds = r.cells.map(function (c) {
        if (pos === left) { gi++; left += sizes[gi]; }
        var col = d.groups[gi].cols[pos - (left - sizes[gi])];
        pos++;
        var cls = 'g' + (gi + 1) + (col.c ? ' ' + col.c : '') + (c instanceof Array && c[1] ? ' ' + c[1] : '');
        return '<td class="' + cls + '">' + (c instanceof Array ? c[0] : c) + '</td>';
      }).join('');
      return '<tr class="xr ' + r.kind + ' xl' + r.lvl + (r.hidden ? ' xh' : '') + '" data-id="' + r.id + '" data-parent="' + r.parent + '"><td><span class="wp-lab">' +
        ctl + r.label + '</span></td><td class="wp-cc"></td>' + tds + '</tr>';
    }).join('');
    var t = '<table class="wp-grid' + closed + '" id="wp-pl3-table"><thead><tr>' + r1 + '</tr><tr>' + r2 + '</tr></thead><tbody>' + body + '</tbody></table>';
    return '<div class="wp-card" id="wp-pl3-box"><div class="wp-card-hdr"><span class="wp-card-title">' + d.title + '</span><span class="wp-card-sub"></span>' +
      '<button type="button" class="wp-link" id="wpPl3HowTo" aria-haspopup="dialog">How to read</button>' +
      '<button type="button" class="wp-link" id="wpPl3Download" title="Download the full table (all columns and rows expanded) as an Excel file">Download .xls</button>' +
      '<button type="button" class="wp-link" id="wpPl3ToggleAll">Expand / Collapse All</button></div>' +
      '<div class="wp-note" role="note"><b>Variance key</b> <span class="fav">+1,000 / +5.0%</span> favorable <span class="unf">(1,000) / \u22125.0%</span> unfavorable ' +
      '<span class="wp-note-t">Positive variance = favorable. $ and % are always shown together.</span></div>' +
      '<div class="wp-scroll">' + t + '</div></div>' + wpHowTo();
  }

  function wpHowTo() {
    return '<div id="wpPl3HowToBackdrop" class="sc-modal-backdrop" hidden><div class="sc-modal-card wp-howto-card" id="wpPl3HowToModal" role="dialog" aria-modal="true" aria-labelledby="wpPl3HowToTitle">' +
      '<div class="sc-modal-hdr"><div class="sc-modal-hdr-l"><div class="sc-modal-title" id="wpPl3HowToTitle">How to read</div><div class="sc-modal-subtitle">P&amp;L SUMMARY BY TIME VIEW ($K)</div></div>' +
      '<button type="button" class="sc-modal-close" id="wpPl3HowToClose" aria-label="Close dialog"><svg viewBox="0 0 14 14" aria-hidden="true" focusable="false"><path d="M3 3l8 8M11 3l-8 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></button></div>' +
      '<div class="sc-modal-body"><dl class="wp-howto">' +
      '<dt>$K</dt><dd>Figures are in thousands of US dollars. Month is shown against plan and against forecast; QTD, YTD and ROY against plan; FY is the latest forecast against plan. All periods are read together in one table.</dd>' +
      '<dt>PL, FC</dt><dd><b>PL</b> = Plan, <b>FC</b> = Forecast. <b>Var $ / Var % vs PL</b> is variance to plan and <b>vs FC</b> is variance to forecast.</dd>' +
      '<dt>YoY $ / YoY %</dt><dd>Change versus the same period last year (Month vs same month, QTD, YTD and ROY vs the same period, FY vs last year actual). $ is derived from the YoY % and shown for dollar and count lines only.</dd>' +
      '<dt>% of FY plan achieved</dt><dd>YTD actual &divide; full-year plan (25% achieved means 75% still to deliver).</dd>' +
      '<dt>ROY</dt><dd>Full year less YTD, measured against the full-year forecast submitted to corporate, not the Hyperion rest-of-year member (which follows the working forecast and changes each month).</dd>' +
      '</dl></div><div class="sc-modal-footer"><button type="button" class="btn-sm" id="wpPl3HowToDone">Close</button></div></div></div>';
  }

  function initWpGroups(tbl) {
    if (!tbl) return;
    tbl.querySelectorAll('th.wp-grp[data-grp]').forEach(function (th) {
      var btn = th.querySelector('.wp-gt'), g = th.getAttribute('data-grp'), n = parseInt(th.getAttribute('data-cols'), 10);
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        tbl.classList.toggle('c' + g, !open);
        th.setAttribute('colspan', open ? n : 4);
      });
    });
  }

  function initWpRows(tbl, all) {
    if (!tbl) return;
    var rows = Array.prototype.slice.call(tbl.querySelectorAll('tbody tr.xr'));
    function setOpen(btn, open) { btn.setAttribute('aria-expanded', open ? 'true' : 'false'); btn.textContent = open ? '\u2212' : '+'; }
    function refresh() {
      var shown = {};
      rows.forEach(function (r) {
        var p = r.getAttribute('data-parent');
        var vis = !p || shown[p] === 'open';
        r.classList.toggle('xh', !vis);
        var b = r.querySelector('.wp-xt');
        shown[r.getAttribute('data-id')] = (vis && b && b.getAttribute('aria-expanded') === 'true') ? 'open' : 'closed';
      });
    }
    tbl.addEventListener('click', function (e) {
      var b = e.target.closest('.wp-xt');
      if (!b) return;
      setOpen(b, b.getAttribute('aria-expanded') !== 'true');
      refresh();
    });
    if (all) all.addEventListener('click', function () {
      var btns = tbl.querySelectorAll('.wp-xt');
      var anyClosed = Array.prototype.some.call(btns, function (b) { return b.getAttribute('aria-expanded') !== 'true'; });
      btns.forEach(function (b) { setOpen(b, anyClosed); });
      refresh();
    });
  }

  function initWpHowTo() {
    var open = document.getElementById('wpPl3HowTo'), bd = document.getElementById('wpPl3HowToBackdrop');
    if (!open || !bd) return;
    var x = document.getElementById('wpPl3HowToClose'), done = document.getElementById('wpPl3HowToDone');
    function show() { bd.hidden = false; done.focus(); }
    function hide() { bd.hidden = true; open.focus(); }
    open.addEventListener('click', show);
    x.addEventListener('click', hide);
    done.addEventListener('click', hide);
    bd.addEventListener('click', function (e) { if (e.target === bd) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !bd.hidden) hide(); });
  }

  function initWpDownload(fileName) {
    var btn = document.getElementById('wpPl3Download'), tbl = document.getElementById('wp-pl3-table');
    if (!btn || !tbl) return;
    function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function labelOf(td) {
      var c = td.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('button, .wp-sp'), function (n) { n.parentNode.removeChild(n); });
      return c.textContent.replace(/\s+/g, ' ').trim();
    }
    btn.addEventListener('click', function () {
      var sub = Array.prototype.slice.call(tbl.querySelectorAll('thead tr:nth-child(2) th'));
      var head1 = '<tr><th rowspan="2" style="text-align:left">Line</th>';
      Array.prototype.forEach.call(tbl.querySelectorAll('thead tr:first-child th.wp-grp'), function (th) {
        var g = th.getAttribute('data-grp');
        var n = sub.filter(function (h) { return h.classList.contains('g' + g); }).length;
        head1 += '<th colspan="' + n + '">' + esc(th.textContent.trim()) + '</th>';
      });
      head1 += '</tr>';
      var head2 = '<tr>' + sub.map(function (h) { return '<th>' + esc(h.textContent.trim()) + '</th>'; }).join('') + '</tr>';
      var body = '';
      Array.prototype.forEach.call(tbl.tBodies[0].rows, function (r) {
        var lvl = /\bxl(\d)\b/.test(r.className) ? parseInt(RegExp.$1, 10) : 0;
        var bold = /\bxk-(total|parent)\b/.test(r.className);
        var cells = '<td style="text-align:left;mso-number-format:\'\\@\';' + (bold ? 'font-weight:bold;' : '') + 'padding-left:' + (lvl * 12) + 'px">' + esc(labelOf(r.cells[0])) + '</td>';
        Array.prototype.forEach.call(r.cells, function (td, i) {
          if (i < 2) return;
          cells += '<td style="text-align:right;mso-number-format:\'\\@\';' + (bold ? 'font-weight:bold;' : '') + '">' + esc(td.textContent.trim()) + '</td>';
        });
        body += '<tr>' + cells + '</tr>';
      });
      var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8">' +
        '<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>P&amp;L by time view</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->' +
        '<style>table{border-collapse:collapse}th,td{border:1px solid #938c85;font-family:Arial,sans-serif;font-size:11pt}th{background:#f7f6f4;font-weight:bold;text-align:center}</style></head><body>' +
        '<table><thead>' + head1 + head2 + '</thead><tbody>' + body + '</tbody></table></body></html>';
      var blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  /* ---------- chart wrapper + SVG renderers (viewBox 0 0 400 200, same grid and palette as RS) ---------- */
  var C = { plan: '#BDB4DC', actual: '#7967ae', blue: '#476bc3', fav: '#529c42', unf: '#f25d71', favTx: '#14562a', unfTx: '#9f1d17' };

  function legendItem(color, label) { return '<span><i style="background:' + color + '"></i> ' + label + '</span>'; }
  var STAR = '<svg class="chart-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8z"/></svg>';
  function chartCard(d, legend, svg) {
    return panel({
      title: d.title, star: STAR, light: true,
      body: '<div class="epm-box-body"><div class="chart-sub">' + d.sub + '</div><div class="chart-legend">' + legend + '</div>' +
        svg + (d.cap ? '<div class="chart-cap">' + d.cap + '</div>' : '') + '</div>'
    });
  }
  function svgOpen(aria) { return '<svg viewBox="0 0 400 200" width="100%" role="group" aria-label="' + attr(aria) + '">'; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.anchor || 'middle') + '" font-size="' + (o.size || 12) + '"' +
      (o.bold ? ' font-weight="700"' : '') + ' fill="' + (o.fill || '#726c66') + '">' + s + '</text>';
  }
  /* Gridlines and y-axis labels: ticks from axis.max down to axis.min between pixel rows top..bottom */
  function grid(axis, top, bottom, suffix) {
    var n = Math.round((axis.max - axis.min) / axis.step), h = '';
    for (var i = 0; i <= n; i++) {
      var y = top + (bottom - top) * i / n;
      h += '<line x1="40" y1="' + f1(y) + '" x2="390" y2="' + f1(y) + '" stroke="' + (i === n ? '#cdc7c2' : '#e3dfda') + '"/>';
      h += txt(34, f1(y + 3), (axis.max - i * axis.step) + (suffix || ''), { anchor: 'end' });
    }
    return h;
  }
  function scaleY(axis, top, bottom) {
    return function (v) { return bottom - (v - axis.min) / (axis.max - axis.min) * (bottom - top); };
  }

  function waterfall(d) {
    var y = scaleY(d.axis, 30, 170), h = svgOpen(d.aria) + grid(d.axis, 30, 170), level = 0, prevRight = null, prevLevel = 0;
    d.steps.forEach(function (s, i) {
      var x = 50 + i * 88, top, ht, fill, tx = '#262321', end;
      if (s.type === 'total') {
        level = s.v; top = y(s.v); ht = 170 - top; fill = i === 0 ? C.plan : C.actual;
      } else {
        var from = level, to = level + s.v;
        top = y(Math.max(from, to)); ht = Math.abs(y(from) - y(to)); level = to;
        fill = s.v >= 0 ? C.fav : C.unf; tx = s.v >= 0 ? C.favTx : C.unfTx;
      }
      if (prevRight !== null) h += '<line x1="' + prevRight + '" y1="' + f1(y(prevLevel)) + '" x2="' + x + '" y2="' + f1(y(prevLevel)) + '" stroke="#938c85" stroke-dasharray="3 2"/>';
      h += '<rect class="nd" data-tip="' + attr(s.tip) + '" x="' + x + '" y="' + f1(top) + '" width="62" height="' + f1(ht) + '" fill="' + fill + '"/>';
      h += txt(x + 31, f1(top - 6), s.text, { size: 12, bold: true, fill: tx });
      if (s.pct) h += txt(x + 31, f1(top - 19), s.pct, { bold: true, fill: tx });
      h += txt(x + 31, 188, s.label);
      prevRight = x + 62; prevLevel = level;
    });
    return h + '</svg>';
  }

  function groupedBar(d) {
    var y = scaleY(d.axis, 20, 160), h = svgOpen(d.aria) + grid(d.axis, 20, 160);
    d.cats.forEach(function (c, i) {
      var cx = 100 + i * 115, ya = y(c.act), yp = y(c.plan);
      h += '<rect class="nd" data-tip="' + attr(c.tipA) + '" x="' + (cx - 29) + '" y="' + f1(ya) + '" width="28" height="' + f1(160 - ya) + '" fill="' + C.actual + '"/>';
      h += '<rect class="nd" data-tip="' + attr(c.tipP) + '" x="' + (cx + 1) + '" y="' + f1(yp) + '" width="28" height="' + f1(160 - yp) + '" fill="' + C.plan + '"/>';
      h += txt(cx - 15, f1(ya - 6), f1(c.act), { bold: true, fill: '#262321' });
      h += txt(cx + 15, f1(yp - 6), f1(c.plan));
      h += txt(cx, 176, c.label[0]) + txt(cx, 188, c.label[1], { size: 12, fill: '#726c66' });
    });
    return h + '</svg>';
  }

  function lineChart(d) {
    var y = scaleY(d.axis, 30, 170), h = svgOpen(d.aria) + grid(d.axis, 30, 170, '%'), n = d.months.length, last = n - 1;
    function px(i) { return 60 + i * 62; }
    function pts(a) { return a.map(function (v, i) { return px(i) + ',' + f1(y(v)); }).join(' '); }
    h += '<polyline points="' + pts(d.plan) + '" fill="none" stroke="' + C.blue + '" stroke-width="2" stroke-linejoin="round"/>';
    h += '<polyline points="' + pts(d.actual) + '" fill="none" stroke="' + C.actual + '" stroke-width="2.4" stroke-linejoin="round"/>';
    d.months.forEach(function (m, i) {
      var tip = '<b>' + m + '</b> \u00b7 Actual YoY +' + f1(d.actual[i]) + '% \u00b7 Plan +' + f1(d.plan[i]) + '%';
      h += '<circle class="nd" data-tip="' + attr(tip) + '" cx="' + px(i) + '" cy="' + f1(y(d.actual[i])) + '" r="4" fill="' + C.actual + '" stroke="#fff" stroke-width="1.5"/>';
    });
    d.months.forEach(function (m, i) {
      h += txt(px(i), f1(y(d.actual[i]) + (d.actual[i] < d.plan[i] ? 17 : -9)), f1(d.actual[i]) + '%', i === last ? { bold: true, fill: '#262321' } : {});
      h += txt(px(i), 188, m);
    });
    h += txt(px(last), f1(y(d.plan[last]) + 17), f1(d.plan[last]) + '%', { fill: C.blue });
    return h + '</svg>';
  }

  function chartCards(c) {
    return chartCard(c.bridge, legendItem(C.plan, 'Plan') + legendItem(C.fav, '\u25b2 Favorable (+)') +
        legendItem(C.unf, '\u25bc Unfavorable ( ) / \u2212') + legendItem(C.actual, 'Actual'), waterfall(c.bridge)) +
      chartCard(c.mix, legendItem(C.actual, 'Actual') + legendItem(C.plan, 'Plan'), groupedBar(c.mix)) +
      chartCard(c.trend, legendItem(C.actual, 'Actual YoY') + legendItem(C.blue, 'Plan YoY'), lineChart(c.trend));
  }

  /* ---------- behaviour: tooltip + column-group toggle (same as RS) ---------- */
  function initTooltips() {
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
  }
  function initColumnGroups(tbl) {
    if (!tbl) return;
    tbl.querySelectorAll('th.grp[data-grp]').forEach(function (th) {
      var btn = th.querySelector('.grp-tg'), g = th.getAttribute('data-grp'), n = parseInt(th.getAttribute('data-cols'), 10);
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        tbl.classList.toggle('c' + g, !open);
        th.setAttribute('colspan', open ? n : 4);
      });
    });
  }

  function initRowHierarchy(tbl, all) {
    if (!tbl) return;
    var rows = Array.prototype.slice.call(tbl.querySelectorAll('tbody tr.xr'));
    function setOpen(btn, open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? '\u2212' : '+';
    }
    function refresh() {
      var shown = {};
      rows.forEach(function (r) {
        var p = r.getAttribute('data-parent');
        var vis = !p || shown[p] === 'open';
        r.classList.toggle('xh', !vis);
        var b = r.querySelector('.xt');
        shown[r.getAttribute('data-id')] = (vis && b && b.getAttribute('aria-expanded') === 'true') ? 'open' : 'closed';
      });
    }
    tbl.addEventListener('click', function (e) {
      var b = e.target.closest('.xt');
      if (!b) return;
      setOpen(b, b.getAttribute('aria-expanded') !== 'true');
      refresh();
    });
    if (all) all.addEventListener('click', function () {
      var btns = tbl.querySelectorAll('.xt');
      var anyClosed = Array.prototype.some.call(btns, function (b) { return b.getAttribute('aria-expanded') !== 'true'; });
      btns.forEach(function (b) { setOpen(b, anyClosed); });
      refresh();
    });
  }

  /* ---------- mount: fill the page's placeholder containers from a data object ---------- */
  function mount(data) {
    function put(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
    put('headline-kpis', kpiStrip(data.kpis));
    put('mount-timeview', data.wpTimeView ? wpTimeViewCard(data.wpTimeView) : timeViewCard(data.timeView));
    put('mount-charts', chartCards(data.charts));
    initColumnGroups(document.getElementById('pl-draft-table'));
    initRowHierarchy(document.getElementById('pl-draft-table'), document.getElementById('plToggleAll'));
    var wp = document.getElementById('wp-pl3-table');
    initWpGroups(wp);
    initWpRows(wp, document.getElementById('wpPl3ToggleAll'));
    initWpHowTo();
    initWpDownload(data.wpDownloadName || 'PL_Summary_by_Time_View.xls');
    initTooltips();
  }

  root.Polaris = {
    sectionHeader: sectionHeader, panel: panel, kpiCard: kpiCard, kpiStrip: kpiStrip, tableCard: tableCard,
    timeViewCard: timeViewCard, chartCard: chartCard, waterfall: waterfall, groupedBar: groupedBar, lineChart: lineChart,
    chartCards: chartCards, mount: mount
  };
})(window);
