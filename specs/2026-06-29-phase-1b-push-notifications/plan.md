# Phase 1b: Push Notifications & Badge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the push-notification/badge infrastructure (token registration, foreground/tap/cold-start receive handling, badge sync, settings persistence) from `paperwork-app`'s Capacitor implementation into `paperwork-app-native`, so the deferred Phase 4 Settings and Notifications-List screens have real infrastructure to build against instead of a stub.

**Architecture:** A data layer (`notificationsService` + the hooks in `useNotifications.ts`, same class+TanStack-Query pattern as every prior phase) talks to the existing notifications API. Two native-capability wrapper modules (`firebase-messaging.service.ts` on `@react-native-firebase/messaging`, `badge.service.ts` on `expo-notifications`) replace the source's Capacitor plugins, following this repo's established plain-function-module convention (not the source's singleton classes). Three hooks (`usePushNotifications`, `useBadge`, `useNotificationReceiver`) compose those two layers, and a small `AppInitializationGate` component — mounted in `src/app/_layout.tsx` alongside the existing `SessionGate` — triggers initialization once the user is authenticated.

**Tech Stack:** Expo, React Native, TypeScript, `expo-router`, `@tanstack/react-query`, `@react-native-firebase/app` + `@react-native-firebase/messaging` (v25, modular API), `expo-notifications`, Jest + React Native Testing Library.

## Global Constraints

- **Never commit to `main`.** This work happens on the existing `phase-1b-push-notifications` branch (already checked out — confirmed via `git status` before this plan was written; do not create a new branch).
- **No Claude/AI attribution** in any commit message.
- **Never push or open a PR without explicit user authorization.**
- **Dutch user-facing error messages everywhere**, matching every other ported service (`Fout bij ...`, `Kon ... niet ...`).
- **Native capability wrappers are plain function modules, not singleton classes** — this repo's established convention (`src/services/secureStorage.ts`, `src/hooks/scan/documentScanner.service.ts`) deliberately replaces the source's `FirebaseMessagingService`/`BadgeService` singleton-class pattern. Module-level state (e.g. nothing mutable is actually needed here — see Task 4/5) stands in for instance state.
- **The `src/api/services/<entity>Service.ts` data-layer service stays class-based** (constructor-injected `axiosInstance`, default-exported singleton instance) per `docs/STATE_MANAGEMENT.md` — this is a different layer from the native wrappers above and follows the existing `expensesService.ts` pattern exactly.
- **Source's internal `sendTokenToServer` raw `fetch` call is not ported.** Per the approved design (`specs/2026-06-29-phase-1b-push-notifications/design.md`, "Data flow"), token registration happens exactly once per token (initial + refresh) through `notificationsService.registerToken`, called from `usePushNotifications` — not duplicated inside the messaging service.
- **Source's manual handler-registry (`registerMessageHandler`/`registerActionHandler`/`clearHandlers` on the singleton service) is dropped.** `@react-native-firebase/messaging`'s `onMessage`/`onTokenRefresh`/`onNotificationOpenedApp` each already return their own unsubscribe function — `useNotificationReceiver` subscribes to `firebase-messaging.service`'s listener exports directly. This makes the source's registry layer (needed only because Capacitor's plugin used a single shared `addListener` per event) redundant. Documented as a deviation, not an oversight.
- **`badge.service.ts` ports `set`/`clear`/`get` only** — not `increment`/`decrement` (nothing in this phase's scope or the deferred Settings/List screens calls them — confirmed by reading the source app; YAGNI) and not its own `checkPermissions`/`requestPermissions` (badge visibility is gated by the same iOS notification authorization that `firebase-messaging.service` already owns end-to-end; there is no separate "badge permission" to request).
- **`@react-native-firebase/messaging`'s `requestPermission`/`hasPermission` are used for the permission+token lifecycle**, per the approved design's explicit reasoning (these are what correctly drive iOS APNs registration before `getToken()`). As of the version this plan installs (`@react-native-firebase/messaging` v25.x, confirmed via the package's own shipped `.d.ts` during this plan's research), these two functions are marked `@deprecated` upstream in favor of `expo-notifications`/`react-native-permissions`, with removal planned for "a future major release" — not yet removed. This is a known future-upgrade item, not a blocker; flagged again in Task 10's real-device checklist.
- **Console.log debugging output from the source is not ported** — matches the quieter convention already established by every previously-ported service/hook in this repo (none of them replicate source's extensive `console.log` calls).
- **`getInitialNotification` (cold-start tap) is added even though it has no source-Capacitor equivalent call site**, because Capacitor's single `notificationActionPerformed` event implicitly covered the quit-state case that RNFirebase splits into `onNotificationOpenedApp` (background) + `getInitialNotification` (quit). Both feed the same tap handler in `useNotificationReceiver`, to faithfully preserve full tap-handling parity across all three app states.
- **Spec correction:** `design.md`'s "Validation criteria" section includes a bullet "logout removes the token", which directly contradicts that same document's "Data flow" section ("Confirmed against the source's actual `useAuth.ts`: logout does not call `removeToken`... left registered server-side"). The Data-flow section's claim is the one independently source-verified during this plan's research (`paperwork-app`'s `useAuth.ts` logout flow calls only `authService.logout()` and sets the `recent_logout` flag — no `removeToken` call). This plan implements that verified behavior; the validation-criteria bullet is a spec typo and is not implemented. Flagged here rather than silently resolved.
- **Firebase config files already gitignored.** `paperwork-app-native/.gitignore` already has `google-services.json` and `GoogleService-Info.plist` entries (and `/android`, `/ios`) — no `.gitignore` edit needed in Task 1.

## File structure (end state after this batch)

```
paperwork-app-native/
  google-services.json                  # NEW (gitignored): copied from paperwork-app/android/app/google-services.json
  GoogleService-Info.plist              # NEW (gitignored): copied from paperwork-app/ios/App/App/GoogleService-Info.plist
  app.json                              # MODIFY: bundle id/package -> nl.paperwork.app, googleServicesFile fields, new plugins
  package.json                          # MODIFY: add @react-native-firebase/app, @react-native-firebase/messaging, expo-notifications
  src/
    api/
      types/
        notifications.ts                # NEW: FCMTokenRequest/Response, NotificationSettings*, GetTokensResponse, StoredNotification, NotificationListResponse, UnreadCountResponse, MarkAsReadResponse, MarkAllReadResponse, DeleteNotificationResponse, NotificationFilter, NotificationPayload, PushNotificationSettings, NotificationPermissionStatus
      services/
        notificationsService.ts         # NEW: class-based, faithful port (registerToken, removeToken, updateSettings, getTokens, getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount, markAsReceived)
      queryKeys.ts                      # MODIFY: add QueryKeys.notifications.*
    services/
      firebase-messaging.service.ts     # NEW: plain functions over @react-native-firebase/messaging
      badge.service.ts                  # NEW: plain functions over expo-notifications
    hooks/
      useNotifications.ts               # NEW: useNotificationTokens, useNotificationSettings, useNotificationsList, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useDeleteNotification, useMarkAsReceived
      usePushNotifications.ts           # NEW
      useBadge.ts                       # NEW
      useNotificationReceiver.ts        # NEW
    app/
      _layout.tsx                       # MODIFY: add AppInitializationGate alongside SessionGate
    __tests__/
      api/
        services/
          notificationsService.test.ts
      services/
        firebase-messaging.service.test.ts
        badge.service.test.ts
      hooks/
        useNotifications.test.tsx
        usePushNotifications.test.tsx
        useBadge.test.tsx
        useNotificationReceiver.test.tsx
```

---

## Task 1: App identity, Firebase config, native dependencies, prebuild

**Files:**

- Create: `google-services.json` (repo root, gitignored)
- Create: `GoogleService-Info.plist` (repo root, gitignored)
- Modify: `app.json`
- Modify: `package.json` (via `npx expo install`, not hand-edited)

**Interfaces:**

- Produces: native modules `@react-native-firebase/app`, `@react-native-firebase/messaging`, `expo-notifications` available for import in every later task. Produces a regenerated `android/`/`ios/` (gitignored, prebuild output) that later tasks' real-device check (Task 10) builds against.

- [ ] **Step 1: Confirm branch and copy the Firebase config files**

```bash
git status
# Expect: On branch phase-1b-push-notifications, nothing to commit, working tree clean

cp /Users/henry/Projects/devartist/paperwork-app/android/app/google-services.json \
   /Users/henry/Projects/devartist/paperwork-app-native/google-services.json

cp /Users/henry/Projects/devartist/paperwork-app/ios/App/App/GoogleService-Info.plist \
   /Users/henry/Projects/devartist/paperwork-app-native/GoogleService-Info.plist
```

Both filenames are already in `.gitignore` — `git status` after this step must **not** list them as untracked.

- [ ] **Step 2: Update `app.json` — identity, Firebase config files, plugins**

Change `ios.bundleIdentifier` and `android.package` from the `com.anonymous.paperworkappnative` placeholder to `nl.paperwork.app` (reusing `paperwork-app`'s existing identity and Firebase project, per the design's "Approach" section). Add `googleServicesFile` to both platform blocks. Add `"@react-native-firebase/app"` and `"expo-notifications"` to `plugins` (no options object for either — no custom notification icon/color asset exists yet to point them at, and `@react-native-firebase/messaging`'s own plugin only customizes the same Android notification icon that `expo-notifications`' plugin already covers, so it is not also listed).

```json
{
  "expo": {
    "name": "paperwork-app-native",
    "slug": "paperwork-app-native",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "paperworkappnative",
    "userInterfaceStyle": "automatic",
    "ios": {
      "icon": "./assets/expo.icon",
      "bundleIdentifier": "nl.paperwork.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "predictiveBackGestureEnabled": false,
      "package": "nl.paperwork.app",
      "googleServicesFile": "./google-services.json"
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      [
        "expo-splash-screen",
        {
          "backgroundColor": "#208AEF",
          "android": {
            "image": "./assets/images/splash-icon.png",
            "imageWidth": 76
          }
        }
      ],
      "expo-secure-store",
      [
        "react-native-document-scanner-plugin",
        {
          "cameraPermission": "Paperwork heeft toegang tot je camera nodig om bonnen te kunnen scannen."
        }
      ],
      "@react-native-firebase/app",
      "expo-notifications"
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    }
  }
}
```

- [ ] **Step 3: Install the native dependencies**

```bash
npx expo install @react-native-firebase/app @react-native-firebase/messaging expo-notifications
```

`expo install` (not plain `npm install`) resolves the exact versions compatible with this project's installed Expo SDK (`~56.0.12`), rather than pinning whatever this plan's research happened to see as "latest".

- [ ] **Step 4: Regenerate the native projects**

```bash
npx expo prebuild --clean
```

Expected: regenerates `android/` and `ios/` (both gitignored — this is expected `prebuild` output, not new source to commit) with the new bundle identifier/package and the Firebase config files wired in via `app.json`.

- [ ] **Step 5: Verify nothing existing broke**

```bash
npx tsc --noEmit
npm test
```

Expected: both clean/green — this step only installs dependencies and regenerates native projects; no application code has changed yet, so the entire existing suite must still pass unmodified.

- [ ] **Step 6: Local dev-client rebuild (manual, real device or simulator)**

```bash
npm run ios
# or: npm run android
```

The dev client installed before this phase predates these native modules and cannot load them — this rebuild is required before Task 10's real-device check can run, but is not itself part of automated verification for this task. Confirm the app still launches to the login/dashboard flow (no crash) before moving on; do not yet expect any push-notification behavior, since no application code exists yet.

- [ ] **Step 7: Commit**

```bash
git add google-services.json GoogleService-Info.plist app.json package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add Firebase identity, push/notifications native deps, prebuild

Adopts nl.paperwork.app's existing bundle id/package and Firebase
project (reusing its already-provisioned APNs key) instead of
provisioning a separate one, per this phase's design. Installs
@react-native-firebase/app, @react-native-firebase/messaging, and
expo-notifications and regenerates the native projects so later
tasks have the native modules available.
EOF
)"
```

---

## Task 2: Notification types and query keys

**Files:**

- Create: `src/api/types/notifications.ts`
- Modify: `src/api/queryKeys.ts`

**Interfaces:**

- Consumes: nothing (leaf types).
- Produces: every type later tasks import — `FCMTokenRequest`, `FCMTokenResponse`, `NotificationSettingsRequest`, `NotificationSettingsResponse`, `GetTokensResponse`, `FCMTokenInfo`, `StoredNotification`, `NotificationType`, `NotificationAction`, `NotificationListResponse`, `UnreadCountResponse`, `MarkAsReadResponse`, `MarkAllReadResponse`, `DeleteNotificationResponse`, `NotificationFilter`, `NotificationPayload`, `PushNotificationSettings`, `NotificationPermissionStatus`. Produces `QueryKeys.notifications.{base,tokens,settings,list,unreadCount}`.

This is a pure-declaration task (types + a query-key factory) — neither `src/api/types/expenses.ts` nor `src/api/queryKeys.ts` has a dedicated test file anywhere in this repo (confirmed by searching `src/__tests__` before writing this plan), so this task's verification is `tsc`, not Jest, matching that existing precedent.

- [ ] **Step 1: Create `src/api/types/notifications.ts`**

```typescript
export interface FCMTokenRequest {
  token: string;
  platform: "ios" | "android";
}

export interface FCMTokenResponse {
  success: boolean;
  message: string;
}

export interface NotificationSettingsRequest {
  enabled: boolean;
}

export interface NotificationSettingsResponse {
  success: boolean;
  message: string;
}

export interface FCMTokenInfo {
  platform: string;
  createdAt: string;
  lastUsed: string;
}

export interface GetTokensResponse {
  success: boolean;
  data: FCMTokenInfo[];
}

export type NotificationType = "expense" | "invoice" | "vat_deadline" | "general";
export type NotificationAction = "view" | "edit";

export interface StoredNotification {
  _id: string;
  title: string;
  body: string;
  type: NotificationType;
  targetId?: string;
  action?: NotificationAction;
  read: boolean;
  received: boolean;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
  data?: Record<string, unknown>;
}

export interface NotificationListResponse {
  success: boolean;
  data: StoredNotification[];
}

export interface UnreadCountResponse {
  success: boolean;
  count: number;
}

export interface MarkAsReadResponse {
  success: boolean;
  data: StoredNotification;
}

export interface MarkAllReadResponse {
  success: boolean;
  count: number;
}

export interface DeleteNotificationResponse {
  success: boolean;
}

export interface NotificationFilter {
  status?: "all" | "unread" | "read";
  type?: NotificationType;
}

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  notificationId?: string;
  data?: Record<string, unknown>;
}

export interface PushNotificationSettings {
  enabled: boolean;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}
```

`StoredNotification` (not `Notification`) deliberately avoids shadowing the global DOM `Notification` type — this codebase targets `react-native-web` via `react-native-web`, where that global still resolves.

- [ ] **Step 2: Add the `notifications` key factory to `src/api/queryKeys.ts`**

Read the current file first — it's small enough to show in full with the addition:

```typescript
import { DashboardStatsRequest } from "./types/dashboard";
import { ExpensesQueryParams } from "./types/expenses";
import { NotificationFilter } from "./types/notifications";

const QueryKeys = {
  auth: {
    base: ["auth"] as const,
    user: () => [...QueryKeys.auth.base, "user"] as const,
    token: () => [...QueryKeys.auth.base, "token"] as const,
    profile: () => [...QueryKeys.auth.base, "profile"] as const,
  },
  dashboard: {
    base: ["dashboard"] as const,
    stats: (params: DashboardStatsRequest) =>
      [...QueryKeys.dashboard.base, "stats", params] as const,
  },
  contacts: {
    base: ["contacts"] as const,
    list: () => [...QueryKeys.contacts.base, "list"] as const,
  },
  expenses: {
    base: ["expenses"] as const,
    list: (params: ExpensesQueryParams) => [...QueryKeys.expenses.base, "list", params] as const,
    detail: (id: string) => [...QueryKeys.expenses.base, "detail", id] as const,
  },
  notifications: {
    base: ["notifications"] as const,
    tokens: () => [...QueryKeys.notifications.base, "tokens"] as const,
    settings: () => [...QueryKeys.notifications.base, "settings"] as const,
    list: (filter?: NotificationFilter) =>
      [...QueryKeys.notifications.base, "list", filter] as const,
    unreadCount: () => [...QueryKeys.notifications.base, "unread-count"] as const,
  },
};

export default QueryKeys;
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: clean (no errors). No new code consumes these types/keys yet, so this only checks the new declarations are internally well-formed.

- [ ] **Step 4: Commit**

```bash
git add src/api/types/notifications.ts src/api/queryKeys.ts
git commit -m "$(cat <<'EOF'
feat: add notification types and query keys

Leaf types and the QueryKeys.notifications factory that every
later task in this phase (service, hooks) builds on.
EOF
)"
```

---

## Task 3: `notificationsService.ts`

**Files:**

- Create: `src/api/services/notificationsService.ts`
- Test: `src/__tests__/api/services/notificationsService.test.ts`

**Interfaces:**

- Consumes: `ApiError` from `../types`; every request/response type from `../types/notifications` (Task 2); the shared `axiosInstance` from `../axiosInstance`.
- Produces: `NotificationsService` class (named export, for test construction with a mock axios) and a default-exported singleton `notificationsService` with methods `registerToken`, `removeToken`, `updateSettings`, `getTokens`, `getNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`, `getUnreadCount`, `markAsReceived` — these exact method names are what Task 9 (`useNotifications.ts`) calls.

Source's `notificationsService.ts` has no `try`/`catch` at all (errors propagate raw from axios). This port adds it, because `docs/STATE_MANAGEMENT.md` makes try/catch-with-Dutch-message **mandatory** for every service in this repo, and every other ported service (`expensesService`, `authService`, `contactsService`, `documentsService`) already follows it — this is the one place this plan deliberately does *not* mirror the source line-for-line.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/api/services/notificationsService.test.ts`:

```typescript
import { NotificationsService } from "@/api/services/notificationsService";

describe("NotificationsService", () => {
  const mockAxios = { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() };

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("registerToken", () => {
    it("posts the token and platform to the register endpoint", async () => {
      const response = { success: true, message: "ok" };
      mockAxios.post.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.registerToken({ token: "t1", platform: "ios" });

      expect(mockAxios.post).toHaveBeenCalledWith("notifications/register-token", {
        token: "t1",
        platform: "ios",
      });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.post.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.registerToken({ token: "t1", platform: "ios" })).rejects.toThrow(
        "Fout bij registreren push-token",
      );
    });
  });

  describe("removeToken", () => {
    it("sends a DELETE with the token in the request body", async () => {
      const response = { success: true, message: "ok" };
      mockAxios.delete.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.removeToken("t1");

      expect(mockAxios.delete).toHaveBeenCalledWith("notifications/remove-token", {
        data: { token: "t1" },
      });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.delete.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.removeToken("t1")).rejects.toThrow("Fout bij verwijderen push-token");
    });
  });

  describe("updateSettings", () => {
    it("puts the settings to the settings endpoint", async () => {
      const response = { success: true, message: "ok" };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.updateSettings({ enabled: true });

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/settings", { enabled: true });
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.updateSettings({ enabled: true })).rejects.toThrow(
        "Fout bij bijwerken notificatie-instellingen",
      );
    });
  });

  describe("getTokens", () => {
    it("fetches the user's tokens", async () => {
      const response = { success: true, data: [] };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.getTokens();

      expect(mockAxios.get).toHaveBeenCalledWith("notifications/tokens");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.getTokens()).rejects.toThrow("Fout bij ophalen push-tokens");
    });
  });

  describe("getNotifications", () => {
    it("forwards status and type filters as params", async () => {
      const response = { success: true, data: [] };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.getNotifications({ status: "unread", type: "expense" });

      expect(mockAxios.get).toHaveBeenCalledWith("notifications", {
        params: { status: "unread", type: "expense" },
      });
    });

    it("sends empty params when no filter is given", async () => {
      const response = { success: true, data: [] };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.getNotifications();

      expect(mockAxios.get).toHaveBeenCalledWith("notifications", { params: {} });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.getNotifications()).rejects.toThrow("Fout bij ophalen notificaties");
    });
  });

  describe("markAsRead", () => {
    it("defaults read to true", async () => {
      const response = { success: true, data: {} };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.markAsRead("n1");

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/n1/read", { read: true });
    });

    it("forwards an explicit read value", async () => {
      const response = { success: true, data: {} };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      await service.markAsRead("n1", false);

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/n1/read", { read: false });
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.markAsRead("n1")).rejects.toThrow(
        "Fout bij markeren van notificatie als gelezen",
      );
    });
  });

  describe("markAllAsRead", () => {
    it("puts to the mark-all-read endpoint", async () => {
      const response = { success: true, count: 3 };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.markAllAsRead();

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/mark-all-read");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.markAllAsRead()).rejects.toThrow(
        "Fout bij markeren van alle notificaties als gelezen",
      );
    });
  });

  describe("deleteNotification", () => {
    it("sends DELETE to the notification's own endpoint", async () => {
      const response = { success: true };
      mockAxios.delete.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.deleteNotification("n1");

      expect(mockAxios.delete).toHaveBeenCalledWith("notifications/n1");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.delete.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.deleteNotification("n1")).rejects.toThrow(
        "Fout bij verwijderen notificatie",
      );
    });
  });

  describe("getUnreadCount", () => {
    it("fetches the unread count", async () => {
      const response = { success: true, count: 2 };
      mockAxios.get.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.getUnreadCount();

      expect(mockAxios.get).toHaveBeenCalledWith("notifications/unread-count");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.get.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.getUnreadCount()).rejects.toThrow(
        "Fout bij ophalen aantal ongelezen notificaties",
      );
    });
  });

  describe("markAsReceived", () => {
    it("puts to the notification's received endpoint", async () => {
      const response = { success: true, data: {} };
      mockAxios.put.mockResolvedValue({ data: response });
      const service = new NotificationsService(mockAxios as never);

      const result = await service.markAsReceived("n1");

      expect(mockAxios.put).toHaveBeenCalledWith("notifications/n1/received");
      expect(result).toEqual(response);
    });

    it("throws a Dutch fallback message on failure", async () => {
      mockAxios.put.mockRejectedValue(new Error("network down"));
      const service = new NotificationsService(mockAxios as never);

      await expect(service.markAsReceived("n1")).rejects.toThrow(
        "Fout bij markeren van notificatie als ontvangen",
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/api/services/notificationsService.test.ts
```

Expected: FAIL — `Cannot find module '@/api/services/notificationsService'`.

- [ ] **Step 3: Implement `src/api/services/notificationsService.ts`**

```typescript
import { AxiosError, AxiosInstance } from "axios";

import { ApiError } from "../types";
import {
  FCMTokenRequest,
  FCMTokenResponse,
  NotificationSettingsRequest,
  NotificationSettingsResponse,
  GetTokensResponse,
  NotificationListResponse,
  NotificationFilter,
  UnreadCountResponse,
  MarkAsReadResponse,
  MarkAllReadResponse,
  DeleteNotificationResponse,
} from "../types/notifications";
import axiosInstance from "../axiosInstance";

export class NotificationsService {
  private axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  async registerToken(tokenData: FCMTokenRequest): Promise<FCMTokenResponse> {
    try {
      const response = await this.axios.post<FCMTokenResponse>(
        "notifications/register-token",
        tokenData,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij registreren push-token");
    }
  }

  async removeToken(token: string): Promise<FCMTokenResponse> {
    try {
      const response = await this.axios.delete<FCMTokenResponse>("notifications/remove-token", {
        data: { token },
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij verwijderen push-token");
    }
  }

  async updateSettings(
    settings: NotificationSettingsRequest,
  ): Promise<NotificationSettingsResponse> {
    try {
      const response = await this.axios.put<NotificationSettingsResponse>(
        "notifications/settings",
        settings,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij bijwerken notificatie-instellingen",
      );
    }
  }

  async getTokens(): Promise<GetTokensResponse> {
    try {
      const response = await this.axios.get<GetTokensResponse>("notifications/tokens");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen push-tokens");
    }
  }

  async getNotifications(filter?: NotificationFilter): Promise<NotificationListResponse> {
    try {
      const params: Record<string, string> = {};
      if (filter?.status) {
        params.status = filter.status;
      }
      if (filter?.type) {
        params.type = filter.type;
      }
      const response = await this.axios.get<NotificationListResponse>("notifications", {
        params,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij ophalen notificaties");
    }
  }

  async markAsRead(notificationId: string, read: boolean = true): Promise<MarkAsReadResponse> {
    try {
      const response = await this.axios.put<MarkAsReadResponse>(
        `notifications/${notificationId}/read`,
        { read },
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij markeren van notificatie als gelezen",
      );
    }
  }

  async markAllAsRead(): Promise<MarkAllReadResponse> {
    try {
      const response = await this.axios.put<MarkAllReadResponse>("notifications/mark-all-read");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message ||
          "Fout bij markeren van alle notificaties als gelezen",
      );
    }
  }

  async deleteNotification(notificationId: string): Promise<DeleteNotificationResponse> {
    try {
      const response = await this.axios.delete<DeleteNotificationResponse>(
        `notifications/${notificationId}`,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(axiosError.response?.data?.message || "Fout bij verwijderen notificatie");
    }
  }

  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await this.axios.get<UnreadCountResponse>("notifications/unread-count");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij ophalen aantal ongelezen notificaties",
      );
    }
  }

  async markAsReceived(notificationId: string): Promise<MarkAsReadResponse> {
    try {
      const response = await this.axios.put<MarkAsReadResponse>(
        `notifications/${notificationId}/received`,
      );
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ApiError>;
      throw new Error(
        axiosError.response?.data?.message || "Fout bij markeren van notificatie als ontvangen",
      );
    }
  }
}

export const notificationsService = new NotificationsService(axiosInstance);

export default notificationsService;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/api/services/notificationsService.test.ts
```

Expected: PASS, all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/api/services/notificationsService.ts src/__tests__/api/services/notificationsService.test.ts
git commit -m "$(cat <<'EOF'
feat: add notificationsService

Faithful port of paperwork-app's notifications API client, with
try/catch + Dutch fallback messages added on every method per this
repo's mandatory service pattern (the source has none).
EOF
)"
```

---

## Task 4: `firebase-messaging.service.ts`

**Files:**

- Create: `src/services/firebase-messaging.service.ts`
- Test: `src/__tests__/services/firebase-messaging.service.test.ts`

**Interfaces:**

- Consumes: `getApp` from `@react-native-firebase/app`; `getMessaging`, `hasPermission`, `requestPermission`, `getToken`, `onMessage`, `onTokenRefresh`, `onNotificationOpenedApp`, `getInitialNotification`, `AuthorizationStatus` from `@react-native-firebase/messaging`; `NotificationPayload`, `NotificationPermissionStatus` from `@/api/types/notifications` (Task 2).
- Produces: `checkPermissions(): Promise<NotificationPermissionStatus>`, `requestPermissions(): Promise<NotificationPermissionStatus>`, `getToken(): Promise<string>`, `onTokenRefreshed(handler: (token: string) => void): () => void`, `onForegroundMessage(handler: (payload: NotificationPayload) => void): () => void`, `onNotificationTapped(handler: (payload: NotificationPayload) => void): () => void`, `getInitialNotificationTap(): Promise<NotificationPayload | null>`. Task 6 (`usePushNotifications`) consumes the first five; Task 8 (`useNotificationReceiver`) consumes the last three.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/services/firebase-messaging.service.test.ts`:

```typescript
import {
  hasPermission,
  requestPermission,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";

import {
  checkPermissions,
  requestPermissions,
  getToken as fetchToken,
  onTokenRefreshed,
  onForegroundMessage,
  onNotificationTapped,
  getInitialNotificationTap,
} from "@/services/firebase-messaging.service";

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({})),
}));

jest.mock("@react-native-firebase/messaging", () => ({
  getMessaging: jest.fn(() => ({})),
  hasPermission: jest.fn(),
  requestPermission: jest.fn(),
  getToken: jest.fn(),
  onMessage: jest.fn(() => jest.fn()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(),
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    EPHEMERAL: 3,
  },
}));

describe("firebase-messaging.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("checkPermissions", () => {
    it("maps AUTHORIZED to granted", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.AUTHORIZED);
      expect(await checkPermissions()).toEqual({ granted: true, denied: false, prompt: false });
    });

    it("maps PROVISIONAL to granted", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.PROVISIONAL);
      expect(await checkPermissions()).toEqual({ granted: true, denied: false, prompt: false });
    });

    it("maps DENIED to denied", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.DENIED);
      expect(await checkPermissions()).toEqual({ granted: false, denied: true, prompt: false });
    });

    it("maps NOT_DETERMINED to prompt", async () => {
      (hasPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.NOT_DETERMINED);
      expect(await checkPermissions()).toEqual({ granted: false, denied: false, prompt: true });
    });
  });

  describe("requestPermissions", () => {
    it("returns the mapped status from requestPermission", async () => {
      (requestPermission as jest.Mock).mockResolvedValue(AuthorizationStatus.AUTHORIZED);
      expect(await requestPermissions()).toEqual({ granted: true, denied: false, prompt: false });
    });
  });

  describe("getToken (re-exported)", () => {
    it("returns the FCM token", async () => {
      (getToken as jest.Mock).mockResolvedValue("token-123");
      expect(await fetchToken()).toBe("token-123");
    });
  });

  describe("onTokenRefreshed", () => {
    it("subscribes via onTokenRefresh and returns its unsubscribe function", () => {
      const unsubscribe = jest.fn();
      (onTokenRefresh as jest.Mock).mockReturnValue(unsubscribe);
      const handler = jest.fn();

      const result = onTokenRefreshed(handler);

      expect(onTokenRefresh).toHaveBeenCalledWith(expect.anything(), handler);
      expect(result).toBe(unsubscribe);
    });
  });

  describe("onForegroundMessage", () => {
    it("parses the RemoteMessage into a NotificationPayload", () => {
      let capturedListener!: (message: unknown) => void;
      (onMessage as jest.Mock).mockImplementation((_messaging, listener) => {
        capturedListener = listener;
        return jest.fn();
      });
      const handler = jest.fn();

      onForegroundMessage(handler);
      capturedListener({
        messageId: "m1",
        notification: { title: "Titel", body: "Inhoud" },
        data: { notificationId: "n1" },
      });

      expect(handler).toHaveBeenCalledWith({
        id: "m1",
        title: "Titel",
        body: "Inhoud",
        notificationId: "n1",
        data: { notificationId: "n1" },
      });
    });

    it("falls back to default title/body and a generated id when missing", () => {
      let capturedListener!: (message: unknown) => void;
      (onMessage as jest.Mock).mockImplementation((_messaging, listener) => {
        capturedListener = listener;
        return jest.fn();
      });
      const handler = jest.fn();

      onForegroundMessage(handler);
      capturedListener({});

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Paperwork Notificatie", body: "" }),
      );
    });
  });

  describe("onNotificationTapped", () => {
    it("parses the RemoteMessage from onNotificationOpenedApp", () => {
      let capturedListener!: (message: unknown) => void;
      (onNotificationOpenedApp as jest.Mock).mockImplementation((_messaging, listener) => {
        capturedListener = listener;
        return jest.fn();
      });
      const handler = jest.fn();

      onNotificationTapped(handler);
      capturedListener({
        messageId: "m2",
        notification: { title: "Tik", body: "Open" },
        data: { notificationId: "n2" },
      });

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ notificationId: "n2", title: "Tik" }),
      );
    });
  });

  describe("getInitialNotificationTap", () => {
    it("returns null when the app wasn't opened from a notification", async () => {
      (getInitialNotification as jest.Mock).mockResolvedValue(null);
      expect(await getInitialNotificationTap()).toBeNull();
    });

    it("parses the initial RemoteMessage when present", async () => {
      (getInitialNotification as jest.Mock).mockResolvedValue({
        messageId: "m3",
        notification: { title: "Quit-start", body: "Tap" },
        data: { notificationId: "n3" },
      });

      expect(await getInitialNotificationTap()).toEqual(
        expect.objectContaining({ notificationId: "n3", title: "Quit-start" }),
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/services/firebase-messaging.service.test.ts
```

Expected: FAIL — `Cannot find module '@/services/firebase-messaging.service'`.

- [ ] **Step 3: Implement `src/services/firebase-messaging.service.ts`**

```typescript
import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  hasPermission,
  requestPermission,
  getToken as fetchFCMToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
  type FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";

import type {
  NotificationPayload,
  NotificationPermissionStatus,
} from "@/api/types/notifications";

const messaging = getMessaging(getApp());

function toPermissionStatus(status: number): NotificationPermissionStatus {
  return {
    granted:
      status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL,
    denied: status === AuthorizationStatus.DENIED,
    prompt: status === AuthorizationStatus.NOT_DETERMINED,
  };
}

export async function checkPermissions(): Promise<NotificationPermissionStatus> {
  return toPermissionStatus(await hasPermission(messaging));
}

export async function requestPermissions(): Promise<NotificationPermissionStatus> {
  return toPermissionStatus(await requestPermission(messaging));
}

export async function getToken(): Promise<string> {
  return fetchFCMToken(messaging);
}

function parseNotificationPayload(
  message: FirebaseMessagingTypes.RemoteMessage,
): NotificationPayload {
  const data = (message.data ?? {}) as Record<string, unknown>;
  return {
    id: (data.id as string) ?? message.messageId ?? Date.now().toString(),
    title: message.notification?.title ?? "Paperwork Notificatie",
    body: message.notification?.body ?? "",
    notificationId: data.notificationId as string | undefined,
    data,
  };
}

export function onTokenRefreshed(handler: (token: string) => void): () => void {
  return onTokenRefresh(messaging, handler);
}

export function onForegroundMessage(
  handler: (payload: NotificationPayload) => void,
): () => void {
  return onMessage(messaging, (message) => handler(parseNotificationPayload(message)));
}

export function onNotificationTapped(
  handler: (payload: NotificationPayload) => void,
): () => void {
  return onNotificationOpenedApp(messaging, (message) => handler(parseNotificationPayload(message)));
}

export async function getInitialNotificationTap(): Promise<NotificationPayload | null> {
  const message = await getInitialNotification(messaging);
  return message ? parseNotificationPayload(message) : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/services/firebase-messaging.service.test.ts
```

Expected: PASS, all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/services/firebase-messaging.service.ts src/__tests__/services/firebase-messaging.service.test.ts
git commit -m "$(cat <<'EOF'
feat: add firebase-messaging.service

Plain-function wrapper over @react-native-firebase/messaging's
modular API, replacing the source's Capacitor-plugin singleton
class per this repo's native-wrapper convention. Covers
permission+token lifecycle and foreground/background/cold-start
message handling.
EOF
)"
```

---

## Task 5: `badge.service.ts`

**Files:**

- Create: `src/services/badge.service.ts`
- Test: `src/__tests__/services/badge.service.test.ts`

**Interfaces:**

- Consumes: `expo-notifications`.
- Produces: `setBadgeCount(count: number): Promise<void>`, `clearBadge(): Promise<void>`, `getBadgeCount(): Promise<number>`. Task 7 (`useBadge`) consumes `setBadgeCount`.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/services/badge.service.test.ts`:

```typescript
import * as Notifications from "expo-notifications";

import { setBadgeCount, clearBadge, getBadgeCount } from "@/services/badge.service";

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
}));

describe("badge.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("registers a notification handler that shows banners without sound or badge side effects", () => {
    expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({ handleNotification: expect.any(Function) }),
    );
  });

  describe("setBadgeCount", () => {
    it("forwards the count to setBadgeCountAsync", async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);
      await setBadgeCount(5);
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });
  });

  describe("clearBadge", () => {
    it("sets the badge count to 0", async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(true);
      await clearBadge();
      expect(Notifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe("getBadgeCount", () => {
    it("returns the current badge count", async () => {
      (Notifications.getBadgeCountAsync as jest.Mock).mockResolvedValue(3);
      expect(await getBadgeCount()).toBe(3);
    });
  });
});
```

The first test depends on `setNotificationHandler` being called once, at module-import time, before `jest.clearAllMocks()` ever runs — that is why it must stay the first test in the file.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/services/badge.service.test.ts
```

Expected: FAIL — `Cannot find module '@/services/badge.service'`.

- [ ] **Step 3: Implement `src/services/badge.service.ts`**

```typescript
import * as Notifications from "expo-notifications";

// Without a handler registered, expo-notifications' documented default is
// not to show a notification at all - this also governs the local
// notification firebase-messaging's foreground listener schedules, not
// just badge-related ones, so it lives here as the expo-notifications
// "owner" module.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/services/badge.service.test.ts
```

Expected: PASS, all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/services/badge.service.ts src/__tests__/services/badge.service.test.ts
git commit -m "$(cat <<'EOF'
feat: add badge.service

Plain-function wrapper over expo-notifications' badge API,
replacing the source's @capawesome/capacitor-badge singleton.
Ports set/clear/get only - increment/decrement and a separate
badge-permission check are dropped, since nothing in this phase's
scope calls them and badge visibility is gated by the same iOS
notification authorization firebase-messaging.service already owns.
EOF
)"
```

---

## Task 6: `useNotifications.ts` (token, settings, and inbox hooks)

**Files:**

- Create: `src/hooks/useNotifications.ts`
- Test: `src/__tests__/hooks/useNotifications.test.tsx`

**Interfaces:**

- Consumes: `notificationsService` (Task 3); `QueryKeys.notifications.*` (Task 2); request/response types from `@/api/types/notifications` (Task 2).
- Produces: `useNotificationTokens()` returning `{ tokens, isLoading, registerToken, removeToken }`; `useNotificationSettings()` returning `{ updateSettings }`; `useNotificationsList(filter?)`, `useUnreadCount()`, `useMarkAsRead()`, `useMarkAllAsRead()`, `useDeleteNotification()`, `useMarkAsReceived()` as standard `UseQueryResult`/`UseMutationResult`. Task 7 (`usePushNotifications`) consumes `useNotificationTokens`, `useNotificationSettings`; Task 8 (`useBadge`) consumes `useUnreadCount`; Task 9 (`useNotificationReceiver`) consumes `useMarkAsReceived`, `useMarkAsRead`.

This merges source's `useNotifications.ts` + `useNotificationCenter.ts` into one file, per the design's file-structure table ("this repo doesn't split the two").

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/useNotifications.test.tsx`:

```typescript
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import {
  useNotificationTokens,
  useNotificationSettings,
  useNotificationsList,
  useUnreadCount,
  useMarkAsRead,
  useMarkAsReceived,
} from "@/hooks/useNotifications";
import notificationsService from "@/api/services/notificationsService";
import QueryKeys from "@/api/queryKeys";

jest.mock("@/api/services/notificationsService", () => ({
  __esModule: true,
  default: {
    getTokens: jest.fn(),
    registerToken: jest.fn(),
    removeToken: jest.fn(),
    updateSettings: jest.fn(),
    getNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    markAsReceived: jest.fn(),
  },
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { ...renderHook(callback, { wrapper }), client };
}

describe("useNotificationTokens", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the tokens the service resolves", async () => {
    const response = { success: true, data: [{ platform: "ios", createdAt: "x", lastUsed: "y" }] };
    (notificationsService.getTokens as jest.Mock).mockResolvedValue(response);

    const { result } = renderWithClient(() => useNotificationTokens());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tokens).toEqual(response.data);
  });

  it("registers a token and invalidates the tokens query on success", async () => {
    (notificationsService.getTokens as jest.Mock).mockResolvedValue({ success: true, data: [] });
    (notificationsService.registerToken as jest.Mock).mockResolvedValue({
      success: true,
      message: "ok",
    });

    const { result, client } = renderWithClient(() => useNotificationTokens());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.registerToken({ token: "t1", platform: "ios" });
    });

    await waitFor(() =>
      expect(notificationsService.registerToken).toHaveBeenCalledWith({
        token: "t1",
        platform: "ios",
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.tokens() });
  });
});

