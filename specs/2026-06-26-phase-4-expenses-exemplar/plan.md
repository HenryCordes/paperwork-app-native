# Phase 4a: Expenses Exemplar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Expenses List, Details, and Edit/Create screens end to end against the real API, finishing Phase 2's loose end (the scan flow never persisted anything) and producing the reference exemplar the rest of Phase 4 (Contacts, Invoices, Notifications, Profile, Settings, Taxes) will point at.

**Architecture:** A data layer (`useExpenses` + `expensesService`, same TanStack Query pattern as Phase 1's auth and Phase 3's dashboard) feeds three screens. A minimal read-only Contacts slice (`useContactsList` + `contactsService`) powers the Edit screen's contact picker — not full Contacts CRUD, which is a separate later Phase 4 batch. `documentsService` (ported with one RN-specific signature change) handles receipt file upload. A shared `Dropdown<T>` component (extracted from Phase 3's `PeriodSelector`, now used twice) backs the contact picker.

**Tech Stack:** Expo, React Native, TypeScript, `expo-router`, `@tanstack/react-query`, Jest + React Native Testing Library. No new libraries — everything needed (camera/OCR, axios, secure storage) already exists from Phases 1-3.

## Global Constraints

- **Routing:** `app/(drawer)/(tabs)/expenses.tsx` stays the List screen (tab, visible tab bar). Details and Edit/Create are **top-level** routes — `app/expenses/[id].tsx` and `app/expenses/edit/[id].tsx` — siblings of `(drawer)` in the root `Stack`, not nested inside it. Confirmed against the source's actual router config (`src/routes/privateRoutes.tsx`): `/expenses/:id` and `/expenses/edit/:id` are registered on the *outer* `IonRouterOutlet`, outside every tab's own `IonTabs`/`IonRouterOutlet` — meaning the source itself hides the tab bar (and, confirmed by `Details/index.tsx` using `IonBackButton` not `MenuButton`, the drawer trigger too) on these screens. Top-level routes outside `(drawer)` reproduce that exactly, matching the existing precedent of `app/login.tsx` for chrome-free screens, rather than nesting under `(drawer)` and fighting its default chrome per-screen.
- **The placeholder `expenses.tsx` tab is replaced, not iterated on.** Its scan-and-display-only behavior moves into the real Edit/Create screen; there is no intermediate state where both coexist.
- **Contacts gets exactly one read-only method** (`getContacts`) and **one hook** (`useContactsList`) — enough to populate the Edit screen's picker. Full Contacts CRUD (List/Details/Edit pages, create/update/delete) is out of scope, a separate later Phase 4 batch.
- **`Dropdown<T>` is extracted from `PeriodSelector.tsx` into `src/components/Dropdown.tsx`.** It's about to be used a second time (the contact picker) with zero changes to its modal/overlay mechanics — the second use is the trigger to extract, per this repo's own rule-of-three convention, not a speculative abstraction.
- **No search/filter inside the contact picker for this exemplar.** The source's own picker is a plain list with no search either (confirmed by reading `Expenses/Edit/index.tsx`). If a long contact list proves unwieldy in practice, that's a focused follow-up to the `Dropdown` component, not a blocker here.
- **List pagination uses `FlatList`'s `onEndReached`**, not a third-party infinite-scroll library — RN's built-in primitive does exactly what `IonInfiniteScroll` did. Pull-to-refresh uses `FlatList`'s built-in `refreshing`/`onRefresh` props (which wrap `RefreshControl`), not a separate component.
- **The FAB is a new pattern**: an absolutely-positioned `Pressable` `Card` circle, bottom-right. No RN equivalent of `IonFab` exists in this repo's "no third-party UI kit" stack. Contacts and Invoices (later Phase 4 batches) will reuse this exact shape rather than each inventing their own.
- **File upload uses RN's `FormData` with `{ uri, name, type }`**, not a browser `File` object — Phase 2's `ScanResult.imageUri` is already a local file URI, the natural input shape for this, not something to convert.
- **No Claude/AI attribution** in any commit message.
- Never commit to `main`. Branch `phase-4-expenses-exemplar` first.
- Never push or open a PR without explicit user authorization.

## File structure (end state after this batch)

