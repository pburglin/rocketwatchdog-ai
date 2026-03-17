export function extractTextFromMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  const parts: string[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const content = (message as { content?: unknown }).content;
    if (typeof content === "string") {
      parts.push(content);
      continue;
    }
    if (Array.isArray(content)) {
      for (const item of content) {
        if (!item || typeof item !== "object") continue;
        const text = (item as { text?: unknown }).text;
        if (typeof text === "string") parts.push(text);
      }
    }
  }
  return parts.join("\n");
}

export function extractToolDefinitions(tools: unknown): { name: string; parameters?: unknown }[] {
  if (!Array.isArray(tools)) return [];
  const definitions: { name: string; parameters?: unknown }[] = [];
  for (const tool of tools) {
    if (!tool || typeof tool !== "object") continue;
    const type = (tool as { type?: unknown }).type;
    if (type !== "function") continue;
    const fn = (tool as { function?: { name?: unknown; parameters?: unknown } }).function;
    if (!fn || typeof fn.name !== "string") continue;
    const entry =
      fn.parameters === undefined
        ? { name: fn.name }
        : { name: fn.name, parameters: fn.parameters };
    definitions.push(entry);
  }
  return definitions;
}

export function extractToolInvocations(payload: unknown): { name: string; arguments?: unknown }[] {
  if (!payload || typeof payload !== "object") return [];
  const possible = (payload as { tool_calls?: unknown; tool_inputs?: unknown }).tool_calls;
  const toolInputs = (payload as { tool_inputs?: unknown }).tool_inputs;
  const entries = Array.isArray(possible) ? possible : Array.isArray(toolInputs) ? toolInputs : [];
  const invocations: { name: string; arguments?: unknown }[] = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const name = (entry as { name?: unknown }).name;
    const args = (entry as { arguments?: unknown }).arguments;
    if (typeof name !== "string") continue;
    invocations.push(args === undefined ? { name } : { name, arguments: args });
  }
  return invocations;
}
