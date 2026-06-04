# Roadmap

## Shipped In v0.2.0

The `0.2.0` release kept the CLI boring-useful: it improved everyday workflows
without widening the tool into a large platform.

- Added generated-file provenance headers.
- Added safer overwrite diagnostics for forced writes.
- Added basic package-manager workspace detection.

## Future Scope

- Deepen monorepo detection beyond package-manager workspaces and immediate
  package boundaries.
- Add config file support with `.agent-notes.json` for stable local preferences.
- Continue hardening generated-file writes so the CLI only mutates expected
  repository paths.

## Not Planned

- External service calls.
- Hidden repository mutation.
- AI-generated project analysis.
