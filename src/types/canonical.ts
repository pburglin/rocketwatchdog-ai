export type CanonicalRequest = {
  requestId: string;
  timestamp: string;
  sourceApp?: string;
  route: string;
  headers: Record<string, string>;
  clientIp?: string;
  userId?: string;
  sessionId?: string;
  workloadHint?: string;
  payload: Record<string, unknown>;
  promptText?: string;
  messages: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
};

export type CanonicalResponse = {
  requestId: string;
  provider?: string;
  model?: string;
  rawOutput?: Record<string, unknown>;
  outputText?: string;
  toolCalls: Array<Record<string, unknown>>;
  metadata: Record<string, unknown>;
};
