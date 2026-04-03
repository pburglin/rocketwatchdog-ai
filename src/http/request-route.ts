import type { FastifyRequest } from "fastify";

export function getRequestRoute(request: FastifyRequest): string {
  const routePattern = request.routeOptions.url;
  if (!routePattern || routePattern.includes("*")) {
    return request.url;
  }
  return routePattern;
}
