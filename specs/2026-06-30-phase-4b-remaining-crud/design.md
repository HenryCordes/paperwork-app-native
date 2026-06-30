# Design: Phase 4b — remaining CRUD screens

Date: 2026-06-30
Status: Approved (design), pending plan-file authoring
Predecessor: [../2026-06-26-phase-4-expenses-exemplar/plan.md](../2026-06-26-phase-4-expenses-exemplar/plan.md)
Parent roadmap: [paperwork-app/specs/2026-06-24-paperwork-app-native-migration/design.md](../../../paperwork-app/specs/2026-06-24-paperwork-app-native-migration/design.md) — Phase 4

## Problem

The Expenses exemplar (Phase 4a) is done and reviewed: it establishes the
reference pattern for a CRUD section in `paperwork-app-native` — a TanStack
Query data layer (types + service + query/mutation hooks) feeding a
`FlatList` List screen, a `[id]` Details screen, and an `edit/[id]`
Create/Edit screen, all top-level-routed off `(drawer)`, Dutch-first, themed
from `Colors`/`Spacing` tokens, no third-party UI kit.

Phase 4's roadmap item lists seven sections total; Expenses is built. The six
remaining — Invoices, Contacts, Settings, Taxes, Notifications, Profile — are
this batch. The design goal of Phase 4 (per the parent roadmap's
token-economy strategy) is to dispatch these as **parallel subagents** off the
exemplar, since they "split cleanly by feature area with no shared state."

That last claim is *almost* true and the part that isn't is what this design
exists to resolve. The sections share three things:

1. **`src/api/queryKeys.ts`** — every section appends a key namespace; six
   agents editing the same lines is a guaranteed merge conflict.
2. **The FAB** — the exemplar built it *inline* in `expenses.tsx`
   (`fabPosition`/`fab` styles), never extracted. Invoices and Contacts both
   need the same floating "create" button. Two agents would each re-invent it.
3. **The Contacts *read* layer** — `Invoices/Edit` (source) imports
   `useContactsList` and reads `contact.firstName`/`contact.lastName` to label
   the contact picker. The exemplar shipped a deliberately minimal Contacts
   slice (`_id` + `companyName` only). So the full `Contact` shape is shared
   state between the Invoices agent and the Contacts agent.

The sections are otherwise genuinely independent. This design freezes those
three shared pieces in a sequential foundation step, then fans the six
sections out as isolated parallel agents.

## Goals

- Complete Phase 4: ship Invoices, Contacts, Settings, Taxes, Notifications,
  and Profile at 1:1 parity with the source app, matching the exemplar's
  patterns and the parent roadmap's dark/light parity requirement.
- Structure the work so each section is a self-contained unit a single
  subagent executes in its own git worktree, touching only its own files.
- Keep the parallel dispatch conflict-free by freezing shared state first.

## Non-goals

- **No new shared scaffold component beyond the FAB.** The exemplar's List and
  Details screens are the reference pattern, but the six screens differ enough
  (invoice line-items, contact address blocks, tax export, a settings form)
  that a forced `ListScreen`/`DetailScreen` abstraction would cost more than it
  saves. YAGNI — revisit only if three screens end up structurally identical.
- **No re-litigation of exemplar decisions.** Top-level routing for Details/
  Edit, `FlatList` over `IonInfiniteScroll`, `RefreshControl` pull-to-refresh,
  the `Dropdown<T>` component, Dutch-first copy, theme tokens, the per-task
  TDD rhythm, no-AI-attribution, branch isolation — all carried verbatim from
  [the exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md)'s Global
  Constraints. Each section plan points at it rather than restating it.
- **No backend changes.** Same API, consumed the same way.
- **No Emails.** That's Phase 5 (rich text), out of scope here.

## Decisions

### Two-step shape: foundation-first, then fan out

A single sequential foundation commit freezes shared state; six parallel
worktree agents then fork from it and only ever edit their own files. This is
the `dispatching-parallel-agents` "isolate shared state before fan-out"
pattern. The alternative — all six starting from current `HEAD` and resolving
`queryKeys.ts` + duplicate-FAB conflicts at merge time — trades a small,
known, upfront cost for a larger, repeated, error-prone one across five
merges. Rejected.

