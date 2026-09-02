import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const port = Number(env.VITE_FE_PORT) || 9000;
    const camUpstream = env.CAM_UPSTREAM_BASE_URL;
    const camRemoteEntry = env.VITE_CAM_REMOTE_ENTRY;
    if (!camRemoteEntry) {
        throw new Error(
            "VITE_CAM_REMOTE_ENTRY is required to load the CAM remote module.",
        );
    }
    const nativeMapShimPath = fileURLToPath(
        new URL("./src/shims/babel-runtime-map.ts", import.meta.url),
    );

    return {
        plugins: [
            react(),
            federation({
                name: "cdi_pedestal",
                dts: false,
                remotes: {
                    cam: {
                        type: "module",
                        name: "cam",
                        entry: camRemoteEntry,
                    },
                },
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
                // 基座和 CAM 子应用统一使用 /api/cam/v1/*。
                "/api/cam": {
                    target: camUpstream,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/cam(?=\/|$)/, ""),
                },
            },
        },
        build: { target: "chrome89" },
    };
});
