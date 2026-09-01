import type { GetMyInfo200ResponseUser } from "@/cam-auto-generate/CDIService/namespaces";

export interface PlatformContextValue {
    user: GetMyInfo200ResponseUser | null;
    accessToken: string;
    apiBase: string;
    locale: string;
    onUnauthorized: () => void;
}
