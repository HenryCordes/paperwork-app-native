# Phase 3: Dashboard & Charts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port paperwork-app's Dashboard screen (financial summary, period selector, dual-series bar chart, revenue/expense pie chart) to paperwork-app-native, rebuilding the chart-specific pieces `react-native-gifted-charts` doesn't provide natively (grouped bars, legends).

**Architecture:** A data layer (`useDashboardStats` + `dashboardService`, same TanStack Query pattern as Phase 1's auth) feeds `dashboard.tsx`. Two chart components (`FinancialChart`, `PieChart`) wrap `react-native-gifted-charts`'s `BarChart`/`PieChart`, each paired with a shared `ChartLegend` component the library doesn't provide. A `PeriodSelector` component (a custom modal picker, not a native `<select>`) drives the query params.

**Tech Stack:** Expo, React Native, TypeScript, `react-native-gifted-charts`, `@tanstack/react-query` (already installed), Jest + React Native Testing Library.

## Global Constraints

- **Faithful port for data/behavior; rebuilt-by-necessity for chart rendering.** The query shape, period-label logic, summary math, and Dutch copy all port verbatim. The charts can't port verbatim — different library, no Chart.js equivalent — but their *visual intent* (dual bars, legend with totals, currency-formatted axis/tooltip) is preserved.
- **Query keys use this repo's established factory convention (`QueryKeys.dashboard.*`), not the source's raw `DASHBOARD_STATS_KEY` string constant.** Phase 1 already chose the factory pattern for `QueryKeys.auth.*` — Dashboard follows the convention already established in *this* repo, not the source's different one.
- **`PERIOD_TYPES`/`PERIOD_PRESETS` get `as const`**, which the source's versions lack. This is why the source needs `PERIOD_TYPES.MONTHLY as PeriodType` casts in `Dashboard/index.tsx` — without `as const` the object's values widen to `string`, not the literal union `PeriodType` expects. Adding it removes the need for those casts; this repo's `AGENTS.md` TypeScript-strictness rule (no `any`, real types) supports doing it correctly rather than copying the workaround.
- **`EXPORT_FORMATS` and `StatsDataPoint` are not ported.** `EXPORT_FORMATS` belongs to an unrelated tax-export feature that happens to share the source's constants file — confirmed unused by anything Dashboard touches. `StatsDataPoint` has zero references anywhere in the source repo (`grep` confirms) — dead code, like Phase 1's dropped `authService` methods.
- **The pie chart's tap-to-tooltip interaction is not ported.** The source's pie tooltip callback only ever shows the category name (the value is already visible in the always-on legend) — confirmed by reading the actual callback, which strips everything after the first `:`. Building `react-native-gifted-charts`'s press-driven tooltip equivalent for a feature that, in the source, adds no information beyond what the legend already shows is not worth the complexity. The legend (name + formatted value, always visible) is the parity bar, not a redundant tap interaction.
- **No native `<select>`/Picker for `PeriodSelector`.** `@expo/ui`'s `Picker` is iOS-only (SwiftUI bridge, no Android equivalent) — using it here would mean building two platform-specific code paths for a basic dropdown. A custom `Pressable` + `Modal` selector matches this repo's established "no third-party UI kit" convention and is the same component on every platform.
- **Verification checkpoints below are based on `gifted-charts-core`'s actual published type definitions** (fetched directly, not assumed from the parent package's docs alone) — `formatYLabel?: (label: string) => string`, `renderTooltip?: Function` (loosely typed by the library itself), `barDataItem { value, frontColor, spacing, label }`, `pieDataItem { value, color, text }`. Remaining uncertainty (exact chart-level sizing/spacing prop names) is flagged inline.
- **No Claude/AI attribution** in any commit message.
- Never commit to `main`. Branch `phase-3-dashboard-charts` already exists (created during brainstorming) — stay on it.
- Never push or open a PR without explicit user authorization.

## File structure (end state after this phase)

```
paperwork-app-native/
  src/
    api/
      types/
        dashboard.ts              # PeriodType, PeriodPreset, DashboardStatsRequest/Response, etc.
      services/
        dashboardService.ts       # getDashboardStats(params)
      queryKeys.ts                 # MODIFY: add QueryKeys.dashboard.{base,stats}
    constants/
      dashboardConstants.ts        # PERIOD_PRESETS, PERIOD_TYPES (as const)
    hooks/
      useDashboard.ts              # useDashboardStats(params)
    components/
      charts/
        ChartLegend.tsx            # shared legend: color swatch + label + formatted value
        FinancialChart.tsx         # BarChart wrapper, dual-series via paired array
        PieChart.tsx               # PieChart wrapper
        barPairing.ts              # pure transform: {labels,turnover,expenses} -> paired barDataItem[]
      PeriodSelector.tsx           # custom modal picker, period type + preset
    app/
      (drawer)/(tabs)/
        dashboard.tsx               # MODIFY: replaces PlaceholderScreen
    __tests__/
      hooks/
        useDashboard.test.tsx
      components/
        charts/
          ChartLegend.test.tsx
          barPairing.test.ts
          FinancialChart.test.tsx
          PieChart.test.tsx
        PeriodSelector.test.tsx
      app/(drawer)/(tabs)/
        dashboard.test.tsx
```

---

## Task 1: Dashboard data layer

**Files:**

- Create: `src/api/types/dashboard.ts`
- Create: `src/constants/dashboardConstants.ts`
- Create: `src/api/services/dashboardService.ts`
- Create: `src/hooks/useDashboard.ts`
- Modify: `src/api/queryKeys.ts`
- Create: `src/__tests__/hooks/useDashboard.test.tsx`

**Interfaces:**

