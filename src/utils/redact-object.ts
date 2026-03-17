import { redactSecrets } from "../core/guard/redaction.js";

export function redactObjectStrings(
  payload: unknown,
  patterns: string[]
): { redacted: unknown; hits: number } {
  let hits = 0;
  function walk(value: unknown): unknown {
    if (typeof value === "string") {
      const result = redactSecrets(value, patterns);
      hits += result.hits;
      return result.redacted;
    }
    if (Array.isArray(value)) {
      return value.map((item) => walk(item));
    }
    if (value && typeof value === "object") {
      const output: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        output[key] = walk(entry);
      }
      return output;
    }
    return value;
  }
  return { redacted: walk(payload), hits };
}
