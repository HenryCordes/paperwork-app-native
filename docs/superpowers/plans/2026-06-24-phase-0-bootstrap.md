# Phase 0 Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap `paperwork-app-native` — an Expo/React Native skeleton with the drawer+tabs navigation shape, theme tokens, and testing/Claude tooling that every later migration phase builds on.

**Architecture:** A managed Expo app using `expo-router` for file-based routing (a `Drawer` navigator wrapping a nested `Tabs` navigator), `StyleSheet` + a typed `theme.ts` token module for styling (no third-party UI kit), and Jest + React Native Testing Library for tests. No business logic, no real screens, no native plugin integration yet — those are later phases. This phase only has to produce a navigable, themed, tested skeleton.

**Tech Stack:** Expo SDK ~56, React Native 0.85.x, React 19.2.x, TypeScript, `expo-router` ~56.2.x — versions matched to what the throwaway feasibility spike (`/Users/henry/Projects/devartist/paperwork-rn-spike/`) already validated. `jest-expo` + `@testing-library/react-native` for tests. npm as package manager.

## Global Constraints

- **Repo:** `github.com/HenryCordes/paperwork-app-native`, already created (private) and cloned to `/Users/henry/Projects/devartist/paperwork-app-native/`. Standalone repo — no shared monorepo package with `paperwork-app`.
- **Never commit to `main`.** Branch first (Task 1, Step 1). Conventional Commits, imperative subject, why-not-what body.
- **Never push or open a PR without explicit user authorization**, even though earlier steps in this migration were pre-authorized — confirm before Task 5's push/PR step specifically.
- **New Architecture is not a choice.** RN 0.85.x only supports it; don't add config trying to opt out.
- **No third-party UI kit** (no React Native Paper, Tamagui, NativeWind). `StyleSheet` + `src/constants/theme.ts` only.
- **Navigation uses the stable `Tabs`/`Drawer` from `expo-router`**, not `expo-router/unstable-native-tabs` (the spike used the unstable one; production doesn't).
- **Dark mode follows the OS color scheme automatically** via `useColorScheme()` — no manual toggle, matching `paperwork-app`'s `dark.system.css` behavior.
- **APIs may have drifted** since this plan was written (today). Where a step calls out a specific verification checkpoint, stop and check the current docs/README before treating a failure as a real bug rather than an API mismatch.

## File structure (end state after this phase)

```
paperwork-app-native/
  src/
    app/                              # expo-router file-based routes
      _layout.tsx
      (drawer)/
        _layout.tsx                   # Drawer navigator + custom drawer content
        (tabs)/
          _layout.tsx                 # Tabs navigator, nested inside the drawer
          dashboard.tsx
          expenses.tsx
          invoices.tsx
          emails.tsx
          contacts.tsx
          taxes.tsx                   # in (tabs) but hidden from the tab bar (href: null)
          notifications.tsx           # same
          profile.tsx                 # same
          settings.tsx                # same, and no drawer menu entry (matches paperwork-app's current commented-out state)
    components/
      PlaceholderScreen.tsx           # shared by every placeholder route above
    constants/
      theme.ts                       # Colors (light/dark), Spacing
    __tests__/
      theme.test.ts
      dashboard.test.tsx
  docs/
    ARCHITECTURE.md
  .claude/
    skills/
      add-rn-screen/SKILL.md
      add-api-hook/SKILL.md
    settings.json
  AGENTS.md
  CLAUDE.md
```

(`react-native-document-scanner-plugin`, ML Kit OCR, `@10play/tentap-editor`, `react-native-gifted-charts`, and the `add-native-feature`/`add-receipt-rule` skills/`receipt-parsing-reviewer` subagent are explicitly **not** part of this phase — they get ported when the phase that needs them starts.)

---

## Task 1: Scaffold the Expo app and verify the toolchain

**Files:**
- Create: entire Expo project skeleton (`package.json`, `app.json`, `tsconfig.json`, `src/app/index.tsx`, etc.)

- [ ] **Step 1: Create the working branch**

```bash
cd /Users/henry/Projects/devartist/paperwork-app-native
git checkout -b phase-0-bootstrap
```

Expected: `Switched to a new branch 'phase-0-bootstrap'`.

- [ ] **Step 2: Scaffold the app**

```bash
npx create-expo-app@latest .
```

Expected: a TypeScript Expo project is created in the current directory. **Verification checkpoint:** check whether routes landed at `src/app/` or `app/` (the spike produced `src/app/` today; the default template can change). Every file path in this plan assumes `src/app/` — if you get `app/` instead, use that path throughout the rest of this plan and note the deviation in this task's own commit message (Step 4 below).

- [ ] **Step 3: Generate native projects and verify the app runs**

```bash
npx expo prebuild
npx expo run:ios
```

Expected: Metro starts, the iOS Simulator launches, and the default Expo template welcome screen renders. `ios/` and `android/` are generated but already gitignored by the template's default `.gitignore` (generated, not committed).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold Expo app with expo-router

Starting point for the paperwork-app-native migration (see
paperwork-app's specs/2026-06-24-paperwork-app-native-migration/
design.md for the full migration plan this phase implements).
EOF
)"
```

---

## Task 2: Testing tooling + theme tokens

**Files:**
- Create: `src/constants/theme.ts`
- Create: `src/__tests__/theme.test.ts`
- Modify: `package.json` (add `test` script, `jest` config, new devDependencies)

**Interfaces:**
- Produces: `Colors.light`, `Colors.dark` (each an object with keys `primary`, `secondary`, `tertiary`, `success`, `warning`, `danger`, `background`, `text`, `backgroundElement`, `textSecondary`, all `string` hex values) and `Spacing` (object with keys `half`/`one`/`two`/`three`/`four`/`five`/`six`, `number` values). Every later task that styles a screen imports these from `@/constants/theme`.

- [ ] **Step 1: Install testing dependencies**

```bash
npx expo install jest-expo jest @types/jest --dev
npm install --save-dev @testing-library/react-native
```

- [ ] **Step 2: Configure the test script**

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "preset": "jest-expo"
  }
}
```

