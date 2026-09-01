import { federation } from "@module-federation/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const apiEnv = loadEnv(mode, process.cwd(), "API_UPSTREAM_");
    const port = Number(env.VITE_FE_PORT) || 9100;
    const cloudMaterialsPath = fileURLToPath(
        new URL("./cloud-materials-common/@cloud-materials/common", import.meta.url),
    );
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
                        entry:
                            env.VITE_CAM_REMOTE_ENTRY ||
                            "http://localhost:9000/mf-manifest.json",
                    },
                },
                shared: {
                    react: { singleton: true },
                    "react-router-dom": { singleton: true },
                },
            }),
        ],
        resolve: {
            alias: {
                "@": fileURLToPath(new URL("./src", import.meta.url)),
                "@cloud-materials/common": cloudMaterialsPath,
                "@babel/runtime-corejs3/core-js-stable/map": nativeMapShimPath,
            },
            dedupe: ["react", "react-dom", "react-router-dom"],
        },
        server: {
            port,
            origin: `http://localhost:${port}`,
            proxy: {
                "/api": {
                    target: apiEnv.API_UPSTREAM_BASE_URL,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ""),
                },
            },
        },
        build: { target: "chrome89" },
    };
});
