import { Form, Input, Select } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";

const roles = [
    "frontend", "backend", "fullstack", "qa", "devops", "product_manager",
    "designer", "architect", "proj_lead", "guest",
];

const RegisterForm = () => {
    const { i18n, t } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage;
    const labelCol = currentLanguage === "en-US" ? { span: 7 } : undefined;
    const wrapperCol = currentLanguage === "en-US" ? { span: 17 } : undefined;

    return (
        <>
            <Form.Item field="username" label={t("register.username")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("register.usernameRequired") }]}>
                <Input allowClear placeholder={t("register.usernamePlaceholder")} />
            </Form.Item>
            <Form.Item field="nickname" label={t("register.nickname")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("register.nicknameRequired") }]}>
                <Input allowClear placeholder={t("register.nicknamePlaceholder")} />
            </Form.Item>
            <Form.Item field="email" label={t("register.email")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("register.emailRequired") }]}>
                <Input allowClear placeholder={t("register.emailPlaceholder")} />
            </Form.Item>
            <Form.Item field="role" label={t("register.role")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("register.roleRequired") }]}>
                <Select placeholder={t("register.rolePlaceholder")}>{roles.map((role) => <Select.Option key={role} value={role}>{t(`user.${role}`)}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item field="password" label={t("register.password")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("register.passwordRequired") }]}>
                <Input.Password allowClear placeholder={t("register.passwordPlaceholder")} />
            </Form.Item>
            <Form.Item field="confirmPassword" label={t("register.confirmPassword")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("register.confirmPasswordRequired") }]}>
                <Input.Password allowClear placeholder={t("register.confirmPasswordPlaceholder")} />
            </Form.Item>
        </>
    );
};

export default RegisterForm;
