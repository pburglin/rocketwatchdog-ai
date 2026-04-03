import type { FastifyReply, FastifyRequest } from "fastify";
import type { ConfigSnapshot, EffectivePolicy } from "../types/config.js";
import type { CanonicalRequest } from "../types/canonical.js";
export declare function proxyMcp(request: FastifyRequest, reply: FastifyReply, snapshot: ConfigSnapshot, policy: EffectivePolicy, canonical: CanonicalRequest): Promise<void>;
