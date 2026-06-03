export const AGENT_NOTES_START = "<!-- agent-notes:start -->";
export const AGENT_NOTES_END = "<!-- agent-notes:end -->";

export function wrapManagedContent(content: string): string {
  return [AGENT_NOTES_START, trimTrailingNewline(content), AGENT_NOTES_END].join("\n");
}

export function hasManagedSection(content: string): boolean {
  return findManagedSection(content) !== undefined;
}

export function replaceManagedSection(
  existingContent: string,
  generatedContent: string
): string | undefined {
  const section = findManagedSection(existingContent);
  if (!section) {
    return undefined;
  }

  return [
    existingContent.slice(0, section.start),
    wrapManagedContent(generatedContent),
    existingContent.slice(section.end)
  ].join("");
}

function findManagedSection(content: string): { start: number; end: number } | undefined {
  const start = content.indexOf(AGENT_NOTES_START);
  if (start === -1) {
    return undefined;
  }

  const endMarkerStart = content.indexOf(
    AGENT_NOTES_END,
    start + AGENT_NOTES_START.length
  );
  if (endMarkerStart === -1) {
    return undefined;
  }

  return {
    start,
    end: endMarkerStart + AGENT_NOTES_END.length
  };
}

function trimTrailingNewline(content: string): string {
  return content.replace(/\n+$/u, "");
}
