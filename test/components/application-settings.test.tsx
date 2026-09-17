import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cam } from "../fixtures/applications";
const session = vi.hoisted(() => ({ accessToken: "token", user: { level: 4 }, openLoginModal: vi.fn() }));
vi.mock("@/hooks/useUser", () => ({ useUser: () => session }));
vi.mock("@/services/CDIService", () => ({ CDIService: { GetAllSubApplicationsGET: vi.fn(), ReorderSubApplicationsPOST: vi.fn() } }));
import { CDIService } from "@/services/CDIService";
import { useApplications } from "@/hooks/useApplications";
import ApplicationSettings from "@/components/ApplicationSettings";
import Sidebar from "@/components/Layout/Sidebar";
import i18n from "@/i18n";
afterEach(() => { cleanup(); vi.restoreAllMocks(); session.user.level = 4; });
describe("application management entry", () => {
    it("rejects ordinary users without requesting full configuration", async () => {
        await i18n.changeLanguage("zh-CN");
        render(<ApplicationSettings />);
        expect(screen.getByText(/L0/)).toBeInTheDocument();
        expect(CDIService.GetAllSubApplicationsGET).not.toHaveBeenCalled();
    });
    it("always appends settings after visible database applications", async () => {
        await i18n.changeLanguage("zh-CN");
        useApplications.setState({ identity: "token", apps: [cam, { ...cam, id: 2, app_key: "hidden", name_zh: "隐藏应用", show_in_menu: false }] });
        render(<MemoryRouter><Sidebar /></MemoryRouter>);
        const labels = [...screen.getByRole("menu").querySelectorAll(".arco-menu-item")].map((el) => el.textContent);
        expect(labels).toEqual(["首页", "CAM", "子应用配置"]);
        expect(screen.queryByText("隐藏应用")).not.toBeInTheDocument();
    });
});

describe("application row dragging", () => {
    it("drags the whole row and persists the complete order including hidden rows", async () => {
        await i18n.changeLanguage("zh-CN");
        session.user.level = 0;
        const second = { ...cam, id: 2, app_key: "second", name_zh: "第二应用" };
        const hidden = { ...cam, id: 3, app_key: "hidden" };
        vi.mocked(CDIService.GetAllSubApplicationsGET).mockImplementation(async (params) => ({ items: params.page_size === "100" ? [cam, hidden, second] : [cam, second], total: params.page_size === "100" ? 3 : 2, status: 200, message: "ok" }));
        vi.mocked(CDIService.ReorderSubApplicationsPOST).mockResolvedValue({ status: 200, message: "ok" });
        const original = useApplications.getState().load;
        useApplications.setState({ load: vi.fn().mockResolvedValue(undefined) });
        try {
            render(<ApplicationSettings />);
            const handles = await screen.findAllByRole("button", { name: /拖拽排序/ });
            expect(screen.queryByRole("button", { name: "上移" })).not.toBeInTheDocument();
            const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn(), effectAllowed: "", dropEffect: "" };
            fireEvent.dragStart(handles[0], { dataTransfer });
            expect(dataTransfer.setDragImage).toHaveBeenCalledWith(handles[0].closest("tr"), 24, expect.any(Number));
            const target = handles[1].closest("tr")!;
            fireEvent.dragOver(target, { dataTransfer });
            fireEvent.drop(target, { dataTransfer });
            await waitFor(() => expect(CDIService.ReorderSubApplicationsPOST).toHaveBeenCalledWith({ ids: [3, 2, cam.id], Authorization: "" }));
            await waitFor(() => expect(useApplications.getState().load).toHaveBeenCalled());
        } finally { useApplications.setState({ load: original }); }
    });
});
