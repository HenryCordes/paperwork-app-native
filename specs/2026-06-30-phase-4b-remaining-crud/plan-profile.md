# Profile Implementation Plan (Phase 4b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This is a leaner plan.** For the per-step rhythm and shared Global Constraints, **follow [the Expenses exemplar plan](../2026-06-26-phase-4-expenses-exemplar/plan.md) exactly.** Read the source page directly.

**Goal:** Build the single Profile screen at parity with `paperwork-app/src/pages/ProfilePage/index.tsx` — read-only profile fields plus a biometric-enable toggle. **Not CRUD.**

**Architecture:** A tiny ported data layer (`authService.getProfile` returning `UserProfile`, plus `useProfile`) feeds one read-only screen. The biometric toggle reuses the existing Phase 1 `useBiometrics` hook and the secure-storage flag it already manages — this agent wires the UI, it does not reimplement biometrics.

**Tech Stack:** Expo, RN, TypeScript, `expo-router`, `@tanstack/react-query`, Jest + RNTL. No new libraries (biometrics + secure storage already exist from Phase 1).

## Global Constraints

- Inherit the exemplar's Global Constraints verbatim.
- **Base commit:** fork from the Phase 4b foundation commit (uses `QueryKeys.profile`).
- **Owned files only.** Touches `api/types/user.ts` (or wherever the existing `authService` types live — check first), `api/services/authService.ts` (**add** `getProfile` only — do not touch existing auth methods), `hooks/useProfile.ts`, `app/(drawer)/(tabs)/profile.tsx`, the `QueryKeys.profile` block, `__tests__` mirrors. Consumes the existing `useBiometrics` read-only.
- Profile is a drawer-reachable screen that also renders the persistent tab strip.
- Branch isolation; no `main` commit; no push/PR without authorization; no AI attribution.

## Source references (read directly)

- `paperwork-app/src/hooks/useProfile.ts` — `useQuery` wrapping `authService.getProfile()`.
- `paperwork-app/src/api/services/authService.ts` — `getProfile` + the `UserProfile` type it returns.
- `paperwork-app/src/pages/ProfilePage/index.tsx` — the displayed fields, the biometric toggle wiring (`useBiometrics`, `BiometricType`, `getBiometricName`), and the date formatting (`date-fns` + `nl` locale).
- This repo's existing `src/hooks/biometrics/useBiometrics.ts` + `biometrics.types.ts` (Phase 1) — the hook to consume; `src/utils/` for any existing biometric-name helper, else port `getBiometricName`.

---

## Task 1: Profile data layer

**Files:** Create/modify `api/types/user.ts` (add `UserProfile` — check whether an auth type module already exists), add `getProfile` to `api/services/authService.ts`, create `hooks/useProfile.ts` + `__tests__` mirrors. Narrow the `QueryKeys.profile` stub if needed.

**Interfaces:**
- Produces: `UserProfile`; `authService.getProfile(): Promise<UserProfile>`; `useProfile(): UseQueryResult<UserProfile, Error>`.
- Mirror the exemplar's read-query + Dutch-error-rethrow pattern. `getProfile` hits the same endpoint the source's `authService.getProfile` uses (confirm the path).

**Test coverage:** `getProfile` (success + Dutch fallback on rejection); `useProfile` (loading/success/error). **Do not** alter or break existing `authService` tests.

---

## Task 2: Profile screen (read + biometric toggle)

**Files:** Modify `app/(drawer)/(tabs)/profile.tsx` (replace placeholder) + `__tests__` mirror.

**Interfaces:** Consumes `useProfile`, `useBiometrics` (existing).

Read `pages/ProfilePage/index.tsx` directly for the exact fields shown and the toggle's enable/disable flow (it checks biometric availability + type, reads the current on/off flag, and flips it through `useBiometrics`).

**Test coverage:**
- Renders the profile fields (name, email, dates formatted with `date-fns`/`nl` — confirm which fields) once `useProfile` resolves; loading + Dutch error states.
- When biometrics are unavailable, the toggle is hidden or disabled (match the source).
- When available, the toggle reflects the stored on/off flag and flipping it calls the `useBiometrics` enable/disable path with the right argument.
- The biometric label uses the device's biometry type name (Face ID / Touch ID / vingerafdruk) via the source's `getBiometricName` logic.

---

## Validation (after all tasks)

- [ ] `npx tsc --noEmit && npm test` green for the Profile files; existing auth + biometrics tests untouched and passing.
- [ ] On-device: open Profile from the drawer, see the real account fields, toggle biometric login on, kill + reopen the app, confirm the biometric prompt now gates entry (and toggling off removes it).
