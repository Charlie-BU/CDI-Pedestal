import { Form, Input } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";

const ModifyPasswordForm = () => {
    const { i18n, t } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage;
    const labelCol = currentLanguage === "en-US" ? { span: 7 } : undefined;
    const wrapperCol = currentLanguage === "en-US" ? { span: 17 } : undefined;

    return (
        <>
            <Form.Item field="old_password" label={t("modifyPassword.oldPassword")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("modifyPassword.oldPasswordRequired") }]}>
                <Input.Password allowClear placeholder={t("modifyPassword.oldPasswordPlaceholder")} />
            </Form.Item>
            <Form.Item field="new_password" label={t("modifyPassword.newPassword")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("modifyPassword.newPasswordRequired") }]}>
                <Input.Password allowClear placeholder={t("modifyPassword.newPasswordPlaceholder")} />
            </Form.Item>
            <Form.Item field="confirm_new_password" label={t("modifyPassword.confirmPassword")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("modifyPassword.confirmPasswordRequired") }]}>
                <Input.Password allowClear placeholder={t("modifyPassword.confirmPasswordPlaceholder")} />
            </Form.Item>
        </>
    );
};

export default ModifyPasswordForm;
