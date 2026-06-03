import { generateAgentsMd } from "../src/generate/generateAgentsMd.js";
import { generateCommandsMd } from "../src/generate/generateCommandsMd.js";
import { generateConventionsMd } from "../src/generate/generateConventionsMd.js";
import { generateProjectMd } from "../src/generate/generateProjectMd.js";
import { generateRisksMd } from "../src/generate/generateRisksMd.js";
import type { RepoAnalysis } from "../src/types.js";

const analysis: RepoAnalysis = {
  rootDir: "/repo",
  projectTypes: ["Node.js"],
  packageManager: "npm",
  languages: ["TypeScript"],
  frameworks: ["Vite", "Vitest"],
  commands: [
    { name: "install", command: "npm install", source: "package-lock.json" },
    { name: "test", command: "npm run test", source: "package.json" }
  ],
  importantFiles: ["package.json", "tsconfig.json"],
  warnings: ["Multiple lockfiles detected: package-lock.json, yarn.lock."]
};

describe("Markdown generators", () => {
  it("generates stable AGENTS.md rules", () => {
    const markdown = generateAgentsMd();

    expect(markdown).toContain("Read `.agent-notes/project.md`");
    expect(markdown).toContain(
      "Do not change package manager unless explicitly requested."
    );
    expect(markdown).toContain("Do not commit or push unless explicitly asked.");
  });

  it("includes expected project sections", () => {
    const markdown = generateProjectMd(analysis);

    expect(markdown).toContain("# Project Notes");
    expect(markdown).toContain("## Detected Project Type");
    expect(markdown).toContain("- Node.js");
    expect(markdown).toContain("## Warnings");
    expect(markdown).toContain("Multiple lockfiles detected");
  });

  it("includes command sources and the detection caveat", () => {
    const markdown = generateCommandsMd(analysis);

    expect(markdown).toContain("| install | `npm install` | package-lock.json |");
    expect(markdown).toContain(
      "Commands are detected from repository files, not guaranteed."
    );
  });

  it("includes conventions and user-maintained notes", () => {
    const markdown = generateConventionsMd(analysis);

    expect(markdown).toContain("## Detected Conventions");
    expect(markdown).toContain("Use `npm` for dependency changes.");
    expect(markdown).toContain("## User-Maintained Notes");
  });

  it("includes guardrails and user-maintained risks", () => {
    const markdown = generateRisksMd(analysis);

    expect(markdown).toContain("## Generated Guardrails");
    expect(markdown).toContain("Multiple lockfiles detected");
    expect(markdown).toContain("## User-Maintained Risk Notes");
  });
});
