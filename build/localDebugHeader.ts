import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin, ViteDevServer, PreviewServer } from "vite";

/** DEBUG_TEMPLATE：由 Caddy 仅输出固定布尔值的请求头模板。 */
export const DEBUG_TEMPLATE = '{{if eq (.Req.Header.Get "X-LOCAL-DEBUG") "1"}}1{{else}}0{{end}}';
/** DEBUG_MARKER：HTML 中的调试开关占位符。 */
export const DEBUG_MARKER = "__CDI_LOCAL_DEBUG__";

/** localDebugHeader：在开发、预览和部署环境传递 HTML 请求头开关。 */
export function localDebugHeader(): Plugin {
    const install = (server: ViteDevServer | PreviewServer, preview: boolean) => {
        server.middlewares.use(async (req, res, next) => {
            const path = new URL(req.url || "/", "http://localhost").pathname;
            if (/^\/(api(?:\/|$)|health(?:\/|$)|@|src\/|node_modules\/)/.test(path)) return next();
            if (req.method !== "GET" || !req.headers.accept?.includes("text/html")) return next();
            try {
                const file = resolve(server.config.root, preview ? `${server.config.build.outDir}/index.html` : "index.html");
                const html = (await readFile(file, "utf8"))
                    .replace(preview ? DEBUG_TEMPLATE : DEBUG_MARKER, req.headers["x-local-debug"] === "1" ? "1" : "0");
                const result = preview ? html : await (server as ViteDevServer).transformIndexHtml(req.url || "/", html);
                res.setHeader("Content-Type", "text/html; charset=utf-8");
                res.setHeader("Cache-Control", "private, no-store");
                res.setHeader("Vary", "X-LOCAL-DEBUG");
                res.end(result);
            } catch (error) { next(error); }
        });
    };
    return {
        name: "cdi-local-debug-header",
        transformIndexHtml: {
            order: "post",
            handler: (html, context) => context.server ? html : html.replace(DEBUG_MARKER, DEBUG_TEMPLATE),
        },
        configureServer: (server) => install(server, false),
        configurePreviewServer: (server) => install(server, true),
    };
}
