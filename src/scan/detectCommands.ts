import { fromRoot, pathExists, readJsonFile } from "./fsUtils.js";
import { packageManagerLockfile } from "./detectPackageManager.js";
import type { PackageManager, RepoCommand } from "../types.js";

type PackageJson = {
  scripts?: Record<string, string>;
};

const COMMON_SCRIPTS = ["build", "test", "lint", "format", "dev", "start", "typecheck"];

export async function detectCommands(
  rootDir: string,
  packageManager?: PackageManager,
  lockfiles?: string[]
): Promise<RepoCommand[]> {
  const packageJson = await readJsonFile<PackageJson>(fromRoot(rootDir, "package.json"));
  if (!packageJson) {
    return [];
  }

  const commands: RepoCommand[] = [];

  if (packageManager && packageManager !== "unknown") {
    commands.push({
      name: "install",
      command: `${packageManager} install`,
      source: await installCommandSource(rootDir, packageManager, lockfiles)
    });
  }

  for (const scriptName of COMMON_SCRIPTS) {
    if (packageJson.scripts?.[scriptName]) {
      commands.push({
        name: scriptName,
        command: scriptCommand(packageManager, scriptName),
        source: "package.json"
      });
    }
  }

  return commands;
}

async function installCommandSource(
  rootDir: string,
  packageManager: Exclude<PackageManager, "unknown">,
  lockfiles?: string[]
): Promise<string> {
  const lockfile = packageManagerLockfile(packageManager);
  if (!lockfile) {
    return "package.json";
  }

  if (lockfiles) {
    return lockfiles.includes(lockfile) ? lockfile : "package.json";
  }

  return (await pathExists(fromRoot(rootDir, lockfile))) ? lockfile : "package.json";
}

function scriptCommand(
  packageManager: PackageManager | undefined,
  scriptName: string
): string {
  if (packageManager === "pnpm") {
    return `pnpm ${scriptName}`;
  }

  if (packageManager === "yarn") {
    return `yarn ${scriptName}`;
  }

  return `npm run ${scriptName}`;
}
