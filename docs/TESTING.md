# Testing

> Read this when writing or changing tests.

## Tools

- **Jest** (`npm test`, `jest-expo` preset) — unit tests for hooks and
  utility functions, and component tests via `expo-router/testing-library`
  for routed screens. Config in `package.json`'s `jest` field.
- **React Native Testing Library** (`@testing-library/react-native`) —
  component tests. `renderRouter` from `expo-router/testing-library` wraps
  it with router context for screens reached by file-based routes.
- **Detox or Maestro** — end-to-end tests for critical user flows. Not set
  up yet; added when the testing/CI phase of the migration starts (see the
  phase roadmap in the migration design doc). paperwork-app's Cypress
  suite is the equivalent being replaced, not ported directly — RN E2E
  tooling has no browser to drive.

## Practices

- Follow the **AAA** pattern (Arrange, Act, Assert).
- Test **behavior**, not implementation details.
- Mock API calls and native modules; don't hit real network or device
  APIs in tests.
- Cover edge cases and error scenarios.
- Tests live in `src/__tests__/`, mirroring the source structure.
- No simulator launches as part of automated test verification — Jest
  runs in Node, not on a device, and that's the fast/cheap signal to rely
  on. Actually launching the app is a manual, visual check, not a test
  step.
