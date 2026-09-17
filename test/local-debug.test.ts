import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEBUG_STORAGE_KEY, getApiBase, getRemoteEntry, isLocalDebugEnabled, normalizeDebugUrl, readDebugSettings, saveDebugSettings } from "@/localDebug";
import { setDebugApplications } from "@/localDebug";
import { cam } from "./fixtures/applications";

beforeEach(() => {
    setDebugApplications([cam]);
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
        expect(getApiBase("cam")).toBe(cam.api_base);
        expect(() => saveDebugSettings({})).toThrow();
    });
    it("resolves independent overrides and restores defaults when fields are cleared", () => {
        saveDebugSettings({ cam: { frontend: " http://localhost:9100/ ", backend: "" } });
        expect(getRemoteEntry("cam", "https://remote.example/mf-manifest.json")).toBe("http://localhost:9100/mf-manifest.json");
        expect(getApiBase("cam")).toBe(cam.api_base);
        saveDebugSettings({ cam: { frontend: "", backend: "http://localhost:9101/" } });
        expect(getRemoteEntry("cam", "https://remote.example/mf-manifest.json")).toBe("https://remote.example/mf-manifest.json");
        expect(getApiBase("cam")).toBe("http://localhost:9101");
        saveDebugSettings({ cam: { frontend: " ", backend: " " } });
        expect(getApiBase("cam")).toBe(cam.api_base);
        expect(getRemoteEntry("cam", "https://remote.example/mf-manifest.json")).toBe("https://remote.example/mf-manifest.json");
    });
    it("accepts explicit manifests and remote entries as well as base paths", () => {
        for (const frontend of ["https://dev.example/app/mf-manifest.json", "http://localhost:9100/remoteEntry.js"]) {
            saveDebugSettings({ cam: { frontend } });
            expect(getRemoteEntry("cam", "https://remote.example/mf-manifest.json")).toBe(frontend);
        }
        saveDebugSettings({ cam: { frontend: "http://localhost:9100/cam" } });
        expect(getRemoteEntry("cam", "https://remote.example/mf-manifest.json")).toBe("http://localhost:9100/cam/mf-manifest.json");
    });
    it("preserves explicit catalog entries and iframe URLs", () => {
        document.querySelector('meta[name="cdi-local-debug"]')?.remove();
        for (const entry of ["https://remote.example/mf-manifest.json", "https://remote.example/remoteEntry.js", "https://remote.example/remoteEntry.mjs"]) {
            expect(getRemoteEntry("cam", entry)).toBe(entry);
        }
        setDebugApplications([{ ...cam, app_type: "iframe" }]);
        expect(getRemoteEntry("cam", "https://remote.example/app/")).toBe("https://remote.example/app/");
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
    it("ignores saved overrides when an application becomes inaccessible", () => {
        saveDebugSettings({ cam: { backend: "http://localhost:9101" } });
        setDebugApplications([{ ...cam, frontend_url: "" }]);
        expect(getApiBase("cam")).toBe(cam.api_base);
    });
});
