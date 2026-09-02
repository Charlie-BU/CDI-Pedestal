interface FederationManifest {
    metaData?: {
        remoteEntry?: {
            name?: string;
            path?: string;
        };
    };
}

let preloading: Promise<void> | undefined;

const appendModulePreload = (url: string) => {
    if (document.querySelector(`link[rel="modulepreload"][href="${url}"]`)) {
        return;
    }

    const link = document.createElement("link");
    link.rel = "modulepreload";
    link.href = url;
    link.crossOrigin = "anonymous";
    document.head.append(link);
};

const getRemoteEntryUrl = (manifestUrl: string, manifest: FederationManifest) => {
    const remoteEntry = manifest.metaData?.remoteEntry;
    if (!remoteEntry?.name) return undefined;

    return new URL(
        `${remoteEntry.path || ""}${remoteEntry.name}`,
        manifestUrl,
    ).href;
};

// 仅预取 Federation 的引导资源；CAM 模块仍保持懒加载，只有访问 /cam 时才会执行。
export const preloadCAMRemote = () => {
    if (preloading) return preloading;

    const manifestUrl = import.meta.env.VITE_CAM_REMOTE_ENTRY;
    if (!manifestUrl) return Promise.resolve();

    preloading = (async () => {
        try {
            // manifest 是跨域静态资源，不需要 Bearer Token、/api/cam 代理或 401 处理；
            // 使用浏览器原生 fetch 可直接复用后续模块加载的 HTTP 缓存，也避免为此另建 Axios 实例。
            const response = await fetch(manifestUrl, { credentials: "omit" });
            if (!response.ok) throw new Error(`Failed to fetch CAM manifest: ${response.status}`);
            const manifest = (await response.json()) as FederationManifest;
            const remoteEntryUrl = getRemoteEntryUrl(manifestUrl, manifest);
            if (remoteEntryUrl) appendModulePreload(remoteEntryUrl);
        } catch (error: unknown) {
            // 预加载失败不能影响主站或会话；用户访问 /cam 时仍会按原有流程加载 CAM。
            console.warn("Unable to preload the CAM remote", error);
        }
    })();

    return preloading;
};
