import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
    document.head.querySelectorAll('link[rel="modulepreload"]').forEach((link) => link.remove());
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("preloadCAMRemote", () => {
    it("preloads the remote entry from a manifest without credentials", async () => {
        vi.stubEnv("VITE_CAM_REMOTE_ENTRY", "https://cam.example/mf-manifest.json");
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ metaData: { remoteEntry: { name: "remoteEntry.js", path: "assets/" } } }) });
        vi.stubGlobal("fetch", fetchMock);
        const { preloadCAMRemote } = await import("@/preloadCAMRemote");
        await preloadCAMRemote();
        expect(fetchMock).toHaveBeenCalledWith("https://cam.example/mf-manifest.json", { credentials: "omit" });
        expect(document.querySelector('link[href="https://cam.example/assets/remoteEntry.js"]')).toHaveAttribute("rel", "modulepreload");
    });
});
