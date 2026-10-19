/** homePageUrl：经过校验的公开首页地址。 */
let homePageUrl = "";

/** getHomePageUrl：读取容器启动时注入的首页地址。 */
export const getHomePageUrl = () => homePageUrl;

/** loadRuntimeConfig：读取公开配置，失败或地址无效时保留默认首页。 */
export async function loadRuntimeConfig() {
    homePageUrl = "";
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    try {
        const response = await fetch("/runtime-config.json", { cache: "no-store", credentials: "omit", signal: controller.signal });
        if (!response.ok) return;
        const config: unknown = await response.json();
        if (!config || typeof config !== "object" || !("homePageUrl" in config) || typeof config.homePageUrl !== "string") return;
        const value = config.homePageUrl.trim();
        if (!value) return;
        const url = new URL(value);
        if (url.username || url.password || !["https:", "http:"].includes(url.protocol)) return;
        if (window.location.protocol === "https:" && url.protocol !== "https:") return;
        // 禁止把当前基座再次嵌入自己，避免递归加载。
        if (url.origin === window.location.origin) return;
        homePageUrl = url.href;
    } catch { /* 公开配置不可用时使用默认首页。 */ }
    finally { window.clearTimeout(timer); }
}