**Verification checkpoint:** this is Expo's documented Jest setup (`jest-expo` preset). If `npm test` errors on an unrecognized preset or missing transform, check https://docs.expo.dev/develop/unit-testing/ for the current setup steps before treating it as a real bug.

- [ ] **Step 3: Write the failing test for theme tokens**

Create `src/__tests__/theme.test.ts`:

```ts
import { Colors, Spacing } from "@/constants/theme";

describe("Colors", () => {
  it("defines the same set of keys for light and dark", () => {
    expect(Object.keys(Colors.dark).sort()).toEqual(
      Object.keys(Colors.light).sort()
    );
  });

  it("uses valid 6-digit hex strings for every light-mode token", () => {
    Object.values(Colors.light).forEach((value) => {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it("uses valid 6-digit hex strings for every dark-mode token", () => {
    Object.values(Colors.dark).forEach((value) => {
      expect(value).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe("Spacing", () => {
  it("is a strictly increasing scale", () => {
    const values = Object.values(Spacing);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '@/constants/theme'` (the file doesn't exist yet).

- [ ] **Step 5: Implement the theme tokens**

These color values are not invented — they're `paperwork-app`'s actual rendered colors: Ionic's stock default light/dark palette, read directly from `node_modules/@ionic/core/css/core.css` and `node_modules/@ionic/core/css/palettes/dark.system.css` in that repo (it has zero color-variable overrides in `src/theme/variables.css`, so the stock palette is exactly what renders today). Note Ionic's light/dark semantic colors named "light" and "dark" represent lightest/darkest *surface* roles and invert between modes — not used here to avoid that confusion; this module uses plain `background`/`backgroundElement`/`text`/`textSecondary` names instead.

Create `src/constants/theme.ts`:

```ts
import { Platform } from "react-native";

const light = {
  primary: "#0054e9",
  secondary: "#0163aa",
  tertiary: "#6030ff",
  success: "#2dd55b",
  warning: "#ffc409",
  danger: "#c5000f",
  background: "#ffffff",
  text: "#000000",
  backgroundElement: "#f4f5f8",
  textSecondary: "#636469",
} as const;

const dark = {
  primary: "#4d8dff",
  secondary: "#46b1ff",
  tertiary: "#8482fb",
  success: "#2dd55b",
  warning: "#ffce31",
  danger: "#f24c58",
  // iOS and Android (md) use different dark-mode surfaces in Ionic too —
  // OLED-true-black on iOS, Material's #121212 on Android.
  background: Platform.select({ ios: "#000000", default: "#121212" }),
  text: "#ffffff",
  backgroundElement: Platform.select({ ios: "#1c1c1d", default: "#1e1e1e" }),
  textSecondary: "#989aa2",
} as const;

export const Colors = { light, dark };

export type ThemeColor = keyof typeof light;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS, 4 tests.

- [ ] **Step 7: Commit**

```bash
git add src/constants/theme.ts src/__tests__/theme.test.ts package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add Jest/RNTL tooling and theme tokens

Color values are paperwork-app's actual rendered Ionic default
palette (it has no CSS-variable overrides), not invented — see
node_modules/@ionic/core/css/{core.css,palettes/dark.system.css}
in that repo for the source.
EOF
)"
```

---

## Task 3: Navigation skeleton (drawer + nested tabs)

**Files:**
- Create: `src/components/PlaceholderScreen.tsx`
- Create: `src/app/_layout.tsx`
- Create: `src/app/(drawer)/_layout.tsx`
- Create: `src/app/(drawer)/(tabs)/_layout.tsx`
- Create: `src/app/(drawer)/(tabs)/dashboard.tsx`, `expenses.tsx`, `invoices.tsx`, `emails.tsx`, `contacts.tsx`, `taxes.tsx`, `notifications.tsx`, `profile.tsx`, `settings.tsx`
- Create: `src/__tests__/dashboard.test.tsx`

**Interfaces:**
- Consumes: `Colors`, `Spacing` from `@/constants/theme` (Task 2).
- Produces: a navigable app — `/dashboard`, `/expenses`, `/invoices`, `/emails`, `/contacts` have visible tab buttons; `/taxes`, `/notifications`, `/profile`, `/settings` are reachable via the drawer only, no tab button, but the tab bar still renders on those screens (matching `paperwork-app`'s `privateRoutes.tsx`, where every authenticated route renders the same `IonTabBar`).

This mirrors `paperwork-app`'s actual nav structure (`src/App.tsx`, `src/components/SideMenu/index.tsx`, `src/routes/privateRoutes.tsx`): an `IonSplitPane` + `IonMenu` side menu linking to all 7 sections + Profile + Logout, with a 5-item bottom tab bar (Dashboard, Kosten, Facturen, Emails, Contacten) rendered on every authenticated page including the 4 that have no tab button of their own.

- [ ] **Step 1: Write the failing smoke test**

Create `src/__tests__/dashboard.test.tsx`:

```tsx
import { renderRouter, screen } from "expo-router/testing-library";

