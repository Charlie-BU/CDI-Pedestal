import { localDebugHeader } from "./build/localDebugHeader";
import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const port = Number(env.VITE_FE_PORT) || 9000;
    const cdiUpstream = env.CDI_UPSTREAM_BASE_URL;
    const nativeMapShimPath = fileURLToPath(
        new URL("./src/shims/babel-runtime-map.ts", import.meta.url),
    );

    return {
        plugins: [
            localDebugHeader(),
            react(),
            federation({
                name: "cdi_pedestal",
                dts: false,
                // 基座先使用自身共享依赖，避免本地 remote 离线阻塞调试入口。
                shareStrategy: "loaded-first",
                runtimePlugins: [fileURLToPath(new URL("./src/federationRuntime.ts", import.meta.url))],
                remotes: {},
                shared: {
                    react: { singleton: true },
                    // Vite dev 的共享 facade 不暴露 createPortal 等具名导出；
                    // 仅让生产构建共享 react-dom，避免公共组件库预构建失败。
                    ...(command === "build"
                        ? {
                              "react-dom": { singleton: true },
                              "@cloud-materials/common": { singleton: true },
                          }
                        : {}),
                    "react-router-dom": { singleton: true },
                },
            }),
        ],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
                "@babel/runtime-corejs3/core-js-stable/map": nativeMapShimPath,
            },
            dedupe: ["react", "react-dom", "react-router-dom"],
        },
        server: {
            port,
            origin: `http://localhost:${port}`,
            proxy: {
                // 基座固定控制服务入口；子应用通过数据库下发的 URL 直连后端。
                "/api/cdi": {
                    target: cdiUpstream,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/cdi(?=\/|$)/, ""),
                },
            },
        },
        build: { target: "chrome89" },
    };
});
