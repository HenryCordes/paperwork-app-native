---
name: add-native-feature
description: Use when integrating a device capability in this project — "add native X", "use the camera", "secure storage", "biometric auth", "push notification", "badge", "document scanner". Enforces a typed hook wrapper with platform guards, a web fallback where relevant, and explicit permission handling.
---

# Add a native feature

Wrap an Expo SDK module (or, when Expo has no first-party equivalent, a
community native module) behind a typed hook so platform branching and
permissions live in one place. See [docs/NATIVE.md](../../../docs/NATIVE.md).

## Checklist

1. Prefer an Expo SDK module (`expo-camera`, `expo-local-authentication`,
   `expo-secure-store`, `expo-notifications`, `expo-file-system`,
   `expo-haptics`) over a community native module. If the capability needs
   one anyway (e.g. the document scanner — no Expo equivalent exists),
   check the migration design doc first for the specific package already
   chosen, and `npx expo prebuild` after installing.
2. Create `src/hooks/use<Feature>.ts` exposing typed methods/state. This is
   this app's equivalent of paperwork-app's `*.service.ts` singleton
   pattern — adapted to a hook, since that's the convention React Native
   code generally favors here.
3. Guard with `Platform.OS` where the capability isn't universally
   available, and provide a **web fallback** if this app needs to keep
   running on web (`react-native-web`) for that screen.
4. Handle **permissions** explicitly via the module's own permission API:
   check, request when needed, degrade gracefully on denial.
5. Keep user-facing text in **Dutch**.
6. Add a unit test that mocks the native module and verifies the
   permission-denied / web-fallback branch; run `npm test`.
