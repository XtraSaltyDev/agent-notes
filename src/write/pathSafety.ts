import { isAbsolute, relative, resolve } from "node:path";

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
