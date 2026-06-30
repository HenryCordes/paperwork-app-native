# Contacts Implementation Plan (Phase 4b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a leaner plan.** For the per-step rhythm and shared Global Constraints, **follow [the Expenses exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md) exactly.** Read the source page for each screen directly.

**Goal:** Extend the foundation's Contacts read layer to full CRUD and build Contacts List + Details + Edit/Create at parity with `paperwork-app/src/pages/Contacts/*`.

**Architecture:** The foundation already widened `Contact`/`useContactsList`. This adds the mutations (`getContactById`/`createOrUpdateContact`/`deleteContact` + hooks) and three screens. The Edit form is large in field count (~610 source lines) but mechanically flat: grouped `TextInput`s + a `sameAddress` toggle + `Dropdown`s for type/gender enums. No new patterns — it's the exemplar's Edit screen scaled up.

**Tech Stack:** Expo, RN, TypeScript, `expo-router`, `@tanstack/react-query`, Jest + RNTL. No new libraries.

## Global Constraints

- Inherit the exemplar's Global Constraints verbatim.
- **Base commit:** fork from the Phase 4b foundation commit (`Fab`, full `Contact`, `useContactsList(params?)`, `QueryKeys.contacts.detail`).
- **Owned files only.** Touches `api/services/contactsService.ts` (extend), `hooks/useContacts.ts` (extend with mutations only — leave `useContactsList` as the foundation left it), `app/(drawer)/(tabs)/contacts.tsx`, `app/contacts/[id].tsx`, `app/contacts/edit/[id].tsx`, a new `api/types/contacts.ts` addition for `ContactCreateUpdateRequest`, the `__tests__` mirrors. Consumes `Fab`, `Dropdown`. **Do not** re-edit the foundation's `Contact`/`useContactsList`/`getContacts`.
- Branch isolation; no `main` commit; no push/PR without authorization; no AI attribution.

## Source references (read directly)

- `paperwork-app/src/api/services/contactsService.ts` — `getContactById`, `createOrUpdateContact`, `deleteContact` (`/contacts/:id`). `getContacts` is already ported in the foundation.
- `paperwork-app/src/api/types/contacts.ts` — `ContactCreateUpdateRequest` (the foundation ported `Contact`/`ContactsQueryParams`/`ContactsResponse`; this agent adds the request type only).
- `paperwork-app/src/pages/Contacts/{List,Details,Edit}/index.tsx`.

---

## Task 1: Extend the Contacts data layer to full CRUD

**Files:** Modify `api/services/contactsService.ts`, `api/types/contacts.ts` (add `ContactCreateUpdateRequest`), `hooks/useContacts.ts` (add mutation/detail hooks). Create/extend the `__tests__` mirrors.

**Interfaces:**
- Produces: `ContactCreateUpdateRequest`; `contactsService.{getContactById, createOrUpdateContact, deleteContact}`; `useContactById(id)`, `useCreateOrUpdateContact()`, `useDeleteContact()`.
- Mirror the exemplar's Task 4 mutation pattern: Dutch error rethrow, `getContactById` early-throw guard for `create`/undefined, mutations invalidate `QueryKeys.contacts.base` on success.

**Test coverage:** the three new service methods (success + Dutch fallback; id guard); `useContactById` `enabled` guard; both mutations invalidate on success. Leave the foundation's `getContacts`/`useContactsList` tests untouched and passing.

---

## Task 2: Contacts List screen

**Files:** Modify `app/(drawer)/(tabs)/contacts.tsx` (replace placeholder) + `__tests__` mirror.

**Interfaces:** Consumes `useContactsList`, `Fab`.

**Test coverage:** mirror the exemplar's Task 5 List tests — card per contact (display name from `companyName` or `firstName`+`lastName` per the source's logic — confirm which), Dutch empty + error, client-side search over the source's predicate, tap -> `/contacts/{id}`, `Fab` -> `/contacts/edit/create`, `onEndReached` pagination via `useContactsList({ offset })`.

---

## Task 3: Contacts Details screen

**Files:** Create `app/contacts/[id].tsx` + `__tests__` mirror.

**Interfaces:** Consumes `useContactById`, `useDeleteContact`.

**Test coverage:** mirror the exemplar's Task 6 — renders the contact's grouped fields (name, type, email/phone, postal + visiting address, IBAN) once loaded; loading -> Dutch error; edit -> `/contacts/edit/{id}`; delete -> confirm -> `mutate(id)` -> back. Top-level route + `setOptions` header.

---

## Task 4: Contacts Edit/Create screen

**Files:** Create `app/contacts/edit/[id].tsx` + `__tests__` mirror.

**Interfaces:** Consumes `useContactById`, `useCreateOrUpdateContact`, `Dropdown`.

Read `pages/Contacts/Edit/index.tsx` directly: the field groups, the `sameAddress` toggle (copies postal address into visiting address), and the `Dropdown`-backed enums (`typeOfContact` Particulier/Bedrijf, Klant/Leverancier, `gender` male/female/other).

**Test coverage:**
- `id="create"`: empty form, `useContactById` not called, save -> `createOrUpdateContact` with no `_id`.
- Real `id`: form pre-fills, save sends `_id`.
- `sameAddress` toggled on copies postal -> visiting and (per source) keeps them in sync; toggled off lets them diverge — assert the source's exact behavior.
- The type/gender `Dropdown`s set their fields.
- Required-field validation shows the source's Dutch messages before allowing save.

---

## Validation (after all tasks)

- [ ] `npx tsc --noEmit && npm test` green for the Contacts files; foundation's contacts-read tests still green.
- [ ] On-device: create a contact (both address blocks, sameAddress path), list/search it, open details, edit, delete — and confirm the Expenses/Invoices contact pickers still populate from the same list.
