import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { proxyMcp } from "../src/adapters/mcp.js";
import type { FastifyReply, FastifyRequest } from "fastify";

afterEach(() => {
  vi.restoreAllMocks();
});

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
        info: vi.fn(),
        error: vi.fn()
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ result: "ok" })
    } as any));

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

  it("returns a proxy error when the MCP upstream request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED")));

    mockPolicy.allowed_mcp_backends = ["test_mcp"];

    await proxyMcp(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    expect(mockReply.code).toHaveBeenCalledWith(502);
    expect(mockReply.send).toHaveBeenCalledWith({
      error: "mcp_upstream_request_failed",
      backend: "test_mcp"
    });
  });

  it("redacts MCP tool arguments before forwarding upstream", async () => {
    mockRequest.body = {
      tool: "create_ticket",
      arguments: {
        note: "token sk-1234567890ABCDE12345"
      }
    };
    mockPolicy.input_guards.secret_redaction = true;

    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ result: "ok" })
    } as any);
    vi.stubGlobal("fetch", fetchMock);

    await proxyMcp(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    const forwarded = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(JSON.stringify(forwarded)).toContain("[REDACTED]");
    expect(JSON.stringify(forwarded)).not.toContain("sk-1234567890ABCDE12345");
  });

  it("drops unsafe upstream reply headers before responding", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({
        "content-type": "application/json",
        "transfer-encoding": "chunked",
        "set-cookie": "session=secret; HttpOnly",
        "x-upstream": "ok"
      }),
      text: async () => JSON.stringify({ result: "ok" })
    } as any));

    await proxyMcp(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    expect(mockReply.headers).toHaveBeenCalledWith({
      "content-type": "application/json",
      "x-upstream": "ok"
    });
  });
});
