import axios, { AxiosHeaders, type AxiosRequestConfig } from "axios";
import CDIServiceService from "@/cam-auto-generate/CDIService";
import {
    cacheResponse,
    createCacheKey,
    getCachedResponse,
    isSameCachedData,
    type CacheRequestOptions,
} from "@/services/cache";

export const TOKEN_KEY = "cdi_access_token";

const http = axios.create({
    baseURL: "/api/cam",
    timeout: 60000,
    headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (token) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set("Authorization", `Bearer ${token}`);
        config.headers = headers;
    }
    return config;
});

export const CDIService = new CDIServiceService<CacheRequestOptions>({
    request: async <T>(config: AxiosRequestConfig, options?: CacheRequestOptions) => {
        // 从自定义 options 中拆出缓存相关参数，其余参数继续透传给 axios。
        const {
            needCache,
            cacheKey,
            onCacheUpdated,
            ...axiosOptions
        } = options || {};
        // 合并生成最终请求配置。外部传入的 axiosOptions 可以补充超时、headers 等信息。
        const requestConfig = { ...axiosOptions, ...config };
        // 封装一次真正的网络请求，统一只返回 response.data，方便后续在不同分支里复用。
        const request = () =>
            http.request<T>(requestConfig).then((response) => response.data);

        // 只有幂等的 GET 请求会参与 stale-while-revalidate 缓存策略。
        // 如果调用方没有开启缓存，或者当前不是 GET 请求，就直接走网络，不进入下面的缓存链路。
        if (!needCache || config.method?.toLowerCase() !== "get") {
            return request();
        }

        // 缓存 key 会把当前 token 纳入计算，这样不同账号之间的缓存不会相互污染。
        const token = localStorage.getItem(TOKEN_KEY) || "";
        // 如果调用方手动指定了 cacheKey，就优先使用；否则根据请求配置自动生成。
        const key = cacheKey || createCacheKey(config, token);
        // cached 用来保存本次请求对应的缓存数据，后面会根据它决定走哪条分支。
        let cached;
        try {
            // 先尝试从 IndexedDB 中读取缓存，这一步命中时可以更快给 UI 返回数据。
            cached = await getCachedResponse(key);
        } catch {
            // IndexedDB 可能不可用，例如在隐私浏览模式下。
            // 这种情况下仍然保持网络请求可正常工作。
            return request();
        }

        if (!cached) {
            // 缓存不存在，说明这是首次请求或缓存已失效，此时直接请求网络。
            const data = await request();
            // 网络结果拿到后异步写入缓存，为下次读取做准备。
            // 这里故意不 await，避免缓存写入耗时阻塞当前接口返回。
            void cacheResponse(key, data).catch(() => undefined);
            // 没有缓存时，调用方拿到的就是这次最新网络结果。
            return data;
        }

        // 走到这里说明缓存命中了：
        // 1. 以下函数不阻塞，函数会立刻返回 cached.data，让页面先显示旧但可用的数据。
        // 2. 同时后台再发一次网络请求，悄悄校验服务端是否已有更新。
        void (async () => {
            try {
                const data = await request();
                // 如果后台拉到的数据和当前缓存完全一致，说明缓存仍然是新的，无需任何额外处理。
                if (isSameCachedData(cached.data, data)) return;
                try {
                    // 后台数据比缓存更新时，先把新数据写回缓存，保证后续读取也能命中最新结果。
                    await cacheResponse(key, data);
                } catch {
                    // 存储配额错误不应阻止 UI 刷新到最新数据。
                }
                // 缓存更新完成后，通过回调通知上层“有新数据到了”。
                // 调用方可以在这里 set 最新状态，从而触发页面刷新。
                onCacheUpdated?.(data);
            } catch {
                // 当前界面已经展示了缓存数据，因此后台刷新失败时保持静默。
            }
        })();

        // 先把缓存数据立即返回给调用方，这就是 stale-while-revalidate 中的 stale 部分。
        // 调用方会先渲染缓存；如果后台请求拿到更新结果，再通过 onCacheUpdated 二次刷新 UI。
        return cached.data as T;
    },
});
