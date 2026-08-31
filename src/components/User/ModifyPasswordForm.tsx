import { Form, Input } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";

const ModifyPasswordForm = () => {
    const { t } = useTranslation();
    return (
        <>
            <Form.Item field="old_password" label={t("modifyPassword.oldPassword")} rules={[{ required: true }]}>
                <Input.Password allowClear />
            </Form.Item>
            <Form.Item field="new_password" label={t("modifyPassword.newPassword")} rules={[{ required: true }]}>
                <Input.Password allowClear />
            </Form.Item>
            <Form.Item field="confirm_new_password" label={t("modifyPassword.confirmPassword")} rules={[{ required: true }]}>
                <Input.Password allowClear />
            </Form.Item>
        </>
    );
};

export default ModifyPasswordForm;

