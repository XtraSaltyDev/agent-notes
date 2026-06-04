import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { GeneratedFile, WritePlan } from "../types.js";
import { wrapManagedContent } from "./managedSections.js";
import { resolveSafeWritablePath } from "./pathSafety.js";

export async function writeFiles(
  rootDir: string,
  files: GeneratedFile[],
  plan: WritePlan
): Promise<void> {
  if (plan.dryRun) {
    return;
  }

  const filesByPath = new Map(files.map((file) => [file.path, file]));

  for (const entry of plan.entries) {
    if (entry.action !== "created" && entry.action !== "overwritten") {
      continue;
    }

    const file = filesByPath.get(entry.path);
    if (!file) {
      continue;
    }

    const absolutePath = await resolveSafeWritablePath(rootDir, file.path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, wrapManagedContent(file.content));
  }
}
