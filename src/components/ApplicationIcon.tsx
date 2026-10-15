import type { ComponentPropsWithoutRef } from "react";
import { LogoAirJelly } from "@/assets/icons";

/** ApplicationIcon：展示子应用图标，未配置或加载失败时使用 AirJelly 图标。 */
export default function ApplicationIcon({ src, alt = "", ...props }: Omit<ComponentPropsWithoutRef<"img">, "onError">) {
    return <img {...props} src={src?.trim() || LogoAirJelly} alt={alt} onError={(event) => {
        const image = event.currentTarget;
        if (image.getAttribute("src") !== LogoAirJelly) image.src = LogoAirJelly;
    }} />;
}
