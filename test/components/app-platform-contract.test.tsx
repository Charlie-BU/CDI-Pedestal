import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Outlet } from "react-router-dom";
import { saveDebugSettings, setDebugApplications } from "@/localDebug";

vi.mock("@/components/Layout", () => ({ default: () => <Outlet /> }));
vi.mock("@/components/RemoteBoundary", () => ({ default: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/preloadApplications", () => ({ preloadApplications: vi.fn() }));
vi.mock("@/federationRuntime", () => ({ applicationSignature: (app: { app_key: string }) => app.app_key, loadApplication: () => import("../fixtures/cam-remote"), needsApplicationReload: () => false }));
vi.mock("@/services/CDIService", () => ({ CDIService: { GetAllSubApplicationsGET: async () => ({ items: [cam], total: 1 }) } }));
import { cam } from "../fixtures/applications";
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
        setDebugApplications([cam]);
        sessionStorage.clear();
    });

    afterEach(() => {
        cleanup();
        document.querySelector('meta[name="cdi-local-debug"]')?.remove();
        setDebugApplications([cam]);
        sessionStorage.clear();
        window.history.replaceState({}, "", "/");
    });

    it("passes the locally overridden API base to the CAM remote", async () => {
        document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="1">');
        saveDebugSettings({ cam: { backend: "http://localhost:9101" } });

        expect(await renderAtCAM()).toHaveTextContent("http://localhost:9101");
    });

    it("passes the database backend URL when local debugging is disabled", async () => {
        document.head.insertAdjacentHTML("beforeend", '<meta name="cdi-local-debug" content="0">');
        sessionStorage.setItem("cdi-local-debug-v1", JSON.stringify({
            cam: { backend: "http://localhost:9101" },
        }));

        expect(await renderAtCAM()).toHaveTextContent(cam.api_base);
    });
});
