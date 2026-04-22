/**
 * Normalize Unicode text using NFKC composition.
 * NFKC normalization converts characters to their canonical composition,
 * collapsing homoglyphs and combining sequences (e.g. a-grave vs a+grave)
 * so that string comparisons and regex matching are not trivially evaded
 * by Unicode obfuscation.
 */
export function normalizeUnicode(input: string): string {
  return input.normalize("NFKC");
}

/**
 * Returns true if the input contains likely confusable homoglyphs
 * (characters outside the Basic Multilingual Plane that visually resemble
 * ASCII characters). These can be used to bypass pattern matching in
 * prompts — e.g. replacing 'o' with Cyrillic 'о'.
 */
export function hasHomoglyphs(input: string): boolean {
  // Cyrillic o (U+043E) and Latin o (U+006F) — common homoglyph pair
  if (/[\u0430-\u044f\u0410-\u042f]/.test(input)) {
    // Check if the input mixes non-ASCII Cyrillic letters with ASCII
    // This catches mixed-script homoglyph attacks
    const hasAscii = /[A-Za-z]/.test(input);
    const hasCyrillic = /[\u0400-\u04FF]/.test(input);
    if (hasAscii && hasCyrillic) return true;
  }
  // Zero-width and other invisible/special-purpose Unicode
  if (/[\u200B-\u200F\uFEFF\u00AD\u061C\u180E]/.test(input)) {
    return true;
  }
  return false;
}
