---
name: add-rn-screen
description: Use when adding a new screen in this project — "add a page", "new screen", "new route", "create the X view". Enforces the expo-router file-based routing structure, drawer/tab placement, and the Dutch-first, theme-token styling conventions.
---

# Add a screen

Add a new route file under `src/app/(drawer)/(tabs)/`. See
[docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md). Read an existing
screen first (e.g. `dashboard.tsx`) and copy the pattern.

## Checklist

1. Create `src/app/(drawer)/(tabs)/<name>.tsx`. The filename becomes the
   route; every file in this folder gets a visible tab button by default.
2. If it should **not** have a visible tab button (drawer-only access,
   like Belasting/Notificaties/Profiel/Instellingen), add a
   `<Tabs.Screen name="<name>" options={{ href: null }} />` entry in
   `(tabs)/_layout.tsx` instead of a tab-bar entry.
3. If it needs a drawer menu entry, add it to `MENU_ITEMS` in
   `(drawer)/_layout.tsx` with a Dutch label and a matching
   `@expo/vector-icons/Ionicons` name.
4. Style with `StyleSheet.create()` plus `Colors`/`Spacing` from
   `@/constants/theme` and `useColorScheme()` branching for light/dark.
   No inline color literals.
5. Keep business logic in a hook (see `add-api-hook`); the screen renders
   state and loading/error UI.
6. User-facing text is **Dutch**.
7. Add a React Native Testing Library test under `src/__tests__/` using
   `renderRouter` from `expo-router/testing-library` (see
   `dashboard.test.tsx` for the pattern); run `npm test`.
