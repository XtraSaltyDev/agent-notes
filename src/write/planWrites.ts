import { readFile } from "node:fs/promises";

import { pathExists } from "../scan/fsUtils.js";
import type { GeneratedFile, WritePlan } from "../types.js";
import { wrapManagedContent } from "./managedSections.js";
import { resolveWritablePath } from "./pathSafety.js";

export type PlanWriteOptions = {
  dryRun?: boolean;
  force?: boolean;
};

export async function planWrites(
  rootDir: string,
  files: GeneratedFile[],
  options: PlanWriteOptions = {}
): Promise<WritePlan> {
  const entries: WritePlan["entries"] = [];
  const force = options.force ?? false;

  for (const file of files) {
    const absolutePath = resolveWritablePath(rootDir, file.path);
    if (!(await pathExists(absolutePath))) {
      entries.push({ path: file.path, action: "created" });
      continue;
    }

    const existingContent = await readFile(absolutePath, "utf8");
    if (existingContent === wrapManagedContent(file.content)) {
      entries.push({ path: file.path, action: "unchanged" });
      continue;
    }

    if (force) {
      entries.push({ path: file.path, action: "overwritten" });
      continue;
    }

    entries.push({
      path: file.path,
      action: "skipped",
      reason: "File exists. Use --force to overwrite."
    });
  }

  return {
    dryRun: options.dryRun ?? false,
    force,
    entries
  };
}
