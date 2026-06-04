import { readFile } from "node:fs/promises";

import { pathExists } from "../scan/fsUtils.js";
import type { GeneratedFile, WritePlan } from "../types.js";
import { replaceManagedSection, wrapManagedContent } from "./managedSections.js";
import { resolveWritablePath } from "./pathSafety.js";

export type PlanUpdateOptions = {
  dryRun?: boolean;
  force?: boolean;
};

export async function planUpdates(
  rootDir: string,
  files: GeneratedFile[],
  options: PlanUpdateOptions = {}
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
    const managedContent = replaceManagedSection(existingContent, file.content);
    if (managedContent !== undefined) {
      entries.push({
        path: file.path,
        action: managedContent === existingContent ? "unchanged" : "updated"
      });
      continue;
    }

    const generatedContent = wrapManagedContent(file.content);
    if (existingContent === generatedContent) {
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
      reason: "File exists without agent-notes markers. Use --force to overwrite."
    });
  }

  return {
    dryRun: options.dryRun ?? false,
    force,
    entries
  };
}
