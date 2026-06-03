import { chmod, mkdtemp, symlink } from "node:fs/promises";
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

    expect(stdout.trim()).toBe("0.1.1");
  });
});
