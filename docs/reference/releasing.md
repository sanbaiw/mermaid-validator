# Releasing the npm preview package

`mermaid-validator` is a public `0.x` CLI preview. The npm package exposes the same-named `mermaid-validator` command; its empty `exports` map deliberately blocks JavaScript and TypeScript imports. The repository's language server is not shipped. A later explicit decision owns LSP publication, while Stage 6 owns any future supported programmatic API.

## Release invariants

The package version in `package.json`, the CLI version in `src/cli/run-cli.ts`, and the pushed Git tag must agree. For version `0.3.1`, the tag is `v0.3.1`. npm versions are immutable: if that version already exists, choose a new version and rerun every check rather than trying to overwrite it.

The published artifact must be the tarball that passed installation smoke tests. `pnpm package:smoke` creates a temporary tarball by default, installs it through both npm and pnpm in separate temporary consumer projects, exercises the installed CLI version and validation paths, and deletes its temporary files. The publish workflow builds a retained tarball, passes its path to the same smoke program, uploads it as the `npm-package` workflow artifact, and publishes that exact file.

## One-time registry bootstrap

npm trusted publishing can only be configured for a package that already exists. Before the first automated release, recheck that `mermaid-validator` is available, review the tarball, and perform one manual bootstrap publish from an npm account that owns the name and has two-factor authentication enabled:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm package:smoke
mkdir -p .release-artifacts
pnpm pack --pack-destination .release-artifacts
npm publish .release-artifacts/mermaid-validator-0.3.0.tgz --access public
```

This manual command changes the public npm registry and must be run only after explicit owner review. Do not add an `NPM_TOKEN` fallback to the GitHub workflow.

The bootstrap publication consumes version `0.3.0`. Do not push `v0.3.0` afterward: the tag workflow would correctly try to publish that version and npm would reject the duplicate. Commit and push the reviewed repository changes without a version tag so `.github/workflows/publish.yml` exists on GitHub. After the package exists and the workflow file is present, open its npm settings and configure a trusted publisher with:

- provider: GitHub Actions;
- GitHub owner: `sanbaiw`;
- repository: `mermaid-validator`;
- workflow filename: `publish.yml`;
- allowed action: npm publish;
- environment: none, unless the workflow and npm setting are changed together later.

The workflow filename is matched exactly and includes only the filename, not `.github/workflows/`. The repository URL in `package.json` must continue to match the GitHub repository.

The first tag-driven trusted-publisher release must therefore use a later immutable version, for example `0.3.1` with tag `v0.3.1`. If the owner instead wants `0.3.0` itself to be the first automated release, the manual bootstrap must use a distinct prerelease version and all version locations must be synchronized and validated for both the bootstrap and final versions.

## Normal release

Update the package and CLI version locations and run:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm compatibility
pnpm package:smoke
git diff --check
```

Review `pnpm pack --dry-run --json`. The tarball may contain only `package.json`, `README.md`, and compiled files under `dist/cli/` and `dist/validation/`. It must not contain `dist/lsp/`, TypeScript source, tests, fixtures, Compatibility Evidence, plans, workflows, or development tooling.

For versions after the manual bootstrap, commit the release only when requested, create the matching `v<version>` tag, and push the commit and tag. A tag push runs `.github/workflows/publish.yml`; a manual workflow dispatch runs the same checks and uploads the tarball but skips the registry publish step.

The workflow follows npm trusted publishing and contains no long-lived registry secret. Its publish job grants `id-token: write`, installs npm `^11.5.1`, and runs:

```sh
npm publish "${PACKAGE_FILE}" --provenance --access public
```

After the workflow succeeds, verify the registry metadata and an actual registry installation:

```sh
pnpm view mermaid-validator version versions time dist.tarball --json
pnpm dlx --package mermaid-validator@0.3.1 mermaid-validator --version
```

Do not rerun a successful tag publication job merely to clear an unrelated warning: npm will reject an existing immutable version, and a release workflow is not a neutral diagnostic action.
