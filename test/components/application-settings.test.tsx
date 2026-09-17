import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cam } from "../fixtures/applications";
const session = vi.hoisted(() => ({ accessToken: "token", user: { level: 4 }, openLoginModal: vi.fn() }));
vi.mock("@/hooks/useUser", () => ({ useUser: () => session }));
vi.mock("@/services/CDIService", () => ({ CDIService: { GetAllSubApplicationsGET: vi.fn() } }));
import { CDIService } from "@/services/CDIService";
import { useApplications } from "@/hooks/useApplications";
import ApplicationSettings from "@/components/ApplicationSettings";
import Sidebar from "@/components/Layout/Sidebar";
import i18n from "@/i18n";
afterEach(cleanup);
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