it("renders the dashboard placeholder at /dashboard", async () => {
  renderRouter("src/app", { initialUrl: "/dashboard" });
  expect(await screen.findByText(/Dashboard/i)).toBeOnTheScreen();
});
```

**Verification checkpoint:** `expo-router/testing-library`'s `renderRouter` is the currently-documented way to test file-based routes (https://docs.expo.dev/router/reference/testing/). If the import or signature has changed, check that page before adjusting.

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — no route exists at `/dashboard` yet.

- [ ] **Step 3: Create the shared placeholder component**

Create `src/components/PlaceholderScreen.tsx`:

```tsx
import { StyleSheet, Text, View, useColorScheme } from "react-native";

import { Colors, Spacing } from "@/constants/theme";

interface PlaceholderScreenProps {
  title: string;
}

export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Bouwt in een latere fase
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
  },
});
```

- [ ] **Step 4: Create the 9 route files**

Create `src/app/(drawer)/(tabs)/dashboard.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function DashboardScreen() {
  return <PlaceholderScreen title="Dashboard" />;
}
```

Create `src/app/(drawer)/(tabs)/expenses.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function ExpensesScreen() {
  return <PlaceholderScreen title="Kosten" />;
}
```

Create `src/app/(drawer)/(tabs)/invoices.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function InvoicesScreen() {
  return <PlaceholderScreen title="Facturen" />;
}
```

Create `src/app/(drawer)/(tabs)/emails.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function EmailsScreen() {
  return <PlaceholderScreen title="Emails" />;
}
```

Create `src/app/(drawer)/(tabs)/contacts.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function ContactsScreen() {
  return <PlaceholderScreen title="Contacten" />;
}
```

Create `src/app/(drawer)/(tabs)/taxes.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function TaxesScreen() {
  return <PlaceholderScreen title="Belasting" />;
}
```

Create `src/app/(drawer)/(tabs)/notifications.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function NotificationsScreen() {
  return <PlaceholderScreen title="Notificaties" />;
}
```

Create `src/app/(drawer)/(tabs)/profile.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function ProfileScreen() {
  return <PlaceholderScreen title="Profiel" />;
}
```

Create `src/app/(drawer)/(tabs)/settings.tsx`:

```tsx
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default function SettingsScreen() {
  return <PlaceholderScreen title="Instellingen" />;
}
```

- [ ] **Step 5: Create the Tabs layout**

Create `src/app/(drawer)/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useColorScheme } from "react-native";

