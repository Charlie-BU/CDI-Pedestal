import { getRemoteEntry } from "./localDebug";

/** RemoteOptions：Federation 注册时可覆盖的远程入口。 */
interface RemoteOptions { name: string; alias?: string; entry?: string }

/** localDebugRuntimePlugin：在远程模块注册前选择当前标签页的调试入口。 */
export default function localDebugRuntimePlugin() {
    return {
        name: "cdi-local-debug",
        beforeRegisterRemote(args: { remote: RemoteOptions }) {
            const { remote } = args;
            if (remote.entry) remote.entry = getRemoteEntry(remote.alias || remote.name, remote.entry);
            return args;
        },
    };
}