```
paperwork-app-native/
  src/
    api/
      types/
        expenses.ts              # Expense, ExpensesResponse, ExpenseDetailResponse, ExpensesQueryParams, ExpenseCreateUpdateRequest
        contacts.ts               # Contact, ContactsResponse (list only)
      services/
        expensesService.ts       # getExpenses, getExpenseById, createOrUpdateExpense, deleteExpense
        contactsService.ts        # getContacts (list only)
        documentsService.ts       # uploadReceiptDocument (RN FormData)
      queryKeys.ts                 # MODIFY: add QueryKeys.expenses.*, QueryKeys.contacts.*
    hooks/
      useExpenses.ts               # useExpensesList, useExpenseById, useCreateOrUpdateExpense, useDeleteExpense
      useContacts.ts               # useContactsList
    components/
      Dropdown.tsx                 # MOVED from PeriodSelector.tsx (generic, now shared)
      PeriodSelector.tsx           # MODIFY: imports Dropdown instead of defining it
    app/
      (drawer)/(tabs)/
        expenses.tsx               # MODIFY: replaces the scan-only placeholder
      expenses/
        [id].tsx                   # NEW: Details
        edit/
          [id].tsx                 # NEW: Edit/Create, id="create" for new
    __tests__/
      api/
        services/
          expensesService.test.ts
          contactsService.test.ts
          documentsService.test.ts
      hooks/
        useExpenses.test.ts
        useContacts.test.ts
      components/
        Dropdown.test.tsx
      app/
        (drawer)/(tabs)/
          expenses.test.tsx
        expenses/
          [id].test.tsx
          edit/
            [id].test.tsx
```

---

## Task 1: Extract `Dropdown<T>` into a shared component

**Files:**

- Create: `src/components/Dropdown.tsx`
- Create: `src/__tests__/components/Dropdown.test.tsx`
- Modify: `src/components/PeriodSelector.tsx`
- Modify: `src/__tests__/components/PeriodSelector.test.tsx` (only if any test imports `Dropdown` directly from `PeriodSelector.tsx` — check first)

**Interfaces:**

- Produces: `Dropdown<T extends string>({ testID, label, value, options, onSelect }: { testID: string; label: string; value: T; options: { value: T; label: string }[]; onSelect: (value: T) => void })`. Task 7's contact picker consumes this with `T = string` (contact IDs).

This is a pure move: lift the existing `Dropdown` function and its `Option<T>`/`labelFor` helpers out of `PeriodSelector.tsx` verbatim, export them, and re-import in `PeriodSelector.tsx`. No behavior change — `PeriodSelector`'s existing tests must keep passing unmodified.

- [ ] **Step 1: Confirm no existing test reaches into `Dropdown` internals**

```bash
grep -n "Dropdown" src/__tests__/components/PeriodSelector.test.tsx
```

Expected: no matches, or only matches via `testID="period-type-dropdown"` etc. (querying the rendered output, not importing the function). If something imports `Dropdown` from `PeriodSelector.tsx` directly, update that import in Step 4 below.

- [ ] **Step 2: Write the failing test for the extracted component**

Create `src/__tests__/components/Dropdown.test.tsx`:

```tsx
import { render, fireEvent } from "@testing-library/react-native";

import { Dropdown } from "@/components/Dropdown";

describe("Dropdown", () => {
  const options = [
    { value: "a", label: "Optie A" },
    { value: "b", label: "Optie B" },
  ];

  it("shows the current value's label and opens the option list on press", () => {
    const onSelect = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <Dropdown testID="test-dropdown" label="Kies" value="a" options={options} onSelect={onSelect} />,
    );

    expect(getByText("Optie A")).toBeTruthy();
    expect(queryByText("Optie B")).toBeNull();

    fireEvent.press(getByTestId("test-dropdown"));

    expect(getByText("Optie B")).toBeTruthy();
  });

  it("calls onSelect and closes the list when an option is pressed", () => {
    const onSelect = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
      <Dropdown testID="test-dropdown" label="Kies" value="a" options={options} onSelect={onSelect} />,
    );

    fireEvent.press(getByTestId("test-dropdown"));
    fireEvent.press(getByText("Optie B"));

    expect(onSelect).toHaveBeenCalledWith("b");
    expect(queryByText("Optie B")).toBeNull();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- "components/Dropdown.test"
```

Expected: FAIL — `Cannot find module '@/components/Dropdown'`.