import { Colors } from "@/constants/theme";

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Kosten",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Facturen",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="emails"
        options={{
          title: "Emails",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: "Contacten",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" color={color} size={size} />
          ),
        }}
      />
      {/* Drawer-only: in the tab group so the tab bar still renders on
          these screens (matching paperwork-app), but hidden from the bar. */}
      <Tabs.Screen name="taxes" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
```

**Verification checkpoint:** `options={{ href: null }}` to hide a tab from the bar while keeping the screen in the navigator is documented Expo Router behavior (https://docs.expo.dev/router/advanced/tabs/) — confirm against current docs if a screen with `href: null` doesn't behave as expected.

- [ ] **Step 6: Create the Drawer layout**

Create `src/app/(drawer)/_layout.tsx`:

```tsx
import { Drawer } from "expo-router/drawer";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Text, View, StyleSheet, useColorScheme } from "react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";

import { Colors, Spacing } from "@/constants/theme";

interface MenuItem {
  label: string;
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const MENU_ITEMS: MenuItem[] = [
  { label: "Dashboard", route: "dashboard", icon: "stats-chart" },
  { label: "Kosten", route: "expenses", icon: "wallet-outline" },
  { label: "Facturen", route: "invoices", icon: "document-text-outline" },
  { label: "Emails", route: "emails", icon: "mail-outline" },
  { label: "Contacten", route: "contacts", icon: "people-outline" },
  { label: "Belasting", route: "taxes", icon: "calculator-outline" },
  { label: "Notificaties", route: "notifications", icon: "notifications-outline" },
];

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.background }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Paperwork</Text>
      </View>

      <DrawerItem
        label="Profiel"
        icon={({ size }) => (
          <Ionicons name="person-circle-outline" size={size} color={colors.text} />
        )}
        labelStyle={{ color: colors.text }}
        onPress={() => props.navigation.navigate("profile")}
      />

      {MENU_ITEMS.map((item) => (
        <DrawerItem
          key={item.route}
          label={item.label}
          icon={({ size }) => (
            <Ionicons name={item.icon} size={size} color={colors.text} />
          )}
          labelStyle={{ color: colors.text }}
          onPress={() => props.navigation.navigate(item.route)}
        />
      ))}

      <DrawerItem
        label="Uitloggen"
        icon={({ size }) => (
          <Ionicons name="log-out-outline" size={size} color={colors.danger} />
        )}
        labelStyle={{ color: colors.danger }}
        // Phase 1 wires this to real auth/logout. Intentionally a no-op
        // placeholder until then.
        onPress={() => {}}
      />
    </DrawerContentScrollView>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: "Paperwork" }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: Spacing.four,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
});
```

**Verification checkpoint:** `expo-router/drawer` wraps `@react-navigation/drawer`. If the import fails, run `npx expo install @react-navigation/drawer react-native-gesture-handler react-native-reanimated` (gesture-handler/reanimated are already in this project from the editor work in a later phase, but may not be installed yet at this point) and check https://docs.expo.dev/router/advanced/drawer/ for the current setup steps.

- [ ] **Step 7: Create the root layout**

Create `src/app/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(drawer)" />
    </Stack>
  );
}
```

(Phase 1 adds the login screen and the authenticated/unauthenticated redirect logic here — `paperwork-app`'s `App.tsx` equivalent. This phase only needs the authenticated shell to be navigable.)

- [ ] **Step 8: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 9: Manually verify in the simulator**

```bash
npx expo run:ios
```

Navigate to each of the 5 tab buttons, open the drawer and navigate to Taxes/Notificaties/Profiel, and toggle the simulator's appearance (Settings > Developer > Dark Appearance, or `Cmd+Shift+A` in the simulator) to confirm both light and dark render with the correct colors from `theme.ts`.

- [ ] **Step 10: Commit**

```bash
git add src/app src/components/PlaceholderScreen.tsx src/__tests__/dashboard.test.tsx package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add drawer + nested tabs navigation skeleton

