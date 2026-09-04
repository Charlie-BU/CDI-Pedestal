import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import Profile from "@/components/User/Profile";

const userInfo = {
    id: 1,
    username: "charlie",
    nickname: "卜天",
    email: "charlie@example.com",
    role: "frontend",
    level: 1,
    created_at: "2026-09-05T00:00:00Z",
    has_password: true,
};

const renderProfile = (
    authProviders: string[],
    openGoogleLinkModal = vi.fn(),
    hasPassword = true,
    openSetPasswordModal = vi.fn(),
) => {
    render(
        <MemoryRouter>
            <Profile
                userInfo={{
                    ...userInfo,
                    has_password: hasPassword,
                    auth_providers: authProviders,
                }}
                logout={vi.fn()}
                openModifyPasswordModal={vi.fn()}
                openSetPasswordModal={openSetPasswordModal}
                openGoogleLinkModal={openGoogleLinkModal}
            />
        </MemoryRouter>,
    );
    return openGoogleLinkModal;
};

describe("Profile Google 绑定状态", () => {
    beforeEach(async () => {
        await i18n.changeLanguage("zh-CN");
    });

    afterEach(() => {
        cleanup();
        document.body.replaceChildren();
    });

    it("已绑定时显示彩色状态且不可重复触发绑定", async () => {
        const openGoogleLinkModal = renderProfile(["google"]);
        const boundMessage = i18n.t("profile.googleBound");
        const icon = screen.getByRole("button", { name: boundMessage });

        expect(icon.className).toContain("googleIconBound");
        fireEvent.mouseEnter(icon);
        expect(await screen.findByText(boundMessage)).toBeInTheDocument();
        fireEvent.click(icon);
        expect(openGoogleLinkModal).not.toHaveBeenCalled();
    });

    it("未绑定时显示灰色状态，点击进入绑定流程", async () => {
        const openGoogleLinkModal = renderProfile([]);
        const icon = screen.getByRole("button", { name: "绑定 Google 账号" });

        expect(icon.className).toContain("googleIconUnbound");
        fireEvent.mouseEnter(icon);
        expect(await screen.findByText(i18n.t("profile.googleUnbound"))).toBeInTheDocument();
        fireEvent.click(icon);
        expect(openGoogleLinkModal).toHaveBeenCalledOnce();
    });

    it("无本地密码时使用设置密码入口", () => {
        const openSetPasswordModal = vi.fn();
        renderProfile(["google"], vi.fn(), false, openSetPasswordModal);

        expect(screen.queryByRole("button", { name: "修改密码" })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "设置密码" }));
        expect(openSetPasswordModal).toHaveBeenCalledOnce();
    });
});
