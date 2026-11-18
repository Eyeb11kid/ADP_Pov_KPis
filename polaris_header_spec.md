# Polaris Global Header — Design Spec (RS prototype)

Prototype applied to `rs_dashboard_3.html` only (P03, RS).
Files: `polaris_header.css`, `polaris_header.js`. Sample data in the JS stands in for OneData services.

## 1. Hierarchy and layout

```
Chrome (existing, 40px)         brand · cycle · status · avatar
Global navigation  .gn          P01 … P07, grouped Corporate | <BU> | Detail
App bar (existing)              BU badge · plan selector · "Switch Experience"
Context bar  .ctx  (sticky)     Row 1: BU · Fiscal period · Time view · Compare to · View toggle · Help
                                Row 2: Product / Function filters · chips · Clear all · Data status
                                Banner: "Close in progress: figures may change." (non-Final only)
Tab strip (existing page tabs)
Page: Breadcrumb → Title → content
```

Compact for executives: two rows at 1440px, three at tablet (chips take their own line), a one-line summary that expands on mobile.

## 2. Navigation strategy

- Seven fixed destinations, P01–P07, each with its code. Active page uses `aria-current="page"` and a blue underline.
- **Context persists.** Period, time view, comparison, view mode, Product and Function filters are carried in the URL query string and mirrored in `sessionStorage`. Every nav link, breadcrumb link and in-page `.html` link is rewritten to carry the current state. URL values are validated against allowlists. Unknown values are dropped.
- **CFO pages (P01, P02)** are shown only to Corporate CFO users. A BU user who opens one directly sees the restricted state (heading focused, link back to their BU dashboard).
- **BU access.** A BU user cannot open another BU's pages. The restricted message is "You do not have access to this business unit's dashboard".
- Pages without a counterpart for the current BU (for example P06 for RS) show as disabled with a tooltip.
- Dashboard/Report toggle appears only on P01 and P03–P06 and preserves all state. The Report layout itself is not built in this prototype, and a note says so.

## 3. Component rules

| Component | Behaviour |
|---|---|
| Fiscal period | FY runs Jul–Jun. Years newest first. Month grid is 4 quarter rows × 3 months, labelled 4-5-4 weeks. Months with no Actual data are disabled and tagged "No Actual". Default is the latest month with Actual data. Each month shows Final or Working (GEN-10). |
| Time view | Month, QTD, YTD, ROY, FY. P01 supports only Month, YTD, FY. The others are disabled with a tooltip. Control is segmented by default. Set `data-pf-timeview-control="dropdown"` on `<body>` for a dropdown. |
| Comparison | Plan (default), Forecast, Prior year. Global. No prior-period option. |
| Product filter | Multi-select, enabled on P03–P07. Chips with an ×, "Clear all", "+N more" overflow (4 visible, 2 on mobile). |
| Function filter | Multi-select. Active only on P05. Elsewhere it is disabled with the tooltip "Applies to Expense P&L only". Existing chips stay but render dashed and inactive. |
| Data status | "Data through <month FY>", "Version: Final/Working", "Refreshed <date/time ET>". Non-final adds the close-in-progress banner. |
| Breadcrumb | Persists context. Earlier levels restore their saved state. Collapses to "… / current" with a "Back to …" link on mobile. |
| Refresh | Any change updates the URL and storage, shows a loading state on KPI tiles and boxes (`aria-busy`), announces via `aria-live`, then fires `polaris:contextchange` / `polaris:ready` events for page components. |
| Unsupported filter | A component with `data-pf-unsupported="product function"` is masked. It shows "Not available for this filter" and a tooltip naming the dimension. Its data tooltip is withheld, so unfiltered values never show while a filter is active. |

## 4. States

- **Active:** dark fill or blue underline.
- **Hover:** light grey fill. On the dark nav, a white-tinted fill.
- **Focus:** 2px blue outline (light blue on the dark nav).
- **Disabled:** dashed border, muted text, `aria-disabled`, tooltip on hover and focus.
- **Loading:** shimmer over tiles and boxes, a spinner and "Refreshing data…" in the status area.
- **Restricted:** centred card with a lock icon, focus on the heading.

