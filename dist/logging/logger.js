import pino from "pino";
export function buildLogger(config) {
    return pino({ level: config.level });
}
//# sourceMappingURL=logger.js.map