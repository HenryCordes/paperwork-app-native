# CLAUDE.md — Project Context for Claude Code

## Source of truth

All AI agent rules, conventions, and standards live in [AGENTS.md](AGENTS.md).
**Read it first** — it covers the app context, tech stack, the always-apply
principles, the documentation index, and the spec-driven workflow. This file
stays thin to avoid duplicating that source of truth.

## Skills

[.claude/skills/](.claude/skills): `add-rn-screen`, `add-api-hook`,
`add-native-feature` — recurring scaffolding tasks with this project's
conventions baked in. `add-receipt-rule` and the `receipt-parsing-reviewer`
subagent are deferred to the phase that builds the receipt rule engine in
RN — porting them now would describe implementation details that don't
exist yet.

## Workflow

Brainstorm -> spec -> implementation plan -> implement, on the
[Superpowers](https://github.com/obra/superpowers) workflow. Specs and plans
live in [specs/](specs), one folder per phase — same structure as
`paperwork-app`.
