import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Outlet } from "react-router-dom";
import { saveDebugSettings } from "@/localDebug";

vi.mock("@/components/Layout", () => ({ default: () => <Outlet /> }));
vi.mock("@/components/RemoteBoundary", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/preloadCAMRemote", () => ({ preloadCAMRemote: vi.fn() }));
vi.mock("@/hooks/useUser", () => ({
    useUser: () => ({
        user: { id: 1, username: "test-user" },
        accessToken: "test-access-token",
        fetchUser: vi.fn(),
        logout: vi.fn(),
    }),
}));

const renderAtCAM = async () => {
    window.history.replaceState({}, "", "/cam");
    const { default: App } = await import("@/App");
    render(<App />);
    return screen.findByTestId("remote-api-base");
};

describe("App platform-to-remote contract", () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    afterEach(() => {
        cleanup();
        document.querySelector('meta[name="cdi-local-debug"]')?.remove();
        sessionStorage.clear();
        window.history.replaceState({}, "", "/");
    });

    it("passes the locally overridden API base to the CAM remote", async () => {
        document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="1">');
        saveDebugSettings({ cam: { backend: "http://localhost:9101" } });

        expect(await renderAtCAM()).toHaveTextContent("http://localhost:9101");
    });

    it("keeps the same-origin API proxy when local debugging is disabled", async () => {
        document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="0">');
        sessionStorage.setItem("cdi-local-debug-v1", JSON.stringify({
            cam: { backend: "http://localhost:9101" },
        }));

        expect(await renderAtCAM()).toHaveTextContent("/api/cam");
    });
});
