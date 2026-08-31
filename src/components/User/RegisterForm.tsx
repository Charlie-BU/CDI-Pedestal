import { Form, Input, Select } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";

const roles = [
    "frontend", "backend", "fullstack", "qa", "devops", "product_manager",
    "designer", "architect", "proj_lead", "guest",
];

const RegisterForm = () => {
    const { t } = useTranslation();
    return (
        <>
            <Form.Item field="username" label={t("register.username")} rules={[{ required: true }]}>
                <Input allowClear />
            </Form.Item>
            <Form.Item field="nickname" label={t("register.nickname")} rules={[{ required: true }]}>
                <Input allowClear />
            </Form.Item>
            <Form.Item field="email" label={t("register.email")} rules={[{ required: true }]}>
                <Input allowClear />
            </Form.Item>
            <Form.Item field="role" label={t("register.role")} rules={[{ required: true }]}>
                <Select>{roles.map((role) => <Select.Option key={role} value={role}>{t(`user.${role}`)}</Select.Option>)}</Select>
            </Form.Item>
            <Form.Item field="password" label={t("register.password")} rules={[{ required: true }]}>
                <Input.Password allowClear />
            </Form.Item>
            <Form.Item field="confirmPassword" label={t("register.confirmPassword")} rules={[{ required: true }]}>
                <Input.Password allowClear />
            </Form.Item>
        </>
    );
};

export default RegisterForm;

