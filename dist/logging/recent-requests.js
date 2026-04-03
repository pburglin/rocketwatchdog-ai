const entries = [];
let nextId = 1;
const MAX_ENTRIES = 500;
export function recordRecentRequest(entry) {
    entries.push({
        ...entry,
        id: String(nextId++)
    });
    if (entries.length > MAX_ENTRIES) {
        entries.splice(0, entries.length - MAX_ENTRIES);
    }
}
export function getRecentRequests(limit = 100) {
    return entries.slice(-limit).reverse();
}
//# sourceMappingURL=recent-requests.js.map