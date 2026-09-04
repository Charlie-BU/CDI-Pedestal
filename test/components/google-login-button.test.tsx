import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleLoginButton } from "@/components/User/LoginForm";

describe("GoogleLoginButton", () => {
    afterEach(() => {
        delete window.google;
    });

    it("使用配置的 client ID 渲染官方按钮并提交 credential", async () => {
        let callback: ((response: { credential: string }) => void) | undefined;
        const initialize = vi.fn((options) => {
            callback = options.callback;
        });
        const renderButton = vi.fn();
        const onCredential = vi.fn().mockResolvedValue(undefined);
        window.google = { accounts: { id: { initialize, renderButton } } };

        render(
            <GoogleLoginButton
                clientId="test-google-client-id"
                locale="zh-CN"
                unavailableMessage="Google 登录暂不可用"
                onCredential={onCredential}
            />,
        );

        expect(initialize).toHaveBeenCalledWith(
            expect.objectContaining({ client_id: "test-google-client-id" }),
        );
        expect(renderButton).toHaveBeenCalledOnce();

        await act(async () => {
            callback?.({ credential: "test-google-credential" });
        });
        await waitFor(() => {
            expect(onCredential).toHaveBeenCalledWith("test-google-credential");
        });
    });

    it("显示平台登录失败信息", async () => {
        let callback: ((response: { credential: string }) => void) | undefined;
        window.google = {
            accounts: {
                id: {
                    initialize: (options) => {
                        callback = options.callback;
                    },
                    renderButton: vi.fn(),
                },
            },
        };

        render(
            <GoogleLoginButton
                clientId="test-google-client-id"
                locale="zh-CN"
                unavailableMessage="Google 登录暂不可用"
                onCredential={() => Promise.reject(new Error("Google 登录失败"))}
            />,
        );

        act(() => {
            callback?.({ credential: "invalid-google-credential" });
        });

        expect(await screen.findByText("Google 登录失败")).toBeInTheDocument();
    });
});
