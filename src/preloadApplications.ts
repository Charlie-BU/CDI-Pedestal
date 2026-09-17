import type { SubApplication } from "./subApplications";
import { getRemoteEntry } from "./localDebug";
const preloaded = new Set<string>();
/** preloadApplications：仅预取当前目录允许访问的 Federation 入口。 */
export async function preloadApplications(apps: SubApplication[]) {
    await Promise.all(apps.filter((app) => app.enabled && app.app_type === "federation" && app.frontend_url).map(async (app) => {
        const url = getRemoteEntry(app.app_key, app.frontend_url);
        if (preloaded.has(url)) return;
        preloaded.add(url);
        try {
            let entry = url;
            if (!/\.m?js$/i.test(new URL(url).pathname)) {
                const response = await fetch(url, { credentials: "omit" });
                if (!response.ok) return;
                const manifest = await response.json();
                const remote = manifest.metaData?.remoteEntry;
                if (!remote?.name) return;
                entry = new URL(`${remote.path || ""}${remote.name}`, url).href;
            }
            const link = document.createElement("link");
            link.rel = "modulepreload"; link.href = entry; link.crossOrigin = "anonymous";
            document.head.append(link);
        } catch { /* 预加载失败不阻塞基座，路由加载时展示错误。 */ }
    }));
}
