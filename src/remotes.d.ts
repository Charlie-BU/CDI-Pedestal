declare module "cam/App" {
    import type { ComponentType } from "react";
    import type { PlatformContextValue } from "@/platform";

    const CamApp: ComponentType<{ platform: PlatformContextValue }>;
    export default CamApp;
}

