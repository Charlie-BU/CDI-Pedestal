import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
    document.head.querySelectorAll('link[rel="modulepreload"]').forEach((link) => link.remove());
    document.querySelector('meta[name="cdi-local-debug"]')?.remove();
    sessionStorage.clear();
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("preloadCAMRemote", () => {
    it("preloads a configured JavaScript entry without trying to parse it as a manifest", async () => {
        document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="1">');
        const { saveDebugSettings } = await import("@/localDebug");
        saveDebugSettings({ cam: { frontend: "http://localhost:9100/remoteEntry.js" } });
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const { preloadCAMRemote } = await import("@/preloadCAMRemote");
        await preloadCAMRemote();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(document.querySelector('link[href="http://localhost:9100/remoteEntry.js"]')).toHaveAttribute("rel", "modulepreload");
    });

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
