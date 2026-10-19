import { useMemo, type ReactNode } from "react";
import { appearanceFromJellyConfig } from "./preset-transfer";
import { JellyAvatarPreview } from "./JellyAvatarPreview";

/** ConfiguredJellyAvatar：按客户端规则渲染用户保存的像素预设。 */
export default function ConfiguredJellyAvatar({ config, size, fill, fallback }: { config: unknown; size: number; fill: number; fallback: ReactNode }) {
    const appearance = useMemo(() => appearanceFromJellyConfig(config), [config]);
    if (!appearance) return fallback;
    return <span aria-hidden="true" style={{ display: "inline-flex", width: size, height: size, cursor: "pointer" }}>
        <JellyAvatarPreview settings={appearance.pixel} fill={fill} />
    </span>;
}
