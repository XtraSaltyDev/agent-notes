import type { RepoAnalysis } from "../types.js";
import { bulletList } from "./format.js";

export function generateConventionsMd(analysis: RepoAnalysis): string {
  const conventions = detectedConventions(analysis);

  return `# Conventions

## Detected Conventions

${bulletList(conventions)}

## Package Manager Guidance

${packageManagerGuidance(analysis)}

## TypeScript and Node Notes

${typescriptNodeNotes(analysis)}

## User-Maintained Notes

- TODO: Review this section and replace placeholders before committing.
- Add project-specific conventions here.
`;
}

function detectedConventions(analysis: RepoAnalysis): string[] {
  const conventions: string[] = [];

  if (
    analysis.importantFiles.some(
      (file) => file.startsWith("eslint.config") || file.startsWith(".eslintrc")
    )
  ) {
    conventions.push("ESLint configuration is present.");
  }
  if (analysis.importantFiles.some((file) => file.startsWith(".prettierrc"))) {
    conventions.push("Prettier configuration is present.");
  }
  if (analysis.importantFiles.includes("tsconfig.json")) {
    conventions.push("TypeScript configuration is present.");
  }
  if (analysis.importantFiles.includes(".github/workflows/")) {
    conventions.push("GitHub Actions workflows are present.");
  }

  return conventions;
}

function packageManagerGuidance(analysis: RepoAnalysis): string {
  if (analysis.packageManager && analysis.packageManager !== "unknown") {
    return `- Use \`${analysis.packageManager}\` for dependency changes.`;
  }

  return "- Package manager is unknown. Do not add or switch lockfiles without confirmation.";
}

function typescriptNodeNotes(analysis: RepoAnalysis): string {
  const notes: string[] = [];

  if (analysis.projectTypes.includes("Node.js")) {
    notes.push("- This appears to be a Node.js project.");
  }
  if (analysis.languages.includes("TypeScript")) {
    notes.push(
      "- TypeScript is detected. Prefer type-safe changes and run type checks when available."
    );
  }

  return notes.length > 0
    ? notes.join("\n")
    : "- No TypeScript or Node.js guidance detected.";
}
