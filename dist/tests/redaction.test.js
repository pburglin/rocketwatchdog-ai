import { describe, expect, it } from "vitest";
import { redactSecrets } from "../src/core/guard/redaction.js";
describe("redactSecrets", () => {
    it("redacts known secret patterns", () => {
        const input = "token sk-1234567890ABCDE12345 and AKIA1234567890ABCD";
        const result = redactSecrets(input);
        expect(result.redacted).toContain("[REDACTED]");
        expect(result.hits).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=redaction.test.js.map