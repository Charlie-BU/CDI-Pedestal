import type { UserProfile } from "@/services/user/types";

export interface PlatformContextValue {
    user: UserProfile | null;
    accessToken: string;
    locale: string;
    openLoginModal: () => void;
    openRegisterModal: () => void;
    logout: () => void;
}