describe("useNotificationSettings", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the new settings on update", async () => {
    (notificationsService.updateSettings as jest.Mock).mockResolvedValue({
      success: true,
      message: "ok",
    });

    const { result } = renderWithClient(() => useNotificationSettings());

    act(() => {
      result.current.updateSettings({ enabled: true });
    });

    await waitFor(() =>
      expect(notificationsService.updateSettings).toHaveBeenCalledWith({ enabled: true }),
    );
  });
});

describe("useNotificationsList", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses QueryKeys.notifications.list(filter) as the real runtime query key", async () => {
    const response = { success: true, data: [] };
    (notificationsService.getNotifications as jest.Mock).mockResolvedValue(response);
    const filter = { status: "unread" as const };

    const { result, client } = renderWithClient(() => useNotificationsList(filter));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const queries = client.getQueryCache().getAll();
    expect(queries[0].queryKey).toEqual(QueryKeys.notifications.list(filter));
  });
});

describe("useUnreadCount", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns the unread count the service resolves", async () => {
    (notificationsService.getUnreadCount as jest.Mock).mockResolvedValue({
      success: true,
      count: 4,
    });

    const { result } = renderWithClient(() => useUnreadCount());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true, count: 4 });
  });
});

describe("useMarkAsRead", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with notificationId and read, then invalidates the base key", async () => {
    (notificationsService.markAsRead as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const { result, client } = renderWithClient(() => useMarkAsRead());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate({ notificationId: "n1", read: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.markAsRead).toHaveBeenCalledWith("n1", true);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.base });
  });
});

