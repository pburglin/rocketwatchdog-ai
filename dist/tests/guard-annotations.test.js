import { describe, expect, it } from "vitest";
import { ConfigSnapshotManager } from "../src/config/snapshot.js";
import { mergeEffectivePolicy } from "../src/core/policy.js";
import { InputGuardsStage } from "../src/stages/input-guards.js";
import { OutputGuardsStage } from "../src/stages/output-guards.js";
const snapshotManager = new ConfigSnapshotManager("configs");
function buildContext(payload) {
    const snapshot = snapshotManager.get();
    const workload = snapshot.workloads.find((item) => item.id === "default");
    if (!workload) {
        throw new Error("default workload missing from test config");
    }
    return {
        route: "/v1/proxy/llm",
        headers: {},
        payload,
        snapshot,
        policy: mergeEffectivePolicy(snapshot.platform, workload)
    };
}
describe("guard annotations", () => {
    it("keeps allow_with_annotations for input redaction", async () => {
        const ctx = buildContext({
            messages: [{ role: "user", content: "api_key: SECRET" }]
        });
        if (!ctx.policy)
            throw new Error("policy missing from test context");
        ctx.policy.input_guards.secret_redaction = true;
        const stage = new InputGuardsStage();
        await stage.run(ctx);
        expect(ctx.decision?.action).toBe("allow_with_annotations");
        expect(ctx.decision?.annotations).toEqual({ redacted: true });
        expect(ctx.decision?.reasonCodes ?? []).toHaveLength(0);
    });
    it("keeps allow_with_annotations for output redaction", async () => {
        const ctx = buildContext({ response: "bearer secret-token" });
        if (!ctx.policy)
            throw new Error("policy missing from test context");
        const stage = new OutputGuardsStage();
        await stage.run(ctx);
        expect(ctx.decision?.action).toBe("allow_with_annotations");
        expect(ctx.decision?.annotations).toEqual({ redacted: true });
        expect(ctx.decision?.reasonCodes ?? []).toHaveLength(0);
    });
});
//# sourceMappingURL=guard-annotations.test.js.map