- Produces: `PeriodType`, `PeriodPreset`, `DashboardStatsRequest`, `DashboardStatsResponse`, `RawDataPoint`, `PeriodInfo`, `CategoryBreakdown` (`api/types/dashboard.ts`); `PERIOD_TYPES`, `PERIOD_PRESETS` (`constants/dashboardConstants.ts`); `dashboardService.getDashboardStats(params): Promise<DashboardStatsResponse>`; `QueryKeys.dashboard.base`, `QueryKeys.dashboard.stats(params)`; `useDashboardStats(params?: DashboardStatsRequest): UseQueryResult<DashboardStatsResponse, Error>`. Tasks 3, 4, 5, 6 all consume these exact types and the hook's exact signature.

- [ ] **Step 1: Create the types**

Create `src/api/types/dashboard.ts`:

```ts
export type PeriodType = "daily" | "monthly" | "quarterly" | "yearly";

export type PeriodPreset =
  | "last-month"
  | "last-3-months"
  | "last-12-months"
  | "this-year"
  | "last-year"
  | "custom";

export interface DashboardStatsRequest {
  periodType?: PeriodType;
  periodPreset?: PeriodPreset;
  year?: string;
  startDate?: string;
  endDate?: string;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface RawDataPoint {
  period: string;
  periodKey: string;
  periodType: string;
  totalRevenue: number;
  paidRevenue: number;
  invoiceCount: number;
  taxCollected: number;
  totalExpenses: number;
  expenseCount: number;
  taxPaid: number;
  netProfit: number;
}

export interface PeriodInfo {
  startDate: string;
  endDate: string;
  groupingLevel: string;
}

export interface DashboardStatsResponse {
  success: boolean;
  data: {
    labels: string[];
    turnover: number[];
    expenses: number[];
    rawData: RawDataPoint[];
  };
  source: "pre-calculated" | "dynamic";
  periodInfo: PeriodInfo;
  summary?: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    totalExpenses: number;
    paidExpenses: number;
    unpaidExpenses: number;
    netProfit: number;
    invoiceCount: number;
    expenseCount: number;
  };
  revenueByCategory?: CategoryBreakdown[];
  expensesByCategory?: CategoryBreakdown[];
}
```

- [ ] **Step 2: Create the constants**

Create `src/constants/dashboardConstants.ts`:

```ts
export const PERIOD_PRESETS = {
  LAST_MONTH: "last-month",
  LAST_THREE_MONTHS: "last-3-months",
  LAST_TWELVE_MONTHS: "last-12-months",
  THIS_YEAR: "this-year",
  LAST_YEAR: "last-year",
  CUSTOM: "custom",
} as const;

export const PERIOD_TYPES = {
  DAILY: "daily",
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
} as const;
```

