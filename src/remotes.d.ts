declare module "cam/App" {
    import type { ComponentType } from "react";
    import type { PlatformContextValue } from "@/platform";

    const CAMApp: ComponentType<{ platform: PlatformContextValue }>;
    export default CAMApp;
}

