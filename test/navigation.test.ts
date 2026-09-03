import { describe, expect, it } from "vitest";
import { isMenuVisible, parseHiddenMenus } from "@/navigation";

describe("VITE_HIDE_MENUS", () => {
    it("hides configured menu paths and accepts names without a leading slash", () => {
        const hiddenMenus = parseHiddenMenus('["/cam", "railway"]');

        expect(isMenuVisible("/cam", hiddenMenus)).toBe(false);
        expect(isMenuVisible("/railway", hiddenMenus)).toBe(false);
        expect(isMenuVisible("/coze-loop", hiddenMenus)).toBe(true);
    });

    it("keeps the home route visible even when it is configured as hidden", () => {
        const hiddenMenus = parseHiddenMenus('["/", "home", "/cam"]');

        expect(isMenuVisible("/", hiddenMenus)).toBe(true);
        expect(isMenuVisible("/cam", hiddenMenus)).toBe(false);
    });

    it("ignores malformed JSON and unknown menu paths", () => {
        expect(parseHiddenMenus("{")).toEqual(new Set());
        expect(parseHiddenMenus('["/unknown", 1]')).toEqual(new Set());
    });
});