## 5. Responsive

- **≥1101px:** full layout.
- **≤1100px:** chips move to a full-width line, "Refreshed …" hidden.
- **≤1024px:** page codes hidden in nav, larger touch targets.
- **≤768px:** nav collapses to a "Menu" sheet. The context bar becomes a sticky one-line summary that expands. Pickers open as bottom sheets with a "Done" button.

## 6. Accessibility

- Skip link to main content.
- Nav landmark is labelled. Context bar is a labelled region.
- Time view, comparison and view mode are `radiogroup`s with roving tabindex and arrow keys.
- Pickers are dialogs with listbox/option semantics. Arrow keys, Home/End and Space/Enter work. Esc closes and returns focus to the trigger.
- Chip remove buttons have explicit labels, and focus moves to the neighbouring chip after removal.
- Tooltips show on hover and keyboard focus. Disabled controls expose the reason via `aria-description`.
- Status changes are announced in a polite live region.
- `prefers-reduced-motion` stops the animations.
- All DOM content is built with `textContent` and `setAttribute`. There is no `innerHTML`.

## 7. Prototype review controls

A "Prototype review" button (bottom right) lets reviewers:
- switch the signed-in role (Corporate CFO, RS BU user, NAS BU user)
- replay the loading state
- mark the latest month Working vs Final
- preview the example drill breadcrumb (`RS Dashboard > Revenue Analysis > Revenue: 401K Small > Transaction Detail`)
- reset saved context

These controls are not part of the production header.

## 8. What was changed on `rs_dashboard_3.html`

- Added the stylesheet and script, the nav and context mount points, and `data-pf-page="P03" data-pf-bu="RS"` on `<body>`.
- Removed the old cosmetic filter strip (`.epm-filter-strip`, its script) and the old meta-links row.
- Replaced the static breadcrumb with the new one.
- Marked the Clients KPI with `data-pf-unsupported="product"` as a **placeholder** to demonstrate the unsupported state.

## 9. Open questions

| # | Question |
|---|---|
| OQ-14 | How is a month determined to be "Final"? Until resolved, the default is the latest month with Actual data. The Final/Working tags are placeholders per GEN-10. |
| OQ-28 | ROY calculation logic is undefined. ROY is selectable but flagged (amber dot), and all data is masked with "Not available for this time view" until defined. |
| NAS product list | "-ric COS" looks garbled. It appears disabled and labelled "(unresolved)". Please confirm the intended value. |
| Page label | The prompt lists "P" instead of "P04" and labels P01 as both "CFO Dashboard" and "SEC P&L". I assumed P01 CFO Dashboard, P02 SEC P&L, P04 Revenue Analysis. Please confirm. |
| Role model | How is "Corporate CFO" and BU entitlement determined in production? The prototype uses a switchable demo role. |
| Unsupported matrix | Which components cannot be filtered by which dimension (and by Function off P05)? Only a placeholder tile is marked. |
| Filter scope on P07 | P07 exists only for RS here. Does it support Function chips from P05 when drilled from there? Currently they are carried but shown inactive. |
| BU switch | When switching BU, the product and function filters reset because values are BU-specific. Is that the desired behaviour? |
| Drill source | In-page drill links should carry `data-pf-line="Revenue: 401K Small"` to build the middle breadcrumb. Which links, and which lines are non-drillable (Sales)? |
| Help link | Destination for "Help" is undefined (currently `index.html`). |
| Time view on non-CFO pages | Are all five views valid on every P03–P07 page? Only P01 is restricted today. |
| Mobile page body | The existing 220px sidebar still fills most of a phone-width screen. This is a pre-existing layout issue outside the header. |

## 10. Rollout to Dashboard Experience 2 (current state)

The header is applied to all nine Experience 2 pages. Each page declares its place with `data-pf-page` and `data-pf-bu` on `<body>`.

