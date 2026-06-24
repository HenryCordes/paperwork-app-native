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
[Superpowers](https://github.com/obra/superpowers) workflow. Plans live in [docs/plans/](docs/plans).
