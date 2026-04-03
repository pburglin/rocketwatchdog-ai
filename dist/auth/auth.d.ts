import type { FastifyRequest } from "fastify";
import type { PlatformConfig } from "../types/config.js";
export type AuthContext = {
    userId?: string;
    roles?: string[];
    sourceApp?: string;
};
export declare function authenticateRequest(request: FastifyRequest, platform: PlatformConfig): {
    allowed: boolean;
    status: number;
    error?: string;
    context?: AuthContext;
};
