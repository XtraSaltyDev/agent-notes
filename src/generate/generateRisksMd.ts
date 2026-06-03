import type { RepoAnalysis } from "../types.js";
import { bulletList } from "./format.js";

export function generateRisksMd(analysis: RepoAnalysis): string {
  return `# Risks

## Generated Guardrails

- Keep generated notes reviewable.
- Do not overwrite files unless \`--force\` is intentionally used.
- Do not change package manager unless explicitly requested.
- Treat detected commands as suggestions until verified locally.

## Detected Warnings

${bulletList(analysis.warnings)}

## User-Maintained Risk Notes

- Add project-specific risks here.
`;
}
