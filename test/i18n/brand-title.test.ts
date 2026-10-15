import { describe, expect, it } from "vitest";
import { brandTitle } from "../../build/brandTitle";
import { applyContentOverride, parseContentOverride } from "@/i18n/contentOverride";
import zhCN from "@/i18n/locales/zh-CN.json";

function renderTitle(raw?: string) {
    const hook = brandTitle(raw).transformIndexHtml;
    if (!hook || typeof hook !== "object") throw new Error("Missing HTML hook");
    const transform: OmitThisParameter<typeof hook.handler> = hook.handler;
    return transform("<title>__CDI_BRAND_TITLE__</title>", { path: "/", filename: "index.html" });
}

describe("initial brand title", () => {
    it("keeps the default for missing or invalid configuration", () => {
        expect(renderTitle()).toBe("<title>CDI</title>");
        expect(renderTitle("{")).toBe("<title>CDI</title>");
    });
    it("uses the default HTML language and escapes title markup", () => {
        expect(renderTitle(JSON.stringify({ "zh-CN": { brand: { title: '</title><script>&$&' } } })))
            .toBe("<title>&lt;/title&gt;&lt;script&gt;&amp;$&amp;</title>");
    });
    it("overrides title and subtitle together without changing defaults", () => {
        const resource = applyContentOverride(zhCN, parseContentOverride(JSON.stringify({
            "zh-CN": { brand: { title: "Example", subtitle: "Example subtitle" } },
        })), "zh-CN");
        expect(resource.brand).toEqual({ title: "Example", subtitle: "Example subtitle" });
        expect(zhCN.brand.title).toBe("CDI");
    });
});
