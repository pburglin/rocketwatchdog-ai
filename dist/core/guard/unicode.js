/**
 * Normalize Unicode text using NFKC composition.
 * NFKC normalization converts characters to their canonical composition,
 * collapsing homoglyphs and combining sequences (e.g. a-grave vs a+grave)
 * so that string comparisons and regex matching are not trivially evaded
 * by Unicode obfuscation.
 */
export function normalizeUnicode(input) {
    return input.normalize("NFKC");
}
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
export function hasHomoglyphs(input) {
    // Zero-width and other invisible/special-purpose Unicode — always suspicious
    if (/[\u200B-\u200F\uFEFF\u00AD\u061C\u180E]/.test(input)) {
        return true;
    }
    // Full-width ASCII presentation forms are commonly used to evade
    // literal pattern matching while still rendering as familiar Latin text.
    if (/[\uFF01-\uFF5E]/.test(input)) {
        return true;
    }
    // Check for homoglyph substitution: replace lookalike characters and
    // see if the string changed. If it did, the original used confusable chars.
    // These are the most commonly exploited pairs in prompt injection.
    const homoglyphPairs = [
        // Cyrillic lookalikes (U+0430-U+044F Cyrillic vs U+0061-U+007A Latin)
        ["\u0430", "a"], // Cyrillic 'a' vs Latin 'a'
        ["\u0435", "e"], // Cyrillic 'e' vs Latin 'e'
        ["\u043e", "o"], // Cyrillic 'o' vs Latin 'o' — most abused
        ["\u0440", "p"], // Cyrillic 'p' vs Latin 'p'
        ["\u0441", "c"], // Cyrillic 's' vs Latin 'c'
        ["\u0445", "x"], // Cyrillic 'x' vs Latin 'x'
        ["\u0451", "e"], // Cyrillic 'io' vs Latin 'e'
        ["\u0410", "A"],
        ["\u0412", "B"],
        ["\u0415", "E"],
        ["\u041A", "K"],
        ["\u041C", "M"],
        ["\u041D", "H"],
        ["\u041E", "O"],
        ["\u0420", "P"],
        ["\u0421", "C"],
        ["\u0422", "T"],
        ["\u0425", "X"],
        ["\u0423", "Y"],
        ["\u0454", "e"], // Ukrainian 'ie'
        // Greek lookalikes
        ["\u03B1", "a"], // Greek alpha
        ["\u03BF", "o"] // Greek omicron
    ];
    let normalized = input;
    for (const [homoglyph, replacement] of homoglyphPairs) {
        normalized = normalized.split(homoglyph).join(replacement);
    }
    // If the normalized string differs from the original, the original
    // contained confusable homoglyphs rather than plain multilingual text.
    // We also verify the string still has substantial ASCII content to
    // avoid flagging strings that are primarily non-Latin alphabets.
    if (normalized !== input) {
        const hasAscii = /[A-Za-z]/.test(input);
        if (hasAscii) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=unicode.js.map