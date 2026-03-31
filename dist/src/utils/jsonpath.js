export function getByJsonPath(payload, path) {
    if (!path)
        return undefined;
    const normalized = path.startsWith("$.") ? path.slice(2) : path.replace(/^\./, "");
    if (!normalized)
        return undefined;
    const parts = normalized.split(".");
    let current = payload;
    for (const part of parts) {
        if (current && typeof current === "object" && part in current) {
            current = current[part];
        }
        else {
            return undefined;
        }
    }
    return current;
}
//# sourceMappingURL=jsonpath.js.map