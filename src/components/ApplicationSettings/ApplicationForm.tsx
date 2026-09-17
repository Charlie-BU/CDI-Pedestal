import { useState } from "react";
import { Form, Input, InputNumber, Select, Switch, Typography } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import type { ApplicationInput } from "@/subApplications";

/** ApplicationForm：按应用类型编辑数据库配置。 */
export default function ApplicationForm({ initial, editing }: { initial: ApplicationInput; editing: boolean }) {
    const { t } = useTranslation();
    const [type, setType] = useState(initial.app_type);
    const textField = (key: keyof ApplicationInput, required = false, disabled = false) => <Form.Item key={key} field={key} label={t(`applications.fields.${key}`)} rules={required ? [{ required: true, message: t("applications.required") }] : undefined}>
        <Input disabled={disabled} allowClear />
    </Form.Item>;
    return <>
        <Typography.Title heading={6} style={{ marginBottom: 16 }}>{t("applications.basic")}</Typography.Title>
        {textField("app_key", true, editing)}
        {textField("name_zh", true)}{textField("name_en", true)}
        {textField("description_zh")}{textField("description_en")}{textField("icon_url")}
        <Typography.Title heading={6} style={{ marginBottom: 16 }}>{t("applications.integration")}</Typography.Title>
        <Form.Item field="app_type" label={t("applications.fields.app_type")}><Select onChange={setType}>
            <Select.Option value="federation">{t("applications.types.federation")}</Select.Option>
            <Select.Option value="iframe">{t("applications.types.iframe")}</Select.Option>
        </Select></Form.Item>
        <Form.Item field="route_path" label={t("applications.fields.route_path")} rules={[
            { required: true, message: t("applications.required") },
            { match: /^\//, message: t("applications.pathMustStartWithSlash") },
        ]}>
            <Input allowClear />
        </Form.Item>
        {textField("frontend_url", true)}
        {type === "federation" && <>{textField("remote_name", true)}{textField("exposed_module", true)}{textField("backend_url")}</>}
        <Typography.Paragraph>{t("applications.backendHint")}</Typography.Paragraph>
        <Typography.Title heading={6} style={{ marginBottom: 16 }}>{t("applications.visibility")}</Typography.Title>
        {editing && <Form.Item field="sort_order" label={t("applications.fields.sort_order")}><InputNumber min={0} max={1000000} precision={0} /></Form.Item>}
        {(["enabled", "show_in_menu", "require_login"] as const).map((key) => <Form.Item key={key} field={key} label={t(`applications.fields.${key}`)} triggerPropName="checked"><Switch /></Form.Item>)}
    </>;
}
