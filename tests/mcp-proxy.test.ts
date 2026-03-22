import { describe, it, expect, vi, beforeEach } from "vitest";
import { proxyMcp } from "../src/adapters/mcp.js";
import type { FastifyReply, FastifyRequest } from "fastify";

// Mock dependencies
vi.mock("undici", () => ({
  fetch: vi.fn()
}));

describe("MCP proxy", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockSnapshot: any;
  let mockPolicy: any;
  let mockCanonical: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      body: {
        prompt: "test prompt",
        params: { messages: [{ role: "user", content: "hello" }] }
      },
      log: {
        info: vi.fn()
      }
    } as any;

    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      headers: vi.fn().mockReturnThis()
    } as any;

    mockSnapshot = {
      platform: {
        mcp_backends: {
          test_mcp: {
            base_url: "http://localhost:3000/mcp",
            timeout_ms: 30000
          }
        },
        redaction: {
          secret_patterns: ["sk-[0-9a-zA-Z]+"],
          pii_patterns: []
        },
        security: {
          normalize_unicode: true
        }
      },
      toolSchemas: []
    };

    mockPolicy = {
      allowed_mcp_backends: ["test_mcp"],
      max_output_chars: 10000,
      input_guards: {
        heuristic_prompt_injection: false,
        max_input_chars: 50000
      },
      output_guards: {
        secret_redaction: true,
        pii_redaction: false
      },
      tool_guards: {
        require_tool_allowlist: false,
        require_schema_validation: false
      },
      allowed_tools: []
    };

    mockCanonical = {
      requestId: "test-request-id"
    };
  });

  it("blocks when no MCP backend is allowed", async () => {
    mockPolicy.allowed_mcp_backends = [];

    await proxyMcp(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    expect(mockReply.code).toHaveBeenCalledWith(403);
    expect(mockReply.send).toHaveBeenCalledWith({ error: "mcp_backend_not_allowed" });
  });

  it("blocks when MCP backend is not found", async () => {
    mockPolicy.allowed_mcp_backends = ["nonexistent"];

    await proxyMcp(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    expect(mockReply.code).toHaveBeenCalledWith(503);
    expect(mockReply.send).toHaveBeenCalledWith({ error: "mcp_backend_unavailable" });
  });

  it("forwards request to MCP backend successfully", async () => {
    const { fetch } = await import("undici");
    vi.mocked(fetch).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ result: "ok" })
    } as any);

    mockPolicy.allowed_mcp_backends = ["test_mcp"];

    await proxyMcp(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    expect(mockReply.code).toHaveBeenCalledWith(200);
    expect(mockReply.send).toHaveBeenCalled();
  });
});