import type { PlatformContextValue } from "@/platform";

/** 离线 CAM remote：只暴露 host-to-remote 合同中需要断言的 apiBase。 */
export default function CAMRemote({ platform }: { platform: PlatformContextValue }) {
    return <output data-testid="remote-api-base">{platform.apiBase}</output>;
}
