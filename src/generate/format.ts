export function bulletList(items: string[], emptyText = "None detected."): string {
  if (items.length === 0) {
    return `- ${emptyText}`;
  }

  return items.map((item) => `- ${item}`).join("\n");
}

export function valueOrUnknown(value: string | undefined): string {
  return value ?? "unknown";
}
