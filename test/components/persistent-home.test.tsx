import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Link, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import PersistentHome from "@/components/PersistentHome";

afterEach(cleanup);
describe("persistent homepage iframe", () => {
    it("preserves the same iframe and its load state when navigating away and back", () => {
        const { container } = render(<MemoryRouter><Link to="/">Home</Link><Link to="/tool">Tool</Link><Routes>
            <Route element={<PersistentHome><iframe title="Cached home" src="about:blank" /></PersistentHome>}>
                <Route index element={null} />
                <Route path="tool" element={<p>Tool content</p>} />
            </Route>
        </Routes></MemoryRouter>);
        const frame = container.querySelector("iframe")!;
        expect(frame).toBeVisible();
        fireEvent.click(screen.getByRole("link", { name: "Tool" }));
        expect(screen.getByText("Tool content")).toBeInTheDocument();
        expect(frame).not.toBeVisible();
        expect(container.querySelector("iframe")).toBe(frame);
        fireEvent.click(screen.getByRole("link", { name: "Home" }));
        expect(frame).toBeVisible();
        expect(container.querySelector("iframe")).toBe(frame);
        expect(screen.queryByText("Tool content")).not.toBeInTheDocument();
    });
});
