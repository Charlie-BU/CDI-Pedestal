import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import ApplicationIcon from "@/components/ApplicationIcon";
import { LogoAirJelly } from "@/assets/icons";

afterEach(cleanup);
describe("application icons", () => {
    it.each([undefined, "", "   "])("uses AirJelly for a missing icon: %s", (src) => {
        const { container } = render(<ApplicationIcon src={src} />);
        expect(container.querySelector("img")).toHaveAttribute("src", LogoAirJelly);
    });
    it("falls back after an image error and uses an updated configuration", () => {
        const { container, rerender } = render(<ApplicationIcon src="https://fixture.invalid/missing.png" />);
        const image = container.querySelector("img")!;
        expect(image).toHaveAttribute("src", "https://fixture.invalid/missing.png");
        fireEvent.error(image);
        expect(image).toHaveAttribute("src", LogoAirJelly);
        fireEvent.error(image);
        expect(image).toHaveAttribute("src", LogoAirJelly);
        rerender(<ApplicationIcon src="https://fixture.invalid/replacement.svg" />);
        expect(image).toHaveAttribute("src", "https://fixture.invalid/replacement.svg");
    });
});
