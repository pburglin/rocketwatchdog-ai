import type { WorkloadConfig } from "../types/config.js";
import { ConfigSnapshotManager } from "./snapshot.js";
export declare function upsertWorkloadConfig(snapshotManager: ConfigSnapshotManager, workload: WorkloadConfig): {
    filePath: string;
    snapshot: import("../types/config.js").ConfigSnapshot;
};
export declare function removeWorkloadConfig(snapshotManager: ConfigSnapshotManager, workloadId: string): {
    filePath: string;
    snapshot: import("../types/config.js").ConfigSnapshot;
};
