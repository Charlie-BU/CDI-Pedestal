import { Form, Input } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";

const LoginForm = () => {
    const { i18n, t } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage;

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
        </>
    );
};

export default LoginForm;
