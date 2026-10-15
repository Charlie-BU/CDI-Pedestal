import type { Plugin } from "vite";
import zhCN from "../src/i18n/locales/zh-CN.json";
import { applyContentOverride, parseContentOverride } from "../src/i18n/contentOverride";

/** brandTitle：将默认语言的品牌标题安全写入初始 HTML。 */
export function brandTitle(raw: string | undefined): Plugin {
    const title = applyContentOverride(zhCN, parseContentOverride(raw), "zh-CN").brand.title;
    const escaped = title.replace(/[&<>"']/g, (char) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]!);
    return {
        name: "cdi-brand-title",
        transformIndexHtml: { order: "pre", handler: (html) => html.replace("__CDI_BRAND_TITLE__", () => escaped) },
    };
}
