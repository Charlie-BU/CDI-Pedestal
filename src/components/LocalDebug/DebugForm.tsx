import { Form, Input, Typography } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import { DEBUG_APPLICATIONS, normalizeDebugUrl } from "@/localDebug";
import styles from "./index.module.less";

/** DebugForm：按子应用展示可选的前端入口与后端服务地址。 */
export default function DebugForm() {
    const { t } = useTranslation();
    return <>
        <Typography.Paragraph style={{ marginBottom: 0 }}>{t("localDebug.description")}</Typography.Paragraph>
        {DEBUG_APPLICATIONS.map((app) => <fieldset className={styles.application} key={app.id}>
            <legend>{app.label}</legend>
            {(["frontend", "backend"] as const).map((kind) => <Form.Item
                key={kind}
                field={`${app.id}.${kind}`}
                label={t(`localDebug.${kind}`)}
                extra={t("localDebug.fallback", { variable: kind === "frontend" ? app.frontendEnv : app.backendEnv })}
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
