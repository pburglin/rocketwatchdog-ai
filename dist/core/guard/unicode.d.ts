/**
 * Normalize Unicode text using NFKC composition.
 * NFKC normalization converts characters to their canonical composition,
 * collapsing homoglyphs and combining sequences (e.g. a-grave vs a+grave)
 * so that string comparisons and regex matching are not trivially evaded
 * by Unicode obfuscation.
 */
export declare function normalizeUnicode(input: string): string;
/**
 * Returns true if the input contains likely confusable homoglyphs
 * that could be used to evade pattern matching.
 *
 * Strategy:
 * 1. Replace known homoglyph pairs (Cyrillic/Greek ↔ Latin lookalikes)
 *    and check whether the normalized result differs.
 * 2. Flag full-width ASCII presentation forms when they appear in prompts,
 *    since they normalize to plain ASCII and are a common obfuscation trick.
 * 3. Flag zero-width and other invisible/special-purpose Unicode.
 *
 * This avoids false positives on legitimate multilingual content that
 * uses distinct scripts (e.g. English + Russian) without homoglyph mixing.
 */
export declare function hasHomoglyphs(input: string): boolean;
