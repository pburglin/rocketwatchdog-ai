import type { FastifyInstance } from "fastify";
import type { EffectivePolicy } from "../types/config.js";
import { ConfigSnapshotManager } from "../config/snapshot.js";
export declare function registerRoutes(app: FastifyInstance<any, any, any, any, any>, snapshotManager: ConfigSnapshotManager, resolvePolicy: (route: string, headers: Record<string, string>, payload?: Record<string, unknown>) => EffectivePolicy): void;
