import { readdir, readFile } from "node:fs/promises";
import { join, posix } from "node:path";

import { directoryExists, fromRoot, readJsonFile } from "./fsUtils.js";
import type { WorkspaceAnalysis, WorkspacePackage } from "../types.js";

type PackageJson = {
  name?: string;
  workspaces?: string[] | { packages?: string[] };
};

const INFERRED_WORKSPACE_PATTERNS = ["apps/*", "packages/*", "services/*"];

export async function detectWorkspaces(
  rootDir: string
): Promise<WorkspaceAnalysis | undefined> {
  const packageJson = await readJsonFile<PackageJson>(fromRoot(rootDir, "package.json"));
  const configuredPatterns = uniqueValues([
    ...normalizeWorkspacePatterns(packageJson?.workspaces),
    ...(await readPnpmWorkspacePatterns(rootDir))
  ]);
  const patterns =
    configuredPatterns.length > 0
      ? configuredPatterns
      : await inferWorkspacePatterns(rootDir);

  const packages = (
    await Promise.all(
      patterns.flatMap((pattern) => detectPackagesForPattern(rootDir, pattern))
    )
  )
    .flat()
    .sort((left, right) => left.path.localeCompare(right.path));

  if (patterns.length === 0 || (configuredPatterns.length === 0 && packages.length === 0)) {
    return undefined;
  }

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

async function readPnpmWorkspacePatterns(rootDir: string): Promise<string[]> {
  const workspacePath = fromRoot(rootDir, "pnpm-workspace.yaml");
  if (!(await directoryExists(rootDir))) {
    return [];
  }

  let raw: string;
  try {
    raw = await readFile(workspacePath, "utf8");
  } catch {
    return [];
  }

  const patterns: string[] = [];
  let inPackages = false;
  for (const line of raw.split(/\r?\n/)) {
    if (/^\s*packages\s*:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }

    if (!inPackages) {
      continue;
    }

    if (/^\S/.test(line)) {
      break;
    }

    const match = line.match(/^\s*-\s*["']?([^"']+)["']?\s*$/);
    const pattern = match?.[1]?.trim();
    if (pattern && !pattern.startsWith("!")) {
      patterns.push(pattern);
    }
  }

  return patterns;
}

async function inferWorkspacePatterns(rootDir: string): Promise<string[]> {
  const detectedPatterns: string[] = [];
  for (const pattern of INFERRED_WORKSPACE_PATTERNS) {
    const packages = await detectPackagesForPattern(rootDir, pattern);
    if (packages.length > 0) {
      detectedPatterns.push(pattern);
    }
  }

  return detectedPatterns;
}

async function detectPackagesForPattern(
  rootDir: string,
  pattern: string
): Promise<WorkspacePackage[]> {
  const packagePaths = await matchWorkspacePackagePaths(rootDir, pattern);
  const packages = await Promise.all(
    packagePaths.map(async (packagePath) => {
      const packageJsonPath = fromRoot(rootDir, posix.join(packagePath, "package.json"));
      const packageJson = await readJsonFile<PackageJson>(packageJsonPath);
      return packageJson ? { path: packagePath, name: packageJson.name } : undefined;
    })
  );

  return packages.filter((workspacePackage) => workspacePackage !== undefined);
}

async function matchWorkspacePackagePaths(
  rootDir: string,
  pattern: string
): Promise<string[]> {
  const segments = pattern.split("/").filter((segment) => segment.length > 0);
  const matches = await matchPatternSegments(rootDir, "", segments);
  return uniqueValues(matches);
}

async function matchPatternSegments(
  rootDir: string,
  currentPath: string,
  segments: string[]
): Promise<string[]> {
  if (segments.length === 0) {
    return [currentPath];
  }

  const [segment, ...remainingSegments] = segments;
  if (segment === undefined) {
    return [currentPath];
  }

  if (segment === "*") {
    const directories = await listChildDirectories(join(rootDir, currentPath));
    return (
      await Promise.all(
        directories.map((directory) =>
          matchPatternSegments(rootDir, posixJoin(currentPath, directory), remainingSegments)
        )
      )
    ).flat();
  }

  if (segment === "**") {
    const zeroSegmentMatches = await matchPatternSegments(
      rootDir,
      currentPath,
      remainingSegments
    );
    const directories = await listChildDirectories(join(rootDir, currentPath));
    const nestedMatches = (
      await Promise.all(
        directories.map((directory) =>
          matchPatternSegments(rootDir, posixJoin(currentPath, directory), segments)
        )
      )
    ).flat();

    return [...zeroSegmentMatches, ...nestedMatches];
  }

  const nextPath = posixJoin(currentPath, segment);
  if (!(await directoryExists(join(rootDir, nextPath)))) {
    return [];
  }

  return matchPatternSegments(rootDir, nextPath, remainingSegments);
}

async function listChildDirectories(path: string): Promise<string[]> {
  if (!(await directoryExists(path))) {
    return [];
  }

  const entries = await readdir(path, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function posixJoin(left: string, right: string): string {
  return left.length > 0 ? posix.join(left, right) : right;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values));
}
