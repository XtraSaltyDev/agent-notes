import { readdir } from "node:fs/promises";
import { join, posix } from "node:path";

import { directoryExists, fromRoot, readJsonFile } from "./fsUtils.js";
import type { WorkspaceAnalysis, WorkspacePackage } from "../types.js";

type PackageJson = {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
};

export async function detectWorkspaces(
  rootDir: string
): Promise<WorkspaceAnalysis | undefined> {
  const packageJson = await readJsonFile<PackageJson>(fromRoot(rootDir, "package.json"));
  const patterns = normalizeWorkspacePatterns(packageJson?.workspaces);
  if (patterns.length === 0) {
    return undefined;
  }

  const packages = (
    await Promise.all(
      patterns.flatMap((pattern) => detectPackagesForPattern(rootDir, pattern))
    )
  )
    .flat()
    .sort((left, right) => left.path.localeCompare(right.path));

  return {
    patterns,
    packages
  };
}

function normalizeWorkspacePatterns(workspaces: PackageJson["workspaces"]): string[] {
  if (Array.isArray(workspaces)) {
    return workspaces.filter((pattern) => pattern.trim().length > 0);
  }

  return workspaces?.packages?.filter((pattern) => pattern.trim().length > 0) ?? [];
}

async function detectPackagesForPattern(
  rootDir: string,
  pattern: string
): Promise<WorkspacePackage[]> {
  if (!pattern.endsWith("/*")) {
    return [];
  }

  const parentPath = pattern.slice(0, -2);
  const absoluteParent = join(rootDir, parentPath);
  if (!(await directoryExists(absoluteParent))) {
    return [];
  }

  const entries = await readdir(absoluteParent, { withFileTypes: true });
  const packages: WorkspacePackage[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packagePath = posix.join(parentPath, entry.name);
    const packageJsonPath = fromRoot(rootDir, posix.join(packagePath, "package.json"));
    const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
    if (!packageJson) {
      continue;
    }

    packages.push({ path: packagePath, name: packageJson.name });
  }

  return packages;
}
