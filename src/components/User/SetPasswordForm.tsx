import { Form, Input } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";

/** SetPasswordForm：为无本地密码用户提供新密码设置表单。 */
const SetPasswordForm = () => {
    const { i18n, t } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage;
    const labelCol = currentLanguage === "en-US" ? { span: 7 } : undefined;
    const wrapperCol = currentLanguage === "en-US" ? { span: 17 } : undefined;

    return (
        <>
            <Form.Item field="new_password" label={t("setPassword.newPassword")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("setPassword.newPasswordRequired") }]}>
                <Input.Password allowClear placeholder={t("setPassword.newPasswordPlaceholder")} />
            </Form.Item>
            <Form.Item field="confirm_new_password" label={t("setPassword.confirmPassword")} labelCol={labelCol} wrapperCol={wrapperCol} rules={[{ required: true, message: t("setPassword.confirmPasswordRequired") }]}>
                <Input.Password allowClear placeholder={t("setPassword.confirmPasswordPlaceholder")} />
            </Form.Item>
        </>
    );
};

export default SetPasswordForm;
