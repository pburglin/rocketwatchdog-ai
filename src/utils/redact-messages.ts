import { redactSecrets } from "../core/guard/redaction.js";

export function redactMessages(
  messages: unknown,
  patterns?: string[]
): { redactedMessages: unknown; hits: number } {
  if (!Array.isArray(messages)) return { redactedMessages: messages, hits: 0 };
  let totalHits = 0;
  const nextMessages = messages.map((message) => {
    if (!message || typeof message !== "object") return message;
    const content = (message as { content?: unknown }).content;
    if (typeof content === "string") {
      const { redacted, hits } = redactSecrets(content, patterns);
      totalHits += hits;
      return { ...message, content: redacted };
    }
    if (Array.isArray(content)) {
      const nextContent = content.map((item) => {
        if (!item || typeof item !== "object") return item;
        const text = (item as { text?: unknown }).text;
        if (typeof text !== "string") return item;
        const { redacted, hits } = redactSecrets(text, patterns);
        totalHits += hits;
        return { ...item, text: redacted };
      });
      return { ...message, content: nextContent };
    }
    return message;
  });
  return { redactedMessages: nextMessages, hits: totalHits };
}
