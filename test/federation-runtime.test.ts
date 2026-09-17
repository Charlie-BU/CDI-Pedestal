import { afterEach, describe, expect, it, vi } from "vitest";
import { cam } from "./fixtures/applications";
afterEach(() => vi.resetModules());
describe("dynamic federation", () => {
    it.each(["https://remote.example", "https://remote.example/", "https://remote.example/cam/"])("resolves catalog base URL %s before registering the remote", async (frontend_url) => {
        const { setDebugApplications } = await import("@/localDebug");
        const app = { ...cam, frontend_url };
        setDebugApplications([app]);
        const { default: plugin, loadApplication } = await import("@/federationRuntime");
        const runtime = { registerRemotes: vi.fn(), loadRemote: vi.fn().mockResolvedValue({ default: () => null }) };
        plugin().init({ origin: runtime });
        await loadApplication(app);
        expect(runtime.registerRemotes).toHaveBeenCalledWith([{ name: "cam", alias: "cam", entry: `${frontend_url.replace(/\/+$/, "")}/mf-manifest.json`, type: "module" }]);
    });
    it("registers a catalog application on the existing host and requires reload after backend changes", async () => {
        const { setDebugApplications } = await import("@/localDebug");
        setDebugApplications([cam]);
        const { default: plugin, loadApplication, needsApplicationReload } = await import("@/federationRuntime");
        const module = { default: () => null };
        const runtime = { registerRemotes: vi.fn(), loadRemote: vi.fn().mockResolvedValue(module) };
        plugin().init({ origin: runtime });
        expect(await loadApplication(cam)).toBe(module);
        expect(runtime.registerRemotes).toHaveBeenCalledWith([{ name: "cam", alias: "cam", entry: cam.frontend_url, type: "module" }]);
        expect(runtime.loadRemote).toHaveBeenCalledWith("cam/App");
        expect(needsApplicationReload({ ...cam, name_zh: "新名称" })).toBe(false);
        const changed = { ...cam, api_base: "/other" };
        setDebugApplications([changed]);
        expect(needsApplicationReload(changed)).toBe(true);
        await expect(loadApplication(changed)).rejects.toThrow("APPLICATION_RELOAD_REQUIRED");
    });
});
