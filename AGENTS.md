# Agent Instructions

- Read `DRAFT-PLAN.md` and `ARCHITECTURE.md` before changing architecture, creating an implementation ExecPlan, or adding dependencies.
- Implement only the active stage and satisfy its exit criteria before starting a later stage.
- Use pnpm for Node.js package management.
- Use uv for any Python tooling; Python is not part of the planned product runtime.
- Keep official Mermaid as the canonical syntax verdict; if visual work is later reactivated, its renderer must also be the canonical render verdict.
- Put upstream and experimental dependencies behind local adapters and exact-pin them.
- Do not add rendering, image, geometry, layout-comparison, or vision-provider dependencies unless the deferred visual roadmap is explicitly reactivated.
- Preserve unrelated user changes and do not commit unless asked.
