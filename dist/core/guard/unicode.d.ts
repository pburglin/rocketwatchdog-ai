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
 * (characters outside the Basic Multilingual Plane that visually resemble
 * ASCII characters). These can be used to bypass pattern matching in
 * prompts — e.g. replacing 'o' with Cyrillic 'о'.
 */
export declare function hasHomoglyphs(input: string): boolean;
