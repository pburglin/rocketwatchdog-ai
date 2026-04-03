export function extractTextFromMessages(messages) {
    if (!Array.isArray(messages))
        return "";
    const parts = [];
    for (const message of messages) {
        if (!message || typeof message !== "object")
            continue;
        const content = message.content;
        if (typeof content === "string") {
            parts.push(content);
            continue;
        }
        if (Array.isArray(content)) {
            for (const item of content) {
                if (!item || typeof item !== "object")
                    continue;
                const text = item.text;
                if (typeof text === "string")
                    parts.push(text);
            }
        }
    }
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
    const possible = payload.tool_calls;
    const toolInputs = payload.tool_inputs;
    const entries = Array.isArray(possible) ? possible : Array.isArray(toolInputs) ? toolInputs : [];
    const invocations = [];
    for (const entry of entries) {
        if (!entry || typeof entry !== "object")
            continue;
        const name = entry.name;
        const args = entry.arguments;
        if (typeof name !== "string")
            continue;
        invocations.push(args === undefined ? { name } : { name, arguments: args });
    }
    return invocations;
}
//# sourceMappingURL=extract.js.map