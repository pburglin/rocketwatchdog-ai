import { buildCanonicalRequest } from "../pipeline/normalize.js";
export class NormalizeRequestStage {
    async run(ctx) {
        ctx.canonical = buildCanonicalRequest({ requestId: undefined, url: ctx.route, routerPath: ctx.route, ip: "" }, ctx.headers, ctx.payload);
        return ctx;
    }
}
//# sourceMappingURL=normalize-request.js.map