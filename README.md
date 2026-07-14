# Mermaid Diagram Validator

A TypeScript/Node project for validating Mermaid syntax and enforcing custom diagram rules across standalone files, Markdown, CLI/JSON, and LSP integrations.

Rendering, geometry checks, layout comparison, and model-based visual review are deliberately deferred from the active roadmap.

Stage 0 is complete: the repository contains a hardened compatibility spike for official Mermaid, `@mermaid-lint/core`, and Merman across 27 local fixtures. Run `nvm use` to select the project-pinned Node 24 runtime, `pnpm compatibility` to print verdict mismatches, official diagnostic coverage, coordinate expectations, and fact completeness, and `pnpm check` for the complete Stage 0 gate. The complete gate passes locally on Node 22.20.0 and Node 24.18.0 and includes a tracked-and-untracked repository hygiene check.

The product CLI is not implemented yet; it begins in Stage 1. See [ADR 0001](./docs/adr/0001-validation-foundation.md) for the foundation decision and [DRAFT-PLAN.md](./DRAFT-PLAN.md) for the later staged roadmap.

Before starting Stage 1, read [ARCHITECTURE.md](./ARCHITECTURE.md) and create a self-contained ExecPlan following [PLANS.md](./PLANS.md). Preserve the Stage 0 compatibility corpus and snapshots during any migration from `src/spike/` and `src/adapters/`; those modules are compatibility evidence, not product contracts for the future `src/validation/` or `src/cli/` modules.
