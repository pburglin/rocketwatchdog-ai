import type { ConfigSnapshot } from "../types/config.js";
export type ConfigStatus = {
    configDir: string;
    loadedAt: string | null;
    lastReloadAttemptAt: string | null;
    lastReloadSucceededAt: string | null;
    lastError: string | null;
    isUsingLastKnownGood: boolean;
    workloadCount: number;
    toolSchemaCount: number;
    debugModeEnabled: boolean;
};
export declare class ConfigSnapshotManager {
    private configDir;
    private current;
    private lastError;
    private lastReloadAttemptAt;
    private lastReloadSucceededAt;
    constructor(configDir: string);
    load(): ConfigSnapshot;
    reload(): ConfigSnapshot;
    getLastError(): string | null;
    getStatus(): ConfigStatus;
    get(): ConfigSnapshot;
    getConfigDir(): string;
    persistSnapshot(dir: string): string;
}
