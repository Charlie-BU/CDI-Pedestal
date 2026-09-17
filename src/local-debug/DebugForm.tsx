import { Form, Input, Typography } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import { getDebugApplications, normalizeDebugUrl } from "@/local-debug";
import { applicationName } from "@/subApplications";
import { useApplications } from "@/hooks/useApplications";
import styles from "./index.module.less";

/** DebugForm：按子应用展示可选的前端入口与后端服务地址。 */
export default function DebugForm() {
    const { t, i18n } = useTranslation();
    useApplications((state) => state.apps);
    const applications = getDebugApplications();
    return <>
        <Typography.Paragraph style={{ marginBottom: 0 }}>{t("localDebug.description")}</Typography.Paragraph>
        {applications.length === 0 && <Typography.Paragraph>{t("localDebug.empty")}</Typography.Paragraph>}
        {applications.map((app) => <fieldset className={styles.application} key={app.app_key}>
            <legend>{applicationName(app, i18n.resolvedLanguage)}</legend>
            {(["frontend", "backend"] as const).filter((kind) => kind === "frontend" || app.app_type === "federation").map((kind) => <Form.Item
                key={kind}
                field={`${app.app_key}.${kind}`}
                label={t(`localDebug.${kind}`)}
                extra={t("localDebug.fallback")}
                rules={[{ validator: (value, callback) => {
                    try { normalizeDebugUrl(value || ""); callback(); }
                    catch { callback(t("localDebug.invalidUrl")); }
                } }]}
            >
                <Input allowClear placeholder={t(`localDebug.${kind}Placeholder`)} />
            </Form.Item>)}
        </fieldset>)}
    </>;
}
