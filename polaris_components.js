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
    var tools = opts.tools ? (opts.light ? '<span style="font-size:10px;color:#64748b;">' + opts.tools + '</span>'
                                         : '<div class="tools"><span>' + opts.tools + '</span></div>') : '';
    return '<div class="epm-box-hdr' + (opts.light ? ' light' : '') + '"><span>' + title + tag + '</span>' + tools + '</div>';
  }
  function panel(opts) {
    return '<div class="epm-box"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' +
      sectionHeader(opts.title, opts) + (opts.body || '') + '</div>';
  }
  function scroller(inner) { return '<div style="overflow-x:auto;">' + inner + '</div>'; }
  function footnote(text) {
    return '<div class="chart-cap" style="margin:0;padding:6px 14px 8px;border-top:1px solid #e2e8f0;">' + text + '</div>';
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
      r1 += '<th colspan="' + (open ? g.cols.length : 1) + '" class="grp" data-grp="' + n + '" data-cols="' + g.cols.length + '">' +
        '<button type="button" class="grp-tg"' + (g.title ? ' title="' + g.title + '"' : '') + ' aria-expanded="' + open + '">' +
        '<span class="grp-chev" aria-hidden="true"></span>' + g.label + '</button></th>';
      g.cols.forEach(function (c, j) { r2 += '<th class="g' + n + (j === 0 ? ' gk' : '') + '">' + c + '</th>'; });
    });
    var sizes = d.groups.map(function (g) { return g.cols.length; });
    var body = d.rows.map(function (r) {
      var gi = 0, left = sizes[0], pos = 0;
      var tds = r.cells.map(function (c) {
        if (pos === left) { gi++; left += sizes[gi]; }
        var first = pos === left - sizes[gi];
        pos++;
        var cls = 'g' + (gi + 1) + (first ? ' gk' : '') + (c instanceof Array ? ' ' + c[1] : '');
        return '<td class="' + cls + '">' + (c instanceof Array ? c[0] : c) + '</td>';
      }).join('');
      return '<tr' + (r.cls ? ' class="' + r.cls + '"' : '') + (r.style ? ' style="' + r.style + '"' : '') + '><td' + (r.indent ? ' class="indent' + (r.indent > 1 ? r.indent : '') + '"' : '') + '>' + r.label + '</td>' + tds + '</tr>';
    }).join('');
    var t = '<table class="epm-table pl-draft' + closed + '" id="pl-draft-table"><thead><tr>' + r1 + '</tr><tr>' + r2 +
      '</tr></thead><tbody>' + body + '</tbody></table>';
    return panel({ id: 'pl-draft-box', title: d.title, tag: d.tag, tools: d.tools, body: VAR_NOTE + scroller(t) + footnote(d.cap) });
  }

  /* ---------- chart wrapper + SVG renderers (viewBox 0 0 400 200, same grid and palette as RS) ---------- */
  var C = { plan: '#BDB4DC', actual: '#7B68B0', blue: '#4066C8', fav: '#3A9A3A', unf: '#F0605D', favTx: '#14562a', unfTx: '#9f1d17' };

  function legendItem(color, label) { return '<span><i style="background:' + color + '"></i> ' + label + '</span>'; }
  function chartCard(d, legend, svg) {
    return panel({
      title: d.title, light: true,
      body: '<div class="epm-box-body"><div class="chart-sub">' + d.sub + '</div><div class="chart-legend">' + legend + '</div>' +
        svg + '<div class="chart-cap">' + d.cap + '</div></div>'
    });
  }
  function svgOpen(aria) { return '<svg viewBox="0 0 400 200" width="100%" role="group" aria-label="' + attr(aria) + '">'; }
  function f1(n) { return (Math.round(n * 10) / 10).toString(); }
  function txt(x, y, s, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.anchor || 'middle') + '" font-size="' + (o.size || 10) + '"' +
      (o.bold ? ' font-weight="700"' : '') + ' fill="' + (o.fill || '#474747') + '">' + s + '</text>';
  }
  /* Gridlines and y-axis labels: ticks from axis.max down to axis.min between pixel rows top..bottom */
  function grid(axis, top, bottom, suffix) {
    var n = Math.round((axis.max - axis.min) / axis.step), h = '';
    for (var i = 0; i <= n; i++) {
      var y = top + (bottom - top) * i / n;
      h += '<line x1="40" y1="' + f1(y) + '" x2="390" y2="' + f1(y) + '" stroke="' + (i === n ? '#cbd5e1' : '#ececec') + '"/>';
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
      var x = 50 + i * 88, top, ht, fill, tx = '#1a1a1a', end;
      if (s.type === 'total') {
        level = s.v; top = y(s.v); ht = 170 - top; fill = i === 0 ? C.plan : C.actual;
      } else {
        var from = level, to = level + s.v;
        top = y(Math.max(from, to)); ht = Math.abs(y(from) - y(to)); level = to;
        fill = s.v >= 0 ? C.fav : C.unf; tx = s.v >= 0 ? C.favTx : C.unfTx;
      }
      if (prevRight !== null) h += '<line x1="' + prevRight + '" y1="' + f1(y(prevLevel)) + '" x2="' + x + '" y2="' + f1(y(prevLevel)) + '" stroke="#94a3b8" stroke-dasharray="3 2"/>';
      h += '<rect class="nd" data-tip="' + attr(s.tip) + '" x="' + x + '" y="' + f1(top) + '" width="62" height="' + f1(ht) + '" fill="' + fill + '"/>';
      h += txt(x + 31, f1(top - 6), s.text, { size: 11, bold: true, fill: tx });
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
      h += txt(cx - 15, f1(ya - 6), f1(c.act), { bold: true, fill: '#1a1a1a' });
      h += txt(cx + 15, f1(yp - 6), f1(c.plan));
      h += txt(cx, 176, c.label[0]) + txt(cx, 188, c.label[1], { size: c.label[1].length > 14 ? 9 : 10, fill: c.label[1].length > 14 ? '#64748b' : '#474747' });
    });
    return h + '</svg>';
  }

  function lineChart(d) {
    var y = scaleY(d.axis, 30, 170), h = svgOpen(d.aria) + grid(d.axis, 30, 170, '%'), n = d.months.length, last = n - 1;
    function px(i) { return 60 + i * 62; }
    function pts(a) { return a.map(function (v, i) { return px(i) + ',' + f1(y(v)); }).join(' '); }
    h += '<polyline points="' + pts(d.plan) + '" fill="none" stroke="' + C.blue + '" stroke-width="1.5" stroke-dasharray="4 3" stroke-linejoin="round"/>';
    h += '<polyline points="' + pts(d.actual) + '" fill="none" stroke="' + C.actual + '" stroke-width="2.4" stroke-linejoin="round"/>';
    d.months.forEach(function (m, i) {
      var tip = '<b>' + m + '</b> \u00b7 Actual YoY +' + f1(d.actual[i]) + '% \u00b7 Plan +' + f1(d.plan[i]) + '%';
      h += '<circle class="nd" data-tip="' + attr(tip) + '" cx="' + px(i) + '" cy="' + f1(y(d.actual[i])) + '" r="4" fill="' + C.actual + '" stroke="#fff" stroke-width="1.5"/>';
    });
    d.months.forEach(function (m, i) {
      h += txt(px(i), f1(y(d.actual[i]) + (d.actual[i] < d.plan[i] ? 17 : -9)), f1(d.actual[i]) + '%', i === last ? { bold: true, fill: '#1a1a1a' } : {});
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
        th.setAttribute('colspan', open ? n : 1);
      });
    });
  }

  /* ---------- mount: fill the page's placeholder containers from a data object ---------- */
  function mount(data) {
    function put(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
    put('headline-kpis', kpiStrip(data.kpis));
    put('mount-timeview', timeViewCard(data.timeView));
    put('mount-rst', tableCard(data.rst));
    put('mount-charts', chartCards(data.charts));
    initColumnGroups(document.getElementById('pl-draft-table'));
    initTooltips();
  }

  root.Polaris = {
    sectionHeader: sectionHeader, panel: panel, kpiCard: kpiCard, kpiStrip: kpiStrip, tableCard: tableCard,
    timeViewCard: timeViewCard, chartCard: chartCard, waterfall: waterfall, groupedBar: groupedBar, lineChart: lineChart,
    chartCards: chartCards, mount: mount
  };
})(window);
