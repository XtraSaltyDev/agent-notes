import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { detectCommands } from "../src/scan/detectCommands.js";
import { detectPackageManager } from "../src/scan/detectPackageManager.js";
import { scanRepo } from "../src/scan/scanRepo.js";

async function fixtureDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "agent-notes-scan-"));
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

describe("repository scanning", () => {
  it("detects npm from package-lock.json", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), { scripts: {} });
    await writeFile(join(rootDir, "package-lock.json"), "{}");

    const result = await detectPackageManager(rootDir);

    expect(result.packageManager).toBe("npm");
    expect(result.warnings).toEqual([]);
  });

  it("reports unknown when package.json exists without a lockfile", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), { scripts: {} });

    const result = await detectPackageManager(rootDir);

    expect(result.packageManager).toBe("unknown");
  });

  it("warns when multiple lockfiles are present", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), { scripts: {} });
    await writeFile(join(rootDir, "package-lock.json"), "{}");
    await writeFile(join(rootDir, "pnpm-lock.yaml"), "");

    const result = await detectPackageManager(rootDir);

    expect(result.packageManager).toBe("npm");
    expect(result.warnings).toContain(
      "Multiple lockfiles detected: package-lock.json, pnpm-lock.yaml."
    );
  });

  it("detects commands from package.json without inventing missing scripts", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), {
      scripts: {
        build: "tsup",
        test: "vitest run",
        dev: "vite"
      }
    });

    const commands = await detectCommands(rootDir, "npm");

    expect(commands).toEqual([
      { name: "install", command: "npm install", source: "package-lock.json" },
      { name: "build", command: "npm run build", source: "package.json" },
      { name: "test", command: "npm run test", source: "package.json" },
      { name: "dev", command: "npm run dev", source: "package.json" }
    ]);
  });

  it("summarizes Node and TypeScript repository signals", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), {
      dependencies: { next: "latest" },
      devDependencies: { typescript: "latest", vitest: "latest" },
      scripts: { typecheck: "tsc --noEmit" }
    });
    await writeFile(join(rootDir, "package-lock.json"), "{}");
    await writeFile(join(rootDir, "tsconfig.json"), "{}");
    await writeFile(join(rootDir, "next.config.js"), "export default {};");
    await mkdir(join(rootDir, ".github", "workflows"), { recursive: true });

    const analysis = await scanRepo(rootDir);

    expect(analysis.projectTypes).toContain("Node.js");
    expect(analysis.languages).toContain("TypeScript");
    expect(analysis.frameworks).toEqual(expect.arrayContaining(["Next.js", "Vitest"]));
    expect(analysis.importantFiles).toEqual(
      expect.arrayContaining([
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        "next.config.js",
        ".github/workflows/"
      ])
    );
  });
});
