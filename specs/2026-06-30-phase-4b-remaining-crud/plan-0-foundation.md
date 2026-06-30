# Phase 4b Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the three pieces of shared state the six Phase 4b section agents would otherwise collide on — the FAB component, the full Contacts read layer, and per-section `queryKeys` namespaces — in one sequential commit that every parallel worktree forks from.

**Architecture:** A pure preparation step. It extracts the inline Expenses FAB into a reusable component, widens the exemplar's minimal Contacts read slice to the full source `Contact` shape (additively, so the Expenses picker is unaffected), and stubs empty query-key namespaces. No new screens, no new behavior — every change is either an extraction or an additive widening, verified by existing tests staying green plus a few new ones.

**Tech Stack:** Expo, React Native, TypeScript, `expo-router`, `@tanstack/react-query`, Jest + React Native Testing Library. No new libraries.

## Global Constraints

- Carried verbatim from [the exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md)'s Global Constraints — read that section before starting.
- **This plan runs first and alone.** The six section plans assume this commit exists as their base. Do not start any section agent until this is merged onto `phase-4b-remaining-crud`.
- **Every change here is additive or an extraction.** Nothing that an existing test asserts may change behavior. The Expenses suite (list/details/edit, picker) MUST stay green at every step.
- **No Claude/AI attribution** in any commit message.
- Branch `phase-4b-remaining-crud` off `main` first. Never commit to `main`. Never push or open a PR without explicit user authorization.

## File structure (end state after this batch)

```
paperwork-app-native/
  src/
    components/
      Fab.tsx                    # NEW: extracted from expenses.tsx
    api/
      types/
        contacts.ts              # MODIFY: minimal -> full Contact shape + params + paginated response
      queryKeys.ts               # MODIFY: stub invoices/settings/taxes/profile + contacts mutation keys
    hooks/
      useContacts.ts             # MODIFY: useContactsList accepts optional ContactsQueryParams
    app/(drawer)/(tabs)/
      expenses.tsx               # MODIFY: render <Fab> instead of inline FAB
    __tests__/
      components/
        Fab.test.tsx             # NEW
```

---

## Task 1: Extract `Fab` into a reusable component

**Files:**

- Create: `src/components/Fab.tsx`
- Create: `src/__tests__/components/Fab.test.tsx`
- Modify: `src/app/(drawer)/(tabs)/expenses.tsx`

**Interfaces:**

- Produces: `Fab({ testID, onPress, children }: { testID: string; onPress: () => void; children?: React.ReactNode })` — an absolutely-positioned (bottom-right) `Pressable` wrapping a circular `Card` filled with `colors.primary`, rendering `children` (defaulting to a "+" glyph) centered. The Invoices and Contacts plans consume this.

This is a pure extraction. Read `src/app/(drawer)/(tabs)/expenses.tsx` first and copy the `fabPosition`/`fab` styles and the `Pressable`+`Card` JSX out verbatim — do not re-derive the look from memory.

- [ ] **Step 1: Read the source FAB**

```bash
grep -nE "fabPosition|fab:|expenses-fab|Pressable|<Card" "src/app/(drawer)/(tabs)/expenses.tsx"
```

Note the exact `fabPosition`/`fab` style values and the icon/glyph the Expenses FAB renders, to reproduce them.

- [ ] **Step 2: Write the failing test**

Create `src/__tests__/components/Fab.test.tsx`:

```tsx
import { render, fireEvent } from "@testing-library/react-native";

import { Fab } from "@/components/Fab";

describe("Fab", () => {
  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<Fab testID="test-fab" onPress={onPress} />);
    fireEvent.press(getByTestId("test-fab"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders custom children when provided", () => {
    const { getByText } = render(
      <Fab testID="test-fab" onPress={jest.fn()}>
        <Text>X</Text>
      </Fab>,
    );
    expect(getByText("X")).toBeTruthy();
  });
});
```

