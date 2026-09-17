import { describe, expect, it, vi } from "vitest";
import { cam } from "../fixtures/applications";
vi.mock("@/services/CDIService", () => ({ CDIService: { GetAllSubApplicationsGET: vi.fn() } }));
import { CDIService } from "@/services/CDIService";
import { useApplications } from "@/hooks/useApplications";
describe("runtime directory identity", () => {
    it("does not let an earlier authenticated request overwrite an anonymous catalog", async () => {
        let resolveOld!: (value: { items: typeof cam[]; total: number; status: number; message: string }) => void;
        vi.mocked(CDIService.GetAllSubApplicationsGET).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce({ items: [], total: 0, status: 200, message: "ok" });
        const old = useApplications.getState().load("old-token");
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
});