Mirrors paperwork-app's actual nav shape (IonSplitPane side menu +
a persistent 5-item bottom tab bar shown on every authenticated
page) rather than a plain tab bar — see src/App.tsx, SideMenu, and
privateRoutes.tsx in that repo for the structure this replicates.
EOF
)"
```

---

## Task 4: Claude tooling

**Files:**
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `.claude/skills/add-rn-screen/SKILL.md`
- Create: `.claude/skills/add-api-hook/SKILL.md`
- Create: `.claude/settings.json`

No test for this task — it's documentation/config, not executable behavior. Verification is Step 6 (a human/agent re-reading it for accuracy).

- [ ] **Step 1: Write the documentation index**

Create `docs/ARCHITECTURE.md`:

```markdown
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
```

- [ ] **Step 2: Write AGENTS.md**

Create `AGENTS.md`:

```markdown
# AI Agent Rules

> Read by AI coding assistants (Claude Code, Cursor, Copilot, Windsurf). This is
> the single source of truth for how to work in this project. Tool-specific files
> (`CLAUDE.md`, etc.) redirect here rather than duplicate rules.

## App context

paperwork-app-native is the React Native rewrite of
[paperwork-app](https://github.com/HenryCordes/paperwork-app) (Ionic +
Capacitor) — an expense and document management and bookkeeping app for
owners of small businesses and independent contractors in the
**Netherlands**. User-facing language is **Dutch**.