- [ ] **Step 4: Extract the component**

Create `src/components/Dropdown.tsx` with the `Dropdown`, `Option<T>`, and `labelFor` definitions currently inside `src/components/PeriodSelector.tsx` (read that file first to copy them verbatim — do not re-derive from memory), changing only `export` visibility and moving the `field`/`overlay`/`optionsCard`/`option` style keys into this file's own `StyleSheet.create`.

Modify `src/components/PeriodSelector.tsx`: remove the now-duplicated `Dropdown`/`Option`/`labelFor` definitions and their styles, add `import { Dropdown } from "./Dropdown";`.

- [ ] **Step 5: Run to verify both pass**

```bash
npm test -- "components/Dropdown.test" "components/PeriodSelector"
```

Expected: PASS, all tests in both files (PeriodSelector's existing tests must be unaffected).

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/Dropdown.tsx src/components/PeriodSelector.tsx src/__tests__/components/Dropdown.test.tsx
git commit -m "$(cat <<'EOF'
refactor: extract Dropdown from PeriodSelector into a shared component

It's about to be used a second time (Expenses' contact picker) with
identical modal/overlay mechanics - extracting now, on the second
use, follows this repo's own rule-of-three convention rather than
duplicating a non-trivial modal component.
EOF
)"
```

---

## Task 2: Minimal Contacts read-only slice

**Files:**

- Create: `src/api/types/contacts.ts`
- Create: `src/api/services/contactsService.ts`
- Create: `src/__tests__/api/services/contactsService.test.ts`
- Create: `src/hooks/useContacts.ts`
- Create: `src/__tests__/hooks/useContacts.test.ts`
- Modify: `src/api/queryKeys.ts`

**Interfaces:**

- Produces: `Contact { _id: string; companyName: string }` (only the fields the picker needs — read `paperwork-app/src/api/types/contacts.ts` for the full shape and confirm `companyName` is correct before trusting this from memory), `ContactsResponse { success: boolean; data: { docs: Contact[] } }`, `contactsService.getContacts(): Promise<ContactsResponse>`, `QueryKeys.contacts.base`, `QueryKeys.contacts.list()`, `useContactsList(): UseQueryResult<ContactsResponse, Error>`. Task 7 consumes `useContactsList` directly.

- [ ] **Step 1: Confirm the source's Contact type and list endpoint**

```bash
grep -n "companyName\|interface Contact" ../paperwork-app/src/api/types/contacts.ts
grep -n "getContacts" ../paperwork-app/src/api/services/contactsService.ts
```

Use the actual field name and endpoint path found here, not an assumption, in Steps 2-4.

- [ ] **Step 2: Create the type**

Create `src/api/types/contacts.ts` with `Contact` (id + the display-name field confirmed in Step 1) and `ContactsResponse`, matching the source's shape for those two fields only — do not port fields the picker doesn't use.

- [ ] **Step 3: Write the failing service test**

Create `src/__tests__/api/services/contactsService.test.ts`, mirroring the structure of an existing service test (read `src/__tests__/api/services/` for an existing example to match this repo's actual pattern, e.g. error-message fallback on a rejected request) — assert `getContacts()` calls the confirmed endpoint and returns the resolved data, and that an `AxiosError` is rethrown with a Dutch fallback message.

- [ ] **Step 4: Run to verify it fails, then implement `contactsService.ts`**

```bash
npm test -- "api/services/contactsService"
```

Expected: FAIL — module not found. Implement `contactsService.getContacts()` as a thin axios wrapper, mirroring `expensesService.getExpenses`'s try/catch-and-rethrow-with-Dutch-message shape (Task 4 below) — write Task 4 first if doing these out of order is confusing; otherwise mirror the source's `expensesService.ts` catch block directly.

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- "api/services/contactsService"
```

- [ ] **Step 6: Add the query key**

Modify `src/api/queryKeys.ts`, adding:

```ts
contacts: {
  base: ["contacts"] as const,
  list: () => [...QueryKeys.contacts.base, "list"] as const,
},
```

- [ ] **Step 7: Write the failing hook test**

Create `src/__tests__/hooks/useContacts.test.ts`, mirroring `useDashboard.test.tsx`'s structure from Phase 3 (loading/success/error states, real query-key assertion via `client.getQueryCache()`) but simplified — `useContactsList` takes no params.

