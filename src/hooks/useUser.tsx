import { create } from "zustand";
import { CModal, Message } from "@cloud-materials/common";
import i18next, { t } from "i18next";
import axios from "axios";
import { CDIService, TOKEN_KEY } from "@/services/CDIService";
import { clearCachedResponsesForToken } from "@/services/cache";
import type {
    GetMyInfo200ResponseUser,
    ModifyPasswordBodyRequest,
    UserGoogleLogin200Response,
    UserLogin200Response,
    UserLoginBodyRequest,
    UserRegisterBodyRequest,
} from "@/cam-auto-generate/CDIService/namespaces";
import LoginForm, { GoogleLinkPanel } from "@/components/User/LoginForm";
import RegisterForm from "@/components/User/RegisterForm";
import ModifyPasswordForm from "@/components/User/ModifyPasswordForm";
import SetPasswordForm from "@/components/User/SetPasswordForm";

/** AuthenticatedUser：包含鉴权方式信息的当前用户。 */
type AuthenticatedUser = GetMyInfo200ResponseUser & {
    has_password?: boolean;
    auth_providers?: string[];
};

interface UserStore {
    user: AuthenticatedUser | null;
    accessToken: string;
    loading: boolean;
    fetchUser: () => Promise<void>;
    logout: () => void;
    openLoginModal: () => void;
    openRegisterModal: () => void;
    openModifyPasswordModal: () => void;
    openSetPasswordModal: () => void;
    openGoogleLinkModal: () => void;
}

const ensureSuccess = (status: number, message: string) => {
    if (status !== 200) {
        Message.warning(message);
        throw new Error(message);
    }
};

/** saveAuthenticatedSession：保存平台令牌并拉取当前用户。 */
const saveAuthenticatedSession = async (
    response: UserLogin200Response | UserGoogleLogin200Response,
    set: (state: Partial<UserStore>) => void,
    fetchUser: () => Promise<void>,
) => {
    ensureSuccess(response.status, response.message || t("login.failure"));
    if (!response.access_token) {
        throw new Error(t("login.failure"));
    }
    localStorage.setItem(TOKEN_KEY, response.access_token);
    set({ accessToken: response.access_token, user: null });
    await fetchUser();
};

interface GoogleAuthErrorPayload {
    code?: string;
    message?: string;
}

/** getGoogleAuthErrorCode：从 Google 登录请求错误中提取业务错误码。 */
const getGoogleAuthErrorCode = (error: unknown): string | undefined => {
    if (!axios.isAxiosError<GoogleAuthErrorPayload>(error)) return undefined;
    return error.response?.data?.code;
};

/** getGoogleAuthErrorMessage：优先使用 CAM 响应中的错误信息。 */
const getGoogleAuthErrorMessage = (error: unknown): string | undefined => {
    if (!axios.isAxiosError<GoogleAuthErrorPayload>(error)) return undefined;
    return error.response?.data?.message;
};

/** googleLoginErrorMessage：把后端 Google 登录错误映射为本地化文案。 */
const googleLoginErrorMessage = (error: unknown): string => {
    const responseMessage = getGoogleAuthErrorMessage(error);
    if (responseMessage) return responseMessage;

    const code = getGoogleAuthErrorCode(error);
    if (code === "ACCOUNT_LINK_REQUIRED") return t("login.googleAccountLinkRequired");
    if (code === "GOOGLE_DOMAIN_NOT_ALLOWED") return t("login.googleDomainNotAllowed");
    if (code === "GOOGLE_AUTH_NOT_CONFIGURED" || code === "GOOGLE_AUTH_UNAVAILABLE") {
        return t("login.googleUnavailable");
    }
    return t("login.googleFailure");
};

/** googleLinkErrorMessage：把 Google 绑定错误映射为本地化文案。 */
const googleLinkErrorMessage = (error: unknown): string => {
    const responseMessage = getGoogleAuthErrorMessage(error);
    if (responseMessage) return responseMessage;

    const code = getGoogleAuthErrorCode(error);
    if (code === "GOOGLE_DOMAIN_NOT_ALLOWED") return t("login.googleDomainNotAllowed");
    if (code === "GOOGLE_AUTH_NOT_CONFIGURED" || code === "GOOGLE_AUTH_UNAVAILABLE") {
        return t("login.googleUnavailable");
    }
    return t("profile.googleLinkFailure");
};

