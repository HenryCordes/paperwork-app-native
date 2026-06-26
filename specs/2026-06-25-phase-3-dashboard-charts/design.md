# Design: Phase 3 — Dashboard & charts

Date: 2026-06-25
Status: Approved, pending implementation plan
Predecessor: Phase 2 (receipt pipeline), PR #5 open, real-device validated
Roadmap: [paperwork-app's specs/2026-06-24-paperwork-app-native-migration/design.md](https://github.com/HenryCordes/paperwork-app/blob/main/specs/2026-06-24-paperwork-app-native-migration/design.md)

## Problem

Phase 2 made the Kosten tab real. The Dashboard tab — the app's landing screen after login — is still `PlaceholderScreen`. It's next per the roadmap, and the riskiest part of it (the chart library) was flagged "Medium risk: exact feature combo untested" in the migration design, since the spike only validated `react-native-chart-kit` (line/bar/pie, legend, dark-mode), not `react-native-gifted-charts` (the production choice) with this screen's actual combination: dual-dataset bars, a currency-formatted tooltip, and a legend.

## Scope

**In scope:** the full Dashboard screen — period label, the 3-card financial summary row (Omzet/Uitgaven/Winst), the period type/preset selector, the dual-series bar chart (turnover vs. expenses per period), and the revenue/expense pie chart. The data layer (`useDashboardStats`, `dashboardService`) ported in full.

**Out of scope, deferred to Phase 4:** the VAT return deadline card. It depends on three subsystems that don't exist yet — tax-deadline calculation (`useTaxDeadline`), VAT notification preferences (`useVatNotificationPreferences`), and `/taxes` routing — all squarely part of Phase 4's Taxes (Belasting) screen. Building them now would mean standing up a chunk of an unrelated feature's data layer early, the same kind of avoidable cross-phase coupling Phase 1's design explicitly declined for Filesystem/Push. The source's own card already returns `null` until a deadline is within 14 days, so its absence is rarely even visible.

Also out of scope: the "custom period" preset, which the source itself doesn't implement — it shows a Dutch "not yet implemented" message. Ported as-is, not a gap to fill. `CategoryBreakdown.tsx` and `DashboardSummaryCards.tsx` exist in the source but aren't used by the live Dashboard page (confirmed by reading the actual page, not assuming from file names) — not ported.

## Source behavior (what this phase ports)

Read from `paperwork-app`'s actual implementation (`src/pages/Dashboard/index.tsx` and its `components/` folder):

- **Summary cards:** Omzet (revenue, primary/blue), Uitgaven (expenses, danger/red), Winst/Verlies (profit if positive else loss, success/danger conditional). All values formatted as EUR via `Intl.NumberFormat('nl-NL', ...)`.
- **Period selector** (`PeriodSelector.tsx`): toggled by a header funnel icon. Period type (Dag/Maand/Kwartaal/Jaar) and period preset (Afgelopen Maand/3 Maanden/12 Maanden, Dit Jaar, Vorig Jaar, Aangepaste Periode) — changing either calls `refetch()`.
- **Financial chart** (`FinancialChart.tsx`): dual-dataset bar chart, turnover and expenses per period label. Currency-formatted Y-axis and tooltips, a legend with aggregated totals in its labels, theme-aware bar/grid/text colors, horizontally scrollable past 12 labels.
- **Pie chart** (`PieChart.tsx`): two slices (total revenue, total expenses), legend at the bottom showing category + formatted currency, custom tooltip.
- **Data shape** (`api/types/dashboard.ts`): `DashboardStatsResponse` with `data.labels/turnover/expenses` (parallel arrays for the chart), `data.rawData` (per-period breakdown), and a `summary` block (totals) the page reduces `rawData` into.
- **Tests** (`useDashboard.test.tsx`): parameterized cases over every period-type/preset/date-range combination, query-key shape, loading/success/error states.

## Approach: faithful port for data + behavior, library-forced rebuild for charts

The data layer, period-selection logic, and summary-card math port faithfully — same query key shape, same param handling, same conditional profit/loss styling. The charts cannot port faithfully at the implementation level (different library, no Chart.js equivalent in RN), but the *visual intent* — dual bars, legend with totals, currency-formatted tooltips/axis — is preserved by building the missing pieces `react-native-gifted-charts` doesn't provide natively:

- **Grouped bars**: the library has no distinct "grouped bar chart" mode. Verified against its own example source (`examples/BarChart/BarPairWithLine.tsx`): pairs are two consecutive `barDataItem`s in a flat array, where only the first item of each pair carries `label` and `spacing`. The turnover/expenses arrays get interleaved into this shape.
- **Legends**: confirmed via the library's own props docs that neither `BarChart` nor `PieChart` has a built-in legend — "you must create a custom legend yourself." A small shared `ChartLegend` component (color swatch + label + formatted total) replaces Chart.js's built-in legend for both charts.
- **Currency formatting**: no built-in number formatting. Axis labels use the `formatYLabel` callback; tooltips use a custom `renderTooltip` callback. Both call Phase 2's `formatCurrency` — its first consumer outside the receipt-scan screen, validating that extracting it there was the right call rather than premature.
- **Colors**: reuse `Colors.primary`/`Colors.danger`/`Colors.success` from `theme.ts` (already used elsewhere in this repo) instead of inventing the source's hardcoded dark-mode RGBA values — same color *intent*, derived from the repo's existing tokens rather than re-specified per chart.

This resolves the migration design's flagged risk: the library does support what's needed, just not as a single built-in feature — confirmed against the library's actual source and docs, not assumed from its marketing page.

## Decisions made during brainstorming

- **VAT deadline card omitted**, deferred to Phase 4 (see Scope).
- **Custom legend's exact visual polish (spacing, typography) is not pinned down now** — the content (swatch + label + currency value) and position (top for the bar chart, bottom for the pie chart, matching the source) are decided; fine-tuning happens once it's running rather than guessing pixel values upfront.

## File structure

| Source (paperwork-app) | This repo |
|---|---|
| `src/pages/Dashboard/index.tsx` | `src/app/(drawer)/(tabs)/dashboard.tsx` — replaces `PlaceholderScreen` |
| `src/pages/Dashboard/components/FinancialChart.tsx` (Chart.js bar) | `src/components/charts/FinancialChart.tsx` (`react-native-gifted-charts` `BarChart`, paired-array grouping) |
| `src/pages/Dashboard/components/PieChart.tsx` (Chart.js pie) | `src/components/charts/PieChart.tsx` (`react-native-gifted-charts` `PieChart`) |
| *(new)* | `src/components/charts/ChartLegend.tsx` — shared custom legend, used by both charts |
| `src/pages/Dashboard/components/PeriodSelector.tsx` | `src/components/PeriodSelector.tsx` — RN port (pickers instead of `IonSelect`) |
| `src/hooks/useDashboard.ts` | same path |
| `src/api/services/dashboardService.ts` | same path |
| `src/api/types/dashboard.ts`, `dashboard-constants.ts` | same paths |
| `src/__tests__/hooks/useDashboard.test.tsx` | same path, ported |

## Data flow

`dashboard.tsx` reads period type/preset state → `useDashboardStats(params)` → `dashboardService.getStats()` (axios `GET /dashboard/stats`) → response's `rawData` reduced into summary totals (revenue/expenses/profit, same reduction as the source) → `labels`/`turnover`/`expenses` interleaved into the bar chart's paired array → `revenue`/`expenses` totals mapped into the pie chart's two-slice array. Changing the period selector updates query params and triggers a refetch, same as the source.

## Error handling

- Query loading: a placeholder occupies the charts/summary area (no layout jump once data arrives).
- Query error: Dutch message ("Kan dashboardgegevens niet laden") with a retry action, in place of the charts.
- Empty period (zero data points): "Geen gegevens voor deze periode" instead of rendering an empty chart shell.
- "Aangepaste periode" (custom date range) preset: ported as-is from the source — shows "volgt in toekomstige update" rather than a date picker, since the source itself never implemented it.

## Testing

- `useDashboardStats`: port the source's parameterized test cases (period type/preset/date-range combinations, query-key shape, loading/success/error).
- Bar-pairing and pie-slice data transforms: dedicated unit tests, since this logic is new (the source never needed it — Chart.js took named multi-dataset arrays directly).
- `formatYLabel`/`renderTooltip` currency formatting: unit tests reusing Phase 2's `formatCurrency`.
- `dashboard.tsx`: RNTL test for period-selector interaction (changing type/preset triggers the expected query params) and profit-vs-loss conditional styling. Chart *rendering* itself (SVG output) isn't meaningfully snapshot-testable — tests target the data transforms feeding the charts, not the rendered chart.

## Validation criteria

- Dashboard shows correct summary totals, a working period selector, and both charts rendering real data, in both light and dark mode, matching the source's color *intent*.
- Legend content (color, label, formatted total) is present and correct on both charts, even if visual polish is iterated post-merge.
- `npx tsc --noEmit` and `npm test` clean before any PR for this phase merges.
- Real-device check (per the migration design's per-phase dogfood pattern, though this phase isn't one of the two explicitly named checkpoints): confirm the grouped-bar pairing and currency formatting render correctly on an actual device, not just in the Jest-mocked unit tests.

## Follow-ups (separate brainstorm/spec/plan cycles)

- VAT deadline card, real (Phase 4, alongside the Taxes screen it actually depends on).
- Legend visual polish pass, if the first-pass spacing/typography doesn't read well once built.