describe("useMarkAsReceived", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls the service with the notificationId and invalidates the base key", async () => {
    (notificationsService.markAsReceived as jest.Mock).mockResolvedValue({
      success: true,
      data: {},
    });

    const { result, client } = renderWithClient(() => useMarkAsReceived());
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => {
      result.current.mutate("n1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(notificationsService.markAsReceived).toHaveBeenCalledWith("n1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QueryKeys.notifications.base });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/hooks/useNotifications.test.tsx
```

Expected: FAIL — `Cannot find module '@/hooks/useNotifications'`.

- [ ] **Step 3: Implement `src/hooks/useNotifications.ts`**

```typescript
import {
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
  UseQueryResult,
} from "@tanstack/react-query";

import notificationsService from "@/api/services/notificationsService";
import QueryKeys from "@/api/queryKeys";
import {
  FCMTokenRequest,
  FCMTokenResponse,
  NotificationSettingsRequest,
  NotificationSettingsResponse,
  GetTokensResponse,
  NotificationListResponse,
  NotificationFilter,
  UnreadCountResponse,
  MarkAsReadResponse,
  MarkAllReadResponse,
  DeleteNotificationResponse,
} from "@/api/types/notifications";

export function useNotificationTokens(): {
  tokens: GetTokensResponse["data"];
  isLoading: boolean;
  registerToken: UseMutationResult<FCMTokenResponse, Error, FCMTokenRequest>["mutate"];
  removeToken: UseMutationResult<FCMTokenResponse, Error, string>["mutate"];
} {
  const queryClient = useQueryClient();

  const tokensQuery = useQuery({
    queryKey: QueryKeys.notifications.tokens(),
    queryFn: () => notificationsService.getTokens(),
  });

  const registerTokenMutation = useMutation({
    mutationFn: (tokenData: FCMTokenRequest) => notificationsService.registerToken(tokenData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.tokens() });
    },
  });

  const removeTokenMutation = useMutation({
    mutationFn: (token: string) => notificationsService.removeToken(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.tokens() });
    },
  });

  return {
    tokens: tokensQuery.data?.data ?? [],
    isLoading: tokensQuery.isLoading,
    registerToken: registerTokenMutation.mutate,
    removeToken: removeTokenMutation.mutate,
  };
}

