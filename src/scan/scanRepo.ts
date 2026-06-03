import { join } from "node:path";

import { detectCommands } from "./detectCommands.js";
import { detectNode } from "./detectNode.js";
import { detectPackageManager } from "./detectPackageManager.js";
import { directoryExists, fromRoot, listRootFiles, pathExists } from "./fsUtils.js";
import type { RepoAnalysis } from "../types.js";

const EXACT_IMPORTANT_FILES = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "README.md"
];

const IMPORTANT_PATTERNS = [
  /^vite\.config\./,
  /^next\.config\./,
  /^eslint\.config\./,
  /^\.eslintrc/,
  /^\.prettierrc/,
  /^vitest\.config\./,
  /^jest\.config\./
];

export async function scanRepo(rootDir = process.cwd()): Promise<RepoAnalysis> {
  const [nodeDetection, packageManagerDetection, importantFiles] = await Promise.all([
    detectNode(rootDir),
    detectPackageManager(rootDir),
    detectImportantFiles(rootDir)
  ]);

  const commands = await detectCommands(rootDir, packageManagerDetection.packageManager);

  return {
    rootDir,
    projectTypes: nodeDetection.projectTypes,
    packageManager: packageManagerDetection.packageManager,
    languages: nodeDetection.languages,
    frameworks: nodeDetection.frameworks,
    commands,
    importantFiles,
    warnings: packageManagerDetection.warnings
  };
}

async function detectImportantFiles(rootDir: string): Promise<string[]> {
  const rootFiles = await listRootFiles(rootDir);
  const important = new Set<string>();

  for (const file of EXACT_IMPORTANT_FILES) {
    if (await pathExists(fromRoot(rootDir, file))) {
      important.add(file);
    }
  }

  for (const file of rootFiles) {
    if (IMPORTANT_PATTERNS.some((pattern) => pattern.test(file))) {
      important.add(file);
    }
  }

  if (await directoryExists(join(rootDir, ".github", "workflows"))) {
    important.add(".github/workflows/");
  }

  return Array.from(important);
}
