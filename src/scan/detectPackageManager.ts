import { fromRoot, pathExists } from "./fsUtils.js";
import type { PackageManager } from "../types.js";

type Lockfile = {
  file: string;
  manager: Exclude<PackageManager, "unknown">;
};

const LOCKFILES: Lockfile[] = [
  { file: "package-lock.json", manager: "npm" },
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" }
];

export type PackageManagerDetection = {
  packageManager?: PackageManager;
  warnings: string[];
  lockfiles: string[];
};

export async function detectPackageManager(
  rootDir: string
): Promise<PackageManagerDetection> {
  const presentLockfiles: Lockfile[] = [];

  for (const lockfile of LOCKFILES) {
    if (await pathExists(fromRoot(rootDir, lockfile.file))) {
      presentLockfiles.push(lockfile);
    }
  }

  const warnings =
    presentLockfiles.length > 1
      ? [
          `Multiple lockfiles detected: ${presentLockfiles.map((item) => item.file).join(", ")}.`
        ]
      : [];

  if (presentLockfiles.length > 0) {
    return {
      packageManager: presentLockfiles[0]?.manager,
      warnings,
      lockfiles: presentLockfiles.map((item) => item.file)
    };
  }

  if (await pathExists(fromRoot(rootDir, "package.json"))) {
    return { packageManager: "unknown", warnings, lockfiles: [] };
  }

  return { warnings, lockfiles: [] };
}

export function packageManagerLockfile(
  packageManager: PackageManager
): string | undefined {
  return LOCKFILES.find((lockfile) => lockfile.manager === packageManager)?.file;
}
