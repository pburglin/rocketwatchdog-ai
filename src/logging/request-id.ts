import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

export function registerRequestId(app: FastifyInstance<any, any, any, any, any>) {
  app.addHook("onRequest", async (request) => {
    const incoming = request.headers["x-request-id"];
    const requestId = typeof incoming === "string" ? incoming : randomUUID();
    request.requestId = requestId;
  });

  app.addHook("onSend", async (request, reply, payload) => {
    if (request.requestId) {
      reply.header("x-request-id", request.requestId);
    }
    return payload;
  });
}