| Page | Code | BU |
|---|---|---|
| `cfo_dashboard_3.html` | P01 | all |
| `rs_dashboard_3.html` | P03 | RS |
| `nas_dashboard_2.html` | P03 | NAS |
| `revenue_analysis_RS_2.html` / `revenue_analysis_NAS_2.html` | P04 | RS / NAS |
| `expense_pl_RS_2.html` / `expense_pl_NAS_2.html` | P05 | RS / NAS |
| `NAS_npi_2.html` | P06 | NAS |
| `rs_transaction_detail_2.html` | P07 | RS |

`sec_report.html` (P02) is not part of Experience 2 and is unchanged.

**Changes on every page**
- The "Switch Experience" link and the old page-link row are removed. The global P01–P07 nav row is no longer rendered, so page-to-page movement is the sidebar and the breadcrumb (see section 13).
- The old global filter strip is replaced by the sticky context bar (BU, fiscal period, time view, compare to, view toggle, Help, Product/Function filters and chips, data status and refresh time).
- The static breadcrumb is replaced by the hierarchy breadcrumb:
  `Corporate CFO Dashboard > BU Dashboard > Revenue Analysis / Expense P&L / NPI P&L > Transaction Detail`.
  Transaction Detail sits under Revenue Analysis.
- Stored trails from a different BU are discarded. Non-CFO roles never see the P01 crumb.

**Page-specific pills kept (they drive page content and are not global context)**
- Revenue (RS and NAS): Scope and Channel pills. The page-level Period pills were removed because the fiscal period selector replaces them.
- Expense P&L RS: the Expense Filter pills. The Period and Function pills were removed because the context bar replaces them.
- Transaction Detail: GL Source and Ledger pills. The static "FY23 Full Year Journal Walk" period pill was removed because it conflicted with the fiscal period selector.

**Removed outright (superseded by the context bar)**
- CFO Dashboard: the Filters, Period and Basis pill rows.
- NAS Dashboard, Expense P&L NAS and NAS NPI: the Filters, View and Units pill rows. Units ($K/$M) have no replacement yet. See OQ below.

**Additional open questions**
- Units ($K / $M) were in the removed NAS strips and are not defined in the header spec. Do they belong in the header or on the page?
- Entity, Channel, Contract and Tier filters on the NAS pages and the CFO segment scope pills (All Segments, Employer Services, PEO, International) were removed. They are not in the header filter list (Product, Function). Where should they live?
- The pages' own prose still shows September figures. Changing the fiscal period or time view refreshes the loading state and fires `polaris:contextchange`, but the sample numbers do not recompute.

## 11. Layout change (all Experience 2 pages)

- The left sidebar now starts directly under the top (ADP) row.
- The context bar moved into the content column, to the right of the sidebar. It is sticky at the top of that column (the `main` element is the scroll container).
- The dark app bar (badge and plan dropdown), the page-pill strips (Scope, Channel, Expense Filter, GL Source, Ledger) and the tab-strip row were removed.
- Help moved to the second row, next to the data status, to keep both rows to one line at 1440px.

## 12. View toggle removed; value format moved to the header

- The Dashboard / Report toggle (and its "Report layout not built" note) is removed from the header on every page. The `mode` URL parameter is no longer used.
- The `$ + %` / `$ only` toggle was removed from each page's KPI strip and now lives in the context bar as "Values". The CFO and RS dashboards previously labelled it `$` and the others `$ only`, so the label is now `$ only` everywhere.
- The setting persists across pages via the `fmt` URL parameter and session storage, and is written to `#headline-kpis[data-fmt]` by the header. The page-level scripts no longer write `data-fmt`.
- The control is hidden on pages with no KPI strip (Transaction Detail).
- The Plan / Plan vs Actual toggle stays on each page's KPI strip.
- Open question: the header also has a Compare to selector (Plan, Forecast, Prior year). Should the on-page Plan / Plan vs Actual toggle be merged into it?

## 13. Breadcrumb dropdown removed

- The ▾ button next to the current crumb, and the list of child pages it opened, are removed from all nine Experience 2 pages. The CSS and JS that supported it are removed too.
- The breadcrumb is now a plain trail. Each earlier crumb is a link and the current crumb is text. The phone view still shows the current page plus a "← Back to …" link.
- Navigation to child pages is through the sidebar and in-page links. This replaces the dropdown wording in sections 3 and 10.
