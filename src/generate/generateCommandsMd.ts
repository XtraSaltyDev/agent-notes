import type { RepoAnalysis } from "../types.js";

const FALLBACK_VERIFICATION_ORDER = ["typecheck", "lint", "test", "build"];

export function generateCommandsMd(analysis: RepoAnalysis): string {
  const rows = analysis.commands
    .map((command) => `| ${command.name} | \`${command.command}\` | ${command.source} |`)
    .join("\n");

  return `# Commands

Commands are detected from repository files, not guaranteed.

${recommendedVerificationLoop(analysis.commands)}

| Name | Command | Source |
| --- | --- | --- |
${rows || "| none | Not detected | n/a |"}
`;
}

function recommendedVerificationLoop(commands: RepoAnalysis["commands"]): string {
  const verifyCommand = commands.find((command) => command.name === "verify");
  if (verifyCommand) {
    return `## Recommended Verification Loop

Use the detected all-in-one verifier first:

1. \`${verifyCommand.command}\`

Run it after each smallest safe change. Use failures as repair signals before
changing more code.`;
  }

  const fallbackCommands = FALLBACK_VERIFICATION_ORDER.flatMap((name) => {
    const command = commands.find((candidate) => candidate.name === name);
    return command ? [command] : [];
  });

  if (fallbackCommands.length === 0) {
    return `## Recommended Verification Loop

No all-in-one verifier was detected.

- No typecheck, lint, test, or build script was detected.
- Create the smallest useful verifier for the task before changing code.`;
  }

  const commandList = fallbackCommands
    .map((command, index) => `${index + 1}. \`${command.command}\``)
    .join("\n");

  return `## Recommended Verification Loop

No all-in-one verifier was detected. Run available scripts in this order:

${commandList}

Use the first failing command as the repair signal, then rerun verification.`;
}
