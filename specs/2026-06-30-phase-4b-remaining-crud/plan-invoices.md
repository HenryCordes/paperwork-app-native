# Invoices Implementation Plan (Phase 4b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a leaner plan.** It lists tasks, owned files, interfaces, and the test coverage to hit. For the per-step rhythm — `write failing test -> run it red -> implement minimal -> run it green -> tsc -> commit` — and for the shared Global Constraints (top-level routing, FlatList/RefreshControl, Dropdown, theme tokens, Dutch-first, no AI attribution), **follow [the Expenses exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md) exactly.** Invoices is the closest twin of Expenses; when in doubt, mirror the exemplar's corresponding screen and read the source page directly.

**Goal:** Build Invoices List + Details + Edit/Create end to end against the real API, at parity with `paperwork-app/src/pages/Invoices/*`.

**Architecture:** Same shape as the Expenses exemplar — `useInvoices` + `invoicesService` data layer feeding three screens — plus one new piece with no exemplar precedent: the invoice **line-items sub-form** (a repeatable `invoiceLines[]` row group). The contact picker reuses the foundation's `useContactsList` + the shared `Dropdown`.

**Tech Stack:** Expo, RN, TypeScript, `expo-router`, `@tanstack/react-query`, Jest + RNTL. No new libraries.

## Global Constraints

- Inherit the exemplar's Global Constraints verbatim. Read them.
- **Base commit:** fork from the Phase 4b foundation commit (`Fab`, widened `useContactsList`, stubbed `QueryKeys.invoices`). Do not start before it exists.
- **Owned files only.** This agent touches `api/types/invoices.ts`, `api/services/invoicesService.ts`, `hooks/useInvoices.ts`, `app/(drawer)/(tabs)/invoices.tsx`, `app/invoices/[id].tsx`, `app/invoices/edit/[id].tsx`, the `QueryKeys.invoices` block, the `pages/Invoices/helpers.ts` port, and its `__tests__` mirrors. It consumes `Fab`, `Dropdown`, `useContactsList`, `documentsService` read-only — never edits them.
- Branch isolation; no commit to `main`; no push/PR without authorization; no AI attribution.

## Source references (read directly, do not trust paraphrase)

- `paperwork-app/src/api/types/invoices.ts` — `Invoice`, `InvoiceLine`, responses, `InvoiceCreateUpdateRequest`, query params.
- `paperwork-app/src/api/services/invoicesService.ts` — `getInvoices` (offset/limit), `getInvoiceById` (`/invoice/:id`), `createOrUpdateInvoice` (POST `/invoice`), `deleteInvoice` (DELETE `/invoices/:id`). Note the singular/plural endpoint mismatch is in the source — port as-is.
- `paperwork-app/src/pages/Invoices/{List,Details,Edit}/index.tsx` and `pages/Invoices/helpers.ts` (`getInvoiceBadgeColor`).

---

## Task 1: Invoices data layer

**Files:** Create `api/types/invoices.ts`, `api/services/invoicesService.ts`, `hooks/useInvoices.ts` + their `__tests__` mirrors. Modify the `QueryKeys.invoices` stub to narrow `list`'s param to the real `InvoicesQueryParams`.

**Interfaces:**
- Produces: `Invoice`, `InvoiceLine`, `InvoicesResponse`, `InvoiceDetailResponse`, `InvoicesQueryParams`, `InvoiceCreateUpdateRequest`; `invoicesService.{getInvoices, getInvoiceById, createOrUpdateInvoice, deleteInvoice}`; `useInvoicesList(params)`, `useInvoiceById(id)`, `useCreateOrUpdateInvoice()`, `useDeleteInvoice()`.
- Mirror the exemplar's Task 4 exactly: same try/catch-rethrow-with-Dutch-message shape, same `getInvoiceById` early-throw guard for `id === "create"`/undefined, same mutation-invalidates-`QueryKeys.invoices.base`-on-success pattern.

**Test coverage:** all four service methods (default `{offset:0, limit:10}`, the `create`/undefined id guard rethrowing the source's Dutch message without calling axios, create-vs-update Dutch fallback keyed on `_id`, delete fallback); the four hooks (loading/success/error, `enabled` guard on `useInvoiceById`, both mutations invalidate on success). Port the types verbatim including `InvoiceLine`.

---

## Task 2: Invoices List screen

**Files:** Modify `app/(drawer)/(tabs)/invoices.tsx` (replace placeholder) + `__tests__` mirror. Port `pages/Invoices/helpers.ts`'s `getInvoiceBadgeColor` into a small helper (map its CSS color names to theme tokens).

**Interfaces:** Consumes `useInvoicesList`, `Fab`.

**Test coverage:** mirror the exemplar's Task 5 List tests (card per invoice with invoice number / contact / formatted date / formatted total / **status badge** colored via `getInvoiceBadgeColor`, Dutch empty + error states, client-side search, tap navigates to `/invoices/{id}`, `Fab` navigates to `/invoices/edit/create`, `onEndReached` pagination). Use `FlatList` + `RefreshControl` + `<Fab>` exactly as the exemplar's Expenses list does.

---

## Task 3: Invoices Details screen

**Files:** Create `app/invoices/[id].tsx` + `__tests__` mirror.

**Interfaces:** Consumes `useInvoiceById`, `useDeleteInvoice`.

**Test coverage:** mirror the exemplar's Task 6 Details tests, plus: renders the **invoice line-items** read-only (each `InvoiceLine`'s description/qty/price), the status badge, and totals. Loading -> Dutch error; edit action -> `/invoices/edit/{id}`; delete -> confirm -> `mutate(id)` -> navigate back. Top-level route, `useLayoutEffect`+`setOptions` header per the exemplar's Details.

---

## Task 4: Invoices Edit/Create screen (with line-items sub-form)

**Files:** Create `app/invoices/edit/[id].tsx` + `__tests__` mirror.

**Interfaces:** Consumes `useInvoiceById`, `useCreateOrUpdateInvoice`, `useContactsList` (foundation), `Dropdown`.

This is the batch's most complex screen. Read `pages/Invoices/Edit/index.tsx` directly, especially `handleContactChange` (stores both `contactId` and `contactName` from `firstName`+`lastName`), `addInvoiceLine`/the line-items array handling, and the `id === "create"` branch.

**Test coverage:**
- `id="create"`: empty form (with one blank invoice line), `useInvoiceById` not called, save calls `createOrUpdateInvoice` with no `_id`.
- Real `id`: form pre-fills including existing `invoiceLines`, save sends that `_id`.
- Contact `Dropdown` populated from `useContactsList`; selecting one sets `contactId` + `contactName` (label from `firstName`/`lastName`).
- **Line-items sub-form:** "add line" appends a blank `InvoiceLine`, editing a row's fields updates only that row, "remove line" drops it; the array round-trips into `createOrUpdateInvoice`.
- A contacts-fetch failure shows an inline Dutch error near the picker without blocking the form (exemplar's error pattern).

Build the line-items group as a plain mapped list of row inputs — **not** a new shared abstraction (YAGNI; it has one consumer).

---

## Validation (after all tasks)

- [ ] `npx tsc --noEmit && npm test` green for the Invoices files.
- [ ] On-device: create an invoice with 2+ line items, confirm it lists with the right status badge, opens in details with the lines, edits (add/remove a line) and persists, deletes and disappears without manual refresh.
