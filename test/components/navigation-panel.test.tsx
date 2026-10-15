import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NavigationPanel from "@/components/Layout/NavigationPanel";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/Layout/Sidebar", () => ({ default: ({ collapsed }: { collapsed: boolean }) => <div>{collapsed ? "icons" : "full menu"}</div> }));

beforeEach(() => { sessionStorage.clear(); });
afterEach(() => { cleanup(); sessionStorage.clear(); });

describe("NavigationPanel", () => {
    it("restores collapse and expanded width after remounting", () => {
        const first = render(<NavigationPanel />);
        fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
        fireEvent.click(screen.getByRole("button", { name: "nav.collapse" }));
        expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("separator")).not.toBeInTheDocument();
        expect(screen.getByText("icons")).toBeInTheDocument();
        first.unmount();
        render(<NavigationPanel />);
        fireEvent.click(screen.getByRole("button", { name: "nav.expand" }));
        expect(screen.getByRole("separator")).toHaveAttribute("aria-valuenow", "210");
        expect(screen.getByText("full menu")).toBeInTheDocument();
    });

    it("enforces keyboard limits and tolerates malformed preferences", () => {
        sessionStorage.setItem("cdi.navigation.v1", "invalid json");
        render(<NavigationPanel />);
        const separator = screen.getByRole("separator");
        fireEvent.keyDown(separator, { key: "ArrowLeft" });
        expect(separator).toHaveAttribute("aria-valuenow", "200");
        fireEvent.keyDown(separator, { key: "End" });
        fireEvent.keyDown(separator, { key: "ArrowRight" });
        expect(separator).toHaveAttribute("aria-valuenow", "400");
        fireEvent.keyDown(separator, { key: "Home" });
        expect(separator).toHaveAttribute("aria-valuenow", "200");
    });

    it("drags within limits and stops resizing on pointer cancellation", () => {
        vi.stubGlobal("PointerEvent", MouseEvent);
        render(<NavigationPanel />);
        const separator = screen.getByRole("separator");
        separator.setPointerCapture = vi.fn();
        fireEvent.pointerDown(separator, { button: 0, clientX: 200 });
        fireEvent.pointerMove(separator, { clientX: 800 });
        expect(separator).toHaveAttribute("aria-valuenow", "400");
        fireEvent.pointerMove(separator, { clientX: 0 });
        expect(separator).toHaveAttribute("aria-valuenow", "200");
        fireEvent.pointerCancel(separator);
        fireEvent.pointerMove(separator, { clientX: 350 });
        expect(separator).toHaveAttribute("aria-valuenow", "200");
        vi.unstubAllGlobals();
    });

    it("remains usable when session storage is unavailable", () => {
        vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
        render(<NavigationPanel />);
        fireEvent.click(screen.getByRole("button"));
        expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "false");
    });
});