export function useNotificationSettings(): {
  updateSettings: UseMutationResult<
    NotificationSettingsResponse,
    Error,
    NotificationSettingsRequest
  >["mutate"];
} {
  const mutation = useMutation({
    mutationFn: (settings: NotificationSettingsRequest) =>
      notificationsService.updateSettings(settings),
  });

  return { updateSettings: mutation.mutate };
}

export function useNotificationsList(
  filter?: NotificationFilter,
): UseQueryResult<NotificationListResponse, Error> {
  return useQuery({
    queryKey: QueryKeys.notifications.list(filter),
    queryFn: () => notificationsService.getNotifications(filter),
  });
}

export function useUnreadCount(): UseQueryResult<UnreadCountResponse, Error> {
  return useQuery({
    queryKey: QueryKeys.notifications.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useMarkAsRead(): UseMutationResult<
  MarkAsReadResponse,
  Error,
  { notificationId: string; read?: boolean }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ notificationId, read }: { notificationId: string; read?: boolean }) =>
      notificationsService.markAsRead(notificationId, read),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}

export function useMarkAllAsRead(): UseMutationResult<MarkAllReadResponse, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}

export function useDeleteNotification(): UseMutationResult<
  DeleteNotificationResponse,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}

export function useMarkAsReceived(): UseMutationResult<MarkAsReadResponse, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsReceived(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.notifications.base });
    },
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/hooks/useNotifications.test.tsx
```

Expected: PASS, all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotifications.ts src/__tests__/hooks/useNotifications.test.tsx
git commit -m "$(cat <<'EOF'
feat: add useNotifications token/settings/inbox hooks

Merges source's useNotifications.ts + useNotificationCenter.ts into
one file, matching this repo's existing service+hook pattern.
EOF
)"
```

