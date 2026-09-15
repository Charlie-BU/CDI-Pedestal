import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEBUG_STORAGE_KEY, getApiBase, getRemoteEntry, isLocalDebugEnabled, normalizeDebugUrl, readDebugSettings, saveDebugSettings } from "@/localDebug";
import localDebugRuntimePlugin from "@/localDebugRuntimePlugin";

beforeEach(() => {
    document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="1">');
    sessionStorage.clear();
});
afterEach(() => {
    document.querySelector('meta[name="cdi-local-debug"]')?.remove();
    sessionStorage.clear();
});

describe("local debug configuration", () => {
    it("ignores stored overrides unless the HTML request enables debugging", () => {
        saveDebugSettings({ cam: { frontend: "http://localhost:9100", backend: "http://localhost:9101" } });
        document.querySelector('meta[name="cdi-local-debug"]')?.setAttribute("content", "0");
        expect(isLocalDebugEnabled()).toBe(false);
        expect(getRemoteEntry("cam", "https://remote.example/mf-manifest.json")).toBe("https://remote.example/mf-manifest.json");
        expect(getApiBase("cam")).toBe("/api/cam");
        expect(() => saveDebugSettings({})).toThrow();
    });
    it("resolves independent overrides and restores defaults when fields are cleared", () => {
        saveDebugSettings({ cam: { frontend: " http://localhost:9100/ ", backend: "" } });
        expect(getRemoteEntry("cam", "default")).toBe("http://localhost:9100/mf-manifest.json");
        expect(getApiBase("cam")).toBe("/api/cam");
        saveDebugSettings({ cam: { frontend: "", backend: "http://localhost:9101/" } });
        expect(getRemoteEntry("cam", "default")).toBe("default");
        expect(getApiBase("cam")).toBe("http://localhost:9101");
        saveDebugSettings({ cam: { frontend: " ", backend: " " } });
        expect(getApiBase("cam")).toBe("/api/cam");
        expect(getRemoteEntry("cam", "default")).toBe("default");
    });
    it("accepts explicit manifests and remote entries as well as base paths", () => {
        for (const frontend of ["https://dev.example/app/mf-manifest.json", "http://localhost:9100/remoteEntry.js"]) {
            saveDebugSettings({ cam: { frontend } });
            expect(getRemoteEntry("cam", "default")).toBe(frontend);
        }
        saveDebugSettings({ cam: { frontend: "http://localhost:9100/cam" } });
        expect(getRemoteEntry("cam", "default")).toBe("http://localhost:9100/cam/mf-manifest.json");
    });
    it.each(["javascript:alert(1)", "file:///tmp/file", "ftp://localhost", "//localhost", "localhost:9100", "https://user:password@example.test", "https://example.test/?token=a", "https://example.test/#fragment"])("rejects invalid URL %s", (value) => {
        expect(() => normalizeDebugUrl(value)).toThrow();
    });
    it("recovers from malformed storage and ignores unknown applications", () => {
        sessionStorage.setItem(DEBUG_STORAGE_KEY, "broken");
        expect(readDebugSettings()).toEqual({ cam: { frontend: "", backend: "" } });
        saveDebugSettings({ unknown: { frontend: "http://localhost:9999" } });
        expect(readDebugSettings()).not.toHaveProperty("unknown");
    });
    it("selects the local entry before Federation registers remotes and preserves their metadata", () => {
        saveDebugSettings({ cam: { frontend: "http://localhost:9100" } });
        const remote = { name: "__mfe_internal__cdi_pedestal__mf_owner__1__cam", alias: "cam", entry: "https://remote.example/mf-manifest.json", type: "module" };
        const other = { name: "other", entry: "https://other.example/entry.js", type: "module" };
        localDebugRuntimePlugin().beforeRegisterRemote({ remote });
        localDebugRuntimePlugin().beforeRegisterRemote({ remote: other });
        expect(remote).toEqual({ name: "__mfe_internal__cdi_pedestal__mf_owner__1__cam", alias: "cam", entry: "http://localhost:9100/mf-manifest.json", type: "module" });
        expect(other.entry).toBe("https://other.example/entry.js");
    });
});
