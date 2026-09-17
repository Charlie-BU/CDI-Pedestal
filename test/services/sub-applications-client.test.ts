import axios, { type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ApplicationInput } from "@/subApplications";
import { cam } from "../fixtures/applications";

const values: ApplicationInput = {
    app_key: "cam", name_zh: "CAM", name_en: "CAM", description_zh: "", description_en: "",
    icon_url: "", app_type: "federation", route_path: "/cam", frontend_url: cam.frontend_url,
    remote_name: "cam", exposed_module: "./App", backend_url: cam.backend_url,
    sort_order: 0, enabled: true, show_in_menu: true, require_login: true,
};
let requests: InternalAxiosRequestConfig[];
beforeEach(() => {
    vi.resetModules();
    requests = [];
    const storage = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) });
    const create = axios.create.bind(axios);
    vi.spyOn(axios, "create").mockImplementation((config) => create({ ...config, adapter: async (request) => {
        requests.push(request);
        return { data: { status: request.url?.endsWith("/create") ? 201 : 200, message: "ok", items: [cam], total: 1, item: cam }, status: 200, statusText: "OK", headers: {}, config: request };
    } }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("uses generated requests with fixed base URL, token injection and matching backend payloads", async () => {
    const { CDIService, TOKEN_KEY } = await import("@/services/CDIService");
    localStorage.setItem(TOKEN_KEY, "test-token");
    const signal = new AbortController().signal;
    const result = await CDIService.GetAllSubApplicationsGET({ page: "2", page_size: "100", search: "cam", app_type: "federation", enabled: "false" }, { signal });
    expect(result.items[0].app_type).toBe("federation");
    expect(result.total).toBe(1);
    const created = await CDIService.CreateSubApplicationPOST({ ...values, Authorization: "" });
    expect(created.status).toBe(201);
    await CDIService.UpdateSubApplicationPOST({ id: 1, values, Authorization: "" });
    await CDIService.SetSubApplicationEnabledPOST({ id: 1, enabled: false, Authorization: "" });
    await CDIService.ReorderSubApplicationsPOST({ ids: [2, 1], Authorization: "" });
    await CDIService.DeleteSubApplicationByIdPOST({ id: 1, Authorization: "" });
    await CDIService.GetSubApplicationByIdGET({ id: "1", Authorization: "" });
    expect(requests.map(({ url, method }) => [url, method])).toEqual([
        ["/v1/sub-application/list", "get"], ["/v1/sub-application/create", "post"],
        ["/v1/sub-application/update", "post"], ["/v1/sub-application/set-enabled", "post"],
        ["/v1/sub-application/reorder", "post"], ["/v1/sub-application/delete", "post"],
        ["/v1/sub-application/detail", "get"],
    ]);
    expect(requests[0].params).toEqual({ page: "2", page_size: "100", search: "cam", app_type: "federation", enabled: "false" });
    expect(requests[0].signal).toBe(signal);
    expect(requests.slice(1, 6).map((request) => JSON.parse(request.data))).toEqual([
        values, { id: 1, values }, { id: 1, enabled: false }, { ids: [2, 1] }, { id: 1 },
    ]);
    for (const request of requests) {
        expect(request.baseURL).toBe("/api/cdi");
        expect(request.headers.get("Authorization")).toBe("Bearer test-token");
    }
});

it("supports anonymous lists and preserves AbortSignal cancellation", async () => {
    const { CDIService } = await import("@/services/CDIService");
    await CDIService.GetAllSubApplicationsGET({});
    expect(requests[0].headers.get("Authorization")).toBeUndefined();
    const controller = new AbortController();
    controller.abort();
    await expect(CDIService.GetAllSubApplicationsGET({}, { signal: controller.signal })).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(requests).toHaveLength(1);
});
