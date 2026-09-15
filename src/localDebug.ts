/** DebugApplication：支持本地调试的子应用注册信息。 */
export interface DebugApplication {
    id: string;
    label: string;
    frontendEnv: string;
    backendEnv: string;
    defaultApiBase: string;
}

/** DEBUG_APPLICATIONS：基座托管的子应用及其默认配置来源。 */
export const DEBUG_APPLICATIONS: readonly DebugApplication[] = [
    { id: "cam", label: "CAM", frontendEnv: "VITE_CAM_REMOTE_ENTRY", backendEnv: "CAM_UPSTREAM_BASE_URL", defaultApiBase: "/api/cam" },
];

/** DebugUrls：子应用的可选前后端覆盖地址。 */
export interface DebugUrls { frontend: string; backend: string }
/** DebugSettings：按子应用保存的调试配置。 */
export type DebugSettings = Record<string, DebugUrls>;
/** DEBUG_STORAGE_KEY：当前标签页的调试配置存储键。 */
export const DEBUG_STORAGE_KEY = "cdi-local-debug-v1";

/** isLocalDebugEnabled：读取服务端根据本次 HTML 请求注入的开关。 */
export function isLocalDebugEnabled(): boolean {
    return typeof document !== "undefined" &&
        document.querySelector('meta[name="cdi-local-debug"]')?.getAttribute("content") === "1";
}

/** normalizeDebugUrl：校验并规范化可选的 HTTP 服务地址。 */
export function normalizeDebugUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const url = new URL(trimmed);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
        throw new Error("INVALID_DEBUG_URL");
    }
    return url.href.replace(/\/+$/, "");
}

/** normalizeDebugSettings：仅接收已注册子应用的合法地址。 */
export function normalizeDebugSettings(value: unknown): DebugSettings {
    const input = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return Object.fromEntries(DEBUG_APPLICATIONS.map(({ id }) => {
        const entry = input[id];
        const urls = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
        return [id, {
            frontend: normalizeDebugUrl(typeof urls.frontend === "string" ? urls.frontend : ""),
            backend: normalizeDebugUrl(typeof urls.backend === "string" ? urls.backend : ""),
        }];
    }));
}

/** readDebugSettings：仅在请求头启用调试时读取标签页配置。 */
export function readDebugSettings(): DebugSettings {
    if (!isLocalDebugEnabled()) return normalizeDebugSettings({});
    try {
        return normalizeDebugSettings(JSON.parse(sessionStorage.getItem(DEBUG_STORAGE_KEY) || "{}"));
    } catch {
        return normalizeDebugSettings({});
    }
}

/** saveDebugSettings：校验并保存配置，存储失败交由弹窗提示。 */
export function saveDebugSettings(value: unknown): void {
    if (!isLocalDebugEnabled()) throw new Error("LOCAL_DEBUG_DISABLED");
    sessionStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(normalizeDebugSettings(value)));
}

/** getRemoteEntry：将子应用前端根地址转换为 Federation manifest 地址。 */
export function getRemoteEntry(id: string, fallback: string): string {
    const url = readDebugSettings()[id]?.frontend;
    if (!url) return fallback;
    return /\.(json|m?js)$/i.test(new URL(url).pathname) ? url : `${url}/mf-manifest.json`;
}

/** getApiBase：解析子应用接口根地址，空值保留线上同源代理。 */
export function getApiBase(id: string): string {
    const app = DEBUG_APPLICATIONS.find((app) => app.id === id);
    if (!app) throw new Error("UNKNOWN_DEBUG_APPLICATION");
    return readDebugSettings()[id]?.backend || app.defaultApiBase;
}
