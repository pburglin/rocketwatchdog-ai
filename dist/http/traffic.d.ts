import type { FastifyInstance } from "fastify";
export declare function registerTrafficLogging(app: FastifyInstance<any, any, any, any, any>): void;
export declare function registerTrafficRoutes(app: FastifyInstance<any, any, any, any, any>, requireAuth: (request: unknown, reply: unknown) => boolean): void;
