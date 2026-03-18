import fs from "node:fs";
import path from "node:path";
import type { ConfigSnapshot } from "../types/config.js";
import { loadConfigDir } from "./loader.js";

export class ConfigSnapshotManager {
  private current: ConfigSnapshot | null = null;
  private lastError: string | null = null;

  constructor(private configDir: string) {}

  load(): ConfigSnapshot {
    const snapshot = loadConfigDir(this.configDir);
    this.current = snapshot;
    this.lastError = null;
    return snapshot;
  }

  reload(): ConfigSnapshot {
    try {
      const snapshot = loadConfigDir(this.configDir);
      this.current = snapshot;
      this.lastError = null;
      return snapshot;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.lastError = message;
      // eslint-disable-next-line no-console
      console.error("config_reload_failed", message);
      if (!this.current) throw err;
      return this.current;
    }
  }

  getLastError(): string | null {
    return this.lastError;
  }

  get(): ConfigSnapshot {
    if (!this.current) {
      return this.load();
    }
    return this.current;
  }

  persistSnapshot(dir: string) {
    const snapshot = this.get();
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `snapshot-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    return filePath;
  }
}
