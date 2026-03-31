import pino from "pino";
import type { PlatformConfig } from "../types/config.js";
export declare function buildLogger(config: PlatformConfig["logging"]): pino.Logger<never, boolean>;