(Add the `Text` import the second test needs.)

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- "components/Fab.test"
```

Expected: FAIL — `Cannot find module '@/components/Fab'`.

- [ ] **Step 4: Create `Fab.tsx`**

Create `src/components/Fab.tsx` with the `Pressable`+`Card` structure and the `fabPosition`/`fab` styles lifted from `expenses.tsx` (its own `StyleSheet.create`). Pull `colors.primary` from the theme the same way `expenses.tsx` does. Default `children` to the existing "+" glyph.

- [ ] **Step 5: Repoint `expenses.tsx`**

Modify `src/app/(drawer)/(tabs)/expenses.tsx`: remove the inline FAB JSX and the `fabPosition`/`fab` style keys, `import { Fab } from "@/components/Fab"`, and render `<Fab testID="expenses-fab" onPress={() => router.push("/expenses/edit/create")} />`. Keep the `testID="expenses-fab"` exactly so the existing Expenses test still finds it.

- [ ] **Step 6: Run both suites**

```bash
npm test -- "components/Fab.test" "expenses.test"
```

Expected: PASS — Fab's new tests and the Expenses suite (which asserts the FAB navigates to `/expenses/edit/create`) both green.

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add src/components/Fab.tsx src/__tests__/components/Fab.test.tsx "src/app/(drawer)/(tabs)/expenses.tsx"
git commit -m "$(cat <<'EOF'
refactor: extract Fab from the Expenses screen into a shared component

Invoices and Contacts both need the same floating create button the
exemplar built inline in expenses.tsx. Extracting on the second/third
use follows this repo's rule-of-three convention; behavior is
unchanged, so the existing Expenses suite covers the repoint.
EOF
)"
```

---

## Task 2: Widen the Contacts read layer to the full `Contact` shape

**Files:**

- Modify: `src/api/types/contacts.ts`
- Modify: `src/hooks/useContacts.ts`
- Modify: `src/__tests__/hooks/useContacts.test.ts`

**Interfaces:**

- Produces: full `Contact` (all source fields), `ContactsQueryParams`, paginated `ContactsResponse` (`docs`, `hasNextPage`, ...); `useContactsList(params?: ContactsQueryParams)`. Consumed by the Contacts plan (full CRUD), the Invoices plan (picker labels via `firstName`/`lastName`), and Expenses (picker via `companyName`, unchanged).

The exemplar shipped `Contact { _id; companyName }` and `useContactsList()` with no params. Invoices' picker needs `firstName`/`lastName`, so widen now — additively. `companyName` stays; the param is optional and defaults to the current behavior.

- [ ] **Step 1: Read the source type**

```bash
grep -nE "interface|firstName|lastName|companyName|hasNextPage|ContactsQueryParams|ContactCreateUpdateRequest" ../paperwork-app/src/api/types/contacts.ts
```

Port `Contact`, `ContactsQueryParams`, and the paginated `ContactsResponse` shape verbatim. **Do not** port `ContactCreateUpdateRequest` here — that's the Contacts CRUD agent's, not shared.

- [ ] **Step 2: Widen `src/api/types/contacts.ts`**

Replace the minimal `Contact`/`ContactsResponse` with the full source versions (read step above), add `ContactsQueryParams`. Keep `companyName` present so the Expenses picker's existing `Contact` usage still compiles.

- [ ] **Step 3: Make `useContactsList` accept optional params**

Modify `src/hooks/useContacts.ts` so `useContactsList(params?: ContactsQueryParams)` forwards `params` to `contactsService.getContacts(params)` and into the query key. The existing no-arg call site (Expenses picker) must still type-check and behave identically — confirm `contactsService.getContacts` already accepts an optional arg, or widen its signature additively too (check `src/api/services/contactsService.ts`).

- [ ] **Step 4: Update the hook test for the optional param**

Modify `src/__tests__/hooks/useContacts.test.ts`: keep the existing no-arg case, add one asserting that passing `{ offset: 10 }` forwards to the service and lands in the query key. Run:

