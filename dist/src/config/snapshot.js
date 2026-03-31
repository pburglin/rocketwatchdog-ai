import fs from "node:fs";
import path from "node:path";
import { loadConfigDir } from "./loader.js";
export class ConfigSnapshotManager {
    configDir;
    current = null;
    lastError = null;
    constructor(configDir) {
        this.configDir = configDir;
    }
    load() {
        const snapshot = loadConfigDir(this.configDir);
        this.current = snapshot;
        this.lastError = null;
        return snapshot;
    }
    reload() {
        try {
            const snapshot = loadConfigDir(this.configDir);
            this.current = snapshot;
            this.lastError = null;
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
    get() {
        if (!this.current) {
            return this.load();
        }
        return this.current;
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