- [ ] **Step 8: Run to verify it fails, then implement `useContacts.ts`**

```bash
npm test -- "hooks/useContacts"
```

Expected: FAIL. Implement `useContactsList` as a plain `useQuery` wrapper, no params, `staleTime` matching Phase 3's 5-minute convention (contacts don't change often within a session).

- [ ] **Step 9: Run to verify it passes, typecheck**

```bash
npm test -- "hooks/useContacts"
npx tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add src/api/types/contacts.ts src/api/services/contactsService.ts src/api/queryKeys.ts src/hooks/useContacts.ts src/__tests__/api/services/contactsService.test.ts src/__tests__/hooks/useContacts.test.ts
git commit -m "$(cat <<'EOF'
feat: add a minimal read-only Contacts slice for the expense picker

Just enough to power Expenses' contact dropdown - getContacts() and
useContactsList(), confirmed against the source's Edit screen as the
only Contacts dependency it actually has. Full Contacts CRUD (List/
Details/Edit, create/update/delete) is a separate, later Phase 4
batch.
EOF
)"
```

---

## Task 3: `documentsService` — receipt file upload

**Files:**

- Create: `src/api/services/documentsService.ts`
- Create: `src/__tests__/api/services/documentsService.test.ts`

**Interfaces:**

- Produces: `documentsService.uploadReceiptDocument(file: { uri: string; name: string; type: string }): Promise<string>` (returns the stored file path). Task 7 calls this with Phase 2's `ScanResult.imageUri` wrapped into that shape.

The source's `uploadReceiptDocument(file: File)` takes a browser `File`; RN has no equivalent. The one change is the input shape — `FormData.append` accepts `{ uri, name, type }` directly on RN, which is what `fetch`/axios's RN runtime expects for multipart uploads. Read `paperwork-app/src/api/services/documentsService.ts`'s `uploadReceiptDocument` method (not `uploadDocument` — confirm which one the Edit screen actually calls) for the exact response-parsing logic and Dutch error message to port verbatim.

- [ ] **Step 1: Confirm which method the source's Edit screen calls**

```bash
grep -n "documentsService\.\|useDocuments" ../paperwork-app/src/pages/Expenses/Edit/index.tsx
```

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/api/services/documentsService.test.ts`, mocking `axiosInstance.post` to confirm: a `FormData` is sent with the file appended, the success path returns `response.data.data.fileLocation`, and a failure re-throws with the source's Dutch message.

- [ ] **Step 3: Run to verify it fails, then implement**

```bash
npm test -- "api/services/documentsService"
```

Implement with the RN-shaped `FormData.append("file", { uri, name, type })` in place of the source's `formData.append("file", file)`.

- [ ] **Step 4: Run to verify it passes, typecheck**

```bash
npm test -- "api/services/documentsService"
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/api/services/documentsService.ts src/__tests__/api/services/documentsService.test.ts
git commit -m "$(cat <<'EOF'
feat: port documentsService for receipt file upload

