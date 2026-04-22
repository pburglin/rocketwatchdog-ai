import { describe, expect, it } from "vitest";
import { normalizeUnicode, hasHomoglyphs } from "../src/core/guard/unicode.js";

describe("normalizeUnicode", () => {
  it("normalizes combining characters to precomposed forms", () => {
    // e + combining acute accent => é (U+00E9)
    const input = "e\u0301";
    expect(normalizeUnicode(input)).toBe("é");
  });

  it("passes through plain ASCII unchanged", () => {
    expect(normalizeUnicode("hello")).toBe("hello");
  });

  it("normalizes fullwidth forms to ASCII", () => {
    // Fullwidth A (U+FF21) => A (U+0041)
    const fullwidthA = "\uFF21";
    const normalized = normalizeUnicode(fullwidthA);
    expect(normalized).toBe("A");
  });
});

describe("hasHomoglyphs", () => {
  it("detects mixed Latin + Cyrillic in the same string", () => {
    // Cyrillic 'о' (U+043E) looks like Latin 'o' (U+006F)
    const mixed = "Hello" + "\u043E" + "World";
    expect(hasHomoglyphs(mixed)).toBe(true);
  });

  it("returns false for pure ASCII", () => {
    expect(hasHomoglyphs("Hello, world!")).toBe(false);
  });

  it("returns false for pure Cyrillic text (no homoglyph mix)", () => {
    expect(hasHomoglyphs("Привет мир")).toBe(false);
  });

  it("returns false for pure Latin with accents (after NFKC normalization)", () => {
    expect(hasHomoglyphs("café résumé")).toBe(false);
  });

  it("detects zero-width characters", () => {
    expect(hasHomoglyphs("system\u200Bprompt")).toBe(true); // ZWSP
    expect(hasHomoglyphs("token\u200Dname")).toBe(true);   // ZWJ
    expect(hasHomoglyphs("data\uFEFFsecret")).toBe(true); // BOM
    expect(hasHomoglyphs("text\u00ADhidden")).toBe(true); // SHY
  });

  it("returns false for empty string", () => {
    expect(hasHomoglyphs("")).toBe(false);
  });
});
