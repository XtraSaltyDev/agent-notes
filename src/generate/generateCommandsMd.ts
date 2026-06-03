import type { RepoAnalysis } from "../types.js";

export function generateCommandsMd(analysis: RepoAnalysis): string {
  const rows = analysis.commands
    .map((command) => `| ${command.name} | \`${command.command}\` | ${command.source} |`)
    .join("\n");

  return `# Commands

Commands are detected from repository files, not guaranteed.

| Name | Command | Source |
| --- | --- | --- |
${rows || "| none | Not detected | n/a |"}
`;
}
