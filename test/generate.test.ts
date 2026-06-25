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

function recommendedVerificationLoopSection(markdown: string): string {
  const start = markdown.indexOf("## Recommended Verification Loop");
  const end = markdown.indexOf("\n| Name |", start);

  return markdown.slice(start, end);
}

describe("Markdown generators", () => {
  it("generates stable AGENTS.md rules", () => {
    const markdown = generateAgentsMd();

    expect(markdown).toContain("Read `.agent-notes/project.md`");
    expect(markdown).toContain("## Default Agent Operating Loop");
    expect(markdown).toContain("Understand the task and relevant context.");
    expect(markdown).toContain("Identify the verifier before changing code.");
    expect(markdown).toContain(
      "Create the smallest useful verifier if one is missing."
    );
    expect(markdown).toContain("Use failures as repair signals.");
    expect(markdown).toContain(
      "Stop on success, repeated no-progress failure, or a missing product decision."
    );
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

  it("includes workspace packages when detected", () => {
    const markdown = generateProjectMd({
      ...analysis,
      workspaces: {
        patterns: ["packages/*"],
        packages: [{ path: "packages/cli", name: "@demo/cli" }]
      }
    });

    expect(markdown).toContain("## Detected Workspaces");
    expect(markdown).toContain("- `packages/*`");
    expect(markdown).toContain("- packages/cli (`@demo/cli`)");
  });

  it("includes command sources and the detection caveat", () => {
    const markdown = generateCommandsMd(analysis);

    expect(markdown).toContain("| install | `npm install` | package-lock.json |");
    expect(markdown).toContain(
      "Commands are detected from repository files, not guaranteed."
    );
  });

  it("recommends a detected verify script before other commands", () => {
    const markdown = generateCommandsMd({
      ...analysis,
      commands: [
        { name: "install", command: "npm install", source: "package-lock.json" },
        { name: "verify", command: "npm run verify", source: "package.json" },
        { name: "test", command: "npm run test", source: "package.json" }
      ]
    });

    expect(markdown).toContain("## Recommended Verification Loop");
    expect(markdown).toContain("Use the detected all-in-one verifier first:");
    expect(markdown).toContain("1. `npm run verify`");
    expect(markdown).toContain("| verify | `npm run verify` | package.json |");
  });

  it("recommends a fallback verification order when verify is missing", () => {
    const markdown = generateCommandsMd({
      ...analysis,
      commands: [
        { name: "build", command: "npm run build", source: "package.json" },
        { name: "test", command: "npm run test", source: "package.json" },
        { name: "lint", command: "npm run lint", source: "package.json" },
        {
          name: "typecheck",
          command: "npm run typecheck",
          source: "package.json"
        }
      ]
    });

    expect(markdown).toContain("## Recommended Verification Loop");
    expect(markdown).toContain("No all-in-one verifier was detected.");
    expect(markdown).toContain("1. `npm run typecheck`");
    expect(markdown).toContain("2. `npm run lint`");
    expect(markdown).toContain("3. `npm run test`");
    expect(markdown).toContain("4. `npm run build`");
  });

  it("recommends creating a verifier when no verifier scripts are detected", () => {
    const markdown = generateCommandsMd({
      ...analysis,
      commands: [
        { name: "install", command: "npm install", source: "package-lock.json" },
        { name: "dev", command: "npm run dev", source: "package.json" },
        { name: "start", command: "npm run start", source: "package.json" }
      ]
    });
    const loop = recommendedVerificationLoopSection(markdown);

    expect(loop).toContain("## Recommended Verification Loop");
    expect(loop).toContain("No all-in-one verifier was detected.");
    expect(loop).toContain(
      "- No typecheck, lint, test, or build script was detected."
    );
    expect(loop).toContain(
      "- Create the smallest useful verifier for the task before changing code."
    );
    expect(loop).not.toContain("npm run dev");
    expect(loop).not.toContain("npm run start");
  });

  it("recommends only detected fallback verifier scripts in deterministic order", () => {
    const markdown = generateCommandsMd({
      ...analysis,
      commands: [
        { name: "build", command: "npm run build", source: "package.json" },
        { name: "format", command: "npm run format", source: "package.json" },
        { name: "test", command: "npm run test", source: "package.json" },
        {
          name: "typecheck",
          command: "npm run typecheck",
          source: "package.json"
        }
      ]
    });
    const loop = recommendedVerificationLoopSection(markdown);

    expect(loop).toContain("No all-in-one verifier was detected.");
    expect(loop).toContain(
      [
        "1. `npm run typecheck`",
        "2. `npm run test`",
        "3. `npm run build`"
      ].join("\n")
    );
    expect(loop).not.toContain("npm run lint");
    expect(loop).not.toContain("npm run format");
  });

  it("includes conventions and user-maintained notes", () => {
    const markdown = generateConventionsMd(analysis);

    expect(markdown).toContain("## Detected Conventions");
    expect(markdown).toContain("Use `npm` for dependency changes.");
    expect(markdown).toContain("## User-Maintained Notes");
    expect(markdown).toContain(
      "TODO: Review this section and replace placeholders before committing."
    );
  });

  it("includes guardrails and user-maintained risks", () => {
    const markdown = generateRisksMd(analysis);

    expect(markdown).toContain("## Generated Guardrails");
    expect(markdown).toContain("Multiple lockfiles detected");
    expect(markdown).toContain("## User-Maintained Risk Notes");
    expect(markdown).toContain(
      "TODO: Review this section and replace placeholders before committing."
    );
  });
});
