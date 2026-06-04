import { fromRoot, pathExists, readJsonFile } from "./fsUtils.js";
import type { PackageManager } from "../types.js";

type PackageJson = {
  packageManager?: string;
};

type Lockfile = {
  file: string;
  manager: Exclude<PackageManager, "unknown">;
};

const LOCKFILES: Lockfile[] = [
  { file: "package-lock.json", manager: "npm" },
  { file: "pnpm-lock.yaml", manager: "pnpm" },
  { file: "yarn.lock", manager: "yarn" }
];

const SUPPORTED_PACKAGE_MANAGERS = new Set<Exclude<PackageManager, "unknown">>([
  "npm",
  "pnpm",
  "yarn"
]);

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
    const packageManager = await detectPackageManagerField(rootDir);
    return { packageManager, warnings, lockfiles: [] };
  }

  return { warnings, lockfiles: [] };
}

export function packageManagerLockfile(
  packageManager: PackageManager
): string | undefined {
  return LOCKFILES.find((lockfile) => lockfile.manager === packageManager)?.file;
}

async function detectPackageManagerField(rootDir: string): Promise<PackageManager> {
  const packageJson = await readJsonFile<PackageJson>(fromRoot(rootDir, "package.json"));
  const managerName = packageJson?.packageManager?.split("@")[0];

  if (managerName && isSupportedPackageManager(managerName)) {
    return managerName;
  }

  return "unknown";
}

function isSupportedPackageManager(
  managerName: string
): managerName is Exclude<PackageManager, "unknown"> {
  return SUPPORTED_PACKAGE_MANAGERS.has(
    managerName as Exclude<PackageManager, "unknown">
  );
}
