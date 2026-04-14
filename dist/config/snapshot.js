import fs from "node:fs";
import path from "node:path";
import { loadDebugModeState } from "../logging/debug-runtime.js";
import { loadConfigDir } from "./loader.js";
export class ConfigSnapshotManager {
    configDir;
    current = null;
    lastError = null;
    lastReloadAttemptAt = null;
    lastReloadSucceededAt = null;
    constructor(configDir) {
        this.configDir = configDir;
    }
    load() {
        const snapshot = loadConfigDir(this.configDir);
        this.current = snapshot;
        this.lastError = null;
        this.lastReloadSucceededAt = snapshot.loadedAt;
        loadDebugModeState(this.configDir);
        return snapshot;
    }
    reload() {
        this.lastReloadAttemptAt = new Date().toISOString();
        try {
            const snapshot = loadConfigDir(this.configDir);
            this.current = snapshot;
            this.lastError = null;
            this.lastReloadSucceededAt = snapshot.loadedAt;
            loadDebugModeState(this.configDir);
            return snapshot;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.lastError = message;
            // eslint-disable-next-line no-console
            console.error("config_reload_failed", message);
            if (!this.current)
                throw err;
            return this.current;
        }
    }
    getLastError() {
        return this.lastError;
    }
    getStatus() {
        return {
            configDir: this.configDir,
            loadedAt: this.current?.loadedAt ?? null,
            lastReloadAttemptAt: this.lastReloadAttemptAt,
            lastReloadSucceededAt: this.lastReloadSucceededAt,
            lastError: this.lastError,
            isUsingLastKnownGood: this.current !== null && this.lastError !== null,
            workloadCount: this.current?.workloads.length ?? 0,
            toolSchemaCount: Object.keys(this.current?.toolSchemas ?? {}).length,
            debugModeEnabled: loadDebugModeState(this.configDir)
        };
    }
    get() {
        if (!this.current) {
            return this.load();
        }
        return this.current;
    }
    getConfigDir() {
        return this.configDir;
    }
    persistSnapshot(dir) {
        const snapshot = this.get();
        fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, `snapshot-${Date.now()}.json`);
        fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
        return filePath;
    }
}
//# sourceMappingURL=snapshot.js.map