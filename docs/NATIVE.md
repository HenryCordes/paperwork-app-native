# Native Functionality (Expo)

> Read this when using a device capability: camera, document scanner, OCR,
> secure storage, biometric auth, push notifications, badges, filesystem.

## Rules

- Prefer first-party **Expo SDK modules** (`expo-camera`,
  `expo-local-authentication`, `expo-secure-store`, `expo-notifications`,
  `expo-file-system`, `expo-haptics`) over community native modules.
  Community native modules (`react-native-document-scanner-plugin`,
  `@react-native-ml-kit/text-recognition`) are only for capabilities Expo
  doesn't cover — see the migration design doc for which ones and why.
- Guard native calls with `Platform.OS` checks where a feature isn't
  universally available, and provide a **web fallback** where this app
  needs to keep running on web (`react-native-web`).
- Handle **permissions** explicitly via each module's own permission API
  (e.g. `Camera.requestCameraPermissionsAsync()`): check first, request
  when needed, degrade gracefully on denial.
- Wrap each native capability behind a typed **hook**
  (`src/hooks/use<Feature>.ts`), so platform branching and permission
  handling live in one place — this app's equivalent of paperwork-app's
  `*.service.ts` singleton pattern, adapted to the hook-first convention
  React Native code generally favors over class-based services.
- Requires a native dev client (`npx expo prebuild` + `expo run:ios` /
  `expo run:android`) for any module that isn't Expo-Go-compatible — most
  of the capabilities above qualify. Test on a real device regularly, not
  only the simulator.

## Localization

The app is for a **Dutch** audience primarily — user-facing text is in
Dutch, including error and permission-rationale messages.

The `add-native-feature` skill scaffolds a new capability wrapper.
