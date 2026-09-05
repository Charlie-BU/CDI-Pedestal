import { useEffect, useRef, useState } from "react";
import { Form, Input, Spin, Typography } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import styles from "./index.module.less";

interface GoogleCredentialResponse {
    credential: string;
}

interface GoogleAccountsId {
    initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
    }) => void;
    renderButton: (
        parent: HTMLElement,
        options: Record<string, string | number>,
    ) => void;
}

declare global {
    interface Window {
        google?: { accounts: { id: GoogleAccountsId } };
    }
}

interface GoogleLoginButtonProps {
    clientId: string;
    locale: string;
    loadingMessage: string;
    unavailableMessage: string;
    onCredential: (credential: string) => Promise<void>;
}

interface GoogleLinkPanelProps extends GoogleLoginButtonProps {
    description: string;
}

/** GoogleLoginButton：加载并渲染 Google 官方登录按钮。 */
export const GoogleLoginButton = ({
    clientId,
    locale,
    loadingMessage,
    unavailableMessage,
    onCredential,
}: GoogleLoginButtonProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let disposed = false;
        const render = () => {
            if (disposed || !containerRef.current || !window.google) return;
            containerRef.current.replaceChildren();
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: (response) => {
                    setErrorMessage("");
                    void onCredential(response.credential).catch((error: unknown) => {
                        if (disposed) return;
                        setErrorMessage(
                            error instanceof Error ? error.message : "",
                        );
                    });
                },
            });
            window.google.accounts.id.renderButton(containerRef.current, {
                type: "standard",
                theme: "outline",
                size: "large",
                shape: "rectangular",
                width: 320,
                locale,
            });
            setLoading(false);
        };
        if (window.google) {
            render();
            return () => {
                disposed = true;
            };
        }

        const existingScript = document.querySelector<HTMLScriptElement>(
            'script[src="https://accounts.google.com/gsi/client"]',
        );
        const script = existingScript || document.createElement("script");
        const handleError = () => {
            if (!disposed) {
                setLoading(false);
                setErrorMessage(unavailableMessage);
            }
        };
        script.addEventListener("load", render);
        script.addEventListener("error", handleError);
        if (!existingScript) {
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            document.head.appendChild(script);
        }
        return () => {
            disposed = true;
            script.removeEventListener("load", render);
            script.removeEventListener("error", handleError);
        };
    }, [clientId, locale, onCredential, unavailableMessage]);

    return (
        <div className={styles.googleLogin}>
            <div className={styles.googleButtonSlot}>
                {loading && (
                    <div
                        className={styles.googleButtonLoading}
                        role="status"
                        aria-label={loadingMessage}
                    >
                        <Spin dot loading />
                    </div>
                )}
                <div ref={containerRef} />
            </div>
            {errorMessage && (
                <Typography.Text type="error">{errorMessage}</Typography.Text>
            )}
        </div>
    );
};

/** GoogleLinkPanel：在绑定弹窗中展示说明和 Google 官方授权按钮。 */
export const GoogleLinkPanel = ({ description, ...buttonProps }: GoogleLinkPanelProps) => (
    <div className={styles.googleLinkPanel}>
        <Typography.Paragraph>{description}</Typography.Paragraph>
        <GoogleLoginButton {...buttonProps} />
    </div>
);

interface LoginFormProps {
    onGoogleCredential: (credential: string) => Promise<void>;
}

/** LoginForm：提供密码登录和 Google 登录入口。 */
const LoginForm = ({ onGoogleCredential }: LoginFormProps) => {
    const { i18n, t } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage;
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
    const googleLoginEnabled =
        import.meta.env.VITE_GOOGLE_LOGIN_ENABLED === "true" && Boolean(googleClientId);

    return (
        <>
            <Form.Item
                field="username"
                label={t("login.username")}
                labelCol={currentLanguage === "en-US" ? { span: 7 } : undefined}
                wrapperCol={currentLanguage === "en-US" ? { span: 17 } : undefined}
                rules={[
                    {
                        required: true,
                        message: t("login.usernameRequired"),
                    },
                ]}
            >
                <Input allowClear placeholder={t("login.usernamePlaceholder")} />
            </Form.Item>
            <Form.Item
                field="password"
                label={t("login.password")}
                labelCol={currentLanguage === "en-US" ? { span: 7 } : undefined}
                wrapperCol={currentLanguage === "en-US" ? { span: 17 } : undefined}
                rules={[
                    {
                        required: true,
                        message: t("login.passwordRequired"),
                    },
                ]}
            >
                <Input.Password allowClear placeholder={t("login.passwordPlaceholder")} />
            </Form.Item>
            {googleLoginEnabled && (
                <>
                    <div className={styles.loginDivider}>{t("login.or")}</div>
                    <GoogleLoginButton
                        clientId={googleClientId}
                        locale={currentLanguage || "zh-CN"}
                        loadingMessage={t("login.googleLoading")}
                        unavailableMessage={t("login.googleUnavailable")}
                        onCredential={onGoogleCredential}
                    />
                </>
            )}
        </>
    );
};

export default LoginForm;