### Step 0 — Foundation (sequential, one agent)

1. **Extract `src/components/Fab.tsx`** from the inline FAB in
   `app/(drawer)/(tabs)/expenses.tsx` (`Pressable` + absolutely-positioned
   `Card` circle, bottom-right, accepting `testID`, `onPress`, and an icon).
   Repoint `expenses.tsx`; its existing test stays green. Rule-of-three:
   Expenses + Invoices + Contacts.
2. **Upgrade the Contacts read layer** to the full source `Contact` shape
   (`firstName`, `lastName`, `companyName`, `typeOfContact`, address +
   visiting-address blocks, `gender`, IBAN, etc.) and
   `useContactsList(params?: ContactsQueryParams)`. Strictly additive —
   `companyName` stays, the param is optional — so the Expenses contact picker
   keeps working unchanged. Add `ContactsQueryParams` and the paginated
   `ContactsResponse` (`docs`/`hasNextPage`/...) from source.
3. **Stub the per-section `queryKeys` namespaces** — empty `invoices`,
   `settings`, `taxes`, `profile` blocks and the `contacts` mutation keys —
   so each fan-out agent fills in its own block rather than appending to the
   same lines. (`contacts.list` already exists from the exemplar; leave it.)
4. **Branch `phase-4b-remaining-crud` off `main`, commit.** This commit is the
   base every worktree forks from.

### Step 1 — Fan out (6 parallel agents, one git worktree each)

| Agent | Screens | Shape | Frozen deps | Data layer |
|---|---|---|---|---|
| Invoices | List + Details + Edit | Full CRUD; line-item sub-form, contact picker, status badge colors | Fab, contacts read | build full |
| Contacts | List + Details + Edit | Full CRUD; multi-field form, address blocks, type/gender selectors | Fab, contacts read | extend read -> +mutations |
| Settings | Details + Edit | Read + form (no list) | — | build (`settingsService`, `vatNotificationPreferencesService`) |
| Taxes | single screen | Read + export | Phase 2 file-management | build (`taxesService`); export ports to `expo-file-system`+share |
| Notifications | List screen only | List + mark-read/mark-all/delete | — | **already exists** (`useNotifications`) |
| Profile | single screen | Read + biometric toggle | Phase 1 biometrics | port small (`authService.getProfile`, `UserProfile`, `useProfile`) |

Each agent owns exclusively: its `api/types/<x>.ts`, `api/services/<x>Service.ts`,
`hooks/use<X>.ts`, `app/<x>/*` screens, `__tests__/**` mirrors, and its own
`queryKeys` block. No two agents touch the same file post-foundation. Each
follows the exemplar's per-task TDD rhythm and Global Constraints, and reads
the corresponding source page(s) directly rather than trusting any paraphrase.

#### Per-section RN-porting notes (the non-mechanical bits)

- **Invoices** is the closest twin of the Expenses exemplar — point the agent
  at the exemplar's List/Details/Edit and at `pages/Invoices/*` in source. The
  one genuinely new piece is the **invoice line-items sub-form** (a repeatable
  row group: `invoiceLines[]` with add/remove), which has no exemplar
  precedent; build it as a plain mapped list of row inputs, not a new
  abstraction. Contact picker reuses the foundation's `useContactsList` +
  `Dropdown`. Status badge colors come from `pages/Invoices/helpers.ts`
  (`getInvoiceBadgeColor`) — port the function, map its CSS colors to tokens.
- **Contacts** extends the foundation's read layer with
  `getContactById`/`createOrUpdateContact`/`deleteContact` + their hooks, then
  builds the three screens. The Edit form is large (~610 source lines) but
  mechanically flat — many `TextInput`s grouped into sections (contact type,
  person, postal address, visiting address, bank), a `sameAddress` toggle that
  copies postal->visiting, and `Dropdown`s for the type/gender enums. No new
  patterns; it's the exemplar's Edit screen scaled up in field count.
