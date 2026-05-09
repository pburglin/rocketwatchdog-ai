const TEXT_KEYS = new Set([
    "prompt",
    "input",
    "query",
    "response",
    "output",
    "text",
    "instructions",
    "content"
]);
const SKIP_BRANCH_KEYS = new Set([
    "tools",
    "tool_choice",
    "parameters",
    "properties",
    "$defs",
    "definitions",
    "schema",
    "json_schema",
    "response_format"
]);
const SKIP_METADATA_KEYS = new Set([
    "description",
    "title",
    "examples",
    "example",
    "enum",
    "default",
    "const",
    "required",
    "name",
    "type"
]);
const STRUCTURED_CONTEXT_KEYS = new Set([
    "previousMessages",
    "priorMessages",
    "earlierMessages",
    "messageHistory"
]);
function pushText(parts, value) {
    if (typeof value !== "string")
        return;
    const trimmed = value.trim();
    if (trimmed)
        parts.push(trimmed);
}
function collectText(value, parts, depth = 0) {
    if (depth > 6 || value === null || value === undefined)
        return;
    if (typeof value === "string") {
        pushText(parts, value);
        return;
    }
    if (Array.isArray(value)) {
        for (const item of value)
            collectText(item, parts, depth + 1);
        return;
    }
    if (typeof value !== "object")
        return;
    const record = value;
    for (const [key, entry] of Object.entries(record)) {
        if (SKIP_BRANCH_KEYS.has(key) || SKIP_METADATA_KEYS.has(key)) {
            continue;
        }
        if (key === "messages") {
            pushText(parts, extractTextFromMessages(entry));
            continue;
        }
        if (STRUCTURED_CONTEXT_KEYS.has(key)) {
            parts.push(key);
            collectText(entry, parts, depth + 1);
            continue;
        }
        if (TEXT_KEYS.has(key) || key === "arguments" || key === "params") {
            collectText(entry, parts, depth + 1);
            continue;
        }
        if (Array.isArray(entry) || (entry && typeof entry === "object")) {
            collectText(entry, parts, depth + 1);
        }
    }
}
export function extractTextFromMessages(messages) {
    if (!Array.isArray(messages))
        return "";
    const parts = [];
    for (const message of messages) {
        if (!message || typeof message !== "object")
            continue;
        const content = message.content;
        if (typeof content === "string") {
            pushText(parts, content);
            continue;
        }
        if (Array.isArray(content)) {
            collectText(content, parts, 1);
        }
    }
    return parts.join("\n");
}
export function extractPrimaryText(payload) {
    if (!payload || typeof payload !== "object")
        return "";
    const parts = [];
    collectText(payload, parts);
    return parts.join("\n");
}
export function extractToolDefinitions(tools) {
    if (!Array.isArray(tools))
        return [];
    const definitions = [];
    for (const tool of tools) {
        if (!tool || typeof tool !== "object")
            continue;
        const type = tool.type;
        if (type !== "function")
            continue;
        const fn = tool.function;
        if (!fn || typeof fn.name !== "string")
            continue;
        const entry = fn.parameters === undefined
            ? { name: fn.name }
            : { name: fn.name, parameters: fn.parameters };
        definitions.push(entry);
    }
    return definitions;
}
export function extractToolInvocations(payload) {
    if (!payload || typeof payload !== "object")
        return [];
    const record = payload;
    const candidateLists = [record.tool_calls, record.tool_inputs, record.output];
    const invocations = [];
    for (const entries of candidateLists) {
        if (!Array.isArray(entries))
            continue;
        for (const entry of entries) {
            if (!entry || typeof entry !== "object")
                continue;
            const directName = entry.name;
            const directArgs = entry.arguments;
            const fn = entry.function;
            const name = typeof directName === "string" ? directName : typeof fn?.name === "string" ? fn.name : undefined;
            const args = directArgs ?? fn?.arguments;
            if (typeof name !== "string")
                continue;
            invocations.push(args === undefined ? { name } : { name, arguments: args });
        }
    }
    return invocations;
}
//# sourceMappingURL=extract.js.map