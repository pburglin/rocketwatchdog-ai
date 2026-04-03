import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";
function toFileName(id) {
    return `${id.replace(/[^a-zA-Z0-9-_]/g, "-")}.yaml`;
}
export function upsertWorkloadConfig(snapshotManager, workload) {
    const configDir = snapshotManager.getConfigDir();
    const workloadsDir = path.join(configDir, "workloads");
    fs.mkdirSync(workloadsDir, { recursive: true });
    const filePath = path.join(workloadsDir, toFileName(workload.id));
    const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
    fs.writeFileSync(filePath, yaml.stringify(workload));
    const snapshot = snapshotManager.reload();
    const error = snapshotManager.getLastError();
    if (error) {
        if (previous === null) {
            fs.unlinkSync(filePath);
        }
        else {
            fs.writeFileSync(filePath, previous);
        }
        snapshotManager.reload();
        throw new Error(error);
    }
    return {
        filePath,
        snapshot
    };
}
export function removeWorkloadConfig(snapshotManager, workloadId) {
    const configDir = snapshotManager.getConfigDir();
    const workloadsDir = path.join(configDir, "workloads");
    const files = fs
        .readdirSync(workloadsDir)
        .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"));
    const fileName = files.find((file) => {
        const raw = fs.readFileSync(path.join(workloadsDir, file), "utf-8");
        const parsed = yaml.parse(raw);
        return parsed.id === workloadId;
    });
    if (!fileName) {
        throw new Error(`Unknown workload: ${workloadId}`);
    }
    const filePath = path.join(workloadsDir, fileName);
    const previous = fs.readFileSync(filePath, "utf-8");
    fs.unlinkSync(filePath);
    const snapshot = snapshotManager.reload();
    const error = snapshotManager.getLastError();
    if (error) {
        fs.writeFileSync(filePath, previous);
        snapshotManager.reload();
        throw new Error(error);
    }
    return {
        filePath,
        snapshot
    };
}
//# sourceMappingURL=workloads.js.map