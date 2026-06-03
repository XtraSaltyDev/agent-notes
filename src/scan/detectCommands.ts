import { fromRoot, readJsonFile } from "./fsUtils.js";
import { packageManagerLockfile } from "./detectPackageManager.js";
import type { PackageManager, RepoCommand } from "../types.js";

type PackageJson = {
  scripts?: Record<string, string>;
};

const COMMON_SCRIPTS = ["build", "test", "lint", "format", "dev", "start", "typecheck"];

export async function detectCommands(
  rootDir: string,
  packageManager?: PackageManager
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
      source: packageManagerLockfile(packageManager) ?? "package.json"
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
