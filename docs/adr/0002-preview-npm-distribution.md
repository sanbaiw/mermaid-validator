# ADR 0002: Publish a CLI-only Stage 4 preview package

- Status: Accepted
- Date: 2026-07-31
- Scope: Stage 4 preview distribution before Stage 5

## Context

Stage 4 completed a useful repository-aware CLI and stdio language server at private version `0.3.0`. The original roadmap postponed every npm publication concern until Stage 6 so early programmatic contracts could continue changing. Real-world CLI use now matters more than keeping the executable artifact inside the checkout, but Stage 5 Semantic Facts and Stage 6 public API hardening have not begun.

Publishing executable shims does not require publishing a supported JavaScript API. npm package metadata can expose `bin` commands while an empty `exports` map denies package imports. This lets users install and exercise the current tool without turning repository `index.ts` seams or compiled implementation paths into compatibility promises.

The project also needs an automated release path. The accepted reference is `/Users/wangzhihao/Documents/playground/web-source-bundler/.github/workflows/publish.yml`, which uses npm trusted publishing: a GitHub-hosted workflow receives an OIDC identity token through `id-token: write`, installs an OIDC-capable npm CLI, builds one tarball, stores it as an artifact, and publishes that exact tarball with provenance. It does not store a long-lived npm publish token.

## Decision

Publish `mermaid-validator` as a public `0.x` CLI-only preview beginning with version `0.3.0`. The public executable surface is exactly:

- `mermaid-validator` mapped to `dist/cli/main.js`.

The Stage 4 language server remains available from a repository checkout, but its executable and compiled files are not part of this npm preview. Publishing an LSP server is deferred until a later explicit distribution decision.

The package has no `main` entry, emits no declarations, and declares an empty `exports` object. Direct or deep JavaScript imports are unsupported and blocked by Node's package export resolution. Stage 6 remains responsible for deciding whether any programmatic interface becomes public and, if so, for declarations, installed-consumer tests, migration policy, and deprecation policy.

The tarball allowlist contains `dist/cli/`, `dist/validation/`, and `README.md`, plus package metadata npm includes automatically. Compatibility Evidence, LSP output, TypeScript source, tests, fixtures, workflows, plans, and development tools are excluded. The two compiled subtrees preserve the existing internal dependency direction: the CLI delivery adapter calls Diagram Validation.

`.github/workflows/publish.yml` follows the trusted-publisher reference with `id-token: write`, npm `^11.5.1`, an uploaded tarball artifact, and `npm publish <tarball> --provenance --access public`. It contains no `NPM_TOKEN` or token fallback. A matching pushed `v*` tag may publish only after the complete gate and npm/pnpm installed-package smoke checks pass. Manual dispatch verifies and stores an artifact but does not publish.

Trusted-publisher configuration requires the package to exist in npm first. If `mermaid-validator` is still absent, the owner must perform one manually authenticated, two-factor-protected bootstrap publication of the reviewed tarball and then bind the package to GitHub repository `sanbaiw/mermaid-validator`, workflow `publish.yml`, with publish permission. If that bootstrap consumes `0.3.0`, no `v0.3.0` tag is pushed afterward because npm versions are immutable; trusted tag publication begins with a later version such as `0.3.1`. This one-time registry operation is outside repository implementation and must not be replaced with a temporary CI token secret.

No source module, dependency direction, dependency version, canonical Mermaid profile, parser deadline, test timeout, visual scope, Stage 5 feature, or Stage 6 stable API is changed by this decision. LSP-only packages are development dependencies because no published runtime imports them. The repository has no license file; this decision does not invent or grant a software license.

## Consequences

Users can install the current CLI with npm or pnpm and provide real-world feedback before semantic rules are implemented. Release candidates are observable as actual tarballs, and the tag/version guard prevents publishing a version under the wrong Git tag.

Internal compiled files must be present for the commands to run, but the empty export map makes their non-public status machine-enforced for normal package resolution. A future Stage 6 decision that accepts programmatic APIs will deliberately replace the empty map and add declarations and compatibility tests.

The package name and every version remain immutable once published. Registry name availability must be checked immediately before the bootstrap publish. The first publication cannot use trusted publishing because no package settings exist yet; subsequent automated releases can be tokenless after the trust relationship is configured.

Before any registry publication, the owner selected `mermaid-validator` as the single public name for the npm package, CLI command, JSON tool identity, LSP server identity, and GitHub repository. The local checkout directory may retain its earlier filesystem name because it is not a public interface.