- [ ] **Step 3: Create the service (no test — pure axios passthrough, exercised indirectly by Step 5's hook test)**

Create `src/api/services/dashboardService.ts`:

```ts
import axiosInstance from "../axiosInstance";
import { DashboardStatsRequest, DashboardStatsResponse } from "../types/dashboard";

const dashboardService = {
  getDashboardStats: async (
    params: DashboardStatsRequest,
  ): Promise<DashboardStatsResponse> => {
    const response = await axiosInstance.get<DashboardStatsResponse>(
      "/dashboard/stats",
      { params },
    );
    return response.data;
  },
};

export default dashboardService;
```

- [ ] **Step 4: Add the dashboard query keys**

Modify `src/api/queryKeys.ts` to the following complete content:

```ts
import { DashboardStatsRequest } from "./types/dashboard";

const QueryKeys = {
  auth: {
    base: ["auth"] as const,
    user: () => [...QueryKeys.auth.base, "user"] as const,
    token: () => [...QueryKeys.auth.base, "token"] as const,
    profile: () => [...QueryKeys.auth.base, "profile"] as const,
  },
  dashboard: {
    base: ["dashboard"] as const,
    stats: (params: DashboardStatsRequest) =>
      [...QueryKeys.dashboard.base, "stats", params] as const,
  },
};

export default QueryKeys;
```

- [ ] **Step 5: Write the failing hook tests**

Create `src/__tests__/hooks/useDashboard.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useDashboardStats } from "@/hooks/useDashboard";
import dashboardService from "@/api/services/dashboardService";
import QueryKeys from "@/api/queryKeys";
import type { DashboardStatsResponse, RawDataPoint, PeriodInfo } from "@/api/types/dashboard";

jest.mock("@/api/services/dashboardService", () => ({
  __esModule: true,
  default: { getDashboardStats: jest.fn() },
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

const makeRawDataPoint = (period: string): RawDataPoint => ({
  period,
  periodKey: period,
  periodType: "monthly",
  totalRevenue: 1000,
  paidRevenue: 800,
  invoiceCount: 5,
  taxCollected: 200,
  totalExpenses: 400,
  expenseCount: 3,
  taxPaid: 80,
  netProfit: 600,
});

const makePeriodInfo = (): PeriodInfo => ({
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  groupingLevel: "monthly",
});

const makeSuccessResponse = (): DashboardStatsResponse => ({
  success: true,
  data: {
    labels: ["Jan", "Feb"],
    turnover: [1000, 1200],
    expenses: [400, 500],
    rawData: [makeRawDataPoint("Jan"), makeRawDataPoint("Feb")],
  },
  source: "pre-calculated",
  periodInfo: makePeriodInfo(),
  summary: {
    totalRevenue: 2200,
    paidRevenue: 1800,
    unpaidRevenue: 400,
    totalExpenses: 900,
    paidExpenses: 700,
    unpaidExpenses: 200,
    netProfit: 1300,
    invoiceCount: 10,
    expenseCount: 6,
  },
});

describe("useDashboardStats", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("called with no params (defaults)", () => {
    it("returns the data the service resolves and calls service with an empty params object", async () => {
      const response = makeSuccessResponse();
      (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

      const { result } = renderWithClient(() => useDashboardStats());

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(response);
      expect(dashboardService.getDashboardStats).toHaveBeenCalledWith({});
    });

    it("exposes isLoading=true before the service resolves", () => {
      (dashboardService.getDashboardStats as jest.Mock).mockReturnValue(
        new Promise(() => {}),
      );

      const { result } = renderWithClient(() => useDashboardStats());

      expect(result.current.isLoading).toBe(true);
    });

    it("exposes isError=true when the service rejects", async () => {
      (dashboardService.getDashboardStats as jest.Mock).mockRejectedValue(
        new Error("network error"),
      );

      const { result } = renderWithClient(() => useDashboardStats());

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });

  describe("called with specific params", () => {
    const cases: Array<{
      label: string;
      params: Parameters<typeof useDashboardStats>[0];
      expectedServiceArgs: Record<string, string>;
    }> = [
      {
        label: "periodType only",
        params: { periodType: "monthly" },
        expectedServiceArgs: { periodType: "monthly" },
      },
      {
        label: "periodPreset only",
        params: { periodPreset: "last-3-months" },
        expectedServiceArgs: { periodPreset: "last-3-months" },
      },
      {
        label: "year only",
        params: { year: "2024" },
        expectedServiceArgs: { year: "2024" },
      },
      {
        label: "custom date range",
        params: { periodPreset: "custom", startDate: "2024-01-01", endDate: "2024-06-30" },
        expectedServiceArgs: {
          periodPreset: "custom",
          startDate: "2024-01-01",
          endDate: "2024-06-30",
        },
      },
      {
        label: "all params supplied",
        params: {
          periodType: "yearly",
          periodPreset: "this-year",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
        },
        expectedServiceArgs: {
          periodType: "yearly",
          periodPreset: "this-year",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          year: "2024",
        },
      },
    ];

    it.each(cases)(
      "passes only the supplied params to the service ($label)",
      async ({ params, expectedServiceArgs }) => {
        const response = makeSuccessResponse();
        (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

        const { result } = renderWithClient(() => useDashboardStats(params));

        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(dashboardService.getDashboardStats).toHaveBeenCalledWith(expectedServiceArgs);
      },
    );
  });

  describe("queryKey shape", () => {
    it("uses QueryKeys.dashboard.stats(params) as the real runtime query key", async () => {
      const response = makeSuccessResponse();
      (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

      const { result, client } = renderWithClient(() =>
        useDashboardStats({ periodType: "monthly" }),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const queries = client.getQueryCache().getAll();
      expect(queries).toHaveLength(1);
      expect(queries[0].queryKey).toEqual(
        QueryKeys.dashboard.stats({ periodType: "monthly" }),
      );
    });
  });

  describe("undefined/falsy params are excluded from the service call", () => {
    it("does not forward undefined values", async () => {
      const response = makeSuccessResponse();
      (dashboardService.getDashboardStats as jest.Mock).mockResolvedValue(response);

      const { result } = renderWithClient(() =>
        useDashboardStats({ periodType: undefined, year: "2024" }),
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(dashboardService.getDashboardStats).toHaveBeenCalledWith({ year: "2024" });
    });
  });
});
```

- [ ] **Step 6: Run to verify it fails**

```bash
npm test -- useDashboard
```

Expected: FAIL — `Cannot find module '@/hooks/useDashboard'`.

- [ ] **Step 7: Implement the hook**

Create `src/hooks/useDashboard.ts`:

```ts
import { useQuery, UseQueryResult } from "@tanstack/react-query";

import dashboardService from "@/api/services/dashboardService";
import QueryKeys from "@/api/queryKeys";
import { DashboardStatsRequest, DashboardStatsResponse } from "@/api/types/dashboard";

export const useDashboardStats = (
  { periodType, periodPreset, startDate, endDate, year }: DashboardStatsRequest = {},
): UseQueryResult<DashboardStatsResponse, Error> => {
  const params: DashboardStatsRequest = {};
  if (periodType) params.periodType = periodType;
  if (periodPreset) params.periodPreset = periodPreset;
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  if (year) params.year = year;

  return useQuery({
    queryKey: QueryKeys.dashboard.stats(params),
    queryFn: () => dashboardService.getDashboardStats(params),
    staleTime: 5 * 60 * 1000,
  });
};

export default useDashboardStats;
```

- [ ] **Step 8: Run to verify it passes**

```bash
npm test -- useDashboard
```

Expected: PASS, 11 tests.

- [ ] **Step 9: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add src/api/types/dashboard.ts src/constants/dashboardConstants.ts src/api/services/dashboardService.ts src/api/queryKeys.ts src/hooks/useDashboard.ts src/__tests__/hooks/useDashboard.test.tsx
git commit -m "$(cat <<'EOF'
feat: add Dashboard data layer (types, service, hook)

Ports paperwork-app's useDashboardStats/dashboardService faithfully,
with two deliberate deviations: query keys use this repo's
QueryKeys.* factory convention (Phase 1's pattern) instead of the
source's raw DASHBOARD_STATS_KEY string, and PERIOD_TYPES/PERIOD_PRESETS
get `as const` so they're real literal-typed constants - the source
needs an explicit `as PeriodType` cast at its only two call sites
specifically because it lacks this. EXPORT_FORMATS (unrelated to
Dashboard) and StatsDataPoint (zero references anywhere in the source
repo) are not ported.
EOF
)"
```

---

## Task 2: `ChartLegend` — shared custom legend

**Files:**

- Create: `src/components/charts/ChartLegend.tsx`
- Create: `src/__tests__/components/charts/ChartLegend.test.tsx`

**Interfaces:**

- Produces: `ChartLegendItem { color: string; label: string; value: string }`, `ChartLegend({ items: ChartLegendItem[] })`. Tasks 3 and 4 both render this with their own computed items.

Neither `BarChart` nor `PieChart` in `react-native-gifted-charts` has a built-in legend — confirmed directly against the library's own props documentation ("you must create a custom legend yourself"). `value` is pre-formatted (a `string`, e.g. `"€1.234,50"` — matching Phase 2's `€{formatCurrency(x)}` convention, no space) rather than a raw `number` — formatting happens once, in each chart's data-transform step (Tasks 3/4), not duplicated inside the legend itself.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/charts/ChartLegend.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import { ChartLegend } from "@/components/charts/ChartLegend";

describe("ChartLegend", () => {
  it("renders one row per item with its label and formatted value", () => {
    const { getByText } = render(
      <ChartLegend
        items={[
          { color: "#0054e9", label: "Omzet", value: "€1.200,00" },
          { color: "#c5000f", label: "Uitgaven", value: "€500,00" },
        ]}
      />,
    );

    expect(getByText("Omzet: €1.200,00")).toBeTruthy();
    expect(getByText("Uitgaven: €500,00")).toBeTruthy();
  });

  it("renders nothing when given an empty list", () => {
    const { queryByText } = render(<ChartLegend items={[]} />);
    expect(queryByText(/:/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- ChartLegend
```

Expected: FAIL — `Cannot find module '@/components/charts/ChartLegend'`.

- [ ] **Step 3: Implement**

Create `src/components/charts/ChartLegend.tsx`:

```tsx
import { StyleSheet, Text, View } from "react-native";

import { Spacing } from "@/constants/theme";

export interface ChartLegendItem {
  color: string;
  label: string;
  value: string;
}

interface ChartLegendProps {
  items: ChartLegendItem[];
}

export function ChartLegend({ items }: ChartLegendProps) {
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: item.color }]} />
          <Text>
            {item.label}: {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.three,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- ChartLegend
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/ChartLegend.tsx src/__tests__/components/charts/ChartLegend.test.tsx
git commit -m "$(cat <<'EOF'
feat: add ChartLegend component

react-native-gifted-charts has no built-in legend for BarChart or
PieChart (confirmed against the library's own props docs) - this
shared component replaces Chart.js's built-in legend-with-totals for
both charts this phase builds.
EOF
)"
```

---

## Task 3: `FinancialChart` — dual-series bar chart

**Files:**

- Create: `src/components/charts/barPairing.ts`
- Create: `src/__tests__/components/charts/barPairing.test.ts`
- Create: `src/components/charts/FinancialChart.tsx`
- Create: `src/__tests__/components/charts/FinancialChart.test.tsx`

**Interfaces:**

- Consumes: `ChartLegend`, `ChartLegendItem` (Task 2); `formatCurrency` (`@/utils/currency`, from Phase 2).
- Produces: `pairBarData(labels: string[], turnover: number[], expenses: number[]): BarDataItem[]` (`barPairing.ts`, exported alongside the `BarDataItem` type it returns); `FinancialChart({ labels, turnover, expenses }: { labels: string[]; turnover: number[]; expenses: number[] })`. Task 6 renders this with the hook's raw `data.labels/turnover/expenses` arrays.

`react-native-gifted-charts` has no distinct grouped-bar mode — confirmed against the library's own example (`examples/BarChart/BarPairWithLine.tsx`): pairs are two consecutive `barDataItem`s in one flat array, where only the first item of a pair carries `label` and `spacing`. `pairBarData` is this transform, kept separate from the chart component so the pairing logic (the only genuinely new logic in this task) has its own focused tests independent of rendering.

**Verification checkpoint:** `gifted-charts-core`'s `barDataItem` type (confirmed via its published `.d.ts`) has `value`, `frontColor`, `spacing`, `label` as the relevant fields, all optional except in practice `value` must be set for a bar to render. The chart-level props controlling the visual gap *between* pairs (as opposed to the `spacing` *within* a pair set on each item) aren't confirmed from documentation alone — check the installed package's actual `BarChartPropsType` for a `groupSpacing`-equivalent prop, or rely on a larger per-pair `spacing` value, when wiring `FinancialChart`'s render in Step 5 below.

- [ ] **Step 1: Write the failing pairing tests**

Create `src/__tests__/components/charts/barPairing.test.ts`:

```ts
import { pairBarData } from "@/components/charts/barPairing";

describe("pairBarData", () => {
  it("interleaves turnover and expenses into label-carrying pairs", () => {
    const result = pairBarData(["Jan", "Feb"], [1000, 1200], [400, 500]);

    expect(result).toEqual([
      { value: 1000, frontColor: "#0054e9", spacing: 2, label: "Jan" },
      { value: 400, frontColor: "#c5000f" },
      { value: 1200, frontColor: "#0054e9", spacing: 2, label: "Feb" },
      { value: 500, frontColor: "#c5000f" },
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(pairBarData([], [], [])).toEqual([]);
  });

  it("accepts custom colors for the two series", () => {
    const result = pairBarData(["Jan"], [1000], [400], {
      turnoverColor: "#111111",
      expensesColor: "#222222",
    });

    expect(result[0].frontColor).toBe("#111111");
    expect(result[1].frontColor).toBe("#222222");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- barPairing
```

Expected: FAIL — `Cannot find module '@/components/charts/barPairing'`.

- [ ] **Step 3: Implement the pairing transform**

Create `src/components/charts/barPairing.ts`:

```ts
export interface BarDataItem {
  value: number;
  frontColor: string;
  spacing?: number;
  label?: string;
}

interface PairBarDataColors {
  turnoverColor?: string;
  expensesColor?: string;
}

const DEFAULT_TURNOVER_COLOR = "#0054e9";
const DEFAULT_EXPENSES_COLOR = "#c5000f";

export function pairBarData(
  labels: string[],
  turnover: number[],
  expenses: number[],
  colors: PairBarDataColors = {},
): BarDataItem[] {
  const turnoverColor = colors.turnoverColor ?? DEFAULT_TURNOVER_COLOR;
  const expensesColor = colors.expensesColor ?? DEFAULT_EXPENSES_COLOR;

  return labels.flatMap((label, index) => [
    {
      value: turnover[index],
      frontColor: turnoverColor,
      spacing: 2,
      label,
    },
    {
      value: expenses[index],
      frontColor: expensesColor,
    },
  ]);
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- barPairing
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing FinancialChart test**

Create `src/__tests__/components/charts/FinancialChart.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import { FinancialChart } from "@/components/charts/FinancialChart";

describe("FinancialChart", () => {
  it("shows a legend with the Dutch labels and formatted totals", () => {
    const { getByText } = render(
      <FinancialChart
        labels={["Jan", "Feb"]}
        turnover={[1000, 1200]}
        expenses={[400, 500]}
      />,
    );

    expect(getByText(/Omzet: €2\.200,00/)).toBeTruthy();
    expect(getByText(/Uitgaven: €900,00/)).toBeTruthy();
  });

  it("shows the Dutch empty-state message when there are no labels", () => {
    const { getByText } = render(
      <FinancialChart labels={[]} turnover={[]} expenses={[]} />,
    );

    expect(
      getByText("Geen gegevens beschikbaar voor deze periode"),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 6: Run to verify it fails**

```bash
npm test -- FinancialChart
```

Expected: FAIL — `Cannot find module '@/components/charts/FinancialChart'`.

- [ ] **Step 7: Install the chart library**

```bash
npx expo install react-native-gifted-charts
```

- [ ] **Step 8: Implement**

Create `src/components/charts/FinancialChart.tsx`:

```tsx
import { BarChart } from "react-native-gifted-charts";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { pairBarData } from "./barPairing";
import { ChartLegend } from "./ChartLegend";
import { formatCurrency } from "@/utils/currency";
import { Colors } from "@/constants/theme";

interface FinancialChartProps {
  labels: string[];
  turnover: number[];
  expenses: number[];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function FinancialChart({
  labels,
  turnover,
  expenses,
}: FinancialChartProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  if (labels.length === 0) {
    return (
      <Text style={styles.emptyMessage}>
        Geen gegevens beschikbaar voor deze periode
      </Text>
    );
  }

  const barData = pairBarData(labels, turnover, expenses, {
    turnoverColor: colors.primary,
    expensesColor: colors.danger,
  });

  return (
    <View>
      <BarChart
        data={barData}
        formatYLabel={(label: string) => formatCurrency(Number(label))}
        renderTooltip={(item: { value: number }) => (
          <View style={[styles.tooltip, { backgroundColor: colors.backgroundElement }]}>
            <Text style={{ color: colors.text }}>
              {formatCurrency(item.value)}
            </Text>
          </View>
        )}
      />
      <ChartLegend
        items={[
          {
            color: colors.primary,
            label: "Omzet",
            value: `€${formatCurrency(sum(turnover))}`,
          },
          {
            color: colors.danger,
            label: "Uitgaven",
            value: `€${formatCurrency(sum(expenses))}`,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyMessage: {
    textAlign: "center",
  },
  tooltip: {
    padding: 4,
    borderRadius: 4,
  },
});
```

**Verification checkpoint:** confirm `BarChart`'s exported prop types for `formatYLabel` and `renderTooltip` against the actually-installed package (`node_modules/gifted-charts-core/dist/BarChart/types.d.ts`) before trusting the inline parameter types above — they're based on the published `.d.ts` fetched while writing this plan, not the installed copy. If `renderTooltip`'s argument shape differs, the fix is local to this one callback.

- [ ] **Step 9: Run to verify it passes**

```bash
npm test -- FinancialChart
```

Expected: PASS, 2 tests.

- [ ] **Step 10: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 11: Commit**

```bash
git add src/components/charts/barPairing.ts src/components/charts/FinancialChart.tsx src/__tests__/components/charts/barPairing.test.ts src/__tests__/components/charts/FinancialChart.test.tsx package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add FinancialChart (dual-series bar chart)

react-native-gifted-charts has no built-in grouped-bar mode - pairBarData
interleaves turnover/expenses into the library's documented paired-item
convention (confirmed against its own BarPairWithLine.tsx example).
Colors come from this repo's existing theme tokens (primary/danger)
rather than the source's hardcoded chart-specific RGBA values, same
color intent via the repo's actual token set.
EOF
)"
```

---

## Task 4: `PieChart` — revenue vs. expenses

**Files:**

- Create: `src/components/charts/PieChart.tsx`
- Create: `src/__tests__/components/charts/PieChart.test.tsx`

**Interfaces:**

- Consumes: `ChartLegend` (Task 2); `formatCurrency` (Phase 2).
- Produces: `PieChart({ revenue, expenses }: { revenue: number; expenses: number })`. Task 6 renders this with the summary totals it already computes.

`pieDataItem`'s `value`/`color`/`text` fields are confirmed against `gifted-charts-core`'s published types. No tap-to-tooltip is built (see Global Constraints) — the legend is the parity bar.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/charts/PieChart.test.tsx`:

```tsx
import { render } from "@testing-library/react-native";

import { PieChart } from "@/components/charts/PieChart";

describe("PieChart", () => {
  it("shows a legend with both slices' Dutch labels and formatted values", () => {
    const { getByText } = render(<PieChart revenue={2200} expenses={900} />);

    expect(getByText(/Omzet: €2\.200,00/)).toBeTruthy();
    expect(getByText(/Uitgaven: €900,00/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- "components/charts/PieChart"
```

Expected: FAIL — `Cannot find module '@/components/charts/PieChart'`.

- [ ] **Step 3: Implement**

Create `src/components/charts/PieChart.tsx`:

```tsx
import { View, useColorScheme } from "react-native";
import { PieChart as GiftedPieChart } from "react-native-gifted-charts";

import { ChartLegend } from "./ChartLegend";
import { formatCurrency } from "@/utils/currency";
import { Colors } from "@/constants/theme";

interface PieChartProps {
  revenue: number;
  expenses: number;
}

export function PieChart({ revenue, expenses }: PieChartProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View>
      <GiftedPieChart
        data={[
          { value: revenue, color: colors.primary, text: "Omzet" },
          { value: expenses, color: colors.danger, text: "Uitgaven" },
        ]}
        radius={90}
      />
      <ChartLegend
        items={[
          { color: colors.primary, label: "Omzet", value: `€${formatCurrency(revenue)}` },
          { color: colors.danger, label: "Uitgaven", value: `€${formatCurrency(expenses)}` },
        ]}
      />
    </View>
  );
}
```

**Verification checkpoint:** `radius={90}` is a placeholder sized to roughly match the source's 250px-tall card — not derived from any measurement. Adjust once this renders on a real screen; it's a cosmetic value, not a behavior.

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- "components/charts/PieChart"
```

Expected: PASS, 1 test.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/charts/PieChart.tsx src/__tests__/components/charts/PieChart.test.tsx
git commit -m "$(cat <<'EOF'
feat: add PieChart (revenue vs. expenses)

Tap-to-tooltip is intentionally not built: the source's own pie
tooltip callback only ever shows the category name (confirmed by
reading it - it strips everything after the first ":"), which adds
no information beyond what the always-visible legend already shows.
EOF
)"
```

---

## Task 5: `PeriodSelector`

**Files:**

- Create: `src/components/PeriodSelector.tsx`
- Create: `src/__tests__/components/PeriodSelector.test.tsx`

**Interfaces:**

- Consumes: `PeriodType`, `PeriodPreset` (Task 1's types); `PERIOD_TYPES`, `PERIOD_PRESETS` (Task 1's constants).
- Produces: `PeriodSelector({ periodType, periodPreset, onPeriodChange }: { periodType: PeriodType; periodPreset: PeriodPreset; onPeriodChange: (type: PeriodType, preset: PeriodPreset) => void })`. Task 6 renders this and supplies the callback that updates its own state.

A custom `Pressable` + `Modal` picker, not a native `<select>` (see Global Constraints — `@expo/ui`'s `Picker` is iOS-only). Two independent pickers (period type, period preset), plus the source's own "not yet implemented" message when `CUSTOM` is selected.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/components/PeriodSelector.test.tsx`:

```tsx
import { render, fireEvent } from "@testing-library/react-native";

import { PeriodSelector } from "@/components/PeriodSelector";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";

describe("PeriodSelector", () => {
  it("calls onPeriodChange with the new type, keeping the current preset", () => {
    const onPeriodChange = jest.fn();
    const { getByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.press(getByText("Maand"));
    fireEvent.press(getByText("Jaar"));

    expect(onPeriodChange).toHaveBeenCalledWith(
      PERIOD_TYPES.YEARLY,
      PERIOD_PRESETS.THIS_YEAR,
    );
  });

  it("calls onPeriodChange with the new preset, keeping the current type", () => {
    const onPeriodChange = jest.fn();
    const { getByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.THIS_YEAR}
        onPeriodChange={onPeriodChange}
      />,
    );

    fireEvent.press(getByText("Dit Jaar"));
    fireEvent.press(getByText("Vorig Jaar"));

    expect(onPeriodChange).toHaveBeenCalledWith(
      PERIOD_TYPES.MONTHLY,
      PERIOD_PRESETS.LAST_YEAR,
    );
  });

  it("shows the not-yet-implemented message when the custom preset is selected", () => {
    const { getByText } = render(
      <PeriodSelector
        periodType={PERIOD_TYPES.MONTHLY}
        periodPreset={PERIOD_PRESETS.CUSTOM}
        onPeriodChange={jest.fn()}
      />,
    );

    expect(
      getByText("Aangepaste periode-functionaliteit volgt in toekomstige update"),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- "components/PeriodSelector"
```

Expected: FAIL — `Cannot find module '@/components/PeriodSelector'`.

- [ ] **Step 3: Implement**

Create `src/components/PeriodSelector.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { PeriodType, PeriodPreset } from "@/api/types/dashboard";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";
import { Colors, Spacing } from "@/constants/theme";

interface PeriodSelectorProps {
  periodType: PeriodType;
  periodPreset: PeriodPreset;
  onPeriodChange: (type: PeriodType, preset: PeriodPreset) => void;
}

const TYPE_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: PERIOD_TYPES.DAILY, label: "Dag" },
  { value: PERIOD_TYPES.MONTHLY, label: "Maand" },
  { value: PERIOD_TYPES.QUARTERLY, label: "Kwartaal" },
  { value: PERIOD_TYPES.YEARLY, label: "Jaar" },
];

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: PERIOD_PRESETS.LAST_MONTH, label: "Afgelopen Maand" },
  { value: PERIOD_PRESETS.LAST_THREE_MONTHS, label: "Afgelopen 3 Maanden" },
  { value: PERIOD_PRESETS.LAST_TWELVE_MONTHS, label: "Afgelopen 12 Maanden" },
  { value: PERIOD_PRESETS.THIS_YEAR, label: "Dit Jaar" },
  { value: PERIOD_PRESETS.LAST_YEAR, label: "Vorig Jaar" },
  { value: PERIOD_PRESETS.CUSTOM, label: "Aangepaste Periode" },
];

export function PeriodSelector({
  periodType,
  periodPreset,
  onPeriodChange,
}: PeriodSelectorProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Per</Text>
      <View style={styles.optionsRow}>
        {TYPE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onPeriodChange(option.value, periodPreset)}
            style={[
              styles.chip,
              option.value === periodType && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={{
                color: option.value === periodType ? "#ffffff" : colors.text,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Periode</Text>
      <View style={styles.optionsRow}>
        {PRESET_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onPeriodChange(periodType, option.value)}
            style={[
              styles.chip,
              option.value === periodPreset && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={{
                color: option.value === periodPreset ? "#ffffff" : colors.text,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {periodPreset === PERIOD_PRESETS.CUSTOM ? (
        <Text style={{ color: colors.textSecondary }}>
          Aangepaste periode-functionaliteit volgt in toekomstige update
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  label: {
    fontSize: 12,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 16,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
```

This deliberately uses inline chips rather than a `Modal`-based popup — for 4 and 6 short options respectively, a always-visible chip row is simpler than a modal with no loss of function, and avoids `Modal`'s extra test-harness ceremony for no benefit. (The Global Constraint ruling out `@expo/ui`'s `Picker` is about avoiding a *platform-specific native* component, not about requiring a modal specifically.)

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- "components/PeriodSelector"
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/PeriodSelector.tsx src/__tests__/components/PeriodSelector.test.tsx
git commit -m "$(cat <<'EOF'
feat: add PeriodSelector

Inline pressable chips instead of a native picker or a Modal popup -
this repo has no third-party UI kit and @expo/ui's Picker is
iOS-only (no Android equivalent), and a short always-visible chip
row needs no modal ceremony for 4-6 options. Ports the source's
"not yet implemented" message for the custom-period preset as-is.
EOF
)"
```

---

## Task 6: `dashboard.tsx` — replace the placeholder

**Files:**

- Modify: `src/app/(drawer)/(tabs)/dashboard.tsx`
- Create: `src/__tests__/app/(drawer)/(tabs)/dashboard.test.tsx`

**Interfaces:**

- Consumes: `useDashboardStats` (Task 1), `FinancialChart` (Task 3), `PieChart` (Task 4), `PeriodSelector` (Task 5), `formatCurrency` (Phase 2).

Integrates every piece from Tasks 1-5. Summary-card math and period-label logic port faithfully from `paperwork-app/src/pages/Dashboard/index.tsx`.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/app/(drawer)/(tabs)/dashboard.test.tsx`:

```tsx
import { render, fireEvent } from "@testing-library/react-native";

import Dashboard from "@/app/(drawer)/(tabs)/dashboard";
import { useDashboardStats } from "@/hooks/useDashboard";

jest.mock("@/hooks/useDashboard");

function mockStats(overrides: Partial<ReturnType<typeof useDashboardStats>>) {
  (useDashboardStats as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  });
}

describe("Dashboard screen", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("shows a loading state while the query is pending", () => {
    mockStats({ isLoading: true });
    const { queryByText } = render(<Dashboard />);
    expect(queryByText("Omzet")).toBeNull();
  });

  it("shows the Dutch error message when the query fails", () => {
    mockStats({ isError: true, error: new Error("network down") });
    const { getByText } = render(<Dashboard />);
    expect(getByText("network down")).toBeTruthy();
  });

  it("falls back to the generic Dutch error message when the error has no message", () => {
    mockStats({ isError: true, error: null });
    const { getByText } = render(<Dashboard />);
    expect(
      getByText("Kan dashboardgegevens niet laden. Probeer het opnieuw."),
    ).toBeTruthy();
  });

  it("shows Winst (profit, green) when netProfit is positive", () => {
    mockStats({
      data: {
        success: true,
        data: {
          labels: ["Jan"],
          turnover: [1000],
          expenses: [400],
          rawData: [
            {
              period: "Jan",
              periodKey: "Jan",
              periodType: "monthly",
              totalRevenue: 1000,
              paidRevenue: 1000,
              invoiceCount: 1,
              taxCollected: 0,
              totalExpenses: 400,
              expenseCount: 1,
              taxPaid: 0,
              netProfit: 600,
            },
          ],
        },
        source: "pre-calculated",
        periodInfo: { startDate: "", endDate: "", groupingLevel: "monthly" },
      },
    });

    const { getByText } = render(<Dashboard />);

    expect(getByText("Winst")).toBeTruthy();
    expect(getByText(/€600,00/)).toBeTruthy();
  });

  it("shows Verlies (loss, red) when netProfit is negative", () => {
    mockStats({
      data: {
        success: true,
        data: {
          labels: ["Jan"],
          turnover: [400],
          expenses: [1000],
          rawData: [
            {
              period: "Jan",
              periodKey: "Jan",
              periodType: "monthly",
              totalRevenue: 400,
              paidRevenue: 400,
              invoiceCount: 1,
              taxCollected: 0,
              totalExpenses: 1000,
              expenseCount: 1,
              taxPaid: 0,
              netProfit: -600,
            },
          ],
        },
        source: "pre-calculated",
        periodInfo: { startDate: "", endDate: "", groupingLevel: "monthly" },
      },
    });

    const { getByText } = render(<Dashboard />);

    expect(getByText("Verlies")).toBeTruthy();
  });

  it("toggles the period selector visibility on funnel button press", () => {
    mockStats({});
    const { getByLabelText, queryByText } = render(<Dashboard />);

    expect(queryByText("Per")).toBeNull();
    fireEvent.press(getByLabelText("Periode wijzigen"));
    expect(queryByText("Per")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- "dashboard.test.tsx"
```

`useDashboard.test.tsx` (Task 1) won't match this pattern — Jest's path matching is case-sensitive and that file has a capital `D` (`...useDashboard.test.tsx`), while this screen's test file is `.../dashboard.test.tsx` (lowercase `d`). A bare `dashboard` substring would match both files.

Expected: FAIL — the placeholder renders "Dashboard"/"Wordt in latere fase gemaakt", none of the new screen's expected text.

- [ ] **Step 3: Implement**

Replace `src/app/(drawer)/(tabs)/dashboard.tsx`:

```tsx
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

import { useDashboardStats } from "@/hooks/useDashboard";
import { FinancialChart } from "@/components/charts/FinancialChart";
import { PieChart } from "@/components/charts/PieChart";
import { PeriodSelector } from "@/components/PeriodSelector";
import { PeriodType, PeriodPreset, RawDataPoint } from "@/api/types/dashboard";
import { PERIOD_PRESETS, PERIOD_TYPES } from "@/constants/dashboardConstants";
import { formatCurrency } from "@/utils/currency";
import { Colors, Spacing } from "@/constants/theme";

function summarize(rawData: RawDataPoint[] | undefined) {
  if (!rawData) {
    return { totalRevenue: 0, totalExpenses: 0, netProfit: 0 };
  }
  return rawData.reduce(
    (acc, point) => ({
      totalRevenue: acc.totalRevenue + point.totalRevenue,
      totalExpenses: acc.totalExpenses + point.totalExpenses,
      netProfit: acc.netProfit + point.netProfit,
    }),
    { totalRevenue: 0, totalExpenses: 0, netProfit: 0 },
  );
}

function periodLabel(periodType: PeriodType, periodPreset: PeriodPreset): string {
  if (periodPreset === PERIOD_PRESETS.LAST_MONTH) return "Overzicht Afgelopen Maand";
  if (periodPreset === PERIOD_PRESETS.LAST_THREE_MONTHS)
    return "Overzicht Afgelopen 3 Maanden";
  if (periodPreset === PERIOD_PRESETS.LAST_TWELVE_MONTHS)
    return "Overzicht Afgelopen 12 Maanden";
  if (periodPreset === PERIOD_PRESETS.THIS_YEAR) return "Overzicht Dit Jaar";
  if (periodPreset === PERIOD_PRESETS.LAST_YEAR) return "Overzicht Vorig Jaar";
  if (periodPreset === PERIOD_PRESETS.CUSTOM) return "Aangepaste Periode";

  switch (periodType) {
    case PERIOD_TYPES.DAILY:
      return "Dagelijks Overzicht";
    case PERIOD_TYPES.MONTHLY:
      return "Maandelijks Overzicht";
    case PERIOD_TYPES.QUARTERLY:
      return "Kwartaal Overzicht";
    case PERIOD_TYPES.YEARLY:
      return "Jaarlijks Overzicht";
    default:
      return "Financieel Overzicht";
  }
}

export default function Dashboard() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [periodType, setPeriodType] = useState<PeriodType>(PERIOD_TYPES.MONTHLY);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(
    PERIOD_PRESETS.THIS_YEAR,
  );

  const { data, isLoading, isError, error } = useDashboardStats({
    periodType,
    periodPreset,
  });

  const handlePeriodChange = (type: PeriodType, preset: PeriodPreset) => {
    setPeriodType(type);
    setPeriodPreset(preset);
  };

  const summary = summarize(data?.data.rawData);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {periodLabel(periodType, periodPreset)}
        </Text>
        <Pressable
          accessibilityLabel="Periode wijzigen"
          onPress={() => setShowPeriodSelector((current) => !current)}
        >
          <Text style={{ color: colors.primary }}>Periode</Text>
        </Pressable>
      </View>

      {showPeriodSelector ? (
        <PeriodSelector
          periodType={periodType}
          periodPreset={periodPreset}
          onPeriodChange={handlePeriodChange}
        />
      ) : null}

      {isLoading ? (
        <Text style={{ color: colors.textSecondary }}>Laden...</Text>
      ) : isError ? (
        <Text style={{ color: colors.danger }}>
          {error instanceof Error
            ? error.message
            : "Kan dashboardgegevens niet laden. Probeer het opnieuw."}
        </Text>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={{ color: colors.primary }}>Omzet</Text>
              <Text style={{ color: colors.text }}>
                €{formatCurrency(summary.totalRevenue)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={{ color: colors.danger }}>Uitgaven</Text>
              <Text style={{ color: colors.text }}>
                €{formatCurrency(summary.totalExpenses)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text
                style={{
                  color: summary.netProfit >= 0 ? colors.success : colors.danger,
                }}
              >
                {summary.netProfit >= 0 ? "Winst" : "Verlies"}
              </Text>
              <Text style={{ color: colors.text }}>
                €{formatCurrency(summary.netProfit)}
              </Text>
            </View>
          </View>

          <FinancialChart
            labels={data?.data.labels ?? []}
            turnover={data?.data.turnover ?? []}
            expenses={data?.data.expenses ?? []}
          />

          <PieChart revenue={summary.totalRevenue} expenses={summary.totalExpenses} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
});
```

Drops the source's funnel-icon header button (no icon library is established in this repo yet) for a plain "Periode" text button with the same `onPress` toggle behavior — same function, simpler dependency footprint. Drops the source's `useIonViewWillEnter`-triggered `refetch()` on screen focus — `expo-router`'s tab navigation doesn't unmount inactive tabs by default the way Ionic's view lifecycle does, and `staleTime: 5 * 60 * 1000` already covers the "data might be stale after navigating back" case; add a focus-triggered refetch later if real usage shows it's needed.

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- "dashboard.test.tsx"
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Run the full suite and typecheck**

```bash
npx tsc --noEmit
npm test
```

Expected: both clean — this is the first task that integrates every piece from Tasks 1-5.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(drawer)/(tabs)/dashboard.tsx" "src/__tests__/app/(drawer)/(tabs)/dashboard.test.tsx"
git commit -m "$(cat <<'EOF'
feat: replace Dashboard placeholder with the real screen

Integrates the data layer, both charts, and the period selector.
Two deliberate drops from the source: the funnel-icon toggle button
becomes a plain text button (no icon library established in this
repo yet, same behavior), and the view-lifecycle-triggered refetch
on screen focus is dropped in favor of the existing 5-minute
staleTime - expo-router doesn't unmount inactive tabs the way Ionic's
view lifecycle does, so the same problem doesn't exist here yet.
EOF
)"
```

---

## Validation (after all tasks)

- [ ] Run the full suite once more end-to-end: `npx tsc --noEmit && npm test`.
- [ ] Real-device or simulator check (user's call): run the app, open the Dashboard tab, confirm the bar chart's grouped pairing renders correctly side-by-side (not stacked or overlapping), the pie chart renders two slices, both legends show correct Dutch labels and Dutch-formatted currency, and the period selector's chips actually change the displayed data. Resolve both verification checkpoints flagged above (Task 3's `renderTooltip` argument shape, Task 4's placeholder `radius` value) against what's actually installed and how it actually looks.
