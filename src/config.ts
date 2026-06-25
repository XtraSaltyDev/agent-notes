import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const AGENT_NOTES_CONFIG_FILE = ".agent-notes.json";

export type AgentNotesCommandConfig = {
  dryRun?: boolean;
};

export type AgentNotesConfig = {
  path?: string;
  init?: AgentNotesCommandConfig;
  update?: AgentNotesCommandConfig;
};

const ROOT_KEYS = new Set(["path", "init", "update"]);
const COMMAND_KEYS = new Set(["dryRun"]);

export async function loadAgentNotesConfig(
  cwd = process.cwd()
): Promise<AgentNotesConfig> {
  const configPath = join(cwd, AGENT_NOTES_CONFIG_FILE);

  let rawConfig: string;
  try {
    rawConfig = await readFile(configPath, "utf8");
  } catch (error) {
    if (isNodeErrorWithCode(error, "ENOENT")) {
      return {};
    }
    throw error;
  }

  let parsedConfig: unknown;
  try {
    parsedConfig = JSON.parse(rawConfig);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${AGENT_NOTES_CONFIG_FILE}: ${message}`);
  }

  return validateConfig(parsedConfig);
}

function validateConfig(value: unknown): AgentNotesConfig {
  if (!isRecord(value)) {
    throw new Error(`Invalid ${AGENT_NOTES_CONFIG_FILE}: expected a JSON object.`);
  }

  for (const key of Object.keys(value)) {
    if (!ROOT_KEYS.has(key)) {
      throw new Error(`Config key ${key} is not supported.`);
    }
  }

  const config: AgentNotesConfig = {};

  if ("path" in value) {
    if (typeof value.path !== "string" || value.path.trim() === "") {
      throw new Error("Config key path must be a non-empty string.");
    }
    config.path = value.path;
  }

  if ("init" in value) {
    config.init = validateCommandConfig("init", value.init);
  }

  if ("update" in value) {
    config.update = validateCommandConfig("update", value.update);
  }

  return config;
}

function validateCommandConfig(
  commandName: "init" | "update",
  value: unknown
): AgentNotesCommandConfig {
  if (!isRecord(value)) {
    throw new Error(`Config key ${commandName} must be an object.`);
  }

  for (const key of Object.keys(value)) {
    if (key === "force") {
      throw new Error(
        `Config key ${commandName}.force is not supported. Use --force explicitly.`
      );
    }
    if (!COMMAND_KEYS.has(key)) {
      throw new Error(`Config key ${commandName}.${key} is not supported.`);
    }
  }

  const config: AgentNotesCommandConfig = {};

  if ("dryRun" in value) {
    if (typeof value.dryRun !== "boolean") {
      throw new Error(`Config key ${commandName}.dryRun must be a boolean.`);
    }
    config.dryRun = value.dryRun;
  }

  return config;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}
