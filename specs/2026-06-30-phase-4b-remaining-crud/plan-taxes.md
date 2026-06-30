# Taxes Implementation Plan (Phase 4b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a leaner plan.** For the per-step rhythm and shared Global Constraints, **follow [the Expenses exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md) exactly.** Read the source page directly.

**Goal:** Build the single Taxes screen at parity with `paperwork-app/src/pages/Taxes/index.tsx` — VAT period/year/format selection, a summary view, a deadline card, and a BTW-export action. This is read + export, **not** CRUD.

**Architecture:** `taxesService` (read: periods/summary/deadline) feeds one screen with `Dropdown`-driven selectors. The export is the one genuine RN deviation: the source downloads the returned file via the browser (`window.URL.createObjectURL` + synthetic `<a download>`), which has no RN equivalent — but the source `useExportTaxReturn` *already* has a `blobToBase64` mobile branch. Port that branch: write the decoded bytes with `expo-file-system` and hand the file to the OS share sheet, reusing Phase 2's file-management service if it wraps this.

**Tech Stack:** Expo, RN, TypeScript, `expo-router`, `@tanstack/react-query`, `expo-file-system` (+ `expo-sharing` if not already wrapped), Jest + RNTL.

## Global Constraints

- Inherit the exemplar's Global Constraints verbatim.
- **Base commit:** fork from the Phase 4b foundation commit (uses `QueryKeys.taxes`).
- **Owned files only.** Touches `api/types/taxes.ts`, `api/services/taxesService.ts`, `hooks/useTaxes.ts`, `app/(drawer)/(tabs)/taxes.tsx`, a small `components/VatReturnDeadlineCard.tsx` (port from source), the `QueryKeys.taxes` block, `__tests__` mirrors. Reuses `Dropdown` and Phase 2's file-management service read-only.
- **The export ports the base64/mobile branch only.** Do NOT port the web `window.URL`/`<a download>` branch — it is dead code on RN.
- Branch isolation; no `main` commit; no push/PR without authorization; no AI attribution.

## Source references (read directly)

- `paperwork-app/src/api/services/taxesService.ts` — `getTaxPeriods` (`/btw-export/periods`), `getTaxSummary` (`/btw-export/summary`), `exportTaxReturn` (`/btw-export/export`, `responseType: blob`), `getNextDeadline` (`/btw-export/deadline`).
- `paperwork-app/src/hooks/useTaxes.ts` — note `useExportTaxReturn`'s `blobToBase64` branch (the mobile path to port) and the web branch (to drop).
- `paperwork-app/src/api/types/taxes.ts`, `paperwork-app/src/pages/Taxes/index.tsx`, `paperwork-app/src/components/VatReturnDeadlineCard*`.

---

## Task 1: Taxes data layer (read)

**Files:** Create `api/types/taxes.ts`, `api/services/taxesService.ts`, `hooks/useTaxes.ts` + `__tests__` mirrors (export-mutation tests come in Task 3). Narrow the `QueryKeys.taxes` stub params to real types.

**Interfaces:**
- Produces: `TaxPeriodType`, `TaxPeriodsResponse`, `TaxSummaryRequest`/`Response`, `TaxDeadlineResponse`, `TaxExportRequest`; `taxesService.{getTaxPeriods, getTaxSummary, getNextDeadline}` (export in Task 3); `useTaxPeriods()`, `useTaxSummary(params)`, `useTaxDeadline(params)`.
- Read queries with the exemplar's 5-minute `staleTime` convention; Dutch-error rethrow.

**Test coverage:** the three read services (success + Dutch fallback); the three hooks (loading/success/error, `enabled` where a param is required before fetching).

---

## Task 2: VatReturnDeadlineCard + Taxes screen (read path)

**Files:** Create `components/VatReturnDeadlineCard.tsx`, modify `app/(drawer)/(tabs)/taxes.tsx` (replace placeholder) + `__tests__` mirrors.

**Interfaces:** Consumes `useTaxPeriods`, `useTaxSummary`, `useTaxDeadline`, `Dropdown`.

**Test coverage:**
- Period-type / year / period / format `Dropdown`s render and drive state (mirror the source's `selectedPeriodType`/`selectedYear`/`selectedPeriod`/`selectedFormat` state).
- `useTaxSummary` is called with the selected params; the summary fields render once loaded; loading + Dutch error states.
- `VatReturnDeadlineCard` renders the `useTaxDeadline` value (date + days-remaining) and its own loading/empty state.

---

## Task 3: BTW export (RN file write + share)

**Files:** Add `exportTaxReturn` to `api/services/taxesService.ts`, `useExportTaxReturn()` to `hooks/useTaxes.ts`, wire the export button in `taxes.tsx` + extend `__tests__` mirrors.

**Interfaces:** Produces `taxesService.exportTaxReturn(params): Promise<...>` and `useExportTaxReturn()` (a mutation). Consumes Phase 2's file-management service (or `expo-file-system` + `expo-sharing`).

Read `useTaxes.ts`'s `blobToBase64` branch. The RN flow: request the export (base64 or arraybuffer per what the axios RN runtime returns), write it to a file in the app's document/cache dir via `expo-file-system`, then present the OS share sheet. The filename mirrors the source's (period + format extension).

**Test coverage:**
- `useExportTaxReturn().mutate(params)` calls `exportTaxReturn`, then writes a file with the expected name/extension, then triggers the share (mock `expo-file-system` + the share API; assert the write path and that share was called with it).
- An export failure surfaces the source's Dutch error message (via `useToast`, as the source does).

---

## Validation (after all tasks)

- [ ] `npx tsc --noEmit && npm test` green for the Taxes files.
- [ ] On-device: select a quarter, view the summary + deadline, export to Excel/CSV, confirm the OS share sheet opens with a correctly-named file that opens in a spreadsheet app.
