import fs from "node:fs";
import path from "node:path";
import type { ConfigSnapshot } from "../types/config.js";
import { loadConfigDir } from "./loader.js";

export type ConfigStatus = {
  configDir: string;
  loadedAt: string | null;
  lastReloadAttemptAt: string | null;
  lastReloadSucceededAt: string | null;
  lastError: string | null;
  isUsingLastKnownGood: boolean;
  workloadCount: number;
  toolSchemaCount: number;
};

export class ConfigSnapshotManager {
  private current: ConfigSnapshot | null = null;
  private lastError: string | null = null;
  private lastReloadAttemptAt: string | null = null;
  private lastReloadSucceededAt: string | null = null;

  constructor(private configDir: string) {}

  load(): ConfigSnapshot {
    const snapshot = loadConfigDir(this.configDir);
    this.current = snapshot;
    this.lastError = null;
    this.lastReloadSucceededAt = snapshot.loadedAt;
    return snapshot;
  }

  reload(): ConfigSnapshot {
    this.lastReloadAttemptAt = new Date().toISOString();
    try {
      const snapshot = loadConfigDir(this.configDir);
      this.current = snapshot;
      this.lastError = null;
      this.lastReloadSucceededAt = snapshot.loadedAt;
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

  getStatus(): ConfigStatus {
    return {
      configDir: this.configDir,
      loadedAt: this.current?.loadedAt ?? null,
      lastReloadAttemptAt: this.lastReloadAttemptAt,
      lastReloadSucceededAt: this.lastReloadSucceededAt,
      lastError: this.lastError,
      isUsingLastKnownGood: this.current !== null && this.lastError !== null,
      workloadCount: this.current?.workloads.length ?? 0,
      toolSchemaCount: Object.keys(this.current?.toolSchemas ?? {}).length
    };
  }

  get(): ConfigSnapshot {
    if (!this.current) {
      return this.load();
    }
    return this.current;
  }

  getConfigDir() {
    return this.configDir;
  }

  persistSnapshot(dir: string) {
    const snapshot = this.get();
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `snapshot-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));
    return filePath;
  }
}
