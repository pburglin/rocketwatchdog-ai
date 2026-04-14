import fs from "node:fs";
import path from "node:path";
const runtimeStateFileName = "runtime-state.json";
let debugModeEnabled = false;
function getRuntimeStatePath(configDir) {
    return path.join(configDir, runtimeStateFileName);
}
export function isDebugModeEnabled() {
    return debugModeEnabled;
}
export function setDebugModeEnabled(enabled) {
    debugModeEnabled = enabled;
    return debugModeEnabled;
}
export function loadDebugModeState(configDir) {
    const filePath = getRuntimeStatePath(configDir);
    if (!fs.existsSync(filePath)) {
        debugModeEnabled = false;
        return debugModeEnabled;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        debugModeEnabled = parsed.debugModeEnabled === true;
    }
    catch {
        debugModeEnabled = false;
    }
    return debugModeEnabled;
}
export function persistDebugModeState(configDir, enabled) {
    debugModeEnabled = enabled;
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(getRuntimeStatePath(configDir), JSON.stringify({ debugModeEnabled: enabled }, null, 2));
    return debugModeEnabled;
}
//# sourceMappingURL=debug-runtime.js.map