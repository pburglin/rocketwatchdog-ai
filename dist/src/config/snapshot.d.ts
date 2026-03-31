import type { ConfigSnapshot } from "../types/config.js";
export declare class ConfigSnapshotManager {
    private configDir;
    private current;
    private lastError;
    constructor(configDir: string);
    load(): ConfigSnapshot;
    reload(): ConfigSnapshot;
    getLastError(): string | null;
    get(): ConfigSnapshot;
    persistSnapshot(dir: string): string;
}