---

## Task 7: `usePushNotifications.ts`

**Files:**

- Create: `src/hooks/usePushNotifications.ts`
- Test: `src/__tests__/hooks/usePushNotifications.test.tsx`

**Interfaces:**

- Consumes: `checkPermissions`, `requestPermissions`, `getToken`, `onTokenRefreshed` from `@/services/firebase-messaging.service` (Task 4); `secureStorage` from `@/services/secureStorage`; `useNotificationTokens`, `useNotificationSettings` from `./useNotifications` (Task 6); `PushNotificationSettings`, `NotificationPermissionStatus` from `@/api/types/notifications` (Task 2).
- Produces: `{ isInitialized, fcmToken, permissionStatus, settings, loading, error, initialize, requestPermissions, refreshToken, updateSettings }`. Task 10 (`AppInitializationGate`) consumes `initialize`, `isInitialized`.

Source persists `pushNotificationSettings` to `localStorage`; this port uses `secureStorage` (already a Phase 1 dependency) under the key `push_notification_settings`, per the design's "Settings persistence" decision.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/usePushNotifications.test.tsx`:

```typescript
import { renderHook, waitFor, act } from "@testing-library/react-native";
import { Platform } from "react-native";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import * as firebaseMessagingService from "@/services/firebase-messaging.service";
import { secureStorage } from "@/services/secureStorage";
import { useNotificationTokens, useNotificationSettings } from "@/hooks/useNotifications";

jest.mock("@/services/firebase-messaging.service", () => ({
  checkPermissions: jest.fn(),
  requestPermissions: jest.fn(),
  getToken: jest.fn(),
  onTokenRefreshed: jest.fn(() => jest.fn()),
}));

jest.mock("@/services/secureStorage", () => ({
  secureStorage: { getItem: jest.fn(), setItem: jest.fn() },
}));

jest.mock("@/hooks/useNotifications", () => ({
  useNotificationTokens: jest.fn(),
  useNotificationSettings: jest.fn(),
}));

describe("usePushNotifications", () => {
  const registerToken = jest.fn();
  const updateApiSettings = jest.fn();

  beforeEach(() => {
    (useNotificationTokens as jest.Mock).mockReturnValue({ registerToken });
    (useNotificationSettings as jest.Mock).mockReturnValue({ updateSettings: updateApiSettings });
    (secureStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("requests permission, fetches a token, and registers it when permission was not yet determined", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockResolvedValue({
      granted: false,
      denied: false,
      prompt: true,
    });
    (firebaseMessagingService.requestPermissions as jest.Mock).mockResolvedValue({
      granted: true,
      denied: false,
      prompt: false,
    });
    (firebaseMessagingService.getToken as jest.Mock).mockResolvedValue("token-1");

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });

    expect(firebaseMessagingService.requestPermissions).toHaveBeenCalled();
    expect(result.current.fcmToken).toBe("token-1");
    expect(result.current.isInitialized).toBe(true);
    expect(registerToken).toHaveBeenCalledWith({ token: "token-1", platform: Platform.OS });
  });

  it("does not request a token when permission is denied", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockResolvedValue({
      granted: false,
      denied: true,
      prompt: false,
    });

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });

    expect(firebaseMessagingService.getToken).not.toHaveBeenCalled();
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.fcmToken).toBeNull();
  });

  it("sets a Dutch error and stays uninitialized when the service throws", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });

    expect(result.current.error).toBe("Kon push notificaties niet initialiseren");
    expect(result.current.isInitialized).toBe(false);
  });

  it("does not re-initialize on a second call", async () => {
    (firebaseMessagingService.checkPermissions as jest.Mock).mockResolvedValue({
      granted: true,
      denied: false,
      prompt: false,
    });
    (firebaseMessagingService.getToken as jest.Mock).mockResolvedValue("token-1");

    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.initialize();
    });
    await act(async () => {
      await result.current.initialize();
    });

    expect(firebaseMessagingService.getToken).toHaveBeenCalledTimes(1);
  });

  it("re-registers the token when firebase-messaging.service reports a refresh", () => {
    let refreshHandler!: (token: string) => void;
    (firebaseMessagingService.onTokenRefreshed as jest.Mock).mockImplementation((handler) => {
      refreshHandler = handler;
      return jest.fn();
    });

    renderHook(() => usePushNotifications());

    act(() => {
      refreshHandler("refreshed-token");
    });

    expect(registerToken).toHaveBeenCalledWith({
      token: "refreshed-token",
      platform: Platform.OS,
    });
  });

  it("persists settings to secureStorage and syncs them to the backend", async () => {
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.updateSettings({ enabled: true });
    });

    expect(secureStorage.setItem).toHaveBeenCalledWith(
      "push_notification_settings",
      JSON.stringify({ enabled: true }),
    );
    expect(updateApiSettings).toHaveBeenCalledWith({ enabled: true });
  });

  it("loads persisted settings from secureStorage on mount", async () => {
    (secureStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ enabled: true }));

    const { result } = renderHook(() => usePushNotifications());

    await waitFor(() => expect(result.current.settings).toEqual({ enabled: true }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/hooks/usePushNotifications.test.tsx
```

