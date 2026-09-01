import type { UserProfile } from "@/services/user/types";

export interface PlatformContextValue {
    user: UserProfile | null;
    accessToken: string;
    apiBase: string;
    locale: string;
    onUnauthorized: () => void;
}
