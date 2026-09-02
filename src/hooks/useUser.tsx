import { create } from "zustand";
import { CModal, Message } from "@cloud-materials/common";
import { t } from "i18next";
import { CDIService, TOKEN_KEY } from "@/services/CDIService";
import { clearCachedResponsesForToken } from "@/services/cache";
import type {
    GetMyInfo200ResponseUser,
    ModifyPasswordBodyRequest,
    UserLoginBodyRequest,
    UserRegisterBodyRequest,
} from "@/cam-auto-generate/CDIService/namespaces";
import LoginForm from "@/components/User/LoginForm";
import RegisterForm from "@/components/User/RegisterForm";
import ModifyPasswordForm from "@/components/User/ModifyPasswordForm";

interface UserStore {
    user: GetMyInfo200ResponseUser | null;
    accessToken: string;
    loading: boolean;
    fetchUser: () => Promise<void>;
    logout: () => void;
    openLoginModal: () => void;
    openRegisterModal: () => void;
    openModifyPasswordModal: () => void;
}

const ensureSuccess = (status: number, message: string) => {
    if (status !== 200) {
        Message.warning(message);
        throw new Error(message);
    }
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
            ensureSuccess(response.status, response.message || "获取用户信息失败");
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
        const modal = CModal.openArcoForm({
            title: t("login.title"),
            content: <LoginForm />,
            cancelText: t("common.cancel"),
            okText: t("login.login"),
            onOk: async (values, form) => {
                await form.validate();
                const payload: UserLoginBodyRequest = {
                    username: values.username,
                    password: values.password,
                };
                const response = await CDIService.UserLoginPOST(payload);
                ensureSuccess(response.status, response.message || t("login.failure"));
                if (!response.access_token) {
                    const message = t("login.failure");
                    Message.warning(message);
                    throw new Error(message);
                }
                localStorage.setItem(TOKEN_KEY, response.access_token);
                set({ accessToken: response.access_token, user: null });
                await get().fetchUser();
                Message.success(response.message || t("login.success"));
                modal.close();
            },
        });
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
                    throw new Error("两次密码输入不一致");
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

    openModifyPasswordModal: () => {
        const modal = CModal.openArcoForm({
            title: t("modifyPassword.title"),
            content: <ModifyPasswordForm />,
            cancelText: t("common.cancel"),
            okText: t("modifyPassword.submit"),
            onOk: async (values, form) => {
                await form.validate();
                if (values.new_password !== values.confirm_new_password) {
                    throw new Error("两次新密码输入不一致");
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
