# Architecture

## Navigation

File-based routing via `expo-router`, rooted at `src/app/`.

- `src/app/_layout.tsx` — root `Stack`. Phase 1 adds the login screen and
  authenticated/unauthenticated redirect logic here.
- `src/app/(drawer)/_layout.tsx` — `Drawer` navigator with a custom
  `drawerContent` mirroring paperwork-app's `SideMenu`: header, a Profiel
  row, the menu items below, then Uitloggen.
- `src/app/(drawer)/(tabs)/_layout.tsx` — `Tabs` navigator nested inside
  the drawer. Dashboard, Kosten, Facturen, Emails, and Contacten have
  visible tab buttons. Belasting, Notificaties, Profiel, and Instellingen
  live in the same `(tabs)` group with `options={{ href: null }}` so the
  tab bar stays visible on those screens too — matching paperwork-app,
  where every authenticated route renders the same `IonTabBar` regardless
  of whether it has its own tab button.
- Instellingen has no drawer menu entry, matching paperwork-app's current
  state (the route exists; it's commented out of `SideMenu`, not deleted).

## Styling

`src/constants/theme.ts` exports `Colors` (light/dark) and `Spacing`.
The color values are paperwork-app's actual rendered colors — Ionic's
stock default palette, since that app has no CSS-variable overrides —
not invented for this app. Dark mode follows the OS color scheme
automatically via `useColorScheme()`, matching paperwork-app's
`dark.system.css` import (no manual toggle).

No third-party UI kit. Screens style with `StyleSheet.create()` plus
`theme.ts` tokens directly.

## Adding a screen

See the `add-rn-screen` skill.
