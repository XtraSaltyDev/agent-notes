import { access, realpath, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

import { Command } from "commander";

import { generateFiles } from "./generate/index.js";
import { scanRepo } from "./scan/scanRepo.js";
import type { RepoAnalysis, WritePlan } from "./types.js";
import { AGENT_NOTES_VERSION } from "./version.js";
import { planUpdates } from "./write/planUpdates.js";
import { planWrites } from "./write/planWrites.js";
import { writeUpdates } from "./write/writeUpdates.js";
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
    .version(AGENT_NOTES_VERSION);

  program
    .command("scan")
    .description("Scan a repository.")
    .option("--path <dir>", "Scan a directory other than the current working directory.")
    .option("--json", "Print analysis as JSON.")
    .action(async (options: { json?: boolean; path?: string }) => {
      let rootDir: string;
      try {
        rootDir = await resolveRepoPath(options.path);
      } catch (error) {
        program.error(error instanceof Error ? error.message : String(error));
        return;
      }

      const analysis = await scanRepo(rootDir);
      if (options.json) {
        console.log(JSON.stringify(analysis, null, 2));
        return;
      }

      console.log(formatAnalysisSummary(analysis));
    });

  program
    .command("init")
    .description("Create AGENTS.md and .agent-notes Markdown files.")
    .option(
      "--path <dir>",
      "Initialize a directory other than the current working directory."
    )
    .option("--dry-run", "Show the write plan without writing files.")
    .option("--force", "Overwrite existing generated files.")
    .action(async (options: { dryRun?: boolean; force?: boolean; path?: string }) => {
      let rootDir: string;
      try {
        rootDir = await resolveRepoPath(options.path);
      } catch (error) {
        program.error(error instanceof Error ? error.message : String(error));
        return;
      }

      const analysis = await scanRepo(rootDir);
      const files = generateFiles(analysis);
      const plan = await planWrites(rootDir, files, {
        dryRun: options.dryRun,
        force: options.force
      });

      await writeFiles(rootDir, files, plan);

      const forceWarning = formatForceWarning(plan);
      if (forceWarning) {
        console.log(forceWarning);
      }
      console.log(formatWritePlan(plan));
    });

  program
    .command("update")
    .description("Refresh existing agent-notes generated sections.")
    .option(
      "--path <dir>",
      "Update a directory other than the current working directory."
    )
    .option("--dry-run", "Show the update plan without writing files.")
    .option("--force", "Overwrite expected generated files that do not have markers.")
    .action(async (options: { dryRun?: boolean; force?: boolean; path?: string }) => {
      let rootDir: string;
      try {
        rootDir = await resolveRepoPath(options.path);
      } catch (error) {
        program.error(error instanceof Error ? error.message : String(error));
        return;
      }

      const analysis = await scanRepo(rootDir);
      const files = generateFiles(analysis);
      const plan = await planUpdates(rootDir, files, {
        dryRun: options.dryRun,
        force: options.force
      });

      await writeUpdates(rootDir, files, plan);

      const forceWarning = formatForceWarning(plan);
      if (forceWarning) {
        console.log(forceWarning);
      }
      console.log(formatUpdatePlan(plan));
    });

  program
    .command("doctor")
    .description("Check whether expected agent-notes files exist.")
    .option("--path <dir>", "Check a directory other than the current working directory.")
    .option("--json", "Print doctor results as JSON.")
    .action(async (options: { json?: boolean; path?: string }) => {
      let rootDir: string;
      try {
        rootDir = await resolveRepoPath(options.path);
      } catch (error) {
        program.error(error instanceof Error ? error.message : String(error));
        return;
      }

      const statuses = await Promise.all(
        EXPECTED_FILES.map(async (path) => ({
          path,
          exists: await fileExists(join(rootDir, path))
        }))
      );
      const missing = statuses.filter((status) => !status.exists);

      if (options.json) {
        console.log(
          JSON.stringify(
            {
              rootDir,
              files: statuses,
              missing: missing.map((status) => status.path)
            },
            null,
            2
          )
        );
        if (missing.length > 0) {
          process.exitCode = 1;
        }
        return;
      }

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
    `Workspaces: ${formatWorkspaceSummary(analysis)}`,
    `Package manager: ${analysis.packageManager ?? "not detected"}`,
    `Important files: ${joinValues(analysis.importantFiles)}`,
    `Commands: ${analysis.commands.map((command) => `${command.name} (${command.command})`).join(", ") || "none detected"}`,
    `Warnings: ${joinValues(analysis.warnings)}`
  ].join("\n");
}

function formatWorkspaceSummary(analysis: RepoAnalysis): string {
  if (!analysis.workspaces) {
    return "none detected";
  }

  const packageCount = analysis.workspaces.packages.length;
  const patternSummary = analysis.workspaces.patterns.join(", ");
  return `${packageCount} package${packageCount === 1 ? "" : "s"} (${patternSummary})`;
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

export function formatUpdatePlan(plan: WritePlan): string {
  const prefix = plan.dryRun ? "agent-notes update dry-run" : "agent-notes update";
  const lines = [prefix];

  for (const action of [
    "created",
    "updated",
    "skipped",
    "overwritten",
    "unchanged"
  ] as const) {
    const entries = plan.entries.filter((entry) => entry.action === action);
    lines.push(`${action}: ${entries.length}`);
    for (const entry of entries) {
      lines.push(`  - ${entry.path}${entry.reason ? ` (${entry.reason})` : ""}`);
    }
  }

  return lines.join("\n");
}

export function formatForceWarning(plan: WritePlan): string | undefined {
  if (!plan.force) {
    return undefined;
  }

  const overwritten = plan.entries
    .filter((entry) => entry.action === "overwritten")
    .map((entry) => entry.path);

  if (overwritten.length === 0) {
    return undefined;
  }

  return `Warning: --force overwrote ${overwritten.join(", ")}`;
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

async function resolveRepoPath(path?: string): Promise<string> {
  const rootDir = resolve(path ?? process.cwd());

  try {
    const rootStat = await stat(rootDir);
    if (!rootStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${rootDir}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Path is not a directory")) {
      throw error;
    }
    throw new Error(`Path not found: ${rootDir}`);
  }

  return rootDir;
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
