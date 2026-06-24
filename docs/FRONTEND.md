# Frontend: Components, Styling & Performance

> Read this when building or changing UI screens, styling, or optimizing
> render/list performance.

## Component design

- Functional components with hooks only (no class components).
- Small, focused components with a single responsibility.
- Strongly type props and state — no `any`.
- Keep business logic out of components; move it to custom hooks (see
  STATE_MANAGEMENT.md).
- Use React Native core components (`View`, `Text`, `Pressable`, etc.)
  directly — no third-party UI kit (no React Native Paper, Tamagui,
  NativeWind). See the migration design doc for why.
- Wrap screens in error boundaries; implement explicit loading and error
  states for every async operation.
- Ensure layouts work across device sizes — flexbox, not fixed pixel
  layouts, for anything that needs to adapt.

## Styling

- `StyleSheet.create()` plus `src/constants/theme.ts` (`Colors`, `Spacing`)
  — no inline color literals, no third-party styling library.
- Dark mode follows the OS color scheme automatically via
  `useColorScheme()` — branch on `scheme === "dark"`, don't build a manual
  toggle.
- `Colors.light`/`Colors.dark` values are paperwork-app's actual rendered
  Ionic default palette (see `theme.ts`'s own comments for the source) —
  don't invent new colors without checking that file first.
- Keep component-specific styles next to their component (a `styles`
  object in the same file, not a separate stylesheet file, unless the
  component genuinely outgrows that).
- Style/variable names describe **purpose**, not appearance.

## Performance

- `React.memo` for genuinely expensive renders (measure first).
- `useCallback` / `useMemo` where they remove real work — not by reflex.
- Use `FlatList`/`SectionList` for any list that can grow — they
  virtualize automatically; don't hand-roll virtualization or render long
  lists with `.map()` inside a `ScrollView`.
- Lean on React Query caching rather than refetching.
- Optimize images (`expo-image` over bare `Image` for remote/cached
  images) and keep bundle size down by avoiding unnecessary dependencies.

## Adding a screen

See the `add-rn-screen` skill — it covers route placement, drawer/tab
visibility, and the styling conventions above together.
