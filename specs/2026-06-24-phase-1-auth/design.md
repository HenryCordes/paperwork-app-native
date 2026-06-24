# Design: Phase 1 — Auth core

Date: 2026-06-24
Status: Approved, pending implementation plan
Predecessor: Phase 0 (bootstrap), merged to `main`
Roadmap: [paperwork-app's specs/2026-06-24-paperwork-app-native-migration/design.md](https://github.com/HenryCordes/paperwork-app/blob/main/specs/2026-06-24-paperwork-app-native-migration/design.md)

## Problem

Phase 0 produced a navigable shell with no real screens — every route is a
placeholder, the drawer's "Uitloggen" button is a no-op, and `index.tsx`
unconditionally redirects to `/dashboard` with no actual auth check. Nothing
in the app works without login, session handling, and the ability to log
back out, so this is the next blocking phase per the migration roadmap.

## Scope

This phase covers the auth core only — login, token/session state,
session-timeout re-auth, biometric opt-in/login, and the secure storage
they all share. It deliberately excludes two things the original roadmap
bundled into "Phase 1":

- **Push notifications + badge** — only loosely coupled to auth (needs a
  logged-in user to register a token, nothing more); split into its own
  follow-on phase.
- **Filesystem** — its only real call sites in `paperwork-app`
  (`useScan.ts` for receipts, `useTaxes.ts` for tax exports) belong to
  Phase 2 and a not-yet-scheduled Taxes feature, not to auth. Bundling it
  here was an artifact of the original assessment grouping, not a real
  dependency.

Reset/PasswordReset screens are placeholders in this phase (real forms,
real route, no API wiring) — not on the critical path; built for real in
Phase 4 alongside the other CRUD screens. Haptics is dead code in the
source app (zero call sites, confirmed) and isn't ported at all.

## Source behavior (what this phase ports)

Read directly from `paperwork-app`'s actual implementation, not the
original feasibility assessment's summary:

- **Login** (`src/pages/LoginPage/index.tsx`): email + password, calls
  `authService.login()` via a React Query mutation. On success: clears a
  `recent_logout` flag, shows `BiometricOptIn` if biometrics are available
  and not yet enabled, redirects to `/dashboard`. On failure: toast error,
  stays on the page.
- **Auth state** (`AuthContext.tsx` + `useAuth.ts`): token in
  `localStorage`; `isAuthenticated` is derived from token presence, not a
  separate boolean. No token refresh — axios handles 401s reactively.
  Exposes `login` (mutation), `logout`, `isAuthenticated()`,
  `checkAuthentication()`, `getCurrentUser()`.
- **Session management** (`useSessionManager.ts`): 15-minute timeout
  (configurable, stored alongside everything else). Watches app
  foreground/background transitions: background records a timestamp;
  foreground checks elapsed time and triggers biometric re-auth if timed
  out. An `auth_in_progress` flag prevents concurrent re-auth attempts
  during rapid state changes. **Android skips this automatic flow
  entirely** — an explicit, repeated workaround in the source for a
  biometric dialog-loop issue, not an oversight.
- **Biometric opt-in/login** (`BiometricOptIn.tsx`, `BiometricLogin.tsx`,
  `biometrics.service.ts`, `useBiometrics.ts`): opt-in stores username +
  password + an enabled flag in secure storage right after a successful
  manual login. Login-via-biometric retrieves those credentials and calls
  the same login mutation. iOS system-cancel is treated as retryable;
  Android cancel is not (consistent with Android being excluded from the
  automatic path generally).
- **Secure storage**: 7 keys total across the cluster above
  (`recent_logout`, biometric username/password, `biometrics_enabled`,
  `last_active_timestamp`, `session_timeout_minutes`, `auth_in_progress`).

## Approach: faithful port, not a redesign

Same architecture, RN-equivalent platform APIs. The alternative — replacing
the boolean-flag/timestamp model with an explicit state machine
(`unauthenticated`/`authenticating`/`authenticated`/`locked`) — would be
cleaner in isolation, but this migration's stated approach throughout has
been to port what already works, not redesign it without a concrete reason.
Not pursued.

Two implementation defaults, chosen rather than asked about since both are
small and reversible:

- **Android keeps skipping automatic biometric login.** Unknown whether
  `expo-local-authentication` has the same dialog-loop issue the source
  app's comments reference for `@aparajita/capacitor-biometric-auth` — the
  restriction is carried over rather than assumed fixed.
- **Secure storage's web fallback** is a `Platform.OS === "web"` branch
  straight to `localStorage` — no new dependency, matches how the
  Capacitor plugin already degrades on web today.

## Decisions made during brainstorming

- **Auth token storage: `expo-secure-store`**, not `AsyncStorage`. The
  source stores the token in plain `localStorage`; porting that
  faithfully would mean adding a new dependency (`AsyncStorage`) just to
  replicate a weaker security posture. `expo-secure-store` is already the
  chosen library for biometric credentials, so this is a real security
  improvement with no new dependency, not just a faithful port.
- **Reset/PasswordReset: placeholders**, deferred to Phase 4.

## File structure

Mirrors the source 1:1, platform APIs swapped:

| Source (paperwork-app) | This repo |
|---|---|
| `src/contexts/AuthContext.tsx` | same path |
| `src/hooks/useAuth.ts` | same path |
| `src/hooks/useSessionManager.ts` (Capacitor `App` listeners) | same path, RN `AppState` |
| `src/hooks/biometrics/biometrics.service.ts` + `useBiometrics.ts` | same paths, `expo-local-authentication` |
| `src/components/BiometricOptIn.tsx`, `BiometricLogin.tsx` | same paths, RN components |
| `src/api/services/authService.ts` | same path, axios call unchanged |
| *(new)* `src/services/secureStorage.ts` | one typed wrapper around `expo-secure-store` + the web fallback above. paperwork-app doesn't need this because Capacitor's plugin already handles it internally; here it's one new module so the 7 storage keys have a single source of truth instead of being duplicated across three consumers |
| `src/pages/LoginPage/index.tsx` | `src/app/login.tsx` (+ `reset.tsx`, `password-reset.tsx` placeholders, all outside `(drawer)`) |

## Data flow

Login screen submits email/password → `authService.login()` → token
written via `secureStorage` → `AuthContext` flips `isAuthenticated` → if
biometrics available and not yet opted in, show `BiometricOptIn` →
redirect to `/dashboard`. `useSessionManager` watches `AppState`:
background records a timestamp; foreground checks elapsed time, triggers
biometric re-auth (skipped on Android) or sends to `/login` if timed out.
`src/app/index.tsx`'s redirect — an unconditional stub from Phase 0 —
becomes `isAuthenticated ? "/dashboard" : "/login"`. The drawer's
"Uitloggen" button (a no-op placeholder since Phase 0) gets wired to real
`useAuth().logout()`.

## Error handling

- Login failure: toast-equivalent error surfaced on the login screen
  (exact component TBD when the first screen establishes the pattern —
  see `docs/STATE_MANAGEMENT.md`'s note on this), Dutch message, stay on
  page.
- Biometric failure/cancel: iOS system-cancel retries; Android cancel
  (and all of Android's automatic path) fails to manual login, matching
  source behavior.
- Secure storage read/write failures: caught, logged, treated as "no
  value" rather than thrown — matches the source's try/catch-per-key
  pattern.
- Session timeout misfire (e.g. clock skew): falls back to requiring
  manual login, never silently extends a session.

## Testing

Real business logic, not Phase 0's placeholders — TDD properly applies
here. `useAuth`, `useSessionManager`'s timeout math, and `secureStorage`
get unit tests with mocked storage; `login.tsx` gets an RNTL test for the
submit/error flow. No simulator launches — Jest/RNTL is the automated
signal, manual device testing is the user's call same as every prior
phase.

## Validation criteria

- A user can log in with email/password, see the authenticated shell, and
  log out via the drawer.
- Biometric opt-in appears after first login when available; biometric
  login works on a subsequent app open (iOS); Android uses manual login
  only, matching source behavior.
- Session timeout is enforced: backgrounding past the timeout and
  returning requires re-auth.
- `npx tsc --noEmit` and `npm test` both clean before any PR for this
  phase merges.

## Follow-ups (separate brainstorm/spec/plan cycles)

- Push notifications + badge (split out of the original "Phase 1" scope).
- Filesystem (receipts in Phase 2; tax export whenever that feature is
  scheduled).
- Reset/PasswordReset real implementation (Phase 4).
