import { lazy, Suspense } from "react";
import { Navigate } from "react-router-dom";
import { Button, Result, Spin } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import type { SubApplication } from "@/subApplications";
import { applicationName } from "@/subApplications";
import { useUser } from "@/hooks/useUser";
import { getApiBase, getRemoteEntry } from "@/localDebug";
import { applicationSignature, loadApplication, needsApplicationReload } from "@/federationRuntime";
import RemoteBoundary from "./RemoteBoundary";

/** createRemote：创建带类型的远程组件容器。 */
const createRemote = (app: SubApplication) => lazy(() => loadApplication(app));
const components = new Map<string, ReturnType<typeof createRemote>>();
/** SubApplicationView：通用 Federation／iframe 容器，使用既有平台合同。 */
export default function SubApplicationView({ app }: { app: SubApplication }) {
    const { t, i18n } = useTranslation();
    const { user, accessToken, logout } = useUser();
    // 配置改变时通过刷新切换，不在运行中的共享作用域里强制覆盖 remote。
    const key = `${app.app_key}:${applicationSignature(app)}`;
    if (!components.has(key)) components.set(key, createRemote(app));
    const Remote = components.get(key)!;
    const platform = { user, accessToken, apiBase: getApiBase(app.app_key), locale: i18n.resolvedLanguage || "zh-CN", onUnauthorized: logout };
    if (app.require_login && !accessToken) return <Navigate to="/" replace />;
    if (needsApplicationReload(app)) return <Result title={t("applications.reloadRequired")} extra={<Button onClick={() => window.location.reload()}>{t("remote.reload")}</Button>} />;
    if (app.app_type === "iframe") return <iframe title={applicationName(app, i18n.resolvedLanguage)} src={getRemoteEntry(app.app_key, app.frontend_url)} style={{ width: "100%", height: "100%", border: 0, display: "block" }} />;
    return <RemoteBoundary key={app.app_key}><Suspense fallback={<Spin loading dot />}><Remote platform={platform} /></Suspense></RemoteBoundary>;
}
