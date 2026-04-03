import type { ConfigSnapshot } from "../types/config.js";

export function sanitizeSnapshotForExposure(snapshot: ConfigSnapshot): ConfigSnapshot {
  return {
    ...snapshot,
    platform: {
      ...snapshot.platform,
      redaction: {
        ...snapshot.platform.redaction,
        secret_patterns: snapshot.platform.redaction.secret_patterns.map(() => "[redacted-pattern]")
      }
    }
  };
}