One deliberate change from the source: uploadReceiptDocument takes
{uri, name, type} instead of a browser File object, since that's RN
FormData's actual expected shape for multipart uploads - and exactly
the shape Phase 2's ScanResult.imageUri is already in, not something
to convert.
EOF
)"
```

---

## Task 4: Expenses data layer

**Files:**

- Create: `src/api/types/expenses.ts`
- Create: `src/api/services/expensesService.ts`
- Create: `src/__tests__/api/services/expensesService.test.ts`
- Create: `src/hooks/useExpenses.ts`
- Create: `src/__tests__/hooks/useExpenses.test.ts`
- Modify: `src/api/queryKeys.ts`

**Interfaces:**

- Produces: `Expense`, `ExpensesResponse`, `ExpenseDetailResponse`, `ExpensesQueryParams`, `ExpenseCreateUpdateRequest` (`api/types/expenses.ts`, ported verbatim from `paperwork-app/src/api/types/expenses.ts` — read it directly rather than trusting this plan's earlier summary of its fields); `expensesService.{getExpenses, getExpenseById, createOrUpdateExpense, deleteExpense}`; `QueryKeys.expenses.{base, list(params), detail(id)}`; `useExpensesList(params)`, `useExpenseById(id)`, `useCreateOrUpdateExpense()`, `useDeleteExpense()`. Tasks 5, 6, and 7 each consume a subset of this hook family.

`useCreateOrUpdateExpense` and `useDeleteExpense` are mutations (`useMutation`, not `useQuery` — this repo's first mutation hooks; Phase 1/3 only needed queries) that invalidate `QueryKeys.expenses.list` on success, so the List screen refetches automatically after a save or delete rather than needing manual cache surgery.

- [ ] **Step 1: Port the types**

Read `paperwork-app/src/api/types/expenses.ts` directly and port `Expense`, `ExpensesResponse`, `ExpenseDetailResponse`, `ExpensesQueryParams`, `ExpenseCreateUpdateRequest` into `src/api/types/expenses.ts` verbatim, including the commented-as-obsolete `priceWOTaxes` field (carry it for backward compatibility, per the source's own comment — don't use it in any new logic).

- [ ] **Step 2: Write the failing service tests**

Create `src/__tests__/api/services/expensesService.test.ts`. Cover all four methods against `paperwork-app/src/api/services/expensesService.ts`'s actual behavior:

- `getExpenses` defaults to `{offset:0, limit:10}` when called with no params, forwards explicit params otherwise.
- `getExpenseById` throws `"Geen geldig kosten ID opgegeven"` synchronously-as-a-rejected-promise when `id` is undefined or `"create"`, without calling axios.
- `createOrUpdateExpense` posts to the combined endpoint and rethrows a Dutch message keyed on whether `_id` was present ("bijwerken" vs "aanmaken" in the fallback message).
- `deleteExpense` calls DELETE on the expense endpoint and rethrows a Dutch fallback on failure.

- [ ] **Step 3: Run to verify it fails, then implement**

```bash
npm test -- "api/services/expensesService"
```

Port `expensesService.ts` from the source verbatim (same endpoints, same Dutch error messages, same `getExpenseById` early-throw guard for `"create"`).

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- "api/services/expensesService"
```

- [ ] **Step 5: Add the query keys**

Modify `src/api/queryKeys.ts`:

```ts
expenses: {
  base: ["expenses"] as const,
  list: (params: ExpensesQueryParams) => [...QueryKeys.expenses.base, "list", params] as const,
  detail: (id: string) => [...QueryKeys.expenses.base, "detail", id] as const,
},
```

- [ ] **Step 6: Write the failing hook tests**

Create `src/__tests__/hooks/useExpenses.test.ts`. Cover:

- `useExpensesList(params)`: loading/success/error, query-key shape (mirrors `useDashboard.test.tsx`'s pattern).
- `useExpenseById(id)`: does **not** call the service when `id` is `undefined` or `"create"` (use TanStack Query's `enabled` option for this — confirm the actual installed `@tanstack/react-query` version's `enabled` typing accepts a plain boolean before relying on it).
- `useCreateOrUpdateExpense()`: calls the service with the mutation's input on `.mutate()`, and invalidates `QueryKeys.expenses.base` (not just one specific list key — any open list query should refetch) on success.
- `useDeleteExpense()`: same invalidation behavior on success.

- [ ] **Step 7: Run to verify it fails, then implement `useExpenses.ts`**

```bash
npm test -- "hooks/useExpenses"
```

- [ ] **Step 8: Run to verify it passes, typecheck**

```bash
npm test -- "hooks/useExpenses"
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/api/types/expenses.ts src/api/services/expensesService.ts src/api/queryKeys.ts src/hooks/useExpenses.ts src/__tests__/api/services/expensesService.test.ts src/__tests__/hooks/useExpenses.test.ts
git commit -m "$(cat <<'EOF'
feat: add Expenses data layer (types, service, mutation hooks)

Ports expensesService and its Expense types verbatim, including the
combined create-or-update endpoint and the create-route id guard.
useCreateOrUpdateExpense/useDeleteExpense are this repo's first
mutation hooks (Phases 1 and 3 only needed queries) - both invalidate
QueryKeys.expenses.base on success so the List screen refetches
automatically.
EOF
)"
```

---

## Task 5: Expenses List screen

**Files:**

- Modify: `src/app/(drawer)/(tabs)/expenses.tsx`
- Create: `src/__tests__/app/(drawer)/(tabs)/expenses.test.tsx`

**Interfaces:**

- Consumes: `useExpensesList` (Task 4).
- Produces: the List screen itself — nothing downstream consumes it as a module, but it's the navigation entry point Tasks 6/7's routes are pushed from.

This is one of the exemplar's two reference screens (per Phase 4's roadmap strategy). Read `paperwork-app/src/pages/Expenses/List/index.tsx` directly before implementing — it's already been summarized in this batch's design doc, but the implementer should confirm field names and the search predicate against the actual source file, not this plan's paraphrase.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/app/(drawer)/(tabs)/expenses.test.tsx`. Cover:

