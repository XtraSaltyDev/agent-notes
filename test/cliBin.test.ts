import {
  chmod,
  mkdtemp,
  readFile,
  realpath,
  symlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const builtCli = join(repoRoot, "dist", "cli.js");

describe("published CLI bin", () => {
  it("runs when launched through a package-manager bin symlink", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");

    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, ["--version"]);

    expect(stdout.trim()).toBe("0.2.3");
  });

  it("scans the directory passed with --path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const targetDir = await mkdtemp(join(tmpdir(), "agent-notes-target-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(
      join(targetDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, ["scan", "--path", targetDir], {
      cwd: rootDir
    });

    expect(stdout).toContain(`Root: ${targetDir}`);
    expect(stdout).toContain("Project types: Node.js");
    expect(stdout).toContain("Commands: test (npm run test)");
  });

  it("uses .agent-notes.json path when --path is omitted", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const targetDir = await mkdtemp(join(rootDir, "target-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(
      join(rootDir, ".agent-notes.json"),
      `${JSON.stringify({ path: basename(targetDir) }, null, 2)}\n`
    );
    await writeFile(
      join(targetDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const expectedTargetDir = await realpath(targetDir);
    const { stdout } = await execFileAsync(binPath, ["scan"], { cwd: rootDir });

    expect(stdout).toContain(`Root: ${expectedTargetDir}`);
    expect(stdout).toContain("Project types: Node.js");
    expect(stdout).toContain("Commands: test (npm run test)");
  });

  it("prefers --path over .agent-notes.json path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const targetDir = await mkdtemp(join(rootDir, "target-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(
      join(rootDir, ".agent-notes.json"),
      `${JSON.stringify({ path: "missing-target" }, null, 2)}\n`
    );
    await writeFile(
      join(targetDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const expectedTargetDir = await realpath(targetDir);
    const { stdout } = await execFileAsync(
      binPath,
      ["scan", "--path", basename(targetDir)],
      { cwd: rootDir }
    );

    expect(stdout).toContain(`Root: ${expectedTargetDir}`);
    expect(stdout).toContain("Project types: Node.js");
  });

  it("prints a clean error when package.json is malformed", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(join(rootDir, "package.json"), "{ broken json");
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const error = await execFileAsync(binPath, ["scan"], { cwd: rootDir }).then(
      () => undefined,
      (error: unknown) => error as { code: number; stderr: string }
    );

    expect(error).toBeDefined();
    if (!error) {
      throw new Error("Expected scan to fail for malformed package.json.");
    }
    expect(error.code).toBe(1);
    expect(error.stderr).toContain("Invalid JSON in");
    expect(error.stderr).toContain("package.json");
    expect(error.stderr).not.toContain("SyntaxError");
    expect(error.stderr).not.toContain("\n    at ");
  });

  it("fails when --path points to a missing directory", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const missingDir = join(rootDir, "missing");
    const binPath = join(rootDir, "agent-notes");

    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    await expect(
      execFileAsync(binPath, ["scan", "--path", missingDir], { cwd: rootDir })
    ).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining(`Path not found: ${missingDir}`)
    });

    await expect(
      execFileAsync(binPath, ["scan", "--path", missingDir], { cwd: rootDir })
    ).rejects.not.toMatchObject({
      stderr: expect.stringContaining("at resolveScanPath")
    });
  });

  it("updates existing managed files through the CLI", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(
      join(rootDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await writeFile(
      join(rootDir, "AGENTS.md"),
      [
        "Manual intro",
        "<!-- agent-notes:start -->",
        "old generated content",
        "<!-- agent-notes:end -->",
        "Manual outro"
      ].join("\n")
    );
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, ["update", "--path", rootDir]);

    expect(stdout).toContain("agent-notes update");
    expect(stdout).toContain("updated: 1");
    const updatedContent = await readFile(join(rootDir, "AGENTS.md"), "utf8");
    expect(updatedContent).toContain("Manual intro");
    expect(updatedContent).toContain("Read `.agent-notes/project.md`");
    expect(updatedContent).toContain("Manual outro");
  });

  it("reports update dry-runs without writing through the CLI", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");
    const original = [
      "Manual intro",
      "<!-- agent-notes:start -->",
      "old generated content",
      "<!-- agent-notes:end -->"
    ].join("\n");

    await writeFile(
      join(rootDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await writeFile(join(rootDir, "AGENTS.md"), original);
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, [
      "update",
      "--dry-run",
      "--path",
      rootDir
    ]);

    expect(stdout).toContain("agent-notes update dry-run");
    expect(stdout).toContain("updated: 1");
    await expect(readFile(join(rootDir, "AGENTS.md"), "utf8")).resolves.toBe(original);
  });

  it("uses .agent-notes.json update dryRun as a safe write default", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");
    const original = [
      "Manual intro",
      "<!-- agent-notes:start -->",
      "old generated content",
      "<!-- agent-notes:end -->"
    ].join("\n");

    await writeFile(
      join(rootDir, ".agent-notes.json"),
      `${JSON.stringify({ update: { dryRun: true } }, null, 2)}\n`
    );
    await writeFile(
      join(rootDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await writeFile(join(rootDir, "AGENTS.md"), original);
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, ["update"], { cwd: rootDir });

    expect(stdout).toContain("agent-notes update dry-run");
    expect(stdout).toContain("updated: 1");
    await expect(readFile(join(rootDir, "AGENTS.md"), "utf8")).resolves.toBe(original);
  });

  it("initializes the directory passed with init --path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const targetDir = await mkdtemp(join(tmpdir(), "agent-notes-target-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(
      join(targetDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, ["init", "--path", targetDir], {
      cwd: rootDir
    });

    expect(stdout).toContain("agent-notes init");
    await expect(readFile(join(targetDir, "AGENTS.md"), "utf8")).resolves.toContain(
      "Read `.agent-notes/project.md`"
    );
    await expect(
      readFile(join(targetDir, ".agent-notes", "commands.md"), "utf8")
    ).resolves.toContain("test");
  });

  it("uses .agent-notes.json init dryRun as a safe write default", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(
      join(rootDir, ".agent-notes.json"),
      `${JSON.stringify({ init: { dryRun: true } }, null, 2)}\n`
    );
    await writeFile(
      join(rootDir, "package.json"),
      `${JSON.stringify({ scripts: { test: "vitest run" } }, null, 2)}\n`
    );
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, ["init"], { cwd: rootDir });

    expect(stdout).toContain("agent-notes init dry-run");
    await expect(readFile(join(rootDir, "AGENTS.md"), "utf8")).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("rejects force defaults in .agent-notes.json", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(
      join(rootDir, ".agent-notes.json"),
      `${JSON.stringify({ init: { force: true } }, null, 2)}\n`
    );
    await writeFile(join(rootDir, "AGENTS.md"), "manual notes");
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const error = await execFileAsync(binPath, ["init"], { cwd: rootDir }).then(
      () => undefined,
      (error: unknown) => error as { code: number; stderr: string }
    );

    expect(error).toBeDefined();
    if (!error) {
      throw new Error("Expected init to reject force configured in .agent-notes.json.");
    }
    expect(error.code).toBe(1);
    expect(error.stderr).toContain(
      "Config key init.force is not supported. Use --force explicitly."
    );
    await expect(readFile(join(rootDir, "AGENTS.md"), "utf8")).resolves.toBe(
      "manual notes"
    );
  });

  it("names files overwritten by init --force", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(join(rootDir, "AGENTS.md"), "manual notes");
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(binPath, ["init", "--force"], {
      cwd: rootDir
    });

    expect(stdout).toContain("Warning: --force overwrote AGENTS.md");
  });

  it("checks the directory passed to doctor with --path", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const targetDir = await mkdtemp(join(tmpdir(), "agent-notes-target-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(join(targetDir, "AGENTS.md"), "manual notes");
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    await expect(
      execFileAsync(binPath, ["doctor", "--path", targetDir], { cwd: rootDir })
    ).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringContaining("present  AGENTS.md")
    });
  });

  it("prints doctor results as JSON", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "agent-notes-bin-"));
    const targetDir = await mkdtemp(join(tmpdir(), "agent-notes-target-"));
    const binPath = join(rootDir, "agent-notes");

    await writeFile(join(targetDir, "AGENTS.md"), "manual notes");
    await chmod(builtCli, 0o755);
    await symlink(builtCli, binPath);

    const { stdout } = await execFileAsync(
      binPath,
      ["doctor", "--json", "--path", targetDir],
      { cwd: rootDir }
    ).catch((error: unknown) => {
      if (error && typeof error === "object" && "stdout" in error && "code" in error) {
        return error as { stdout: string };
      }
      throw error;
    });

    expect(JSON.parse(stdout)).toEqual({
      rootDir: targetDir,
      files: [
        { path: "AGENTS.md", exists: true },
        { path: ".agent-notes/project.md", exists: false },
        { path: ".agent-notes/commands.md", exists: false },
        { path: ".agent-notes/conventions.md", exists: false },
        { path: ".agent-notes/risks.md", exists: false }
      ],
      missing: [
        ".agent-notes/project.md",
        ".agent-notes/commands.md",
        ".agent-notes/conventions.md",
        ".agent-notes/risks.md"
      ]
    });
  });
});
