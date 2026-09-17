import type { ComponentType } from "react";
import type { PlatformContextValue } from "./platform";
import type { SubApplication } from "./subApplications";
import { getApiBase, getRemoteEntry } from "./localDebug";

/** FederationRuntime：构建插件创建的 host 运行时接口。 */
interface FederationRuntime {
    registerRemotes: (remotes: { name: string; alias: string; entry: string; type: "module" }[]) => void;
    loadRemote: <T>(id: string) => Promise<T | null>;
}
let resolveRuntime: (runtime: FederationRuntime) => void;
const ready = new Promise<FederationRuntime>((resolve) => { resolveRuntime = resolve; });
const loaded = new Map<string, string>();

/** federationRuntimePlugin：使用构建插件的同一 host 实例和共享依赖。 */
export default function federationRuntimePlugin() {
    return { name: "cdi-dynamic-applications", init: (args: { origin: FederationRuntime }) => { resolveRuntime(args.origin); return args; } };
}
/** applicationSignature：标识需要刷新后才可切换的加载配置。 */
export const applicationSignature = (app: SubApplication) => JSON.stringify([app.app_type, app.route_path, getRemoteEntry(app.app_key, app.frontend_url), app.remote_name, app.exposed_module, getApiBase(app.app_key)]);
/** needsApplicationReload：避免同一页面混用两个远程模块或后端。 */
export const needsApplicationReload = (app: SubApplication) => loaded.has(app.app_key) && loaded.get(app.app_key) !== applicationSignature(app);
/** loadApplication：按数据库配置延迟注册并加载任意合约兼容的子应用。 */
export async function loadApplication(app: SubApplication) {
    if (needsApplicationReload(app)) throw new Error("APPLICATION_RELOAD_REQUIRED");
    const runtime = await ready;
    const signature = applicationSignature(app);
    runtime.registerRemotes([{ name: app.remote_name, alias: app.app_key, entry: getRemoteEntry(app.app_key, app.frontend_url), type: "module" }]);
    loaded.set(app.app_key, signature);
    const module = await runtime.loadRemote<{ default: ComponentType<{ platform: PlatformContextValue }> }>(`${app.app_key}/${app.exposed_module.slice(2)}`);
    if (!module?.default) throw new Error("INVALID_APPLICATION_MODULE");
    return module;
}
