const defaultPatterns = [
  /sk-[A-Za-z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /(?<=Bearer\s)[A-Za-z0-9._-]+/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /ghp_[A-Za-z0-9]{36}/g
];

export function redactSecrets(input: string, patterns?: string[]): { redacted: string; hits: number } {
  const compiled = patterns?.length
    ? patterns.map((pattern) => new RegExp(pattern, "g"))
    : defaultPatterns;
  let redacted = input;
  let hits = 0;
  for (const pattern of compiled) {
    const next = redacted.replace(pattern, (match) => {
      hits += 1;
      return "[REDACTED]";
    });
    redacted = next;
  }
  return { redacted, hits };
}
