import pino from "pino";
import type { PlatformConfig } from "../types/config.js";

export function buildLogger(config: PlatformConfig["logging"]) {
  return pino({ level: config.level });
}
