export function generateAgentsMd(): string {
  return `# Agent Instructions

Before making changes:

- Read \`.agent-notes/project.md\`.
- Read \`.agent-notes/commands.md\`.
- Read \`.agent-notes/conventions.md\`.
- Read \`.agent-notes/risks.md\`.

Behavior rules:

- Keep changes scoped.
- Follow existing patterns.
- Do not change package manager unless explicitly requested.
- Do not commit or push unless explicitly asked.
`;
}
