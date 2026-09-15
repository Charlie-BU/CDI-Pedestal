import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
            "cam/App": fileURLToPath(new URL("./test/fixtures/cam-remote.tsx", import.meta.url)),
        },
    },
    test: { environment: "jsdom", include: ["test/**/*.test.{ts,tsx}"], setupFiles: ["./test/setup.ts"] },
});
