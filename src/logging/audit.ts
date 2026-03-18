import fs from "node:fs";
import path from "node:path";
import type { PlatformConfig } from "../types/config.js";
import { redactSecrets } from "../core/guard/redaction.js";

export type AuditEntry = {
  request_id?: string;
  workload_id?: string;
  level?: string;
  decision?: string;
  reason_codes?: string[];
  prompt_text?: string;
};

export function writeAuditLog(platform: PlatformConfig, entry: AuditEntry) {
  if (!platform.logging.log_dir) return;
  const logDir = platform.logging.log_dir;
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, "audit.log");
  let payload = entry;
  if (platform.security.redact_secrets_in_logs && entry.prompt_text) {
    const redacted = redactSecrets(entry.prompt_text, platform.redaction.secret_patterns);
    payload = { ...entry, prompt_text: redacted.redacted };
  }
  fs.appendFileSync(logPath, `${JSON.stringify(payload)}\n`);
}
