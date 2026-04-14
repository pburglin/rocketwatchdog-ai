import type { EffectivePolicy, PlatformConfig } from "../types/config.js";
export declare function buildSafeReplyHeaders(headers: Headers): Record<string, string>;
export declare function buildOutputRedactionPatterns(policy: EffectivePolicy, platform: PlatformConfig): string[];
