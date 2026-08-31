import { create } from "zustand";
import { CModal, Message } from "@cloud-materials/common";
import { t } from "i18next";
import { TOKEN_KEY } from "@/request";
import { getMyInfo, login, modifyPassword, register } from "@/services/user";
import type { LoginRequest, ModifyPasswordRequest, RegisterRequest, UserProfile } from "@/services/user/types";
import LoginForm from "@/components/User/LoginForm";
import RegisterForm from "@/components/User/RegisterForm";
import ModifyPasswordForm from "@/components/User/ModifyPasswordForm";

interface UserStore {
    user: UserProfile | null;
    accessToken: string;
    loading: boolean;
    fetchUser: () => Promise<void>;
    logout: () => void;
    openLoginModal: () => void;
    openRegisterModal: () => void;
    openModifyPasswordModal: () => void;
}

const ensureSuccess = (status: number, message: string) => {
    if (status !== 200) throw new Error(message);
};

export const useUser = create<UserStore>((set, get) => ({
    user: null,
    accessToken: localStorage.getItem(TOKEN_KEY) || "",
    loading: false,

    fetchUser: async () => {
        if (!get().accessToken || get().loading) return;
        set({ loading: true });
        try {
            const response = await getMyInfo();
            ensureSuccess(response.status, response.message || "获取用户信息失败");
            set({ user: response.user, loading: false });
        } catch {
            localStorage.removeItem(TOKEN_KEY);
            set({ user: null, accessToken: "", loading: false });
        }
    },

    logout: () => {
        localStorage.removeItem(TOKEN_KEY);
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
                const payload: LoginRequest = {
                    username: values.username,
                    password: values.password,
                };
                const response = await login(payload);
                ensureSuccess(response.status, response.message || t("login.failure"));
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
                const payload: RegisterRequest = {
                    username: values.username,
                    nickname: values.nickname,
                    email: values.email,
                    role: values.role,
                    password: values.password,
                };
                const response = await register(payload);
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
                const payload: ModifyPasswordRequest = {
                    old_password: values.old_password,
                    new_password: values.new_password,
                };
                const response = await modifyPassword(payload);
                ensureSuccess(response.status, response.message || t("modifyPassword.failure"));
                Message.success(response.message || t("modifyPassword.success"));
                modal.close();
            },
        });
    },
}));

