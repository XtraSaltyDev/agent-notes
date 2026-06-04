import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
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

  it.each([
    ["npm@10.8.2", "npm"],
    ["pnpm@9.12.3", "pnpm"],
    ["yarn@4.5.1", "yarn"]
  ] as const)("detects %s from packageManager when lockfiles are absent", async (
    packageManager,
    expected
  ) => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), {
      packageManager,
      scripts: {}
    });

    const result = await detectPackageManager(rootDir);

    expect(result.packageManager).toBe(expected);
    expect(result.warnings).toEqual([]);
  });

  it("reports unknown for unsupported packageManager values", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), {
      packageManager: "bun@1.1.0",
      scripts: {}
    });

    const result = await detectPackageManager(rootDir);

    expect(result.packageManager).toBe("unknown");
    expect(result.warnings).toEqual([]);
  });

  it("prefers lockfiles over the packageManager field", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), {
      packageManager: "pnpm@9.12.3",
      scripts: {}
    });
    await writeFile(join(rootDir, "package-lock.json"), "{}");

    const result = await detectPackageManager(rootDir);

    expect(result.packageManager).toBe("npm");
    expect(result.lockfiles).toEqual(["package-lock.json"]);
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
      { name: "install", command: "npm install", source: "package.json" },
      { name: "build", command: "npm run build", source: "package.json" },
      { name: "test", command: "npm run test", source: "package.json" },
      { name: "dev", command: "npm run dev", source: "package.json" }
    ]);
  });

  it("uses the matching lockfile as the install source when present", async () => {
    const rootDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), {
      scripts: { test: "vitest run" }
    });
    await writeFile(join(rootDir, "package-lock.json"), "{}");

    const analysis = await scanRepo(rootDir);

    expect(analysis.commands).toContainEqual({
      name: "install",
      command: "npm install",
      source: "package-lock.json"
    });
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

  it("detects package manager workspaces and package names", async () => {
    const rootDir = await fixtureDir();
    await mkdir(join(rootDir, "packages", "cli"), { recursive: true });
    await mkdir(join(rootDir, "packages", "core"), { recursive: true });
    await writeJson(join(rootDir, "package.json"), {
      workspaces: ["packages/*"],
      scripts: { test: "vitest run" }
    });
    await writeJson(join(rootDir, "packages", "cli", "package.json"), {
      name: "@demo/cli"
    });
    await writeJson(join(rootDir, "packages", "core", "package.json"), {
      name: "@demo/core"
    });

    const analysis = await scanRepo(rootDir);

    expect(analysis.projectTypes).toEqual(["Node.js", "Workspace"]);
    expect(analysis.workspaces).toEqual({
      patterns: ["packages/*"],
      packages: [
        { path: "packages/cli", name: "@demo/cli" },
        { path: "packages/core", name: "@demo/core" }
      ]
    });
  });

  it("detects pnpm workspace file patterns and recursive packages", async () => {
    const rootDir = await fixtureDir();
    await mkdir(join(rootDir, "apps", "web"), { recursive: true });
    await mkdir(join(rootDir, "packages", "features", "auth"), { recursive: true });
    await writeJson(join(rootDir, "package.json"), {
      scripts: { test: "vitest run" }
    });
    await writeFile(
      join(rootDir, "pnpm-workspace.yaml"),
      ["packages:", "  - apps/*", "  - packages/**"].join("\n")
    );
    await writeJson(join(rootDir, "apps", "web", "package.json"), {
      name: "@demo/web"
    });
    await writeJson(join(rootDir, "packages", "features", "auth", "package.json"), {
      name: "@demo/auth"
    });

    const analysis = await scanRepo(rootDir);

    expect(analysis.workspaces).toEqual({
      patterns: ["apps/*", "packages/**"],
      packages: [
        { path: "apps/web", name: "@demo/web" },
        { path: "packages/features/auth", name: "@demo/auth" }
      ]
    });
    expect(analysis.importantFiles).toContain("pnpm-workspace.yaml");
  });

  it("dedupes workspace packages discovered by overlapping patterns", async () => {
    const rootDir = await fixtureDir();
    await mkdir(join(rootDir, "packages", "core"), { recursive: true });
    await writeJson(join(rootDir, "package.json"), {
      workspaces: ["packages/*", "packages/**"],
      scripts: { test: "vitest run" }
    });
    await writeJson(join(rootDir, "packages", "core", "package.json"), {
      name: "@demo/core"
    });

    const analysis = await scanRepo(rootDir);

    expect(analysis.workspaces).toEqual({
      patterns: ["packages/*", "packages/**"],
      packages: [{ path: "packages/core", name: "@demo/core" }]
    });
  });

  it("does not traverse symlinked workspace directories outside the repo", async () => {
    const rootDir = await fixtureDir();
    const outsideDir = await fixtureDir();
    await writeJson(join(rootDir, "package.json"), {
      workspaces: ["linked-package"],
      scripts: { test: "vitest run" }
    });
    await writeJson(join(outsideDir, "package.json"), {
      name: "@demo/outside"
    });
    await symlink(outsideDir, join(rootDir, "linked-package"), "dir");

    const analysis = await scanRepo(rootDir);

    expect(analysis.workspaces).toEqual({
      patterns: ["linked-package"],
      packages: []
    });
  });

  it("applies pnpm workspace exclusions to recursive package matches", async () => {
    const rootDir = await fixtureDir();
    await mkdir(join(rootDir, "packages", "core", "test", "fixture"), {
      recursive: true
    });
    await writeJson(join(rootDir, "package.json"), {
      scripts: { test: "vitest run" }
    });
    await writeFile(
      join(rootDir, "pnpm-workspace.yaml"),
      [
        "packages:",
        '  - "packages/**"',
        '  - "!packages/**/test/**"'
      ].join("\n")
    );
    await writeJson(join(rootDir, "packages", "core", "package.json"), {
      name: "@demo/core"
    });
    await writeJson(join(rootDir, "packages", "core", "test", "fixture", "package.json"), {
      name: "@demo/test-fixture"
    });

    const analysis = await scanRepo(rootDir);

    expect(analysis.workspaces).toEqual({
      patterns: ["packages/**", "!packages/**/test/**"],
      packages: [{ path: "packages/core", name: "@demo/core" }]
    });
  });

  it("infers common monorepo package directories without workspace config", async () => {
    const rootDir = await fixtureDir();
    await mkdir(join(rootDir, "apps", "web"), { recursive: true });
    await mkdir(join(rootDir, "packages", "core"), { recursive: true });
    await writeJson(join(rootDir, "package.json"), {
      scripts: { test: "vitest run" }
    });
    await writeJson(join(rootDir, "apps", "web", "package.json"), {
      name: "@demo/web"
    });
    await writeJson(join(rootDir, "packages", "core", "package.json"), {
      name: "@demo/core"
    });

    const analysis = await scanRepo(rootDir);

    expect(analysis.projectTypes).toEqual(["Node.js", "Workspace"]);
    expect(analysis.workspaces).toEqual({
      patterns: ["apps/*", "packages/*"],
      packages: [
        { path: "apps/web", name: "@demo/web" },
        { path: "packages/core", name: "@demo/core" }
      ]
    });
  });
});
