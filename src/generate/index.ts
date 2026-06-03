import { generateAgentsMd } from "./generateAgentsMd.js";
import { generateCommandsMd } from "./generateCommandsMd.js";
import { generateConventionsMd } from "./generateConventionsMd.js";
import { generateProjectMd } from "./generateProjectMd.js";
import { generateRisksMd } from "./generateRisksMd.js";
import type { GeneratedFile, RepoAnalysis } from "../types.js";

export function generateFiles(analysis: RepoAnalysis): GeneratedFile[] {
  return [
    { path: "AGENTS.md", content: generateAgentsMd() },
    { path: ".agent-notes/project.md", content: generateProjectMd(analysis) },
    { path: ".agent-notes/commands.md", content: generateCommandsMd(analysis) },
    { path: ".agent-notes/conventions.md", content: generateConventionsMd(analysis) },
    { path: ".agent-notes/risks.md", content: generateRisksMd(analysis) }
  ];
}
