export function getByJsonPath(payload: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const normalized = path.startsWith("$.") ? path.slice(2) : path.replace(/^\./, "");
  if (!normalized) return undefined;
  const parts = normalized.split(".");
  let current: unknown = payload;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}
