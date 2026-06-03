import { fromRoot, listRootFiles, pathExists, readJsonFile } from "./fsUtils.js";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type NodeDetection = {
  projectTypes: string[];
  languages: string[];
  frameworks: string[];
};

export async function detectNode(rootDir: string): Promise<NodeDetection> {
  const rootFiles = await listRootFiles(rootDir);
  const packageJson = await readJsonFile<PackageJson>(fromRoot(rootDir, "package.json"));
  const dependencies = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies
  };

  const hasPackageJson = Boolean(packageJson);
  const hasTsConfig = await pathExists(fromRoot(rootDir, "tsconfig.json"));
  const projectTypes = hasPackageJson ? ["Node.js"] : [];
  const languages = hasTsConfig || dependencies.typescript ? ["TypeScript"] : [];
  if (hasPackageJson) {
    languages.unshift("JavaScript");
  }

  const frameworks = new Set<string>();
  if (dependencies.next || hasMatchingRootFile(rootFiles, /^next\.config\./)) {
    frameworks.add("Next.js");
  }
  if (dependencies.vite || hasMatchingRootFile(rootFiles, /^vite\.config\./)) {
    frameworks.add("Vite");
  }
  if (dependencies.vitest || hasMatchingRootFile(rootFiles, /^vitest\.config\./)) {
    frameworks.add("Vitest");
  }
  if (dependencies.jest || hasMatchingRootFile(rootFiles, /^jest\.config\./)) {
    frameworks.add("Jest");
  }
  if (dependencies.eslint || hasMatchingRootFile(rootFiles, /^eslint\.config\./)) {
    frameworks.add("ESLint");
  }
  if (dependencies.prettier || hasMatchingRootFile(rootFiles, /^\.prettierrc/)) {
    frameworks.add("Prettier");
  }

  return {
    projectTypes,
    languages: Array.from(new Set(languages)),
    frameworks: Array.from(frameworks)
  };
}

function hasMatchingRootFile(files: string[], pattern: RegExp): boolean {
  return files.some((file) => pattern.test(file));
}
