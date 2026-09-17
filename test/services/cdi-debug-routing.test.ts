import axios, { type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getApiBase, saveDebugSettings, setDebugApplications } from "@/localDebug";

import { cam } from "../fixtures/applications";

beforeEach(() => {
    setDebugApplications([cam]);
    vi.resetModules();
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), clear: () => storage.clear() });
    document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="1">');
    sessionStorage.clear();
});
afterEach(() => {
    document.querySelector('meta[name="cdi-local-debug"]')?.remove();
    sessionStorage.clear();
    vi.unstubAllGlobals();
});

describe("CDI debug transport", () => {
    it.each(["", "http://localhost:9101"])("keeps shell requests on /api/cdi with remote override %s and preserves auth and cancellation", async (backend) => {
        saveDebugSettings({ cam: { backend } });
        const actualCreate = axios.create.bind(axios);
        const requests: InternalAxiosRequestConfig[] = [];
        vi.spyOn(axios, "create").mockImplementation((config) => actualCreate({ ...config, adapter: async (request) => {
            requests.push(request);
            return { data: { user: { username: "test-user" } }, status: 200, statusText: "OK", headers: {}, config: request };
        } }));
        const { CDIService, TOKEN_KEY } = await import("@/services/CDIService");
        localStorage.setItem(TOKEN_KEY, "test-access-token");
        const controller = new AbortController();
        await CDIService.GetMyInfoGET({ Authorization: "" }, { signal: controller.signal });
        expect(requests[0].baseURL).toBe("/api/cdi");
        expect(getApiBase("cam")).toBe(backend || cam.api_base);
        expect(requests[0].url).toMatch(/^\/v1\//);
        expect(requests[0].headers.get("Authorization")).toBe("Bearer test-access-token");
        expect(requests[0].signal).toBe(controller.signal);
    });
});
