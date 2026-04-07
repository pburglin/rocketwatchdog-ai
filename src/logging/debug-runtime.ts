let debugModeEnabled = false;

export function isDebugModeEnabled() {
  return debugModeEnabled;
}

export function setDebugModeEnabled(enabled: boolean) {
  debugModeEnabled = enabled;
  return debugModeEnabled;
}
