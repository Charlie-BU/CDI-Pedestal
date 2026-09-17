import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDebugRefreshInitializer } from "@/local-debug/refresh";
import { saveDebugSettings, setDebugApplications } from "@/local-debug";
import { cam } from "./fixtures/applications";

beforeEach(() => {
    setDebugApplications([cam]);
    sessionStorage.clear();
    document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="1">');
});
afterEach(() => {
    document.querySelector('meta[name="cdi-local-debug"]')?.remove();
    sessionStorage.clear();
    for (const key of ["$RefreshReg$", "$RefreshSig$", "__vite_plugin_react_preamble_installed__"]) Reflect.deleteProperty(window, key);
});
it("initializes the actual remote runtime once before resolving concurrent loads", async () => {
    saveDebugSettings({ cam: { frontend: "http://localhost:9100/cam/" } });
    const injectIntoGlobalHook = vi.fn();
    const importer = vi.fn().mockResolvedValue({ injectIntoGlobalHook });
    const prepare = createDebugRefreshInitializer(importer);
    await Promise.all([prepare("cam"), prepare("cam")]);
    expect(importer).toHaveBeenCalledExactlyOnceWith("http://localhost:9100/cam/@react-refresh");
    expect(injectIntoGlobalHook).toHaveBeenCalledExactlyOnceWith(window);
    expect(Reflect.get(window, "$RefreshReg$")).toBeTypeOf("function");
    expect(Reflect.get(window, "__vite_plugin_react_preamble_installed__")).toBe(true);
});
it("does not request development runtime for production or backend-only overrides", async () => {
    const importer = vi.fn();
    const prepare = createDebugRefreshInitializer(importer);
    await prepare("cam");
    saveDebugSettings({ cam: { backend: "http://localhost:9101" } });
    await prepare("cam");
    saveDebugSettings({ cam: { frontend: "http://localhost:9100" } });
    document.querySelector('meta[name="cdi-local-debug"]')?.setAttribute("content", "0");
    await prepare("cam");
    expect(importer).not.toHaveBeenCalled();
});
it("permits non-Vite overrides and retries a failed development runtime", async () => {
    saveDebugSettings({ cam: { frontend: "http://localhost:9100/remoteEntry.js" } });
    const injectIntoGlobalHook = vi.fn();
    const importer = vi.fn().mockRejectedValueOnce(new Error("missing runtime")).mockResolvedValueOnce({ default: { injectIntoGlobalHook } });
    const prepare = createDebugRefreshInitializer(importer);
    await expect(prepare("cam")).resolves.toBeUndefined();
    expect(Reflect.get(window, "$RefreshReg$")).toBeUndefined();
    await prepare("cam");
    expect(injectIntoGlobalHook).toHaveBeenCalledOnce();
});
