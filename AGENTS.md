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
| State & data layer | [docs/STATE_MANAGEMENT.md](docs/STATE_MANAGEMENT.md) | Fetching/mutating data, adding an API service or hook, query keys |
| Frontend | [docs/FRONTEND.md](docs/FRONTEND.md) | Building screens, styling, render/list performance |
| Native functionality | [docs/NATIVE.md](docs/NATIVE.md) | Camera, scanner, OCR, secure storage, biometric, push, badge |
| Receipt parsing | [docs/RECEIPT_PARSING.md](docs/RECEIPT_PARSING.md) | Changing the OCR rule engine, detectors, or merchant-specific handling |
| Testing | [docs/TESTING.md](docs/TESTING.md) | Writing or changing tests |

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

Each phase gets its own folder under [specs/](specs), mirroring
`paperwork-app`'s convention exactly: `assessment.md` (research/brainstorm
findings, when the phase needs one), `design.md` (the spec), and `plan.md`
(the implementation plan). Not every phase needs all three — Phase 0's
design lives in `paperwork-app`'s
`specs/2026-06-24-paperwork-app-native-migration/design.md` instead, since
the migration-level design was done before this repo existed; its folder
here holds only `plan.md`.

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
