export type PackageManager = "npm" | "pnpm" | "yarn" | "unknown";

export type RepoCommand = {
  name: string;
  command: string;
  source: string;
};

export type RepoAnalysis = {
  rootDir: string;
  projectTypes: string[];
  packageManager?: PackageManager;
  languages: string[];
  frameworks: string[];
  workspaces?: WorkspaceAnalysis;
  commands: RepoCommand[];
  importantFiles: string[];
  warnings: string[];
};

export type WorkspaceAnalysis = {
  patterns: string[];
  packages: WorkspacePackage[];
};

export type WorkspacePackage = {
  path: string;
  name?: string;
};

export type GeneratedFile = {
  path: string;
  content: string;
};

export type WriteAction = "created" | "updated" | "skipped" | "overwritten" | "unchanged";

export type WritePlanEntry = {
  path: string;
  action: WriteAction;
  reason?: string;
};

export type WritePlan = {
  dryRun: boolean;
  force: boolean;
  entries: WritePlanEntry[];
};
