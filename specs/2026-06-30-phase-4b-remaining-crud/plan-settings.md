# Settings Implementation Plan (Phase 4b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a leaner plan.** For the per-step rhythm and shared Global Constraints, **follow [the Expenses exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md) exactly.** Read the source pages directly.

**Goal:** Build Settings Details (read) + Edit (form) at parity with `paperwork-app/src/pages/Settings/{Details,Edit}`. No List screen — Settings is a single record.

**Architecture:** Two data sources feed two top-level screens: `settingsService` (company/invoice defaults) and `vatNotificationPreferencesService` (BTW-notification opt-ins). Same data-layer pattern as the exemplar, but the "detail" is a singleton (no id) and there's no create/delete — only read + update.

**Tech Stack:** Expo, RN, TypeScript, `expo-router`, `@tanstack/react-query`, Jest + RNTL. No new libraries.

## Global Constraints

- Inherit the exemplar's Global Constraints verbatim.
- **Base commit:** fork from the Phase 4b foundation commit (uses `QueryKeys.settings`).
- **Owned files only.** Touches `api/types/settings.ts`, `api/types/vatNotificationPreferences.ts`, `api/services/settingsService.ts`, `api/services/vatNotificationPreferencesService.ts`, `hooks/useSettings.ts`, `app/(drawer)/(tabs)/settings.tsx` (the existing placeholder = the Details destination), `app/settings/edit.tsx` (new top-level Edit route), the `QueryKeys.settings` block, `__tests__` mirrors. Reuses `Dropdown` if the form has enums.
- **Routing wrinkle to confirm first:** the source registers `/settings` + `/settings/edit` as top-level routes, but the native Phase 0 nav already placed a `(drawer)/(tabs)/settings.tsx` placeholder as the drawer destination. Resolve by making that existing tab file the **Details** screen (the drawer lands there) and adding **Edit** as a chrome-free top-level `app/settings/edit.tsx` (matching the exemplar's top-level-Edit precedent). Confirm this against the actual Phase 0 nav before building — do not add a second settings route that competes with the placeholder.
- Branch isolation; no `main` commit; no push/PR without authorization; no AI attribution.

## Source references (read directly)

- `paperwork-app/src/api/services/settingsService.ts` — `getSettings`, `updateSettings`.
- `paperwork-app/src/api/services/vatNotificationPreferencesService.ts` — `getPreferences`, `updatePreferences`.
- `paperwork-app/src/api/types/{settings,vatNotificationPreferences}.ts`.
- `paperwork-app/src/pages/Settings/{Details,Edit}/index.tsx`.

---

## Task 1: Settings data layer

**Files:** Create `api/types/settings.ts`, `api/types/vatNotificationPreferences.ts`, `api/services/settingsService.ts`, `api/services/vatNotificationPreferencesService.ts`, `hooks/useSettings.ts` + `__tests__` mirrors. Narrow the `QueryKeys.settings` stub if needed.

**Interfaces:**
- Produces: `Settings`, `SettingsResponse`, `SettingsUpdateRequest`, `VatNotificationPreferences*`; `settingsService.{getSettings, updateSettings}`, `vatNotificationPreferencesService.{getPreferences, updatePreferences}`; `useSettings()`, `useUpdateSettings()`, `useVatPreferences()`, `useUpdateVatPreferences()`.
- Mutations invalidate `QueryKeys.settings.detail()` / `QueryKeys.settings.vatPreferences()` on success. Dutch-error rethrow per the exemplar.

**Test coverage:** both services' get/update (success + Dutch fallback); the four hooks (query loading/success/error; mutations invalidate the right key on success).

---

## Task 2: Settings Details screen

**Files:** Modify `app/(drawer)/(tabs)/settings.tsx` (replace the placeholder) + `__tests__` mirror.

**Interfaces:** Consumes `useSettings`, `useVatPreferences`.

**Test coverage:** renders the company/invoice-default fields and the VAT-preference values once loaded; loading -> Dutch error; an edit action navigates to `/settings/edit`. Top-level route + `setOptions` header per the exemplar's Details.

---

## Task 3: Settings Edit screen

**Files:** Create `app/settings/edit.tsx` + `__tests__` mirror.

**Interfaces:** Consumes `useSettings`, `useUpdateSettings`, `useVatPreferences`, `useUpdateVatPreferences`, `Dropdown` (if enums).

Read `pages/Settings/Edit/index.tsx` directly for the field set and which fields belong to settings vs VAT preferences.

**Test coverage:**
- Form pre-fills from `useSettings` + `useVatPreferences`.
- Editing a settings field and saving calls `useUpdateSettings` with the changed payload.
- Toggling a VAT-notification preference and saving calls `useUpdateVatPreferences`.
- Save errors surface the source's Dutch message; success navigates back to `/settings`.

---

## Validation (after all tasks)

- [ ] `npx tsc --noEmit && npm test` green for the Settings files.
- [ ] On-device: open Settings from the drawer, view values, edit a company field + a VAT toggle, save, confirm persistence on reopen.
