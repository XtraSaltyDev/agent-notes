import {
  formatAnalysisSummary,
  formatForceWarning,
  formatWritePlan
} from "../src/cli.js";
import type { RepoAnalysis, WritePlan } from "../src/types.js";

describe("CLI output formatting", () => {
  it("formats scan summaries as stable human-readable output", () => {
    const analysis: RepoAnalysis = {
      rootDir: "/repo/demo",
      projectTypes: ["Node.js"],
      packageManager: "npm",
      languages: ["TypeScript"],
      frameworks: ["Vitest"],
      commands: [{ name: "test", command: "npm run test", source: "package.json" }],
      importantFiles: ["package.json", "tsconfig.json"],
      warnings: []
    };

    expect(formatAnalysisSummary(analysis)).toMatchInlineSnapshot(`
      "agent-notes scan
      Root: /repo/demo
      Project types: Node.js
      Languages: TypeScript
      Frameworks: Vitest
      Workspaces: none detected
      Package manager: npm
      Important files: package.json, tsconfig.json
      Commands: test (npm run test)
      Warnings: none detected"
    `);
  });

  it("formats write plans with exact action counts", () => {
    const plan: WritePlan = {
      dryRun: true,
      force: true,
      entries: [
        { path: "AGENTS.md", action: "overwritten" },
        { path: ".agent-notes/project.md", action: "created" }
      ]
    };

    expect(formatWritePlan(plan)).toMatchInlineSnapshot(`
      "agent-notes init dry-run
      created: 1
        - .agent-notes/project.md
      skipped: 0
      overwritten: 1
        - AGENTS.md
      unchanged: 0"
    `);
    expect(formatForceWarning(plan)).toBe("Warning: --force overwrote AGENTS.md");
  });
});
