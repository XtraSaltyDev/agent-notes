import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { planWrites } from "../src/write/planWrites.js";
import { writeFiles } from "../src/write/writeFiles.js";

async function fixtureDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "agent-notes-write-"));
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("write planning", () => {
  it("does not overwrite by default", async () => {
    const rootDir = await fixtureDir();
    await writeFile(join(rootDir, "AGENTS.md"), "existing");

    const plan = await planWrites(rootDir, [{ path: "AGENTS.md", content: "new" }]);

    expect(plan.entries).toEqual([
      {
        path: "AGENTS.md",
        action: "skipped",
        reason: "File exists. Use --force to overwrite."
      }
    ]);
  });

  it("reports unchanged when existing content matches", async () => {
    const rootDir = await fixtureDir();
    await writeFile(
      join(rootDir, "AGENTS.md"),
      ["<!-- agent-notes:start -->", "same", "<!-- agent-notes:end -->"].join("\n")
    );

    const plan = await planWrites(rootDir, [{ path: "AGENTS.md", content: "same" }]);

    expect(plan.entries).toEqual([{ path: "AGENTS.md", action: "unchanged" }]);
  });

  it("dry-run does not write files", async () => {
    const rootDir = await fixtureDir();
    const files = [{ path: ".agent-notes/project.md", content: "project" }];
    const plan = await planWrites(rootDir, files, { dryRun: true });

    await writeFiles(rootDir, files, plan);

    expect(plan.entries).toEqual([
      { path: ".agent-notes/project.md", action: "created" }
    ]);
    expect(await exists(join(rootDir, ".agent-notes", "project.md"))).toBe(false);
  });

  it("force allows overwrite", async () => {
    const rootDir = await fixtureDir();
    await writeFile(join(rootDir, "AGENTS.md"), "existing");
    const files = [{ path: "AGENTS.md", content: "new" }];
    const plan = await planWrites(rootDir, files, { force: true });

    await writeFiles(rootDir, files, plan);

    expect(plan.entries).toEqual([{ path: "AGENTS.md", action: "overwritten" }]);
    await expect(readFile(join(rootDir, "AGENTS.md"), "utf8")).resolves.toBe(
      ["<!-- agent-notes:start -->", "new", "<!-- agent-notes:end -->"].join("\n")
    );
  });

  it("writes generated files inside agent-notes markers", async () => {
    const rootDir = await fixtureDir();
    const files = [{ path: "AGENTS.md", content: "generated content\n" }];
    const plan = await planWrites(rootDir, files);

    await writeFiles(rootDir, files, plan);

    await expect(readFile(join(rootDir, "AGENTS.md"), "utf8")).resolves.toBe(
      [
        "<!-- agent-notes:start -->",
        "generated content",
        "<!-- agent-notes:end -->"
      ].join("\n")
    );
  });
});
