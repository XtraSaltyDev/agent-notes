import { chmod, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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

    expect(stdout.trim()).toBe("0.1.3");
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
});
