import { readDebugSettings, getRemoteEntry } from "./index";

/** RefreshRuntime：Vite React 开发服务器暴露的初始化接口。 */
interface RefreshRuntime {
    injectIntoGlobalHook?: (target: Window) => void;
    default?: { injectIntoGlobalHook?: (target: Window) => void };
}
/** RefreshWindow：兼容不同版本 React 插件的浏览器初始化标记。 */
type RefreshWindow = Window & {
    $RefreshReg$?: (...args: unknown[]) => void;
    $RefreshSig$?: () => (type: unknown) => unknown;
    __vite_plugin_react_preamble_installed__?: boolean;
};
/** createDebugRefreshInitializer：按开发入口去重，在远程模块执行前初始化真实 Refresh 运行时。 */
export function createDebugRefreshInitializer(importRuntime: (url: string) => Promise<RefreshRuntime> = (url) => import(/* @vite-ignore */ url)) {
    const pending = new Map<string, Promise<void>>();
    return async (appKey: string) => {
        const frontend = readDebugSettings()[appKey]?.frontend;
        if (!frontend) return;
        const url = new URL("./@react-refresh", getRemoteEntry(appKey, frontend)).href;
        if (!pending.has(url)) {
            const task = (async () => {
                const module = await importRuntime(url);
                const inject = module.injectIntoGlobalHook || module.default?.injectIntoGlobalHook;
                if (!inject) return;
                inject(window);
                const target = window as RefreshWindow;
                target.$RefreshReg$ ??= () => {};
                target.$RefreshSig$ ??= () => (type) => type;
                target.__vite_plugin_react_preamble_installed__ = true;
            })();
            pending.set(url, task);
        }
        try { await pending.get(url); }
        catch {
            // 覆盖地址也可能是生产构建或非 Vite 服务，继续由正常模块加载报告错误。
            pending.delete(url);
        }
    };
}
/** prepareLocalDebugRefresh：基座内共享的开发入口初始化器。 */
export const prepareLocalDebugRefresh = createDebugRefreshInitializer();
