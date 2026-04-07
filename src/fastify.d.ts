import "fastify";

declare module "fastify" {
  interface FastifyInstance {
    snapshotManager?: import("./config/snapshot.js").ConfigSnapshotManager;
  }
  interface FastifyRequest {
    requestId?: string;
    rwdStartTimeMs?: number;
    rwdTrafficMeta?: {
      workloadId?: string;
      reasonCodes?: string[];
      decision?: string;
      backend?: string;
      integrationMode?: string;
    };
    rwdCanonicalRequest?: import("./types/canonical.js").CanonicalRequest;
  }
}
