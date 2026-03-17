import fs from "node:fs";
import path from "node:path";
import type { ConfigSnapshot } from "../types/config.js";
import { loadConfigDir } from "./loader.js";

export class ConfigSnapshotManager {
  private current: ConfigSnapshot | null = null;

  constructor(private configDir: string) {}

  load(): ConfigSnapshot {
    const snapshot = loadConfigDir(this.configDir);
    this.current = snapshot;
    return snapshot;
  }

  reload(): ConfigSnapshot {
    try {
      const snapshot = loadConfigDir(this.configDir);
      this.current = snapshot;
      return snapshot;
    } catch (err) {
      if (!this.current) throw err;
      return this.current;
    }
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
