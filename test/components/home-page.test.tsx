import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/components/HomePage";
import { useUser } from "@/hooks/useUser";
import { getHomePageMode, getHomePageUrl } from "@/runtimeConfig";
import i18n from "@/i18n";
vi.mock("@/runtimeConfig", () => ({ getHomePageUrl: vi.fn(() => ""), getHomePageMode: vi.fn(() => "embedded") }));
vi.mock("@/hooks/useUser", () => ({ useUser: vi.fn() }));
const openLoginModal = vi.fn();
vi.mocked(useUser).mockReturnValue({ accessToken: null, openLoginModal });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("external home", () => {
    beforeEach(() => { vi.mocked(getHomePageMode).mockReturnValue("embedded"); });
    it("sends locale on load and ready, then updates without reloading the iframe", async () => {
        await i18n.changeLanguage("zh-CN");
        vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
        const { container, unmount } = render(<HomePage><p>Default home</p></HomePage>);
        const frame = container.querySelector("iframe")!;
        const source = frame.contentWindow!;
        const post = vi.spyOn(source, "postMessage");
        fireEvent.load(frame);
        expect(post).toHaveBeenLastCalledWith({ type: "cdi:context", locale: "zh-CN", authenticated: false }, "https://home.example.test");
        post.mockClear();
        window.dispatchEvent(new MessageEvent("message", { origin: "https://other.example.test", source, data: { type: "cdi:homepage-ready" } }));
        window.dispatchEvent(new MessageEvent("message", { origin: "https://home.example.test", source: window, data: { type: "cdi:homepage-ready" } }));
        expect(post).not.toHaveBeenCalled();
        act(() => { window.dispatchEvent(new MessageEvent("message", { origin: "https://home.example.test", source, data: { type: "cdi:homepage-ready" } })); });
        expect(post).toHaveBeenLastCalledWith({ type: "cdi:context", locale: "zh-CN", authenticated: false }, "https://home.example.test");
        await act(async () => { await i18n.changeLanguage("en-US"); });
        expect(post).toHaveBeenLastCalledWith({ type: "cdi:context", locale: "en-US", authenticated: false }, "https://home.example.test");
        expect(container.querySelector("iframe")).toBe(frame);
        expect(frame).toHaveAttribute("src", "https://home.example.test/");
        unmount();
        post.mockClear();
        act(() => { window.dispatchEvent(new MessageEvent("message", { origin: "https://home.example.test", source, data: { type: "cdi:homepage-ready" } })); });
        expect(post).not.toHaveBeenCalled();
        post.mockRestore();
        await i18n.changeLanguage("zh-CN");
    });
    it("updates authenticated context on sign-in and sign-out without sending credentials", () => {
        vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
        const { container, rerender } = render(<HomePage><p>Default home</p></HomePage>);
        const frame = container.querySelector("iframe")!;
        const post = vi.spyOn(frame.contentWindow!, "postMessage");
        vi.mocked(useUser).mockReturnValueOnce({ accessToken: "test-access-token", openLoginModal });
        rerender(<HomePage><p>Default home</p></HomePage>);
        expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ authenticated: true }), "https://home.example.test");
        expect(JSON.stringify(post.mock.calls)).not.toContain("test-access-token");
        rerender(<HomePage><p>Default home</p></HomePage>);
        expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ authenticated: false }), "https://home.example.test");
        expect(container.querySelector("iframe")).toBe(frame);
        post.mockRestore();
    });
    it("passes the shell background to the isolated iframe", () => {
        document.body.style.setProperty("--color-bg-3", "#f3efe6");
        try {
            vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
            const { container } = render(<HomePage><p>Default home</p></HomePage>);
            const frame = container.querySelector("iframe")!;
            const post = vi.spyOn(frame.contentWindow!, "postMessage");
            fireEvent.load(frame);
            expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ backgroundColor: "#f3efe6" }), "https://home.example.test");
            post.mockRestore();
        } finally { document.body.style.removeProperty("--color-bg-3"); }
    });
    it("opens the host login modal only for the configured frame and origin", () => {
        vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
        const { container, unmount } = render(<HomePage><p>Default home</p></HomePage>);
        const source = container.querySelector("iframe")!.contentWindow!;
        const send = (origin: string, sender: MessageEventSource | null, data: unknown) =>
            window.dispatchEvent(new MessageEvent("message", { origin, source: sender, data }));
        send("https://other.example.test", source, { type: "cdi:open-login" });
        send("https://home.example.test", window, { type: "cdi:open-login" });
        for (const data of [null, "cdi:open-login", { type: "unknown" }]) send("https://home.example.test", source, data);
        expect(openLoginModal).not.toHaveBeenCalled();
        send("https://home.example.test", source, { type: "cdi:open-login" });
        expect(openLoginModal).toHaveBeenCalledOnce();
        unmount();
        send("https://home.example.test", source, { type: "cdi:open-login" });
        expect(openLoginModal).toHaveBeenCalledOnce();
    });
    it("does not open a login modal for an authenticated session", () => {
        vi.mocked(useUser).mockReturnValueOnce({ accessToken: "test-access-token", openLoginModal });
        vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
        const { container } = render(<HomePage><p>Default home</p></HomePage>);
        window.dispatchEvent(new MessageEvent("message", {
            origin: "https://home.example.test", source: container.querySelector("iframe")!.contentWindow,
            data: { type: "cdi:open-login" },
        }));
        expect(openLoginModal).not.toHaveBeenCalled();
    });
    it("keeps the default page when not configured", () => {
        vi.mocked(getHomePageUrl).mockReturnValue("");
        vi.mocked(getHomePageMode).mockReturnValue("default");
        const { container } = render(<HomePage><p>Default home</p></HomePage>);
        expect(screen.getByText("Default home")).toBeInTheDocument();
        expect(container.querySelector("iframe")).toBeNull();
    });
    it("keeps loading through frame load and reveals only a trusted ready message", () => {
        vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
        const { container } = render(<HomePage><p>Default home</p></HomePage>);
        const frame = container.querySelector("iframe")!;
        expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
        expect(frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        expect(screen.queryByText("Default home")).not.toBeInTheDocument();
        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(frame).toHaveStyle({ visibility: "hidden" });
        fireEvent.load(frame);
        expect(screen.getByRole("status")).toBeInTheDocument();
        fireEvent.error(frame);
        expect(screen.queryByText("Default home")).not.toBeInTheDocument();
        for (const [origin, source] of [["https://other.example.test", frame.contentWindow], ["https://home.example.test", window]] as const) {
            act(() => { window.dispatchEvent(new MessageEvent("message", { origin, source, data: { type: "cdi:homepage-ready" } })); });
        }
        expect(screen.getByRole("status")).toBeInTheDocument();
        act(() => { window.dispatchEvent(new MessageEvent("message", { origin: "https://home.example.test", source: frame.contentWindow, data: { type: "cdi:homepage-ready" } })); });
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        expect(frame).toHaveStyle({ visibility: "visible" });
        expect(screen.queryByText("Default home")).not.toBeInTheDocument();
    });
    it("does not show the default page if configuration cannot be confirmed", () => {
        vi.mocked(getHomePageUrl).mockReturnValue("");
        vi.mocked(getHomePageMode).mockReturnValue("unavailable");
        render(<HomePage><p>Default home</p></HomePage>);
        expect(screen.getByRole("status")).toBeInTheDocument();
        expect(screen.queryByText("Default home")).not.toBeInTheDocument();
    });
});
