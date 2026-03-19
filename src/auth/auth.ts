import type { FastifyRequest } from "fastify";
import type { PlatformConfig } from "../types/config.js";

export type AuthContext = {
  userId?: string;
  roles?: string[];
  sourceApp?: string;
};

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = Buffer.from(parts[1], "base64").toString("utf-8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function authenticateRequest(
  request: FastifyRequest,
  platform: PlatformConfig
): { allowed: boolean; status: number; error?: string; context?: AuthContext } {
  const mode = platform.auth?.mode ?? "none";
  if (mode === "none") {
    return { allowed: true, status: 200 };
  }

  if (mode === "api_key") {
    const envKey = platform.auth?.api_key_env;
    if (!envKey || !process.env[envKey]) {
      return { allowed: false, status: 500, error: "api_key_env_missing" };
    }
    const expected = process.env[envKey] as string;
    const headerKey = request.headers["x-api-key"];
    const bearer = request.headers.authorization?.replace("Bearer ", "");
    const provided = typeof headerKey === "string" ? headerKey : bearer;
    if (!provided || provided !== expected) {
      return { allowed: false, status: 401, error: "unauthorized" };
    }
    return { allowed: true, status: 200 };
  }

  if (mode === "jwt") {
    const bearer = request.headers.authorization?.replace("Bearer ", "");
    if (!bearer) {
      return { allowed: false, status: 401, error: "missing_token" };
    }
    const payload = parseJwtPayload(bearer);
    if (!payload) {
      return { allowed: false, status: 401, error: "invalid_token" };
    }
    return {
      allowed: true,
      status: 200,
      context: {
        userId: typeof payload.sub === "string" ? payload.sub : undefined,
        roles: Array.isArray(payload.roles) ? (payload.roles as string[]) : undefined,
        sourceApp: typeof payload.iss === "string" ? payload.iss : undefined
      }
    };
  }

  return { allowed: true, status: 200 };
}
