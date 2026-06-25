export function generateAgentsMd(): string {
  return `# Agent Instructions

Before making changes:

- Read \`.agent-notes/project.md\`.
- Read \`.agent-notes/commands.md\`.
- Read \`.agent-notes/conventions.md\`.
- Read \`.agent-notes/risks.md\`.

## Default Agent Operating Loop

1. Understand the task and relevant context.
2. Identify the verifier before changing code.
3. Create the smallest useful verifier if one is missing.
4. Make the smallest safe change.
5. Run verification.
6. Use failures as repair signals.
7. Stop on success, repeated no-progress failure, or a missing product decision.

Behavior rules:

- Keep changes scoped.
- Follow existing patterns.
- Do not change package manager unless explicitly requested.
- Do not commit or push unless explicitly asked.
`;
}