```bash
npm test -- "hooks/useContacts"
```

Expected: PASS.

- [ ] **Step 5: Confirm Expenses picker still compiles and passes**

```bash
npx tsc --noEmit
npm test -- "expenses/edit"
```

Expected: clean + green — the picker consumes the widened `Contact`/hook without change.

- [ ] **Step 6: Commit**

```bash
git add src/api/types/contacts.ts src/hooks/useContacts.ts src/__tests__/hooks/useContacts.test.ts
git commit -m "$(cat <<'EOF'
feat: widen the Contacts read layer to the full Contact shape

Invoices' contact picker labels rows with firstName/lastName, which
the exemplar's minimal {_id, companyName} slice didn't carry. Widening
is additive - companyName stays and the new list param is optional -
so the Expenses picker is unaffected. Freezing this here lets the
Invoices and Contacts agents both consume a stable read layer.
EOF
)"
```

---

## Task 3: Stub the per-section `queryKeys` namespaces

**Files:**

- Modify: `src/api/queryKeys.ts`

**Interfaces:**

- Produces: empty-but-present `QueryKeys.invoices`, `QueryKeys.settings`, `QueryKeys.taxes`, `QueryKeys.profile` namespaces and `QueryKeys.contacts` mutation keys, so each fan-out agent fills in its own block instead of all six appending to the same lines (the merge-conflict this foundation exists to prevent).

- [ ] **Step 1: Read the current file**

```bash
grep -nE "expenses|contacts|notifications|dashboard|base|list|detail" src/api/queryKeys.ts
```

Match the existing namespace style exactly (the `base`/`list`/`detail` `as const` pattern the exemplar added for `expenses`).

- [ ] **Step 2: Add the stub namespaces**

Modify `src/api/queryKeys.ts`, adding (following the existing style):

```ts
invoices: {
  base: ["invoices"] as const,
  list: (params: unknown) => [...QueryKeys.invoices.base, "list", params] as const,
  detail: (id: string) => [...QueryKeys.invoices.base, "detail", id] as const,
},
settings: {
  base: ["settings"] as const,
  detail: () => [...QueryKeys.settings.base, "detail"] as const,
  vatPreferences: () => [...QueryKeys.settings.base, "vat-preferences"] as const,
},
taxes: {
  base: ["taxes"] as const,
  periods: () => [...QueryKeys.taxes.base, "periods"] as const,
  summary: (params: unknown) => [...QueryKeys.taxes.base, "summary", params] as const,
  deadline: () => [...QueryKeys.taxes.base, "deadline"] as const,
},
profile: {
  base: ["profile"] as const,
  detail: () => [...QueryKeys.profile.base, "detail"] as const,
},
```

And add a `detail` key under the existing `contacts` namespace for the Contacts agent's `useContactById`:

```ts
// inside the existing QueryKeys.contacts:
detail: (id: string) => [...QueryKeys.contacts.base, "detail", id] as const,
```

The `params: unknown` placeholders are intentional — each section agent narrows its own to the real param type when it ports its data layer. Leaving them `unknown` here keeps this stub from importing six not-yet-existing type modules.

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/api/queryKeys.ts
git commit -m "$(cat <<'EOF'
chore: stub per-section query-key namespaces for Phase 4b fan-out

Pre-declaring invoices/settings/taxes/profile namespaces (and the
contacts detail key) means the six parallel section agents each fill
their own block instead of all appending to the same lines - the
queryKeys.ts merge conflict this foundation step exists to avoid.
EOF
)"
```

---

## Validation (after all tasks)

- [ ] `npx tsc --noEmit && npm test` — whole suite green; the Expenses suite in particular is unchanged-and-passing, proving the FAB extraction and Contacts widening were behavior-preserving.
- [ ] Confirm `Fab`, the widened `Contact`/`useContactsList`, and the stub `queryKeys` namespaces are all on `phase-4b-remaining-crud` before dispatching any section agent. This commit is their fork point.