Full migration context (strategy, phase roadmap, architecture decisions,
the spike findings this app's choices are based on) lives in
`paperwork-app`'s `specs/2026-06-24-paperwork-app-native-migration/design.md`
— read it for *why*, not just *what*.

Features, ported incrementally phase by phase: manage expenses; scan
receipts into an expense; manage and generate invoices (PDF); manage
contacts; email invoices to clients; a dashboard visualizing profit/loss;
export for tax returns.

## Documentation Index

Load the right doc for the task instead of reading everything:

| Topic | File | When to read |
|-------|------|-------------|
| Architecture & structure | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | App structure, routing, folder layout, where a file belongs |

Other topics (state/data layer, frontend component patterns, native
functionality, receipt parsing, testing strategy) get their own doc and
index entry once the phase that introduces them lands — not written
speculatively ahead of real code.

## Tech Stack

- UI: Expo (managed workflow + `prebuild`/dev client), React Native,
  `expo-router` (file-based routing: `Drawer` + nested `Tabs`), React 19,
  TypeScript
- Styling: RN `StyleSheet` + `src/constants/theme.ts` (typed color/spacing
  tokens), no third-party UI kit
- Data: TanStack Query 5 + axios, ported from paperwork-app
- Tests: Jest (`jest-expo` preset) + React Native Testing Library; Detox or
  Maestro for E2E, added when the testing/CI phase starts
- Package manager: **npm**

## Principles (always apply)

- **TypeScript strictness.** Declare types for variables, parameters, and
  return values. Never use `any`; create the necessary types. One export
  per file. Keep functions short and single-purpose; prefer early returns
  over deep nesting.
- **Error handling.** Never throw from screen components — capture in
  try/catch and surface user-facing, **Dutch**, actionable error messages.
  Validate input client-side.
- **Conventions.** Show money in **Dutch format** everywhere (two decimals,
  comma decimal separator, period thousands separator). Use named
  constants, never magic numbers/strings. Reuse existing patterns before
  introducing new ones.
- **Security.** No secrets in client code. Store sensitive data with
  `expo-secure-store`. Request the minimum native permissions and degrade
  gracefully.

## Workflow (spec-driven)

1. Brainstorm -> 2. Spec -> 3. Implementation plan -> 4. Implement.

Each phase gets its own folder under `specs/` holding its `design.md` and
`plan.md`, mirroring `paperwork-app`'s convention.

For agentic execution use the Superpowers skills
(`superpowers:executing-plans`, `superpowers:subagent-driven-development`)
to implement plans task-by-task.

## Commit & PR rules

- Never commit to `main`. Branch first; Conventional Commits, imperative
  subject, why-not-what body.
- Run `npm test` (and lint, once configured) before staging.
- Before a PR: typecheck (`npx tsc --noEmit`), lint, and the test suite all
  pass.
- Never commit or push automatically — only on explicit user authorization.
```

- [ ] **Step 3: Write CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# CLAUDE.md — Project Context for Claude Code

## Source of truth

All AI agent rules, conventions, and standards live in [AGENTS.md](AGENTS.md).
**Read it first** — it covers the app context, tech stack, the always-apply
principles, the documentation index, and the spec-driven workflow. This file
stays thin to avoid duplicating that source of truth.

## Skills

[.claude/skills/](.claude/skills): `add-rn-screen`, `add-api-hook` —
recurring scaffolding tasks with this project's conventions baked in.
More get added as later phases introduce their own recurring patterns
(native feature wrappers, receipt-parsing rules).

## Workflow

Brainstorm -> spec -> implementation plan -> implement, on the
[Superpowers](https://github.com/obra/superpowers) workflow. Specs and
plans live in [specs/](specs).
```

- [ ] **Step 4: Write the add-rn-screen skill**

Create `.claude/skills/add-rn-screen/SKILL.md`:

```markdown
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
```

- [ ] **Step 5: Write the add-api-hook skill**

Create `.claude/skills/add-api-hook/SKILL.md`:

```markdown
---
name: add-api-hook
description: Use when adding data fetching or mutation in this project — "add a hook", "fetch X", "new query", "new mutation", "call the API for Y". Enforces the service + hook pattern, the query-key factory, error/loading states, and cache invalidation.
---

# Add an API hook

Add server-state access through the **service + hook** pattern — ported
from paperwork-app largely unchanged, since TanStack Query + axios is the
same on both. Never call axios from a component.

Until this repo has its own established pair, read paperwork-app's
`src/api/services/expensesService.ts` and `src/hooks/useExpenses.ts` for
the reference pattern.

## Checklist

1. **Types** — add request/response interfaces to `src/api/types/<entity>.ts`
   (no `any`). Shared cross-cutting types (e.g. `ApiError`) go in
   `src/api/types.ts`.
2. **Service** — create `src/api/services/<entity>Service.ts`: a class
   receiving the shared `axiosInstance` via constructor injection,
   exporting a pre-built singleton as the default. Methods wrap axios
   calls in try/catch and throw an `Error` with a Dutch, user-safe
   message. One file per domain entity.
3. **Query keys** — add an entry to `src/api/queryKeys.ts`: a `base`
   tuple plus `list(offset)`/`detail(id)` factories. Reuse existing keys;
   invalidate via the relevant factory rather than inventing a parallel
   scheme.
4. **Hook** — add `src/hooks/use<Entity>.ts`: `useQuery` for reads,
   `useMutation` for writes. On mutation success, invalidate the
   narrowest relevant query key.
5. **Test** — add a unit test under `src/__tests__/` mirroring the source
   path, mocking the service; run `npm test`.

Note: the error-UI surface isn't decided yet for this repo (paperwork-app
uses `IonToast`; this app has no toast/banner component yet). Until a
screen establishes the pattern, surface errors however the calling screen
already does and flag the inconsistency — don't invent a new convention
inside a hook.
```

- [ ] **Step 6: Write the permission allowlist**

Create `.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm test:*)",
      "Bash(npm run lint:*)",
      "Bash(npx tsc:*)",
      "Bash(git status)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git branch:*)"
    ]
  }
}
```

- [ ] **Step 7: Re-read all 6 files for accuracy**

Confirm every file path, route name, and skill name mentioned matches
what Tasks 1-3 actually produced (especially if Task 1's verification
checkpoint found `app/` instead of `src/app/` — fix every reference
above if so).

- [ ] **Step 8: Commit**

```bash
git add AGENTS.md CLAUDE.md docs/ARCHITECTURE.md .claude
git commit -m "$(cat <<'EOF'
docs: add AGENTS.md, ARCHITECTURE.md, and two scaffolding skills

Ports the paperwork-app pattern of a thin CLAUDE.md pointing to a
fuller AGENTS.md, plus skills that encode this repo's conventions
so later screen/hook work doesn't re-derive them from examples
each time. add-native-feature, add-receipt-rule, and the
receipt-parsing-reviewer subagent are intentionally not ported yet
— they belong to the phases that actually introduce those concerns.
EOF
)"
```

---

## Task 5: Final verification and push

**Files:** none

- [ ] **Step 1: Full verification sweep**

```bash
npx tsc --noEmit
npm test
npx expo run:ios
```

Expected: typecheck clean, all tests pass, app launches and the drawer/tabs
navigation from Task 3 still works in both light and dark appearance.

- [ ] **Step 2: Confirm working tree is clean**

```bash
git status
```

Expected: clean working tree on branch `phase-0-bootstrap`.

- [ ] **Step 3: Push and open a PR — ask the user first**

This is the one step in this plan that touches the shared remote. Confirm
with the user before running:

```bash
git push -u origin phase-0-bootstrap
gh pr create --title "Phase 0: bootstrap paperwork-app-native" --body "$(cat <<'EOF'
## Summary
- Expo + expo-router scaffold, matching the versions the feasibility
  spike already validated.
- Drawer + nested-tabs navigation skeleton mirroring paperwork-app's
  actual nav shape (side menu + persistent bottom tab bar), not a
  plain tab bar.
- Theme tokens sourced from paperwork-app's actual rendered Ionic
  default colors.
- Jest + React Native Testing Library wired up.
- AGENTS.md/CLAUDE.md + two scaffolding skills ported and adapted.

## Test plan
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] App launches in the iOS Simulator; all 5 tab buttons and all 4
      drawer-only screens (Belasting, Notificaties, Profiel,
      Instellingen) navigate correctly
- [ ] Toggling the simulator's appearance shows correct light/dark
      colors on every screen
EOF
)"
```

- [ ] **Step 4: Report**

Summarize what Phase 0 produced and link the PR. Phase 1 (auth + core
native plugins) gets its own brainstorm/spec/plan cycle next.

---

## Self-review notes

- **Spec coverage:** design.md's Phase 0 scope — "Expo TS scaffold +
  `prebuild`/dev client, `expo-router` nav skeleton (drawer + nested
  tabs), dark/light theme tokens derived from the current app, ported
  Claude tooling" — maps to Tasks 1 (scaffold), 3 (nav skeleton), 2
  (theme tokens), and 4 (tooling) respectively. The previously-deferred
  nav question (whether Belasting/Notificaties/Profiel/Instellingen show
  the persistent tab bar) is resolved in Task 3 via `href: null` rather
  than left open.
- **No placeholders except the screens themselves**, which are
  *intentional* placeholders per the design doc — every file path, color
  value, and command is concrete and sourced (Ionic's actual default
  palette, not invented).
- **Naming consistency:** `PlaceholderScreen`, `Colors`, `Spacing`,
  `MENU_ITEMS` are spelled identically everywhere they're used across
  Tasks 2-4.
- **Explicitly out of scope, by design:** native plugins, real auth,
  business-logic hooks, the rich-text editor, charts, and the
  receipt-parsing-reviewer/add-native-feature/add-receipt-rule tooling —
  each belongs to the phase that actually introduces it.
