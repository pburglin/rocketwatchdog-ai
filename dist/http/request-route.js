export function getRequestRoute(request) {
    const routePattern = request.routeOptions.url;
    if (!routePattern || routePattern.includes("*")) {
        return request.url;
    }
    return routePattern;
}
//# sourceMappingURL=request-route.js.map