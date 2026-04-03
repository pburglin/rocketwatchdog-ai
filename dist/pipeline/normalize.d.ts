import type { FastifyRequest } from "fastify";
import type { CanonicalRequest } from "../types/canonical.js";
export declare function buildCanonicalRequest(request: FastifyRequest, headers: Record<string, string>, payload: Record<string, unknown>): CanonicalRequest;