export const useUser = create<UserStore>((set, get) => ({
    user: null,
    accessToken: localStorage.getItem(TOKEN_KEY) || "",
    loading: false,

    fetchUser: async () => {
        const token = get().accessToken;
        if (!token || get().loading) return;
        set({ loading: true });
        try {
            const response = await CDIService.GetMyInfoGET(
                { Authorization: "" },
                {
                    needCache: true,
                    onCacheUpdated: (updatedResponse) => {
                        const latest = updatedResponse as {
                            status?: number;
                            user?: GetMyInfo200ResponseUser;
                        };
                        // 忽略在退出登录或切换账号后才返回的旧响应。
                        if (get().accessToken === token && latest.status === 200) {
                            // 命中了缓存后，又拉到更新数据时，再补一次最新用户信息
                            set({ user: latest.user || null });
                        }
                    },
                },
            );
            ensureSuccess(response.status, response.message || t("user.fetchFailure"));
            set({ user: response.user, loading: false });
        } catch {
            localStorage.removeItem(TOKEN_KEY);
            set({ user: null, accessToken: "", loading: false });
        }
    },

    logout: () => {
        const token = get().accessToken;
        localStorage.removeItem(TOKEN_KEY);
        void clearCachedResponsesForToken(token).catch(() => undefined);
        set({ user: null, accessToken: "" });
    },

    openLoginModal: () => {
        let pendingGoogleCredential = "";
        let closeModal: () => void = () => undefined;
        const handleGoogleCredential = async (credential: string) => {
            try {
                const response = await CDIService.UserGoogleLoginPOST({ credential });
                await saveAuthenticatedSession(response, set, get().fetchUser);
                Message.success(t("login.success"));
                closeModal();
            } catch (error) {
                if (getGoogleAuthErrorCode(error) === "ACCOUNT_LINK_REQUIRED") {
                    pendingGoogleCredential = credential;
                }
                throw new Error(googleLoginErrorMessage(error));
            }
        };
        const modal = CModal.openArcoForm({
            title: t("login.title"),
            content: <LoginForm onGoogleCredential={handleGoogleCredential} />,
            cancelText: t("common.cancel"),
            okText: t("login.login"),
            onOk: async (values, form) => {
                await form.validate();
                const payload: UserLoginBodyRequest = {
                    username: values.username,
                    password: values.password,
                };
                const response = await CDIService.UserLoginPOST(payload);
                await saveAuthenticatedSession(response, set, get().fetchUser);
                if (pendingGoogleCredential) {
                    try {
                        await CDIService.LinkGooglePOST({
                            credential: pendingGoogleCredential,
                            Authorization: "",
                        });
                        pendingGoogleCredential = "";
                    } catch {
                        Message.warning(t("login.googleLinkFailure"));
                    }
                }
                Message.success(response.message || t("login.success"));
                modal.close();
            },
        });
        closeModal = () => modal.close();
    },

    openRegisterModal: () => {
        const modal = CModal.openArcoForm({
            title: t("register.title"),
            content: <RegisterForm />,
            cancelText: t("common.cancel"),
            okText: t("register.submit"),
            onOk: async (values, form) => {
                await form.validate();
                if (values.password !== values.confirmPassword) {
                    throw new Error(t("register.passwordMismatch"));
                }
                const payload: UserRegisterBodyRequest = {
                    username: values.username,
                    nickname: values.nickname,
                    email: values.email,
                    role: values.role,
                    password: values.password,
                };
                const response = await CDIService.UserRegisterPOST(payload);
                ensureSuccess(response.status, response.message || t("register.failure"));
                Message.success(response.message || t("register.success"));
                modal.close();
            },
        });
    },

    openGoogleLinkModal: () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
        const enabled =
            import.meta.env.VITE_GOOGLE_LOGIN_ENABLED === "true" && Boolean(clientId);
        if (!enabled) {
            Message.warning(t("login.googleUnavailable"));
            return;
        }

        let closeModal: () => void = () => undefined;
        const modal = CModal.open({
            title: t("profile.googleLinkTitle"),
            footer: null,
            content: (
                <GoogleLinkPanel
                    clientId={clientId}
                    locale={i18next.resolvedLanguage || "zh-CN"}
                    unavailableMessage={t("login.googleUnavailable")}
                    description={t("profile.googleLinkDescription")}
                    onCredential={async (credential) => {
                        try {
                            const response = await CDIService.LinkGooglePOST({
                                credential,
                                Authorization: "",
                            });
                            ensureSuccess(
                                response.status,
                                response.message || t("profile.googleLinkFailure"),
                            );
                            await get().fetchUser();
                            Message.success(t("profile.googleLinkSuccess"));
                            closeModal();
                        } catch (error) {
                            throw new Error(googleLinkErrorMessage(error));
                        }
                    }}
                />
            ),
        });
        closeModal = () => modal.close();
    },

    openSetPasswordModal: () => {
        const modal = CModal.openArcoForm({
            title: t("setPassword.title"),
            content: <SetPasswordForm />,
            cancelText: t("common.cancel"),
            okText: t("setPassword.submit"),
            onOk: async (values, form) => {
                await form.validate();
                if (values.new_password !== values.confirm_new_password) {
                    throw new Error(t("setPassword.passwordMismatch"));
                }
                const response = await CDIService.ModifyPasswordPOST({
                    old_password: "",
                    new_password: values.new_password,
                    Authorization: "",
                });
                ensureSuccess(response.status, response.message || t("setPassword.failure"));
                const user = get().user;
                if (user) set({ user: { ...user, has_password: true } });
                Message.success(response.message || t("setPassword.success"));
                modal.close();
            },
        });
    },

    openModifyPasswordModal: () => {
        const modal = CModal.openArcoForm({
            title: t("modifyPassword.title"),
            content: <ModifyPasswordForm />,
            cancelText: t("common.cancel"),
            okText: t("modifyPassword.submit"),
            onOk: async (values, form) => {
                await form.validate();
                if (values.new_password !== values.confirm_new_password) {
                    throw new Error(t("modifyPassword.passwordMismatch"));
                }
                const payload: ModifyPasswordBodyRequest = {
                    old_password: values.old_password,
                    new_password: values.new_password,
                };
                const response = await CDIService.ModifyPasswordPOST({
                    ...payload,
                    Authorization: "",
                });
                ensureSuccess(response.status, response.message || t("modifyPassword.failure"));
                Message.success(response.message || t("modifyPassword.success"));
                modal.close();
            },
        });
    },
}));
