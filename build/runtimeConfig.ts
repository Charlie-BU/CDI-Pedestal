import type { Plugin, ViteDevServer, PreviewServer } from "vite";

/** runtimeConfig：在本地开发及预览时提供公开的首页配置。 */
export function runtimeConfig(homePageUrl = ""): Plugin {
    const install = (server: ViteDevServer | PreviewServer) => {
        server.middlewares.use((req, res, next) => {
            if (req.url?.split("?")[0] !== "/runtime-config.json") return next();
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify({ homePageUrl }));
        });
    };
    return { name: "cdi-runtime-config", configureServer: install, configurePreviewServer: install };
}
