import { Form, Input } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";

const LoginForm = () => {
    const { t } = useTranslation();
    return (
        <>
            <Form.Item field="username" label={t("login.username")} rules={[{ required: true }]}>
                <Input allowClear placeholder={t("login.usernamePlaceholder")} />
            </Form.Item>
            <Form.Item field="password" label={t("login.password")} rules={[{ required: true }]}>
                <Input.Password allowClear placeholder={t("login.passwordPlaceholder")} />
            </Form.Item>
        </>
    );
};

export default LoginForm;

