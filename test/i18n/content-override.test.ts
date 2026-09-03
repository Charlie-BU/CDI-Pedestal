import { describe, expect, it } from "vitest";
import { applyContentOverride, parseContentOverride } from "@/i18n/contentOverride";

describe("CONTENT_OVERRIDE", () => {
    const defaults = {
        nav: { home: "首页", cam: "API 管理 CAM" },
        common: { cancel: "取消" },
    };

    it("overrides only existing text keys in the specified locale", () => {
        const override = parseContentOverride(
            JSON.stringify({
                "zh-CN": {
                    nav: { home: "主页", unknown: "ignored" },
                    common: { cancel: 1 },
                    unknownNamespace: { value: "ignored" },
                },
            }),
        );

        expect(applyContentOverride(defaults, override, "zh-CN")).toEqual({
            nav: { home: "主页", cam: "API 管理 CAM" },
            common: { cancel: "取消" },
        });
        expect(applyContentOverride(defaults, override, "en-US")).toEqual(defaults);
    });

    it("falls back to defaults when the JSON is invalid", () => {
        expect(parseContentOverride("{")).toEqual({});
        expect(applyContentOverride(defaults, parseContentOverride("{"), "zh-CN")).toEqual(
            defaults,
        );
    });
});
