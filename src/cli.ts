import { access, realpath } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { generateFiles } from "./generate/index.js";
import { scanRepo } from "./scan/scanRepo.js";
import type { RepoAnalysis, WritePlan } from "./types.js";
import { planWrites } from "./write/planWrites.js";
import { writeFiles } from "./write/writeFiles.js";

const EXPECTED_FILES = [
  "AGENTS.md",
  ".agent-notes/project.md",
  ".agent-notes/commands.md",
  ".agent-notes/conventions.md",
  ".agent-notes/risks.md"
];

export function createProgram(): Command {
  const program = new Command();

  program
    .name("agent-notes")
    .description("Generate deterministic repository notes for coding agents.")
    .version("0.1.1");

  program
    .command("scan")
    .description("Scan the current repository.")
    .option("--json", "Print analysis as JSON.")
    .action(async (options: { json?: boolean }) => {
      const analysis = await scanRepo(process.cwd());
      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
      }

      console.log(formatAnalysisSummary(analysis));
    });

  program
    .command("init")
    .description("Create AGENTS.md and .agent-notes Markdown files.")
    .option("--dry-run", "Show the write plan without writing files.")
    .option("--force", "Overwrite existing generated files.")
    .action(async (options: { dryRun?: boolean; force?: boolean }) => {
      const rootDir = process.cwd();
      const analysis = await scanRepo(rootDir);
      const files = generateFiles(analysis);
      const plan = await planWrites(rootDir, files, {
        dryRun: options.dryRun,
        force: options.force
      });

      await writeFiles(rootDir, files, plan);

      if (options.force) {
        console.log("Warning: --force allows overwriting existing generated files.");
      }
      console.log(formatWritePlan(plan));
    });

  program
    .command("doctor")
    .description("Check whether expected agent-notes files exist.")
    .action(async () => {
      const statuses = await Promise.all(
        EXPECTED_FILES.map(async (path) => ({
          path,
          exists: await fileExists(join(process.cwd(), path))
        }))
      );
      const missing = statuses.filter((status) => !status.exists);

      console.log("agent-notes doctor");
      for (const status of statuses) {
        console.log(`${status.exists ? "present" : "missing"}  ${status.path}`);
      }

      if (missing.length > 0) {
        console.log(`Missing files: ${missing.map((status) => status.path).join(", ")}`);
        process.exitCode = 1;
      }
    });

  return program;
}

export function formatAnalysisSummary(analysis: RepoAnalysis): string {
  return [
    "agent-notes scan",
    `Root: ${analysis.rootDir}`,
    `Project types: ${joinValues(analysis.projectTypes)}`,
    `Languages: ${joinValues(analysis.languages)}`,
    `Frameworks: ${joinValues(analysis.frameworks)}`,
    `Package manager: ${analysis.packageManager ?? "not detected"}`,
    `Important files: ${joinValues(analysis.importantFiles)}`,
    `Commands: ${analysis.commands.map((command) => `${command.name} (${command.command})`).join(", ") || "none detected"}`,
    `Warnings: ${joinValues(analysis.warnings)}`
  ].join("\n");
}

export function formatWritePlan(plan: WritePlan): string {
  const prefix = plan.dryRun ? "agent-notes init dry-run" : "agent-notes init";
  const lines = [prefix];

  for (const action of ["created", "skipped", "overwritten", "unchanged"] as const) {
    const entries = plan.entries.filter((entry) => entry.action === action);
    lines.push(`${action}: ${entries.length}`);
    for (const entry of entries) {
      lines.push(`  - ${entry.path}${entry.reason ? ` (${entry.reason})` : ""}`);
    }
  }

  return lines.join("\n");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function joinValues(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "none detected";
}

async function isCliEntryPoint(): Promise<boolean> {
  if (!process.argv[1]) {
    return false;
  }

  try {
    const modulePath = await realpath(fileURLToPath(import.meta.url));
    const invokedPath = await realpath(process.argv[1]);
    return modulePath === invokedPath;
  } catch {
    return false;
  }
}

if (await isCliEntryPoint()) {
  await createProgram().parseAsync(process.argv);
}
