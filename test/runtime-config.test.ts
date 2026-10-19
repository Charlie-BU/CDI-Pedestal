import { afterEach, describe, expect, it, vi } from "vitest";
import { getHomePageMode, getHomePageUrl, loadRuntimeConfig } from "@/runtimeConfig";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const respond = (value: unknown) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => value }));
describe("public runtime home configuration", () => {
    it("reads fresh public configuration without sending credentials", async () => {
        respond({ homePageUrl: " https://home.example.test/?q=a%22b " });
        await loadRuntimeConfig();
        expect(getHomePageUrl()).toBe("https://home.example.test/?q=a%22b");
        expect(getHomePageMode()).toBe("embedded");
        expect(fetch).toHaveBeenCalledWith("/runtime-config.json", expect.objectContaining({ cache: "no-store", credentials: "omit" }));
    });
    it.each([{}, null, { homePageUrl: 42 }, { homePageUrl: "" }, { homePageUrl: "javascript:alert(1)" }, { homePageUrl: "https://user:password@home.example.test" }, { homePageUrl: window.location.origin }])("falls back safely for invalid configuration %j", async (value) => {
        respond(value);
        await loadRuntimeConfig();
        expect(getHomePageUrl()).toBe("");
    });
    it("clears stale configuration after a network or JSON failure", async () => {
        respond({ homePageUrl: "https://home.example.test" });
        await loadRuntimeConfig();
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
        await loadRuntimeConfig();
        expect(getHomePageUrl()).toBe("");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => { throw new Error("invalid JSON"); } }));
        await loadRuntimeConfig();
        expect(getHomePageUrl()).toBe("");
    });
    it("aborts a stalled request so startup can continue", async () => {
        vi.useFakeTimers();
        vi.stubGlobal("fetch", vi.fn((_url, options: RequestInit) => new Promise((_resolve, reject) => {
            options.signal!.addEventListener("abort", () => reject(new Error("aborted")));
        })));
        const pending = loadRuntimeConfig();
        await vi.advanceTimersByTimeAsync(3000);
        await pending;
        expect(getHomePageUrl()).toBe("");
        expect(getHomePageMode()).toBe("unavailable");
    });
    it.each([{}, { homePageUrl: "" }, { homePageUrl: "   " }])("uses the default page only for explicitly absent URL %j", async (value) => {
        respond(value);
        await loadRuntimeConfig();
        expect(getHomePageMode()).toBe("default");
    });
    it.each([null, { homePageUrl: 42 }, { homePageUrl: "javascript:alert(1)" }])("does not use the default page for invalid configuration %j", async (value) => {
        respond(value);
        await loadRuntimeConfig();
        expect(getHomePageMode()).toBe("unavailable");
    });
});
