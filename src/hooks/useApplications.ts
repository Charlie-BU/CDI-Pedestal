import { create } from "zustand";
import { CDIService } from "@/services/CDIService";
import { normalizeApplication } from "@/subApplications";
import type { SubApplication } from "@/subApplications";
import { setDebugApplications } from "@/localDebug";

/** ApplicationStore：当前登录身份下的运行目录。 */
interface ApplicationStore {
    apps: SubApplication[];
    loading: boolean;
    error: string;
    identity: string | null;
    load: (identity: string) => Promise<void>;
}
let controller: AbortController | undefined;
/** useApplications：统一驱动菜单、路由和调试表单，拒绝过期请求覆盖新会话。 */
export const useApplications = create<ApplicationStore>((set, get) => ({
    apps: [], loading: true, error: "", identity: null,
    load: async (identity) => {
        controller?.abort();
        const requestController = new AbortController();
        controller = requestController;
        if (get().identity !== identity) {
            setDebugApplications([]);
            set({ apps: [], identity });
        }
        set({ loading: true, error: "" });
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
            setDebugApplications(apps);
            set({ apps, loading: false });
        } catch {
            if (requestController.signal.aborted) return;
            setDebugApplications([]);
            set({ apps: [], loading: false, error: "REQUEST_FAILED" });
        }
    },
}));
