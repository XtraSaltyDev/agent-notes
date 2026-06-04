# Roadmap

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
- Add config file support with `.agent-notes.json` for stable local preferences.
- Expand `doctor` beyond presence checks: report managed marker status, generated
  section version drift, and stale generated content compared with the current
  scan.
- Continue hardening generated-file writes so the CLI only mutates expected
  repository paths.

## Not Planned

- External service calls.
- Hidden repository mutation.
- AI-generated project analysis.
