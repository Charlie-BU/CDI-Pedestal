/** homePageUrl：经过校验的公开首页地址。 */
let homePageUrl = "";

/** homePageMode：只有确认未配置地址时才使用默认首页。 */
let homePageMode: "default" | "embedded" | "unavailable" = "unavailable";

/** getHomePageMode：读取首页配置状态。 */
export const getHomePageMode = () => homePageMode;

/** getHomePageUrl：读取容器启动时注入的首页地址。 */
export const getHomePageUrl = () => homePageUrl;

/** loadRuntimeConfig：读取公开配置，配置无法确认或无效时保留加载状态。 */
export async function loadRuntimeConfig() {
    homePageUrl = "";
    homePageMode = "unavailable";
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    try {
        const response = await fetch("/runtime-config.json", { cache: "no-store", credentials: "omit", signal: controller.signal });
        if (!response.ok) return;
        const config: unknown = await response.json();
        if (!config || typeof config !== "object" || Array.isArray(config)) return;
        if (!("homePageUrl" in config)) { homePageMode = "default"; return; }
        if (typeof config.homePageUrl !== "string") return;
        const value = config.homePageUrl.trim();
        if (!value) { homePageMode = "default"; return; }
        const url = new URL(value);
        if (url.username || url.password || !["https:", "http:"].includes(url.protocol)) return;
        if (window.location.protocol === "https:" && url.protocol !== "https:") return;
        // 禁止把当前基座再次嵌入自己，避免递归加载。
        if (url.origin === window.location.origin) return;
        homePageUrl = url.href;
        homePageMode = "embedded";
    } catch { /* 公开配置不可用时不能认定首页未配置。 */ }
    finally { window.clearTimeout(timer); }
}
