import { create } from "zustand";
import { CDIService } from "@/services/CDIService";
import { normalizeApplication } from "@/subApplications";
import type { SubApplication } from "@/subApplications";
import { cacheResponse, createCacheKey, getCachedResponse, isSameCachedData } from "@/services/cache";
import { setDebugApplications } from "@/localDebug";

/** ApplicationStore：当前登录身份下的运行目录。 */
interface ApplicationStore {
    apps: SubApplication[];
    loading: boolean;
    ready: boolean;
    error: string;
    identity: string | null;
    load: (identity: string) => Promise<void>;
}
let controller: AbortController | undefined;
/** useApplications：统一驱动菜单、路由和调试表单，拒绝过期请求覆盖新会话。 */
export const useApplications = create<ApplicationStore>((set, get) => ({
    apps: [], loading: true, ready: false, error: "", identity: null,
    load: async (identity) => {
        controller?.abort();
        const requestController = new AbortController();
        controller = requestController;
        if (get().identity !== identity) {
            setDebugApplications([]);
            set({ apps: [], identity, ready: false });
        }
        set({ loading: !get().ready, error: "" });
        const key = createCacheKey({ method: "get", baseURL: "/api/cdi", url: "sub-application-directory", params: { enabled: true } }, identity);
        if (!get().ready) {
            try {
                const cached = await getCachedResponse(key);
                if (requestController.signal.aborted) return;
                if (cached && Array.isArray(cached.data)) {
                    const apps = cached.data.map(normalizeApplication) as SubApplication[];
                    setDebugApplications(apps);
                    set({ apps, ready: true, loading: false });
                }
            } catch { /* 缓存不可用时继续请求完整目录。 */ }
        }
        if (requestController.signal.aborted) return;
        try {
            const apps: SubApplication[] = [];
            let page = 1;
            let total = Infinity;
            while (apps.length < total) {
                const response = await CDIService.GetAllSubApplicationsGET(
                    { page: String(page++), page_size: "100", enabled: "true" },
                    { signal: requestController.signal },
                );
                if (requestController.signal.aborted) return;
                apps.push(...response.items.map(normalizeApplication));
                total = response.total;
                if (!response.items.length) break;
            }
            if (!get().ready || !isSameCachedData(get().apps, apps)) {
                setDebugApplications(apps);
                set({ apps, ready: true, loading: false });
            }
            void cacheResponse(key, apps).catch(() => undefined);
        } catch {
            if (requestController.signal.aborted) return;
            if (!get().ready) {
                setDebugApplications([]);
                set({ apps: [], loading: false, error: "REQUEST_FAILED" });
            }
        }
    },
}));