Expected: FAIL — `Cannot find module '@/hooks/usePushNotifications'`.

- [ ] **Step 3: Implement `src/hooks/usePushNotifications.ts`**

```typescript
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import {
  checkPermissions,
  requestPermissions as requestFCMPermissions,
  getToken,
  onTokenRefreshed,
} from "@/services/firebase-messaging.service";
import { secureStorage } from "@/services/secureStorage";
import { useNotificationTokens, useNotificationSettings } from "./useNotifications";
import type {
  NotificationPermissionStatus,
  PushNotificationSettings,
} from "@/api/types/notifications";

const PUSH_SETTINGS_KEY = "push_notification_settings";

const DEFAULT_SETTINGS: PushNotificationSettings = { enabled: false };

export function usePushNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    denied: false,
    prompt: true,
  });
  const [settings, setSettings] = useState<PushNotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { registerToken } = useNotificationTokens();
  const { updateSettings: updateApiSettings } = useNotificationSettings();

  useEffect(() => {
    secureStorage.getItem(PUSH_SETTINGS_KEY).then((stored) => {
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    });
  }, []);

  const registerCurrentPlatformToken = useCallback(
    (token: string) => {
      registerToken({ token, platform: Platform.OS as "ios" | "android" });
    },
    [registerToken],
  );

  const initialize = useCallback(async () => {
    if (isInitialized) return;

    try {
      setLoading(true);
      setError(null);

      let status = await checkPermissions();
      if (status.prompt) {
        status = await requestFCMPermissions();
      }
      setPermissionStatus(status);

      if (!status.granted) {
        setIsInitialized(true);
        return;
      }

      const token = await getToken();
      setFcmToken(token);
      setIsInitialized(true);
      registerCurrentPlatformToken(token);
    } catch {
      setError("Kon push notificaties niet initialiseren");
    } finally {
      setLoading(false);
    }
  }, [isInitialized, registerCurrentPlatformToken]);

  useEffect(() => {
    return onTokenRefreshed((token) => {
      setFcmToken(token);
      registerCurrentPlatformToken(token);
    });
  }, [registerCurrentPlatformToken]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const status = await requestFCMPermissions();
      setPermissionStatus(status);
      return status.granted;
    } catch {
      setError("Kon notificatie-permissies niet aanvragen");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      setFcmToken(token);
      registerCurrentPlatformToken(token);
      return token;
    } catch {
      setError("Kon FCM token niet vernieuwen");
      return null;
    } finally {
      setLoading(false);
    }
  }, [registerCurrentPlatformToken]);

  const updateSettings = useCallback(
    async (newSettings: PushNotificationSettings) => {
      setSettings(newSettings);
      await secureStorage.setItem(PUSH_SETTINGS_KEY, JSON.stringify(newSettings));
      updateApiSettings({ enabled: newSettings.enabled });
    },
    [updateApiSettings],
  );

  return {
    isInitialized,
    fcmToken,
    permissionStatus,
    settings,
    loading,
    error,
    initialize,
    requestPermissions,
    refreshToken,
    updateSettings,
  };
}

export default usePushNotifications;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/hooks/usePushNotifications.test.tsx
```

