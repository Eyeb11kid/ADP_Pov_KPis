# RS Variance Display Standard

Applies to the Polaris RS pages: `rs_dashboard_3.html`, `rs_dashboard_4.html`, `revenue_analysis_RS_2.html`, `expense_pl_RS_2.html`.
Implemented in [`variance.css`](variance.css) (loaded last on each page) and one change in [`polaris_header.js`](polaris_header.js).

## 1. Rules

| Rule | Implementation |
|---|---|
| Positive variance = favorable (RS close-package) | Variance is always computed so that positive is good. For expense lines, Var = Plan less Actual. |
| Unfavorable $ or count | Parentheses: `(1,117.4)`, `($632K)` |
| Unfavorable % or bps | Minus sign (U+2212): `−2.5%`, `−30 bps` |
| $ and % always together | KPI tiles show one chip, `+$4.0M / +4.5%`. Tables keep Var $ and Var % side by side. |
| No $ / % toggle | The header "Values" control is hidden on RS pages and `data-fmt` is forced to `both`. |
| Never color alone | Every variance has sign or parentheses, an arrow, and a color. |
| Neutral KPIs (Headcount, FTE) | Gray only, wording "higher" / "lower", arrow kept. Never red or green. |

## 2. Markup contract

Class names are unchanged, so existing pages keep working.

| Class | Meaning | Arrow (CSS `::before`) | Spoken prefix |
|---|---|---|---|
| `.fav` | Favorable | ▲ | "Favorable:" |
| `.unf` | Unfavorable | ▼ | "Unfavorable:" |
| `.neu.up` | Neutral, higher | ▲ | "Higher:" |
| `.neu.down` | Neutral, lower | ▼ | "Lower:" |
| `.neu` | Neutral, no change | ▬ | "Unchanged:" |

Arrows come from CSS, not from the text, so copied cells and exports contain only the number. Write the number and sign only:

```html
<td class="g1 fav">+4,003.4</td>
<td class="g1 unf">(1,117.4)</td>
<td class="g1 unf">−2.5%</td>
<span class="fav">+$4.0M / +4.5%</span>
<span class="neu up">+8.3 FTE / +0.6% higher</span> than plan
```

## 3. Visual styling

| Token | Value | Contrast on white | On the darkest row (`#cbd5e1`) |
|---|---|---|---|
| Favorable text | `#14562a` | 8.8:1 | 5.9:1 |
| Unfavorable text | `#9f1d17` | 7.9:1 | 5.3:1 |
| Neutral text | `#424b57` | 8.8:1 | 6.0:1 |

- Chip background: tint of the text color (`#e6f4ea`, `#fdeceb`, `#eef0f3`) with a 1px border. Used on KPI tiles and the variance key.
- Table cells: colored bold text, right-aligned, tabular numerals. Summary and total rows use weight 700.
- The old colors (`#2e7d32`, `#c8322f`) were 4.2–4.6:1 on blue and gray summary rows, below the 4.5:1 AA minimum. The new ones meet AA everywhere.
- Each variance table has a **Variance key** under its header showing `+1,000 / +5.0%` favorable and `(1,000) / −5.0%` unfavorable.

## 4. Examples

**Positive (favorable)**: revenue above plan
`▲ +$4.0M / +4.5%`, green, `+` sign, up arrow.

**Negative (unfavorable)**: field expense above plan
`▼ ($632K) / −3.5%`, red, parentheses on $, minus on %, down arrow.

**Neutral**: average FTE
`▲ +8.3 FTE / +0.6% higher`, gray, up arrow, "higher" wording. Never red or green.

**Bridge chart labels**: `▲ +4.0` and `+4.5%` in green. `▼ (1.4)` and `−3.0%` in red. The legend reads "▲ Favorable (+)" and "▼ Unfavorable ( ) / −".

## 5. Accessibility for color-blind users

- Green and red have almost the same lightness (about 1.1:1), so lightness does not separate them. Sign, arrow and parentheses carry the meaning.
- Redundant cues per variance: sign or parentheses, arrow shape (▲ / ▼), color, and the spoken prefix.
- Screen readers: the arrow's alt text in CSS (`content: "▲" / "Favorable: "`) reads as "Favorable: plus 4,003.4". Browsers without alt-text support show the arrow and read the sign.
- Tooltips on KPI tiles and chart bars now say "favorable" or "unfavorable" in words, for example `Var ($631.9K) / −3.5% unfavorable`.
- Forced-colors (Windows high contrast): all variance color is replaced with `CanvasText`. Chips get a border, and unfavorable chips get a dashed border.
- Print and grayscale: arrows and signs stay. Unfavorable values get a dotted underline.
- Neutral gray is clearly different from red and green in lightness and saturation, and is never used for a favorable or unfavorable outcome.

