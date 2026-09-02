// 读取型、低实时性、可按当前账号隔离的 API 适合配置缓存 + 静默更新机制
import type { AxiosRequestConfig } from "axios";

const DATABASE_NAME = "cdi-pedestal-cache";
const DATABASE_VERSION = 1;
const STORE_NAME = "responses";

interface CachedResponse {
    key: string;
    data: unknown;
    updatedAt: number;
}

/** CDI 服务适配器消费的额外请求选项，不会透传给 Axios。 */
export interface CacheRequestOptions extends AxiosRequestConfig {
    /** 立即返回缓存的 GET 响应，并在后台刷新。 */
    needCache?: boolean;
    /** 覆盖自动生成的、带用户隔离的缓存键。通常不需要传，除非有特殊需求。 */
    cacheKey?: string;
    /** 仅当后台刷新拿到不同数据时触发。 */
    onCacheUpdated?: (data: unknown) => void;
}

// 打开 IndexedDB 数据库，并在首次创建时初始化对象仓库。
const openDatabase = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE_NAME)) {
                request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

// 按缓存键读取一条缓存记录。
const read = async (key: string): Promise<CachedResponse | undefined> => {
    const database = await openDatabase();
    try {
        return await new Promise((resolve, reject) => {
            const request = database
                .transaction(STORE_NAME, "readonly")
                .objectStore(STORE_NAME)
                .get(key);
            request.onsuccess = () => resolve(request.result as CachedResponse | undefined);
            request.onerror = () => reject(request.error);
        });
    } finally {
        database.close();
    }
};

// 写入或更新一条缓存记录。
const write = async (record: CachedResponse): Promise<void> => {
    const database = await openDatabase();
    try {
        await new Promise<void>((resolve, reject) => {
            const request = database
                .transaction(STORE_NAME, "readwrite")
                .objectStore(STORE_NAME)
                .put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } finally {
        database.close();
    }
};

// 计算稳定的短哈希值，用于生成更紧凑的缓存键。
const hash = (value: string): string => {
    let result = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        result ^= value.charCodeAt(index);
        result = Math.imul(result, 16777619);
    }
    return (result >>> 0).toString(36);
};

// 对对象做稳定序列化，避免因键顺序不同导致比较结果不一致。
const stableStringify = (value: unknown): string => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return JSON.stringify(value) || "";
    }
    return JSON.stringify(
        Object.fromEntries(
            Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
                left.localeCompare(right),
            ),
        ),
    );
};

/**
 * 缓存键会包含当前 access token 的摘要，避免切换账号后复用旧响应。
 * token 本身不会被持久化存储。
 */
// 基于请求信息和当前用户令牌生成缓存键。
export const createCacheKey = (
    config: Pick<AxiosRequestConfig, "method" | "url" | "params">,
    accessToken: string,
): string =>
    [
        "v1",
        hash(accessToken || "anonymous"),
        (config.method || "get").toLowerCase(),
        config.url || "",
        stableStringify(config.params),
    ].join(":");

// 读取指定缓存键对应的缓存响应。
export const getCachedResponse = async (key: string) => read(key);

// 将响应数据写入缓存。
export const cacheResponse = async (key: string, data: unknown) =>
    write({ key, data, updatedAt: Date.now() });

// 比较两份缓存数据是否在结构和值上保持一致。
export const isSameCachedData = (left: unknown, right: unknown) =>
    stableStringify(left) === stableStringify(right);

/** 删除由当前用户令牌生成的全部缓存响应。 */
// 按当前用户令牌清理对应账号下的所有缓存。
export const clearCachedResponsesForToken = async (accessToken: string) => {
    const prefix = `v1:${hash(accessToken || "anonymous")}:`;
    const database = await openDatabase();
    try {
        await new Promise<void>((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.openCursor();
            request.onsuccess = () => {
                const cursor = request.result;
                if (!cursor) return;
                if (String(cursor.key).startsWith(prefix)) cursor.delete();
                cursor.continue();
            };
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    } finally {
        database.close();
    }
};
