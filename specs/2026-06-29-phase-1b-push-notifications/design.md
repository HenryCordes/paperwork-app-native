# Design: Phase 1b — Push notifications & badge

Date: 2026-06-29
Status: Approved, pending implementation plan
Predecessor: Phase 1 (auth core), PR #4 merged — push/badge were split out of Phase 1's original scope during that phase's brainstorming and deferred as a follow-on that never got its own cycle. Picked up now, after Phase 4a (Expenses exemplar, PR #8 merged), ahead of the rest of Phase 4's CRUD batches.
Roadmap: [paperwork-app's specs/2026-06-24-paperwork-app-native-migration/design.md](https://github.com/HenryCordes/paperwork-app/blob/main/specs/2026-06-24-paperwork-app-native-migration/design.md)

## Problem

Phase 1's roadmap scope was "Login, biometric auth, secure storage, push/badge/filesystem/haptics," but Phase 1's actual plan split push/badge out as a deferred "Phase 1b" that never got its own brainstorm/spec/plan cycle. Filesystem ended up covered anyway by Phase 2's scan-pipeline file handling (`expo-file-system` is already installed and in use); haptics has zero call sites anywhere in the source app and isn't needed. Only push/badge remained a real gap.

That gap blocks the next Phase 4 batch: the source `Settings/Details` screen has a live notification-permission/enable toggle wired to `usePushNotifications`, and `useAppInitialization` mounts push initialization, the notification receiver, and badge sync unconditionally for every authenticated session — none of which exist yet in `paperwork-app-native`. Porting Settings as a mechanical clone without this underneath would ship a stub or a silently broken toggle. This spec builds the missing infrastructure first.

## Scope

**In scope:**
- App identity change: `nl.paperwork.app` bundle ID/package (reusing `paperwork-app`'s existing identity and Firebase project — see Approach) and copying its Firebase config files in.
- Native modules: `@react-native-firebase/app`, `@react-native-firebase/messaging`, `expo-notifications`, plus their config plugins and a `prebuild` regen.
- Full port of `notificationsService.ts` (all methods — see Decisions for why it isn't split), `firebase-messaging.service.ts`, `badge.service.ts`, `usePushNotifications.ts`, `useBadge.ts`, `useNotificationReceiver.ts`, and the token/settings half of `useNotifications.ts` + the mutation/query hooks from `useNotificationCenter.ts` that these consume (`useUnreadCount`, `useMarkAsRead`, `useMarkAsReceived`).
- Wiring into the root layout: an `AppInitializationGate`-equivalent mounted in `src/app/_layout.tsx` alongside the existing `SessionGate`, gated on `isAuthenticated` exactly like the source's `useAppInitialization`.
- A fresh EAS dev-client build once the native modules land (the currently-installed dev client predates this and can't load new native code).

**Out of scope, deferred to their own Phase 4 batches:**
- The Settings screen itself (the toggle UI that calls `usePushNotifications`/`useBadge`) — built later, against this real infrastructure instead of a stub.
- The Notifications List screen (`getNotifications`, `markAllAsRead`, `deleteNotification` get UI consumers there) — its data layer ships now as part of the full service port, but no screen.
- Any backend changes — the API contract (FCM token registration, notification CRUD) is unchanged.

## Source behavior (what this phase ports)

Read from `paperwork-app`'s actual implementation:

- **`firebase-messaging.service.ts`**: a singleton wrapping `@capacitor-firebase/messaging`. `initialize()` checks/requests permission, then fetches an FCM token via `FirebaseMessaging.getToken()`. Exposes `checkPermissions`/`requestPermissions`, `getFCMToken`/`refreshToken`, and a message-handler/action-handler registry for foreground-receive and notification-tap events.
- **`usePushNotifications.ts`**: owns initialization state, permission status, and settings (persisted to `localStorage` under `pushNotificationSettings`, plus synced to the backend via `useNotificationSettings().updateSettings`). `initialize()` calls the messaging service, then registers the resulting token with the backend (`useNotificationTokens().registerToken`) — only when running on a native platform.
- **`useAppInitialization.ts`**: the single call site, mounted once in `App.tsx`. Gated on `isAuthenticated`, calls `usePushNotifications().initialize()`; unconditionally mounts `useBadge()` and `useNotificationReceiver()`.
- **`useNotificationReceiver.ts`**: registers a receive handler that calls `markAsReceived(notificationId)` and a tap handler that calls `markAsRead({notificationId, read: true})` — both from `useNotificationCenter`, independent of any List-screen UI.
- **`badge.service.ts`** / **`useBadge.ts`**: a singleton wrapping `@capawesome/capacitor-badge` (set/clear/get/increment/decrement/permissions). `useBadge` syncs the OS badge count from `useUnreadCount()` (TanStack Query) on every change — this is what actually keeps the badge accurate, not manual increment/decrement calls.
- **`notificationsService.ts`**: one class covering both push-token management (`registerToken`/`removeToken`/`getTokens`/`updateSettings`, against `FCMTokenRequest`/`FCMTokenResponse` types) and the notification inbox (`getNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`, `getUnreadCount`, `markAsReceived`).

## Approach

**Identity: reuse, don't create new.** `paperwork-app`'s Capacitor app (`nl.paperwork.app`) already has a working Firebase project — `android/app/google-services.json` and `ios/App/App/GoogleService-Info.plist` both exist, and push already works in the live app, so its Apple APNs key is already provisioned. `paperwork-app-native` adopts the same bundle ID/package (replacing the `com.anonymous.paperworkappnative` placeholder) and copies in those two config files. This avoids redundant Firebase/Apple Developer setup and matches the migration's single-external-cutover strategy — the rewrite is meant to become the same app, not a separate store listing.

**EAS project setup and the Android keystore are explicitly deferred to Phase 6 (release/cutover), not part of this phase.** Every dev-client rebuild so far (including Phase 4a's real-device check) has been a *local* build (`npm run ios` / `npm run android`), which doesn't touch EAS at all — local builds sign with Xcode's automatic debug signing / Android's debug keystore, neither of which is the production keystore. The production keystore only matters once an actual Play Store release build happens, and `eas init`/`eas credentials` only matter once `eas build` is actually used — setting either up now would be infrastructure this phase doesn't exercise. The keystore file is already staged in this repo's root (gitignored, copied from `paperwork-app/keystore` during this design's brainstorming) so Phase 6 doesn't have to go find it again, but importing it into EAS credentials is that phase's task, not this one.

**Library split: `@react-native-firebase/messaging` owns permission + token, `expo-notifications` owns local display + badge.** `@react-native-firebase/messaging`'s own `requestPermission()` is what registers the device for remote messages on iOS — using `expo-notifications`' permission API instead is a documented source of tokens silently never arriving. So firebase-messaging owns the permission/token lifecycle end to end (replacing `FirebaseMessagingService`); `expo-notifications` is scoped narrowly to showing a local notification for foreground data-only FCM messages and to badge count (`setBadgeCountAsync`/`getBadgeCountAsync`, replacing `@capawesome/capacitor-badge`).

**Settings persistence:** the source's `localStorage` cache for `pushNotificationSettings` becomes `expo-secure-store` (already a dependency from Phase 1 auth) rather than pulling in `@react-native-async-storage/async-storage` for one boolean — no new dependency for something the existing one already covers.

**Data layer: faithful port, same as every prior phase's services.** Same Dutch error messages, same endpoints, same `FCMTokenRequest`/`FCMTokenResponse` shapes.

## Decisions made during brainstorming

- **Reuse `nl.paperwork.app`'s identity and Firebase project** rather than giving `paperwork-app-native` its own — matches the project's single-cutover strategy rather than treating the rewrite as a permanently separate app. The Android keystore (confirmed available) is staged in the repo now but its actual EAS-credentials import waits for Phase 6, since nothing before a real release build needs it.
- **`notificationsService.ts` ports in full now, not split by "push" vs. "inbox" methods.** `useNotificationReceiver` calls `markAsReceived`/`markAsRead` on every push event regardless of whether the List screen exists, and `useBadge` depends on `getUnreadCount` for badge sync — most of the "inbox" half is actually exercised by this phase's own data flow. Splitting one cohesive service file across two phases for partial method coverage isn't worth it; only the List screen's UI stays deferred.
- **No new screens in this phase.** Settings' toggle and the Notifications List UI both stay with their own later Phase 4 batches, ported against this real infrastructure instead of a stub.
- **Filesystem and haptics dropped from scope entirely** — filesystem is already covered by Phase 2, haptics has no call sites anywhere in the source app.

## File structure

| Source (paperwork-app) | This repo |
|---|---|
| `capacitor.config.ts` (`appId: "nl.paperwork.app"`) | `app.json` (`ios.bundleIdentifier`, `android.package`) — identity change, not a 1:1 port |
| `android/app/google-services.json`, `ios/App/App/GoogleService-Info.plist` | project root `google-services.json`, `GoogleService-Info.plist`, referenced via `app.json`'s `android.googleServicesFile`/`ios.googleServicesFile` (the Expo-managed-workflow convention — `android/`, `ios/` are gitignored `prebuild` output here, not source) |
| `src/services/firebase-messaging.service.ts` | `src/services/firebase-messaging.service.ts` — rebuilt on `@react-native-firebase/messaging` |
| `src/services/badge.service.ts` | `src/services/badge.service.ts` — rebuilt on `expo-notifications` |
| `src/api/services/notificationsService.ts` | `src/api/services/notificationsService.ts` |
| `src/hooks/usePushNotifications.ts` | `src/hooks/usePushNotifications.ts` |
| `src/hooks/useBadge.ts` | `src/hooks/useBadge.ts` |
| `src/hooks/useNotificationReceiver.ts` | `src/hooks/useNotificationReceiver.ts` |
| `src/hooks/useNotifications.ts`, `src/hooks/useNotificationCenter.ts` | merged into `src/hooks/useNotifications.ts` (this repo doesn't split the two — confirm exact split in the implementation plan) |
| `src/hooks/useAppInitialization.ts` (mounted in `App.tsx`) | inlined into `src/app/_layout.tsx` alongside the existing `SessionGate`, not a separate hook file — mirrors how `useSessionManager` is already mounted there |

## Data flow

On app start, `_layout.tsx`'s session/init gate checks `isAuthenticated`. Once true: `firebase-messaging.service` requests permission and fetches an FCM token → `notificationsService.registerToken({token, platform})`. A foreground message listener shows a local notification via `expo-notifications` and calls `markAsReceived`/`markAsRead` against `notificationsService` on receive/tap. `useBadge` subscribes to `useUnreadCount()` and calls `expo-notifications`' `setBadgeCountAsync` whenever it changes. **Confirmed against the source's `useAuth.ts`: logout does not call `removeToken`** — it only clears auth state and sets a biometric-suppression flag. The registered FCM token is left registered server-side; this phase ports that as-is rather than inventing stronger cleanup the source doesn't have.

One deliberate non-port: the source's `firebase-messaging.service.ts` has its own internal `sendTokenToServer`, a raw `fetch` call reading the auth token straight out of `localStorage`, duplicating what `usePushNotifications.initialize()` already does properly through `notificationsService.registerToken` (axios, via the shared `axiosInstance`). That's redundant in the source, not a second behavior to preserve — the RN port registers the token exactly once, through `notificationsService`, the same as every other API call in this codebase. Likewise, `config/firebase.ts` (the web `firebase/app`/`firebase/messaging` JS SDK config) doesn't port at all — `@react-native-firebase/messaging` talks to the native iOS/Android SDKs via `google-services.json`/`GoogleService-Info.plist`, not a JS SDK config object.

## Error handling

Dutch user-facing error messages, same as every other ported service. Permission denial is not an error state — it's a valid `permissionStatus` the UI (Settings, later) reads and displays; this phase just needs `checkPermissions`/`requestPermissions` to report it accurately. Token registration failures are logged and surfaced via `usePushNotifications`' existing `error` state, not thrown — matches the source.

## Testing

- Manual Jest mocks for `@react-native-firebase/messaging` and `expo-notifications`, same approach as Phase 2's ML Kit/document-scanner mocks.
- Unit tests for `notificationsService` (mirroring the existing Dutch-error-fallback pattern), `usePushNotifications`, `useBadge`, `useNotificationReceiver`.
- Real token delivery, foreground display, and badge behavior can't be verified in Jest — requires the rebuilt dev client and a real-device check (send a test push via Firebase console, confirm token registers, notification displays, badge increments and clears on read) before this phase is marked done.

## Validation criteria

- `tsc --noEmit` and the full Jest suite pass.
- Real-device check on the rebuilt dev client: permission prompt appears, token registers with the backend, a test push from the Firebase console shows a local notification while foregrounded, badge count tracks unread state and clears appropriately, logout removes the token.
- No regression in the existing dev-client flows (login, biometric, scan, dashboard, expenses) after the `prebuild` regen.

## Follow-ups (separate brainstorm/spec/plan cycles)

- Settings screen (Phase 4 batch) — the notification-permission toggle UI, built against this infrastructure.
- Notifications List screen (Phase 4 batch) — UI for the inbox methods this phase's data layer already ports.
- Contacts, Invoices, Profile, Taxes (remaining Phase 4 batches) — unaffected by this phase, can proceed in any order once it's done.
- Phase 6 (release/cutover) — `eas init`, `eas credentials` keystore import (file already staged), and the rest of the EAS Build/Submit setup this phase deliberately doesn't touch.
