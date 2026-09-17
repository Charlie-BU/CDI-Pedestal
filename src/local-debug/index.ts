import type { SubApplication } from "../subApplications";

/** DebugUrls：子应用的可选前后端覆盖地址。 */
export interface DebugUrls { frontend: string; backend: string }
/** DebugSettings：以数据库稳定标识保存的标签页配置。 */
export type DebugSettings = Record<string, DebugUrls>;
/** DEBUG_STORAGE_KEY：当前标签页的调试配置存储键。 */
export const DEBUG_STORAGE_KEY = "cdi-local-debug-v1";
let applications: SubApplication[] = [];

/** setDebugApplications：同步服务端已启用目录，不保留停用或删除应用。 */
export function setDebugApplications(values: SubApplication[]) { applications = values.filter((app) => app.enabled); }
/** getDebugApplications：读取当前可访问的应用。 */
export function getDebugApplications() { return applications.filter((app) => app.frontend_url); }
/** isLocalDebugEnabled：读取本次 HTML 请求的调试开关。 */
export function isLocalDebugEnabled(): boolean {
    return typeof document !== "undefined" && document.querySelector('meta[name="cdi-local-debug"]')?.getAttribute("content") === "1";
}
/** normalizeDebugUrl：规范化可选的 HTTP 服务地址。 */
export function normalizeDebugUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error("INVALID_DEBUG_URL");
    return url.href.replace(/\/+$/, "");
}
/** normalizeDebugSettings：仅接受当前可访问的子应用字段。 */
export function normalizeDebugSettings(value: unknown): DebugSettings {
    const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return Object.fromEntries(getDebugApplications().map((app) => {
        const entry = input[app.app_key];
        const urls = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        return [app.app_key, {
            frontend: normalizeDebugUrl(typeof urls.frontend === "string" ? urls.frontend : ""),
            backend: app.app_type === "federation" ? normalizeDebugUrl(typeof urls.backend === "string" ? urls.backend : "") : "",
        }];
    }));
}
/** readDebugSettings：关闭开关时忽略存储，损坏配置回退数据库默认值。 */
export function readDebugSettings(): DebugSettings {
    if (!isLocalDebugEnabled()) return normalizeDebugSettings({});
    try { return normalizeDebugSettings(JSON.parse(sessionStorage.getItem(DEBUG_STORAGE_KEY) || "{}")); }
    catch { return normalizeDebugSettings({}); }
}
/** saveDebugSettings：校验并保存标签页配置。 */
export function saveDebugSettings(value: unknown): void {
    if (!isLocalDebugEnabled()) throw new Error("LOCAL_DEBUG_DISABLED");
    sessionStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(normalizeDebugSettings(value)));
}
/** getRemoteEntry：统一解析数据库与调试入口，为 Federation 服务地址补全 manifest。 */
export function getRemoteEntry(id: string, fallback: string): string {
    const url = readDebugSettings()[id]?.frontend || fallback;
    if (!url) return url;
    const app = applications.find((item) => item.app_key === id);
    if (app?.app_type === "iframe") return url;
    return /\.(json|m?js)$/i.test(new URL(url).pathname) ? url : `${url.replace(/\/+$/, "")}/mf-manifest.json`;
}
/** getApiBase：仅解析子应用 API 地址，不影响基座 CDIService。 */
export function getApiBase(id: string): string {
    const app = applications.find((item) => item.app_key === id);
    if (!app) throw new Error("UNKNOWN_DEBUG_APPLICATION");
    return readDebugSettings()[id]?.backend || app.api_base;
}
