# Roadmap

## Shipped In v0.2.3

The `0.2.3` patch adds deterministic `.agent-notes.json` config support without
changing generated output or write safety defaults.

- Added `.agent-notes.json` support for stable `path`, `init.dryRun`, and
  `update.dryRun` defaults.
- Kept command-line flags higher precedence than config values.
- Rejected unsupported config keys instead of silently ignoring typos.
- Kept `--force` as an explicit CLI-only overwrite action.

## Shipped In v0.2.2

The `0.2.2` patch keeps output deterministic and improves generated notes for
Codex-style iterative repair loops.

- Added a project-level `npm run verify` script that runs build, test,
  typecheck, and lint.
- Added a default agent operating loop to generated `AGENTS.md`.
- Added a recommended verification loop to generated `.agent-notes/commands.md`.
- Preferred detected `verify` scripts before falling back to detected
  typecheck, lint, test, and build scripts.
- Kept the existing generated command table and did not broaden monorepo
  detection.

## Shipped In v0.2.1

The `0.2.1` patch keeps scope tight around reliability and detection
correctness.

- Built `dist` before tests so clean checkouts can run `npm test`.
- Exported update workflow helpers from the public library entry point.
- Deduped workspace packages discovered by overlapping patterns.
- Hardened workspace traversal so symlinked directories and obvious heavy
  recursive directories are skipped.
- Detected `npm`, `pnpm`, and `yarn` from `packageManager` when lockfiles are
  absent.
- Honored pnpm workspace `!` exclusions.

## Shipped In v0.2.0

The `0.2.0` release kept the CLI boring-useful: it improved everyday workflows
without widening the tool into a large platform.

- Added generated-file provenance headers.
- Added safer overwrite diagnostics for forced writes.
- Added basic package-manager workspace detection.

## Future Scope

- High priority: keep deepening monorepo detection beyond the current
  `package.json`, `pnpm-workspace.yaml`, `*`, `**`, and common-directory support,
  especially for mixed-language repos and non-Node package boundaries.
- Expand `doctor` beyond presence checks: report managed marker status, generated
  section version drift, and stale generated content compared with the current
  scan.
- Continue hardening generated-file writes so the CLI only mutates expected
  repository paths.

## Not Planned

- External service calls.
- Hidden repository mutation.
- AI-generated project analysis.