Expected: PASS, all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePushNotifications.ts src/__tests__/hooks/usePushNotifications.test.tsx
git commit -m "$(cat <<'EOF'
feat: add usePushNotifications

Owns initialization state, permission status, and settings
(persisted to expo-secure-store instead of source's localStorage).
Re-registers the token on both initial fetch and onTokenRefresh.
EOF
)"
```

---

## Task 8: `useBadge.ts`

**Files:**

- Create: `src/hooks/useBadge.ts`
- Test: `src/__tests__/hooks/useBadge.test.tsx`

**Interfaces:**

- Consumes: `setBadgeCount`, `clearBadge` from `@/services/badge.service` (Task 5); `useUnreadCount` from `./useNotifications` (Task 6).
- Produces: `{ setBadge, clearBadge }`. Task 10 (`AppInitializationGate`) mounts this hook unconditionally (for its side effect, like source's `useAppInitialization`) without using its return value.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/useBadge.test.tsx`:

```typescript
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useBadge } from "@/hooks/useBadge";
import { setBadgeCount } from "@/services/badge.service";
import { useUnreadCount } from "@/hooks/useNotifications";

jest.mock("@/services/badge.service", () => ({
  setBadgeCount: jest.fn(),
  clearBadge: jest.fn(),
}));

jest.mock("@/hooks/useNotifications", () => ({
  useUnreadCount: jest.fn(),
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(callback, { wrapper });
}

describe("useBadge", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("syncs the OS badge count whenever the unread count changes", async () => {
    (useUnreadCount as jest.Mock).mockReturnValue({
      data: { success: true, count: 4 },
    });

    renderWithClient(() => useBadge());

    await waitFor(() => expect(setBadgeCount).toHaveBeenCalledWith(4));
  });

  it("does not sync the badge while the unread count hasn't loaded yet", () => {
    (useUnreadCount as jest.Mock).mockReturnValue({ data: undefined });

    renderWithClient(() => useBadge());

    expect(setBadgeCount).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/hooks/useBadge.test.tsx
```

Expected: FAIL — `Cannot find module '@/hooks/useBadge'`.

- [ ] **Step 3: Implement `src/hooks/useBadge.ts`**

```typescript
import { useCallback, useEffect } from "react";

import { setBadgeCount, clearBadge as clearBadgeCount } from "@/services/badge.service";
import { useUnreadCount } from "./useNotifications";

export function useBadge() {
  const { data } = useUnreadCount();

  useEffect(() => {
    if (data) {
      setBadgeCount(data.count);
    }
  }, [data]);

  const setBadge = useCallback(async (count: number) => {
    await setBadgeCount(count);
  }, []);

  const clearBadge = useCallback(async () => {
    await clearBadgeCount();
  }, []);

  return { setBadge, clearBadge };
}

export default useBadge;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/hooks/useBadge.test.tsx
```

Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBadge.ts src/__tests__/hooks/useBadge.test.tsx
git commit -m "$(cat <<'EOF'
feat: add useBadge

Syncs the OS badge from useUnreadCount() on every change - this is
what actually keeps the badge accurate, not manual increment/
decrement calls (dropped per this phase's scope decision).
EOF
)"
```

---

## Task 9: `useNotificationReceiver.ts`

**Files:**

- Create: `src/hooks/useNotificationReceiver.ts`
- Test: `src/__tests__/hooks/useNotificationReceiver.test.tsx`

**Interfaces:**

- Consumes: `onForegroundMessage`, `onNotificationTapped`, `getInitialNotificationTap` from `@/services/firebase-messaging.service` (Task 4); `useMarkAsReceived`, `useMarkAsRead` from `./useNotifications` (Task 6).
- Produces: no return value (`void`) — a pure side-effect hook. Task 10 (`AppInitializationGate`) mounts it unconditionally.

This hook replaces source's `registerHandler`/`registerActionHandler`/`clearHandlers` pattern (which existed only because `usePushNotifications` used to own a manual handler registry — dropped per this plan's Global Constraints) with direct subscription to `firebase-messaging.service`'s listener exports.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/hooks/useNotificationReceiver.test.tsx`:

```typescript
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useNotificationReceiver } from "@/hooks/useNotificationReceiver";
import {
  onForegroundMessage,
  onNotificationTapped,
  getInitialNotificationTap,
} from "@/services/firebase-messaging.service";
import { useMarkAsReceived, useMarkAsRead } from "@/hooks/useNotifications";

jest.mock("@/services/firebase-messaging.service", () => ({
  onForegroundMessage: jest.fn(() => jest.fn()),
  onNotificationTapped: jest.fn(() => jest.fn()),
  getInitialNotificationTap: jest.fn(),
}));

jest.mock("@/hooks/useNotifications", () => ({
  useMarkAsReceived: jest.fn(),
  useMarkAsRead: jest.fn(),
}));

function renderWithClient<T>(callback: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(callback, { wrapper });
}

describe("useNotificationReceiver", () => {
  const markAsReceived = jest.fn();
  const markAsRead = jest.fn();

  beforeEach(() => {
    (useMarkAsReceived as jest.Mock).mockReturnValue({ mutate: markAsReceived });
    (useMarkAsRead as jest.Mock).mockReturnValue({ mutate: markAsRead });
    (getInitialNotificationTap as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("marks a notification as received when a foreground message arrives", () => {
    let receivedHandler!: (payload: { notificationId?: string }) => void;
    (onForegroundMessage as jest.Mock).mockImplementation((handler) => {
      receivedHandler = handler;
      return jest.fn();
    });

    renderWithClient(() => useNotificationReceiver());
    receivedHandler({ notificationId: "n1" });

    expect(markAsReceived).toHaveBeenCalledWith("n1");
  });

  it("marks a notification as read when it is tapped", () => {
    let tapHandler!: (payload: { notificationId?: string }) => void;
    (onNotificationTapped as jest.Mock).mockImplementation((handler) => {
      tapHandler = handler;
      return jest.fn();
    });

    renderWithClient(() => useNotificationReceiver());
    tapHandler({ notificationId: "n2" });

    expect(markAsRead).toHaveBeenCalledWith({ notificationId: "n2", read: true });
  });

  it("marks a notification as read for a cold-start tap from a quit state", async () => {
    (getInitialNotificationTap as jest.Mock).mockResolvedValue({
      id: "m3",
      title: "Quit-start",
      body: "Tap",
      notificationId: "n3",
    });

    renderWithClient(() => useNotificationReceiver());

    await waitFor(() =>
      expect(markAsRead).toHaveBeenCalledWith({ notificationId: "n3", read: true }),
    );
  });

  it("unsubscribes both listeners on unmount", () => {
    const unsubscribeMessage = jest.fn();
    const unsubscribeTap = jest.fn();
    (onForegroundMessage as jest.Mock).mockReturnValue(unsubscribeMessage);
    (onNotificationTapped as jest.Mock).mockReturnValue(unsubscribeTap);

    const { unmount } = renderWithClient(() => useNotificationReceiver());
    unmount();

    expect(unsubscribeMessage).toHaveBeenCalled();
    expect(unsubscribeTap).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx jest src/__tests__/hooks/useNotificationReceiver.test.tsx
```

