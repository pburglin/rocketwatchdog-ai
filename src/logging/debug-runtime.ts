import fs from "node:fs";
import path from "node:path";

const runtimeStateFileName = "runtime-state.json";
let debugModeEnabled = false;

function getRuntimeStatePath(configDir: string) {
  return path.join(configDir, runtimeStateFileName);
}

export function isDebugModeEnabled() {
  return debugModeEnabled;
}

export function setDebugModeEnabled(enabled: boolean) {
  debugModeEnabled = enabled;
  return debugModeEnabled;
}

export function loadDebugModeState(configDir: string) {
  const filePath = getRuntimeStatePath(configDir);
  if (!fs.existsSync(filePath)) {
    debugModeEnabled = false;
    return debugModeEnabled;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8")) as { debugModeEnabled?: unknown };
    debugModeEnabled = parsed.debugModeEnabled === true;
  } catch {
    debugModeEnabled = false;
  }

  return debugModeEnabled;
}

export function persistDebugModeState(configDir: string, enabled: boolean) {
  debugModeEnabled = enabled;
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(
    getRuntimeStatePath(configDir),
    JSON.stringify({ debugModeEnabled: enabled }, null, 2)
  );
  return debugModeEnabled;
}
