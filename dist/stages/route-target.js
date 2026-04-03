export class RouteTargetStage {
    async run(ctx) {
        if (ctx.route.includes("/mcp")) {
            ctx.target = "mcp";
        }
        else if (ctx.route.includes("/llm") || ctx.route.includes("/chat/completions")) {
            ctx.target = "llm";
        }
        else {
            ctx.target = "llm"; // Default to LLM if not explicitly MCP
        }
        return ctx;
    }
}
//# sourceMappingURL=route-target.js.map