import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import { proxyOpenAI } from "../src/adapters/openai.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OpenAI proxy", () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockSnapshot: any;
  let mockPolicy: any;
  let mockCanonical: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      body: {
        model: "gpt-main",
        messages: [{ role: "user", content: "token sk-1234567890ABCDE12345" }],
        tools: [
          {
            type: "function",
            function: {
              name: "create_ticket",
              description: "Uses token sk-1234567890ABCDE12345"
            }
          }
        ],
        tool_choice: {
          type: "function",
          function: { name: "create_ticket", note: "token sk-1234567890ABCDE12345" }
        }
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
        llm_backends: {
          primary: {
            base_url: "https://example.com",
            timeout_ms: 30000
          }
        },
        redaction: {
          secret_patterns: ["sk-[0-9A-Za-z]+"],
          pii_patterns: []
        },
        security: {
          normalize_unicode: true
        }
      },
      toolSchemas: {}
    };

    mockPolicy = {
      allowed_llm_backends: ["primary"],
      allowed_models: ["gpt-main"],
      max_output_chars: 10000,
      input_guards: {
        heuristic_prompt_injection: false,
        secret_redaction: true
      },
      output_guards: {
        secret_redaction: false,
        pii_redaction: false
      },
      tool_guards: {
        require_tool_allowlist: false,
        require_tool_schema_validation: false
      },
      allowed_tools: []
    };

    mockCanonical = {
      requestId: "test-request-id"
    };
  });

  it("redacts tool metadata before forwarding upstream", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ ok: true })
    } as any);
    vi.stubGlobal("fetch", fetchMock);

    await proxyOpenAI(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const forwarded = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(JSON.stringify(forwarded)).toContain("[REDACTED]");
    expect(JSON.stringify(forwarded)).not.toContain("sk-1234567890ABCDE12345");
  });

  it("drops unsafe upstream reply headers before responding", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({
        "content-type": "application/json",
        "content-length": "999",
        "transfer-encoding": "chunked",
        connection: "keep-alive",
        "x-upstream": "ok"
      }),
      text: async () => JSON.stringify({ secret: "sk-1234567890ABCDE12345" })
    } as any));

    await proxyOpenAI(
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

  it("drops upstream cookie headers before responding", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({
        "content-type": "application/json",
        "set-cookie": "session=secret; HttpOnly",
        "x-upstream": "ok"
      }),
      text: async () => JSON.stringify({ ok: true })
    } as any));

    await proxyOpenAI(
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

  it("does not redact upstream output secrets when output secret redaction is disabled", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ secret: "sk-1234567890ABCDE12345" })
    } as any));

    await proxyOpenAI(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockSnapshot,
      mockPolicy,
      mockCanonical
    );

    expect(mockReply.send).toHaveBeenCalledWith(JSON.stringify({ secret: "sk-1234567890ABCDE12345" }));
  });
});
