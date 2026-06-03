import { chmod, mkdtemp, symlink, writeFile } from "node:fs/promises";
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

    expect(stdout.trim()).toBe("0.1.2");
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
});
