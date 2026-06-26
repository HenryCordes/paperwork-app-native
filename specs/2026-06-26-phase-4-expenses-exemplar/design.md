# Design: Phase 4a — Expenses exemplar

Date: 2026-06-26
Status: Approved, pending implementation plan
Predecessor: Phase 3 (dashboard & charts), PR #6 merged
Roadmap: [paperwork-app's specs/2026-06-24-paperwork-app-native-migration/design.md](https://github.com/HenryCordes/paperwork-app/blob/main/specs/2026-06-24-paperwork-app-native-migration/design.md)

## Problem

Phase 4 is "Remaining CRUD screens" — Contacts, Expenses, Invoices, Notifications, Profile, Settings, Taxes, ~30 files total. The roadmap's execution strategy calls for hand-building one list screen and one form/edit screen fully reviewed first, so every later conversion task points at a working exemplar instead of re-deriving the Ionic→RN mapping from prose each time. This spec scopes that exemplar.

Expenses was chosen over Contacts (simpler, but wouldn't surface the edge cases the others hit) and Invoices (most complex — PDF generation, line items — too slow to land first) for being medium-complexity and, uniquely among the candidates, already half-built: Phase 2 left a placeholder `Bon scannen` tab (`src/app/(drawer)/(tabs)/expenses.tsx`) that scans a receipt and displays the parsed result, but never persists it. The source app integrates that exact scan flow *inside* the Expenses Edit screen (confirmed by reading `src/pages/Expenses/Edit/index.tsx`) — building the real Expenses screens necessarily finishes Phase 2's loose end rather than leaving it as permanent placeholder code.

## Scope

**In scope:**
- Expenses List, Details, and Edit/Create screens (replacing the placeholder `expenses.tsx` tab).
- Data layer: `expensesService.ts`, `api/types/expenses.ts`, a `useExpenses` hook family (list/detail/create-or-update/delete), mirroring `useDashboard`'s TanStack Query pattern from Phase 3.
- `documentsService.ts` port (receipt file upload) — RN-adapted, since there's no browser `File` object.
- Retrofitting Phase 2's scan flow into the real Edit/Create screen; the placeholder tab's standalone UI is deleted.
- A minimal Contacts dependency: `contactsService.getContacts()` + a `Contact` type + a `useContactsList` hook — just enough to power the Edit form's contact picker. Confirmed by reading the source Edit screen: it needs a contact dropdown, not full Contacts CRUD.

**Out of scope, deferred to later Phase 4 batches** (dispatched via subagents per the roadmap's strategy, once this exemplar is reviewed and approved):
- Full Contacts CRUD (List/Details/Edit pages) — only the read-only list-for-picker slice above is built now.
- Invoices, Notifications, Profile, Settings.
- Taxes, including the VAT return deadline card — already deferred once from Phase 3's design for the same reason (it depends on tax-deadline calculation, VAT notification preferences, and `/taxes` routing, none of which exist yet).

## Source behavior (what this exemplar ports)

Read from `paperwork-app`'s actual implementation (`src/pages/Expenses/{List,Details,Edit}/index.tsx`, `src/api/services/expensesService.ts`, `src/api/types/expenses.ts`, `src/api/services/documentsService.ts`):

- **List**: search-as-you-filter (client-side, over `info`/`contactName`/`expenseNumber`/`price`), offset/limit pagination via infinite scroll, pull-to-refresh, a FAB that navigates to create, skeleton loading, one card per expense showing `#expenseNumber - info`, contact name, date, price, BTW 21% (`tax`) and BTW 9% (`taxLow`). Tapping a card navigates to Details.
- **Details**: read-only display of the same fields plus the receipt document (opens via `documentsService`), an edit action, and a delete action behind a confirm alert.
- **Edit/Create**: a single screen handles both (route param `id` of `"create"` skips the detail fetch). Fields: contact (picker, sourced from `useContactsList`), date, info, price, tax, taxLow, optional receipt file. A "scan receipt" button runs the camera/OCR flow (Phase 2's `useScan`) and pre-fills date/price/tax/taxLow from the result, which the user can then review and adjust before saving. Save calls one combined create-or-update endpoint (`POST /expense`, with `_id` present for updates).
- **Expense type**: `_id, state, contactId, contactName, expenseNumber, expenseDate, info, tax, taxLow, price, createdAt, tenantId, expenseFile?` (plus an obsolete `priceWOTaxes` carried for backward compatibility — port it, don't use it for anything new).
- **`ExpensesService`**: `getExpenses({offset,limit})` (paginated list), `getExpenseById(id)` (throws a Dutch error if `id` is missing or `"create"`), `createOrUpdateExpense(data)`, `deleteExpense(id)`. Each method catches `AxiosError` and re-throws with a Dutch message.
- **`DocumentsService.uploadReceiptDocument(file)`**: multipart upload, returns the stored file path used as `expenseFile`.

## Approach: faithful port for data + behavior, native-shaped UI

Data layer, validation, and the create-or-update/delete flows port faithfully — same service methods, same Dutch error messages, same combined create/update endpoint. The UI is rebuilt with RN-native equivalents rather than 1:1 component swaps:

- **List**: `FlatList` with `onEndReached` for pagination (replaces `IonInfiniteScroll`) and `RefreshControl` (replaces `IonRefresher`). Search is a plain `TextInput` filtering the loaded page client-side, matching the source's own client-side filter (it doesn't search server-side either). The FAB is a `Pressable` `Card`-styled circle, positioned absolutely — no RN equivalent of `IonFab` exists, so this is a small new pattern future screens (Contacts, Invoices) will reuse.
- **Edit/Create**: plain RN `TextInput`s and a `Dropdown` for the contact picker, reusing the exact pattern already built for `PeriodSelector` in Phase 3 rather than inventing a second picker component.
- **File upload**: Phase 2's `ScanResult.imageUri` (a local file URI) is already in the right shape for RN's `FormData` (`{ uri, name, type }`), unlike the source's browser `File` object — `documentsService.uploadReceiptDocument` is ported with that one signature change, not re-derived from scratch.

## Decisions made during brainstorming

- **Expenses chosen as the Phase 4 exemplar** over Contacts and Invoices — see Problem.
- **Contacts gets a minimal read-only slice now, not a stub or a full port** — a stub picker would make the Edit screen untestable against real data; a full Contacts CRUD port now would be the same cross-phase coupling Phase 1 and Phase 3 both explicitly declined.
- **The placeholder `expenses.tsx` tab is deleted outright**, not iterated on — its scan flow moves into the real Edit/Create screen; there's no scenario where both the placeholder and the real screen coexist.

## File structure

| Source (paperwork-app) | This repo |
|---|---|
| `src/pages/Expenses/List/index.tsx` | `src/app/(drawer)/(tabs)/expenses.tsx` — replaces the placeholder |
| `src/pages/Expenses/Details/index.tsx` | `src/app/expenses/[id].tsx` (or equivalent `expo-router` detail route — exact path decided in the implementation plan) |
| `src/pages/Expenses/Edit/index.tsx` | `src/app/expenses/edit/[id].tsx`, `id="create"` for new — reuses Phase 2's `useScan` |
| `src/api/services/expensesService.ts` | same path |
| `src/api/types/expenses.ts` | same path |
| `src/api/services/documentsService.ts` | same path, RN file-upload adaptation |
| `src/hooks/useExpenses.ts` | same path |
| *(new, minimal)* `src/api/services/contactsService.ts` (list only), `src/api/types/contacts.ts`, `src/hooks/useContacts.ts` (`useContactsList` only) | — |

## Data flow

List: `useExpensesList({offset, limit})` → `expensesService.getExpenses()` → `FlatList` renders cards, client-filtered by the search text. Create/Edit: `useContactsList()` populates the contact picker; optional scan populates initial form state; save calls `useCreateOrUpdateExpense()` → `expensesService.createOrUpdateExpense()`, and if a new receipt image was captured, `documentsService.uploadReceiptDocument()` first, with the returned path passed as `expenseFile`. Delete: Details screen's confirm alert → `useDeleteExpense()` → `expensesService.deleteExpense()` → list query invalidated.

## Error handling

- List: Dutch error message with the thrown error text; empty state ("Geen kosten gevonden") distinct from the error state.
- Edit/Create: contact-list fetch failure shown inline near the picker (source does this too), not a full-screen error — the rest of the form stays usable.
- Scan failure: Phase 2's existing Dutch error messages, unchanged.
- Delete: confirm dialog before the request; Dutch error toast on failure, no optimistic removal.

## Testing

- `expensesService`/`documentsService`: unit tests per method, including the Dutch error-message fallback path (mirroring the existing `axiosInstance` test pattern from Phase 3's review).
- `useExpenses` hook family: loading/success/error states, query-key shape, mirroring `useDashboard.test.tsx`'s structure.
- List/Details/Edit screens: RNTL tests for the search filter, pagination trigger, contact-picker wiring, scan-result pre-fill, and the create-vs-update save path.
- Real-device check before this exemplar is considered approved: scan a real receipt end to end into a saved expense, confirm it appears in the list and details correctly.

## Validation criteria

- A user can list, search, scroll, view, create (with or without a scan), edit, and delete an expense, end to end against the real API.
- The Phase 2 scan flow is reachable only from the Edit/Create screen; the placeholder tab is gone.
- `npx tsc --noEmit` and `npm test` clean before the PR for this exemplar merges.
- Code review (via `code-reviewer`) on the exemplar specifically, before it becomes the reference for the remaining Phase 4 batches.

## Follow-ups (separate brainstorm/spec/plan cycles)

- Remaining Phase 4 batches, each pointing at this exemplar: full Contacts CRUD, Invoices, Notifications, Profile, Settings, Taxes (incl. the VAT deadline card deferred twice now).
- FAB pattern polish, if the absolutely-positioned `Pressable` approach doesn't hold up once Contacts/Invoices reuse it.