- Renders a card per expense with `#expenseNumber - info`, contact name, formatted date, formatted price, tax (21%), taxLow (9%).
- Shows the Dutch empty state ("Geen kosten gevonden") when the list is empty.
- Shows a Dutch error message when the query fails.
- Search input filters the rendered cards client-side (matching the source's filter predicate over info/contactName/expenseNumber/price).
- Tapping a card navigates to `/expenses/{id}` (mock `expo-router`'s `useRouter`, assert `router.push` was called with the right path).
- The FAB navigates to `/expenses/edit/create`.
- Reaching the end of the list (simulate `onEndReached`) triggers loading the next page when `hasNextPage` is true, and does not when it's false.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- "expenses.test.tsx"
```

Expected: FAIL — the placeholder scan UI doesn't match any of these.

- [ ] **Step 3: Implement**

Replace `src/app/(drawer)/(tabs)/expenses.tsx` with a `FlatList`-based screen: a `TextInput` search bar in the header area, `RefreshControl`-backed pull-to-refresh, `onEndReached` pagination accumulating pages into local state (mirroring the source's own `allExpenses`/`page`/`hasNextPage` state shape — it already isn't relying on the query cache for accumulation, so there's no React Query anti-pattern to fix here, just port the shape), a `Card`-wrapped FAB (`Pressable`, absolutely positioned bottom-right, per the Global Constraints), and a card-per-expense renderer using `Colors`/`Spacing` tokens and `formatCurrency`.

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- "expenses.test.tsx"
```

- [ ] **Step 5: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add "src/app/(drawer)/(tabs)/expenses.tsx" "src/__tests__/app/(drawer)/(tabs)/expenses.test.tsx"
git commit -m "$(cat <<'EOF'
feat: replace the scan-only placeholder with the real Expenses list

FlatList + onEndReached replaces IonInfiniteScroll, RefreshControl
replaces IonRefresher, and an absolutely-positioned Pressable Card
replaces IonFab (no RN equivalent exists, and no third-party UI kit
is used in this repo) - same search/paginate/refresh/create behavior
as the source, native-shaped primitives.
EOF
)"
```

---

## Task 6: Expenses Details screen

**Files:**

- Create: `src/app/expenses/[id].tsx`
- Create: `src/__tests__/app/expenses/[id].test.tsx`

**Interfaces:**

- Consumes: `useExpenseById`, `useDeleteExpense` (Task 4).

Read `paperwork-app/src/pages/Expenses/Details/index.tsx` directly before implementing.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/app/expenses/[id].test.tsx` (mock `expo-router`'s `useLocalSearchParams` to supply `id`). Cover:

- Renders the expense's fields (contact, date, info, price, tax, taxLow) once loaded.
- Shows a loading state, then a Dutch error state on failure.
- An edit action navigates to `/expenses/edit/{id}`.
- A delete action shows a confirm step before calling `useDeleteExpense().mutate(id)`; after a successful delete, navigates back (mock `router.back` or equivalent, assert it's called).
- If `expenseFile` is present, a "view receipt" action is shown; if absent, it isn't.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- "expenses/\[id\].test"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/app/expenses/[id].tsx`. Use `useLayoutEffect` + `navigation.setOptions` for a back-button header (Phase 3's established pattern for screen-owned header content), not the default `headerShown:false` from the root `Stack` — this screen needs `headerShown:true` with a title, overridden locally.

- [ ] **Step 4: Run to verify it passes, typecheck**

```bash
npm test -- "expenses/\[id\].test"
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/expenses/[id].tsx" "src/__tests__/app/expenses/[id].test.tsx"
git commit -m "$(cat <<'EOF'
feat: add the Expenses Details screen

Top-level route (src/app/expenses/[id].tsx), not nested under
(drawer) - confirmed against the source's actual router config that
this screen hides both the tab bar and the drawer trigger, matching
the existing precedent of login.tsx for chrome-free screens.
EOF
)"
```

---

## Task 7: Expenses Edit/Create screen

**Files:**

- Create: `src/app/expenses/edit/[id].tsx`
- Create: `src/__tests__/app/expenses/edit/[id].test.tsx`

**Interfaces:**

- Consumes: `useExpenseById`, `useCreateOrUpdateExpense` (Task 4); `useContactsList` (Task 2); `documentsService` (Task 3); `Dropdown` (Task 1); `useScan` (Phase 2, `@/hooks/scan/useScan`).

This is the exemplar's second reference screen and the most complex piece of this batch — it's where Phase 2's scan flow finally gets persisted. Read `paperwork-app/src/pages/Expenses/Edit/index.tsx` directly before implementing, particularly the `applyScannedValues` mapping and the `id === "create"` branch that skips the detail fetch.

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/app/expenses/edit/[id].test.tsx`. Cover:

- With `id="create"`: form starts empty, `useExpenseById` is not called (relies on Task 4's `enabled` guard), saving calls `createOrUpdateExpense` with no `_id`.
- With a real `id`: form pre-fills from the fetched expense, saving calls `createOrUpdateExpense` with that `_id`.
- The contact `Dropdown` is populated from `useContactsList`'s data; selecting one sets both `contactId` and `contactName` (the source stores both, not just the id — confirm this is still necessary or if the API could derive `contactName` server-side, but port as-is unless that's confirmed unnecessary).
- Pressing "scan" and resolving a `ScanResult` pre-fills `expenseDate`/`price`/`tax`/`taxLow` from `receiptInfo`, per the source's exact field mapping (`total`→`price`, `taxHigh`→`tax`, `taxLow`→`taxLow`, `date`→ISO `expenseDate`) - confirm this mapping against the source rather than trusting this plan's restatement of it.
- If a scan produced an image, saving uploads it via `documentsService.uploadReceiptDocument` first and includes the returned path as `expenseFile`; if no new scan happened on an edit, the existing `expenseFile` is preserved unchanged.
- A contacts-fetch failure shows an inline Dutch error near the picker without blocking the rest of the form (per design.md's error-handling section).

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- "expenses/edit/\[id\].test"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/app/expenses/edit/[id].tsx`. Plain RN `TextInput`s for date/info/price/tax/taxLow, the extracted `Dropdown` for the contact picker, a "Bon scannen" button reusing `useScan` exactly as the placeholder tab did (Step 4 below removes the now-redundant tab UI, not this logic), and a save button wired to `useCreateOrUpdateExpense`.

- [ ] **Step 4: Run to verify it passes, typecheck**

```bash
npm test -- "expenses/edit/\[id\].test"
npx tsc --noEmit
```

- [ ] **Step 5: Run the full suite**

```bash
npm test
npx tsc --noEmit
```

Expected: both clean — this is the first task that integrates every piece from Tasks 1-6.

- [ ] **Step 6: Commit**

```bash
git add "src/app/expenses/edit/[id].tsx" "src/__tests__/app/expenses/edit/[id].test.tsx"
git commit -m "$(cat <<'EOF'
feat: add the Expenses Edit/Create screen, finishing Phase 2's scan flow

Phase 2 left a placeholder tab that scanned a receipt and displayed
the parsed result without ever saving it - the source app integrates
that exact scan flow inside this Edit screen, pre-filling date/price/
tax/taxLow from the OCR result for the user to review before saving.
This is the second reference screen for the rest of Phase 4's batches.
EOF
)"
```

---

## Validation (after all tasks)

- [ ] Run the full suite once more end-to-end: `npx tsc --noEmit && npm test`.
- [ ] Whole-batch code review via the `code-reviewer` agent, before this becomes the reference exemplar for Contacts/Invoices/Notifications/Profile/Settings/Taxes.
- [ ] Real-device check: scan a real receipt end to end into a saved expense; confirm it appears correctly in the list (search and pagination both work) and in details (including the receipt image); edit it and confirm the change persists; delete it and confirm it's gone from the list without a manual refresh.
- [ ] Confirm the FAB pattern (Task 5) and the `Dropdown` extraction (Task 1) both read as genuinely reusable before pointing later batches at them — if either needs adjustment, do it now while there's exactly one consumer, not after three more screens depend on it.