Expected: FAIL — `Cannot find module '@/hooks/useNotificationReceiver'`.

- [ ] **Step 3: Implement `src/hooks/useNotificationReceiver.ts`**

```typescript
import { useEffect } from "react";

import {
  onForegroundMessage,
  onNotificationTapped,
  getInitialNotificationTap,
} from "@/services/firebase-messaging.service";
import { useMarkAsReceived, useMarkAsRead } from "./useNotifications";
import type { NotificationPayload } from "@/api/types/notifications";

export function useNotificationReceiver(): void {
  const { mutate: markAsReceived } = useMarkAsReceived();
  const { mutate: markAsRead } = useMarkAsRead();

  useEffect(() => {
    const handleReceived = (payload: NotificationPayload) => {
      if (payload.notificationId) {
        markAsReceived(payload.notificationId);
      }
    };

    const handleTapped = (payload: NotificationPayload) => {
      if (payload.notificationId) {
        markAsRead({ notificationId: payload.notificationId, read: true });
      }
    };

    const unsubscribeMessage = onForegroundMessage(handleReceived);
    const unsubscribeTap = onNotificationTapped(handleTapped);

    getInitialNotificationTap().then((payload) => {
      if (payload) {
        handleTapped(payload);
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeTap();
    };
  }, [markAsReceived, markAsRead]);
}

export default useNotificationReceiver;
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx jest src/__tests__/hooks/useNotificationReceiver.test.tsx
```

Expected: PASS, all four tests green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotificationReceiver.ts src/__tests__/hooks/useNotificationReceiver.test.tsx
git commit -m "$(cat <<'EOF'
feat: add useNotificationReceiver

Marks notifications received/read on foreground message, background
tap, and cold-start tap, by subscribing directly to
firebase-messaging.service's listener exports.
EOF
)"
```

---

## Task 10: Wire initialization into `src/app/_layout.tsx`

**Files:**

- Modify: `src/app/_layout.tsx`

**Interfaces:**

- Consumes: `usePushNotifications` (Task 7), `useBadge` (Task 8), `useNotificationReceiver` (Task 9), `useAuth` from `@/hooks/useAuth`.
- Produces: nothing importable — this is the root composition that actually activates push notifications for an authenticated session.

No new test file. `SessionGate` (the existing analogous gate in this same file, wrapping `useSessionManager`) has no direct test either — only the hook it calls (`useSessionManager.test.tsx`) is tested, and that precedent is followed here: `AppInitializationGate`'s only logic is a three-line `useEffect` composing three already-independently-tested hooks (Tasks 7-9), so it is verified by those tests plus this task's manual real-device check (Task 11), not a new component test.

- [ ] **Step 1: Read the current file**

`src/app/_layout.tsx` currently reads:

```typescript
import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { useSessionManager } from "@/hooks/useSessionManager";

function SessionGate({ children }: { children: ReactNode }) {
  useSessionManager();
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="reset" />
            <Stack.Screen name="password-reset" />
            <Stack.Screen name="(drawer)" />
          </Stack>
        </SessionGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Add `AppInitializationGate` and mount it inside `SessionGate`**

Replace the full file with:

```typescript
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { useSessionManager } from "@/hooks/useSessionManager";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useBadge } from "@/hooks/useBadge";
import { useNotificationReceiver } from "@/hooks/useNotificationReceiver";

function SessionGate({ children }: { children: ReactNode }) {
  useSessionManager();
  return <>{children}</>;
}

function AppInitializationGate({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const authed = isAuthenticated();
  const { initialize, isInitialized } = usePushNotifications();

  useBadge();
  useNotificationReceiver();

  useEffect(() => {
    if (!authed || isInitialized) {
      return;
    }
    initialize();
  }, [authed, isInitialized, initialize]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SessionGate>
          <AppInitializationGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="reset" />
              <Stack.Screen name="password-reset" />
              <Stack.Screen name="(drawer)" />
            </Stack>
          </AppInitializationGate>
        </SessionGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

`useBadge()` and `useNotificationReceiver()` mount unconditionally (matching source's `useAppInitialization`, where they run regardless of auth state) — both are inert until there is a notification to react to, and gating them on `authed` would just add a second auth check that duplicates the one already inside the `useEffect` below, for no behavioral difference.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
npm test
```

Expected: both clean/green — every consumed hook (Tasks 6-9) already has its own passing test suite; this step only confirms the new composition type-checks and doesn't break anything already covered (e.g. `login.test.tsx`, which renders through `_layout.tsx`'s provider tree).

- [ ] **Step 4: Commit**

```bash
git add src/app/_layout.tsx
git commit -m "$(cat <<'EOF'
feat: wire push-notification initialization into the root layout

Adds AppInitializationGate alongside the existing SessionGate,
mirroring useAppInitialization's source behavior: push init is
gated on isAuthenticated, badge sync and the notification receiver
mount unconditionally.
EOF
)"
```

---

## Task 11: Real-device validation (manual, closes out the phase)

**Files:** none — this task produces no code. It is the design's required closing gate: "Real token delivery, foreground display, and badge behavior can't be verified in Jest... before this phase is marked done."

- [ ] **Step 1: Rebuild the dev client with the final code**

```bash
npx expo prebuild --clean
npm run ios
# or: npm run android
```

- [ ] **Step 2: Walk the checklist on a real device (not only the simulator)**

- [ ] Log in. A native permission prompt for notifications appears.
- [ ] Grant permission. Confirm (via a temporary `console.log` or a debugger breakpoint in `usePushNotifications.initialize`, removed before considering this step done) that `fcmToken` is set and `notificationsService.registerToken` was called.
- [ ] From the Firebase console, send a test push to the registered token while the app is foregrounded. A local notification banner appears (via `expo-notifications`, triggered by `firebase-messaging.service`'s `onForegroundMessage` listener).
- [ ] Send a test push while the app is backgrounded; tap the resulting system notification. The app opens and `useNotificationReceiver`'s tap handler fires (`markAsRead` called — confirm via a network inspector or temporary log).
- [ ] Force-quit the app, then send a test push and tap the system notification to launch the app from a cold start. Confirm the cold-start tap path (`getInitialNotificationTap`) also fires `markAsRead`.
- [ ] Confirm the badge count on the home-screen icon tracks `useUnreadCount()` — increases on a new unread push, decreases/clears after marking notifications read through the API (a manual API call via a REST client is sufficient; there is no UI for this yet).
- [ ] Log out. Confirm the app does **not** attempt to remove the FCM token server-side (per this plan's Global Constraints — the token is deliberately left registered, matching source behavior).
- [ ] Exercise the existing dev-client flows once more (login, biometric, scan, dashboard, expenses) to confirm no regression from the `prebuild` regen or the new native modules.
- [ ] Specifically re-confirm the permission flow still grants a working token — `@react-native-firebase/messaging`'s `requestPermission`/`hasPermission` are deprecated upstream (see Global Constraints); this is the checkpoint that would surface it if the deprecated path silently stopped registering for remote notifications on the installed version.

- [ ] **Step 3: Record the result**

If every box above is checked, this phase is done — no further commit is needed for this task (it's verification, not code). If any box fails, open a follow-up task scoped to that specific failure rather than reopening this plan's already-merged tasks.

