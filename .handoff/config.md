# Handoff Config

## Verification Commands
test:      npm run test
typecheck: npm run typecheck
lint:
build:     npm run build

## Conventions
response_language: en
handoff_dir:       .handoff
commit_style:      conventional
convention_docs:   AGENTS.md

## Project Documentation Index

### Agent guidance
- [AGENTS.md](AGENTS.md) — agent-agnostic rules
- [CLAUDE.md](CLAUDE.md) — root agent rules (imports AGENTS.md)
- [GEMINI.md](GEMINI.md) — Gemini-specific (imports AGENTS.md)

### Project docs
- [README.md](README.md) — project overview
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — as-built architecture
- [docs/PLAN.md](docs/PLAN.md) — master plan and phases
- [docs/STATUS.md](docs/STATUS.md) — phase status register
- [docs/FEATURES.md](docs/FEATURES.md) — final feature list
- [docs/DECISIONS.md](docs/DECISIONS.md) — decision log
- [docs/visual-design.md](docs/visual-design.md) — visual design notes
- [src/game/INDEX.md](src/game/INDEX.md) — game lane public exports
- [src/ui/INDEX.md](src/ui/INDEX.md) — UI lane public exports
- [docs/agent-reports/TEMPLATE.md](docs/agent-reports/TEMPLATE.md) — after-job report template

### Detected toolchain
- package manager: npm
- monorepo: none
- frameworks: Vite 8.3.8, TypeScript 7.0.2 (strict), Phaser 4.2.1, Vitest 5.1.0

> Written in `--auto` mode for an unattended session: all four items were auto-detected, no interview.
> There is no lint script in package.json; `npm run check` runs typecheck and tests together.
