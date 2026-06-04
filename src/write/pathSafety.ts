import { lstat } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

export function resolveWritablePath(rootDir: string, relativePath: string): string {
  const absoluteRoot = resolve(rootDir);
  const absolutePath = resolve(absoluteRoot, relativePath);
  const pathFromRoot = relative(absoluteRoot, absolutePath);

  if (
    isAbsolute(relativePath) ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${"/"}`) ||
    pathFromRoot.startsWith(`..${"\\"}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error(`Refusing to write outside repository root: ${relativePath}`);
  }

  return absolutePath;
}

export async function resolveSafeWritablePath(
  rootDir: string,
  relativePath: string
): Promise<string> {
  const absoluteRoot = resolve(rootDir);
  const absolutePath = resolveWritablePath(rootDir, relativePath);
  const pathFromRoot = relative(absoluteRoot, absolutePath);
  let currentPath = absoluteRoot;

  for (const segment of pathFromRoot.split(/[\\/]+/).filter(Boolean)) {
    currentPath = join(currentPath, segment);

    let stats;
    try {
      stats = await lstat(currentPath);
    } catch (error) {
      if (isNodeErrorWithCode(error, "ENOENT")) {
        break;
      }
      throw error;
    }

    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing to write through symbolic link: ${relativePath}`);
    }
  }

  return absolutePath;
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
