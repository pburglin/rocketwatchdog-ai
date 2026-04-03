import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId?: string;
    rwdStartTimeMs?: number;
    rwdTrafficMeta?: {
      workloadId?: string;
      reasonCodes?: string[];
      decision?: string;
    };
  }
}
