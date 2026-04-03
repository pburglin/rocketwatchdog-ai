export function sanitizeSnapshotForExposure(snapshot) {
    return {
        ...snapshot,
        platform: {
            ...snapshot.platform,
            redaction: {
                ...snapshot.platform.redaction,
                secret_patterns: snapshot.platform.redaction.secret_patterns.map(() => "[redacted-pattern]")
            }
        }
    };
}
//# sourceMappingURL=exposure.js.map