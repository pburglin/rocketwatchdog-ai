import { describe, expect, it } from "vitest";
import { summarizeRecentRequests } from "../src/http/perf-summary.js";

describe("summarizeRecentRequests", () => {
  it("groups request shapes and reports retry visibility", () => {
    const summary = summarizeRecentRequests([
      {
        id: "1",
        timestamp: "2026-04-18T09:00:00.000Z",
        method: "POST",
        path: "/v1/proxy/llm",
        workload: "default",
        action: "allow",
        reasonCodes: [],
        duration_ms: 120,
        status_code: 200,
        backend: "openai_primary",
        integration_mode: "proxy",
        retry_count: 2,
        retry_after_ms: 800
      },
      {
        id: "2",
        timestamp: "2026-04-18T09:00:01.000Z",
        method: "POST",
        path: "/v1/proxy/llm",
        workload: "default",
        action: "allow",
        reasonCodes: [],
        duration_ms: 80,
        status_code: 200,
        backend: "openai_primary",
        integration_mode: "proxy"
      },
      {
        id: "3",
        timestamp: "2026-04-18T09:00:02.000Z",
        method: "POST",
        path: "/v1/decision",
        workload: "default",
        action: "allow_with_annotations",
        reasonCodes: ["review"],
        duration_ms: 40,
        status_code: 200,
        backend: "openai_primary",
        integration_mode: "decision",
        retry_count: 1
      }
    ]);

    expect(summary.count).toBe(3);
    expect(summary.retries).toEqual({ total: 3, retried_requests: 2, retry_after_ms_max: 800 });
    expect(summary.request_shapes[0]).toMatchObject({
      key: "POST /v1/proxy/llm openai_primary proxy",
      count: 2,
      retries: 2,
      retried_requests: 1
    });
    expect(summary.slowest[0]?.duration_ms).toBe(120);
  });
});
