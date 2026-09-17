import { beforeEach, describe, expect, it, vi } from "vitest";
import { cam } from "../fixtures/applications";
vi.mock("@/services/CDIService", () => ({ CDIService: { GetAllSubApplicationsGET: vi.fn() } }));
import { CDIService } from "@/services/CDIService";
vi.mock("@/services/cache", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/services/cache")>(),
    getCachedResponse: vi.fn().mockResolvedValue(undefined),
    cacheResponse: vi.fn().mockResolvedValue(undefined),
}));
import { cacheResponse, getCachedResponse } from "@/services/cache";
import { useApplications } from "@/hooks/useApplications";
beforeEach(() => {
    vi.mocked(CDIService.GetAllSubApplicationsGET).mockReset();
    vi.mocked(getCachedResponse).mockReset().mockResolvedValue(undefined);
    vi.mocked(cacheResponse).mockClear();
    useApplications.setState({ apps: [], ready: false, identity: null, loading: true, error: "" });
});
describe("runtime directory identity", () => {
    it("does not let an earlier authenticated request overwrite an anonymous catalog", async () => {
        let resolveOld!: (value: { items: typeof cam[]; total: number; status: number; message: string }) => void;
        vi.mocked(CDIService.GetAllSubApplicationsGET).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce({ items: [], total: 0, status: 200, message: "ok" });
        const old = useApplications.getState().load("old-token");
        await vi.waitFor(() => expect(resolveOld).toBeDefined());
        await useApplications.getState().load("");
        resolveOld({ items: [cam], total: 1, status: 200, message: "ok" });
        await old;
        expect(useApplications.getState().identity).toBe("");
        expect(useApplications.getState().apps).toEqual([]);
    });
    it("loads all enabled application pages through the unified list", async () => {
        const second = { ...cam, id: 2, app_key: "second", route_path: "/second" };
        const list = vi.mocked(CDIService.GetAllSubApplicationsGET).mockReset();
        list.mockResolvedValueOnce({ items: [cam], total: 2, status: 200, message: "ok" })
            .mockResolvedValueOnce({ items: [second], total: 2, status: 200, message: "ok" });
        await useApplications.getState().load("token");
        expect(useApplications.getState().apps).toEqual([cam, second]);
        expect(list).toHaveBeenNthCalledWith(1, { page: "1", page_size: "100", enabled: "true" }, { signal: expect.any(AbortSignal) });
        expect(list).toHaveBeenNthCalledWith(2, { page: "2", page_size: "100", enabled: "true" }, { signal: expect.any(AbortSignal) });
    });
    it("keeps initial loading until all pages complete and caches the complete directory", async () => {
        let finish!: (response: { items: typeof cam[]; total: number; status: number; message: string }) => void;
        vi.mocked(CDIService.GetAllSubApplicationsGET).mockResolvedValueOnce({ items: [cam], total: 2, status: 200, message: "ok" })
            .mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        const pending = useApplications.getState().load("token");
        await vi.waitFor(() => expect(finish).toBeDefined());
        expect(useApplications.getState()).toMatchObject({ loading: true, ready: false, apps: [], error: "" });
        const second = { ...cam, id: 2, app_key: "second" };
        finish({ items: [second], total: 2, status: 200, message: "ok" });
        await pending;
        expect(useApplications.getState()).toMatchObject({ loading: false, ready: true, apps: [cam, second] });
        expect(cacheResponse).toHaveBeenCalledWith(expect.any(String), [cam, second]);
    });
    it("shows a cached directory immediately and silently updates it", async () => {
        vi.mocked(getCachedResponse).mockResolvedValueOnce({ key: "cached", data: [cam], updatedAt: 1 });
        let finish!: (response: { items: typeof cam[]; total: number; status: number; message: string }) => void;
        vi.mocked(CDIService.GetAllSubApplicationsGET).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
        const pending = useApplications.getState().load("token");
        await vi.waitFor(() => expect(finish).toBeDefined());
        expect(useApplications.getState()).toMatchObject({ loading: false, ready: true, apps: [cam] });
        finish({ items: [], total: 0, status: 200, message: "ok" });
        await pending;
        expect(useApplications.getState()).toMatchObject({ loading: false, apps: [], error: "" });
    });
    it("preserves cached content on refresh failure and avoids loading on subsequent refreshes", async () => {
        vi.mocked(getCachedResponse).mockResolvedValueOnce({ key: "cached", data: [cam], updatedAt: 1 });
        vi.mocked(CDIService.GetAllSubApplicationsGET).mockRejectedValue(new Error("offline"));
        await useApplications.getState().load("token");
        const refresh = useApplications.getState().load("token");
        expect(useApplications.getState()).toMatchObject({ loading: false, apps: [cam], error: "" });
        await refresh;
        expect(useApplications.getState()).toMatchObject({ loading: false, apps: [cam], error: "" });
    });
    it("reports initial failure only after the network fails when cache is unavailable", async () => {
        vi.mocked(getCachedResponse).mockRejectedValueOnce(new Error("unavailable"));
        vi.mocked(CDIService.GetAllSubApplicationsGET).mockRejectedValueOnce(new Error("offline"));
        await useApplications.getState().load("token");
        expect(useApplications.getState()).toMatchObject({ loading: false, ready: false, apps: [], error: "REQUEST_FAILED" });
    });

});
