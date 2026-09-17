import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Button, Result, Spin } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import SubApplicationView from "@/components/SubApplicationView";
import ApplicationSettings from "@/components/ApplicationSettings";
import { useUser } from "@/hooks/useUser";
import { useApplications } from "@/hooks/useApplications";
import { APPLICATION_SETTINGS_PATH } from "@/subApplications";
import { preloadApplications } from "@/preloadApplications";

/** App：固定基座路由与数据库驱动的子应用路由。 */
export default function App() {
    const { t } = useTranslation();
    const { user, accessToken, fetchUser } = useUser();
    const { apps, loading, error, load, identity } = useApplications();
    const currentApps = identity === accessToken ? apps : [];
    useEffect(() => { if (accessToken && !user) void fetchUser(); }, [accessToken, user, fetchUser]);
    useEffect(() => {
        void load(accessToken);
        const refresh = () => void load(accessToken);
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    }, [accessToken, load]);
    useEffect(() => {
        if (identity !== accessToken) return;
        const run = () => void preloadApplications(apps);
        if (window.requestIdleCallback) {
            const id = window.requestIdleCallback(run, { timeout: 3000 });
            return () => window.cancelIdleCallback(id);
        }
        const id = window.setTimeout(run, 1000);
        return () => window.clearTimeout(id);
    }, [apps, identity, accessToken]);
    if (loading || identity !== accessToken) {
        return <div role="status" aria-label={t("applications.loadingDirectory")} style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><Spin loading dot /></div>;
    }
    const retry = <Button onClick={() => void load(accessToken)}>{t("applications.retry")}</Button>;
    return <BrowserRouter><Routes><Route element={<Layout />}>
        <Route index element={<div style={{ padding: 32 }}><h1>CDI</h1><p>{t("home.description")}</p>{error && <Result title={t("applications.directoryFailed")} extra={retry} />}</div>} />
        <Route path={APPLICATION_SETTINGS_PATH} element={<ApplicationSettings />} />
        {currentApps.filter((app) => app.enabled).map((app) => <Route key={app.id} path={`${app.route_path.slice(1)}/*`} element={<SubApplicationView app={app} />} />)}
        <Route path="*" element={loading || identity !== accessToken ? <Spin loading dot /> : <Result title={t(error ? "applications.directoryFailed" : "applications.notFound")} extra={error ? retry : undefined} />} />
    </Route></Routes></BrowserRouter>;
}