## 6. Iconography

| Use | Glyph | Why |
|---|---|---|
| Favorable, higher | ▲ U+25B2 | Filled triangle, readable at 9–11px, no font dependency |
| Unfavorable, lower | ▼ U+25BC | Same family, mirrored |
| Neutral, unchanged | ▬ U+25AC | Distinct from both arrows |
| Minus sign | − U+2212 | Wider than a hyphen, not confused with a dash |

Arrows are text glyphs rather than images, so they scale with font size, follow `color`, and work in forced-colors mode.

## 7. Hover and focus

- Hover on a variance: dotted underline. In tables the cell takes the tint of its status (`#e6f4ea` / `#fdeceb` / `#eef0f3`).
- Keyboard: a variance given `tabindex="0"` shows a 2px `#0f62fe` outline. KPI tiles that are links add a 1px blue ring on the chip while the tile has focus.
- Tooltips (`data-tip`) show the full $ and % with the word "favorable" or "unfavorable".

## 8. Responsive behavior

- Above 1100px: five KPI tiles per row.
- 1100px and below: three tiles per row, with slightly tighter chip padding.
- 700px and below: tiles stack. Variance text grows from 11px to 12px and chips get more padding, for touch.
- The chip and "vs plan" text wrap onto two lines instead of clipping.
- Tables keep each number on one line and scroll horizontally inside the existing wrapper. The arrow never separates from its number.
- The variance key wraps and its explanatory text moves to its own line.

## 9. Before / after

| Item | Before | After |
|---|---|---|
| Expense line over plan (`expense_pl_RS_2`) | `+1,117.4` and `+2.5%`, red | `▼ (1,117.4)` and `▼ −2.5%`, red |
| Expense line under plan | `(4.1)` and `(16.4%)`, green | `▲ +4.1` and `▲ +16.4%`, green |
| KPI tile, revenue (`rs_dashboard_3`) | `▲ +$4.0M` `(+4.5%)` hidden by the `$ only` toggle | `▲ +$4.0M / +4.5%` in a green chip, always shown |
| KPI tile, field expense | `▲ +$632K` in red, up arrow | `▼ ($632K) / −3.5%` in a red chip, down arrow |
| NDE % of sales (lower is good) | `(430 bps)` in green | `▲ +430 bps` in green |
| Headcount / FTE tile | `▲ +8.3 FTE` in red | `▲ +8.3 FTE / +0.6% higher` in gray |
| Margin cell (`48.2%`) | Colored green as if it were a variance | Plain, since it is not a variance |
| Header "Values" control | `$ + %` / `$ only` on RS pages | Hidden on RS pages |
| Tooltip | `(+$631.9K / +3.5% unfav)` | `Var ($631.9K) / −3.5% unfavorable` |

## 10. What changed

- 4 pages: about 1,000 variance cells, KPI chips, YoY rows, tooltips, bridge-chart labels and captions rewritten.
- Corrected the notes: "variances: favorable green, unfavorable red" and "a positive expense variance is unfavorable".
- Variance key added to 6 table headers.
- `polaris_header.js`: Values control hidden and `data-fmt` forced to `both` when the page's `data-pf-bu` is `RS`.
- Backups of every edited file are in `.bob/tmp/prevar/`. The transform script is `.bob/tmp/var_transform.rb`.

## 11. Known limits

- The KPI strips on `expense_pl_RS_2.html` and `revenue_analysis_RS_2.html` are commented out. They were updated inside the comment, including the gray Headcount / FTE tile, so they follow the standard when uncommented.
- Not changed: `rs_dashboard.html`, `expense_pl_RS.html` and the CFO/NAS pages. They use the older layout and a different convention. `expense_pl_RS.html` shows `+$1.4m` in red for unfavorable expense. Say if you want them brought across.
- Headcount and FTE tables: no neutral rows exist on the four pages beyond the one KPI tile. Any new Headcount / FTE variance should use `.neu up` or `.neu down`.
- Variance signs follow the existing `fav` / `unf` class as the source of truth for each cell. The source data was not recomputed.
