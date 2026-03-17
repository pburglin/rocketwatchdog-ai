export type RequestContext = {
  route: string;
  headers: Record<string, string>;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  sourceApp?: string;
  model?: string;
};
