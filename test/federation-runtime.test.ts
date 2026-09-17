import { afterEach, describe, expect, it, vi } from "vitest";
import { cam } from "./fixtures/applications";
afterEach(() => vi.resetModules());
describe("dynamic federation", () => {
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