- **Settings** has no List — just Details (read) and Edit (form), top-level
  routed (`/settings`, `/settings/edit`) per source. Two data sources:
  `settingsService` (company/invoice defaults) and
  `vatNotificationPreferencesService` (the BTW-notification opt-ins). Port both.
- **Taxes** is read + export, single screen. The export is the one RN
  deviation: source's `useExportTaxReturn` downloads via
  `window.URL.createObjectURL` + a synthetic `<a download>` (web-only) but
  *already* has a `blobToBase64` mobile branch — port that branch, writing the
  decoded file with `expo-file-system` and handing it to the OS share sheet
  (reuse Phase 2's file-management service if it already wraps this; otherwise
  `expo-sharing`). Do **not** port the web `<a>` branch. The screen also shows
  a VAT-deadline card (`useTaxDeadline`) and a period/year/format selector
  (reuse `Dropdown`).
- **Notifications** is the cheapest: the data layer (`useNotifications` with
  list/unread-count/mark-read/mark-all/delete/mark-received) already exists
  from Phase 1b. This agent builds *only* the List screen — a `FlatList` of
  notification cards with read/unread styling, swipe-or-button mark-read and
  delete, and a "mark all read" header action — against the existing hooks.
- **Profile** ports a tiny data layer (`authService.getProfile` returning
  `UserProfile`, plus `useProfile`) then builds one screen: read-only profile
  fields + a biometric-enable toggle wired to the existing Phase 1
  `useBiometrics`. No CRUD.

### Step 2 — Integrate (sequential)

Merge the six branches into `phase-4b-remaining-crud` one at a time. After
each merge, wire that section's tab/route entry (replace the 5-line
placeholder screen) and run `tsc --noEmit`. After all six, run the full Jest
suite and one `code-reviewer` pass over the whole batch — the parent roadmap's
"`code-reviewer` once per phase batch, not per file" quality gate. Then an
EAS/TestFlight checkpoint build per the migration strategy's per-phase
on-device verification.

## Components and interfaces (frozen in Step 0)

- `src/components/Fab.tsx` — `Fab({ testID, onPress, children }: { testID:
  string; onPress: () => void; children?: ReactNode })`. Consumed by Expenses
  (repointed), Invoices, Contacts.
- `src/api/types/contacts.ts` — full `Contact`, `ContactsQueryParams`,
  paginated `ContactsResponse`. Consumed by Contacts (full CRUD), Invoices
  (picker), Expenses (picker, unchanged).
- `src/hooks/useContacts.ts` — `useContactsList(params?: ContactsQueryParams)`.
  Same three consumers.
- `src/api/queryKeys.ts` — stubbed `invoices`/`settings`/`taxes`/`profile`
  namespaces + `contacts` mutation keys.

## Deliverable structure

```
specs/2026-06-30-phase-4b-remaining-crud/
  design.md              # this
  plan-0-foundation.md   # Step 0, executed first, sequential
  plan-invoices.md       # \
  plan-contacts.md       #  |
  plan-settings.md       #  |- Step 1, one subagent each, parallel
  plan-taxes.md          #  |
  plan-notifications.md  #  |
  plan-profile.md        # /
```

Each `plan-<section>.md` is self-contained and leaner than the exemplar
plan: it lists tasks, owned files, produced/consumed interfaces, and the test
coverage to hit, then points at
[the exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md) for the
step-by-step `failing test -> implement -> tsc -> commit` rhythm and the shared
Global Constraints, instead of restating them. A dispatched subagent loads
only its own plan plus the exemplar.

## Validation criteria

- All six sections reach parity with their source pages; dark/light match.
- No file is edited by more than one fan-out agent (the isolation invariant).
- `tsc --noEmit` + full Jest suite green after integration.
- One `code-reviewer` pass over the merged batch; on-device checkpoint build.

## Follow-ups

- Phase 5 (Emails, rich text) — next phase after this batch.
- If Contacts' and Invoices' List/Details screens turn out structurally
  identical in practice, extract the shared scaffold *then* (rule of three),
  not now.
