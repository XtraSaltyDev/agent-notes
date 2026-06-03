import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { GeneratedFile, WritePlan } from "../types.js";
import { replaceManagedSection, wrapManagedContent } from "./managedSections.js";

export async function writeUpdates(
  rootDir: string,
  files: GeneratedFile[],
  plan: WritePlan
): Promise<void> {
  if (plan.dryRun) {
    return;
  }

  const filesByPath = new Map(files.map((file) => [file.path, file]));

  for (const entry of plan.entries) {
    if (
      entry.action !== "created" &&
      entry.action !== "updated" &&
      entry.action !== "overwritten"
    ) {
      continue;
    }

    const file = filesByPath.get(entry.path);
    if (!file) {
      continue;
    }

    const absolutePath = join(rootDir, file.path);
    await mkdir(dirname(absolutePath), { recursive: true });

    if (entry.action === "updated") {
      const existingContent = await readFile(absolutePath, "utf8");
      const updatedContent = replaceManagedSection(existingContent, file.content);
      if (updatedContent !== undefined) {
        await writeFile(absolutePath, updatedContent);
      }
      continue;
    }

    await writeFile(absolutePath, wrapManagedContent(file.content));
  }
}
