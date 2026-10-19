import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "@/components/HomePage";
import { useUser } from "@/hooks/useUser";
import { getHomePageUrl } from "@/runtimeConfig";
import i18n from "@/i18n";
vi.mock("@/runtimeConfig", () => ({ getHomePageUrl: vi.fn(() => "") }));
vi.mock("@/hooks/useUser", () => ({ useUser: vi.fn() }));
const openLoginModal = vi.fn();
vi.mocked(useUser).mockReturnValue({ accessToken: null, openLoginModal });
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("external home", () => {
    it("sends locale on load and ready, then updates without reloading the iframe", async () => {
        await i18n.changeLanguage("zh-CN");
        vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
        const { container, unmount } = render(<HomePage><p>Default home</p></HomePage>);
        const frame = container.querySelector("iframe")!;
        const source = frame.contentWindow!;
        const post = vi.spyOn(source, "postMessage");
        fireEvent.load(frame);
        expect(post).toHaveBeenLastCalledWith({ type: "cdi:context", locale: "zh-CN" }, "https://home.example.test");
        post.mockClear();
        window.dispatchEvent(new MessageEvent("message", { origin: "https://other.example.test", source, data: { type: "cdi:homepage-ready" } }));
        window.dispatchEvent(new MessageEvent("message", { origin: "https://home.example.test", source: window, data: { type: "cdi:homepage-ready" } }));
        expect(post).not.toHaveBeenCalled();
        window.dispatchEvent(new MessageEvent("message", { origin: "https://home.example.test", source, data: { type: "cdi:homepage-ready" } }));
        expect(post).toHaveBeenLastCalledWith({ type: "cdi:context", locale: "zh-CN" }, "https://home.example.test");
        await act(async () => { await i18n.changeLanguage("en-US"); });
        expect(post).toHaveBeenLastCalledWith({ type: "cdi:context", locale: "en-US" }, "https://home.example.test");
        expect(container.querySelector("iframe")).toBe(frame);
        expect(frame).toHaveAttribute("src", "https://home.example.test/");
        unmount();
        post.mockClear();
        window.dispatchEvent(new MessageEvent("message", { origin: "https://home.example.test", source, data: { type: "cdi:homepage-ready" } }));
        expect(post).not.toHaveBeenCalled();
        post.mockRestore();
        await i18n.changeLanguage("zh-CN");
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
        fireEvent.click(screen.getByRole("button"));
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
        const { container } = render(<HomePage><p>Default home</p></HomePage>);
        expect(screen.getByText("Default home")).toBeInTheDocument();
        expect(container.querySelector("iframe")).toBeNull();
    });
    it("embeds without credentials and lets users recover the default page", () => {
        vi.mocked(getHomePageUrl).mockReturnValue("https://home.example.test/");
        const { container } = render(<HomePage><p>Default home</p></HomePage>);
        const frame = container.querySelector("iframe")!;
        expect(frame).toHaveAttribute("src", "https://home.example.test/");
        expect(frame).toHaveAttribute("title");
        expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
        expect(frame.getAttribute("sandbox")).not.toContain("allow-top-navigation");
        expect(screen.queryByText("Default home")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button"));
        expect(container.querySelector("iframe")).toBeNull();
        expect(screen.getByText("Default home")).toBeInTheDocument();
    });
});
