import { lazy, Suspense, useEffect, useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { Spin } from "@cloud-materials/common";
import Layout from "@/components/Layout";
import { useUser } from "@/hooks/useUser";
import { useTranslation } from "react-i18next";
import type { PlatformContextValue } from "@/platform";
import RemoteBoundary from "@/components/RemoteBoundary";

const CamApp = lazy(() => import("cam/App"));

const Home = () => (
    <div style={{ padding: 32 }}>
        <h1 style={{ marginTop: 0 }}>CDI</h1>
        <p>请从左侧导航选择要使用的平台。</p>
    </div>
);

const App = () => {
    const { i18n } = useTranslation();
    const {
        user,
        accessToken,
        fetchUser,
        logout,
    } = useUser();

    useEffect(() => {
        if (accessToken && !user) void fetchUser();
    }, [accessToken, fetchUser, user]);

    const platform = useMemo<PlatformContextValue>(
        () => ({
            user,
            accessToken,
            apiBase: "/api/cam",
            locale: i18n.resolvedLanguage || "zh-CN",
            onUnauthorized: logout,
        }),
        [
            accessToken,
            i18n.resolvedLanguage,
            logout,
            user,
        ],
    );

    return (
        <BrowserRouter>
            <Routes>
                <Route element={<Layout />}>
                    <Route index element={<Navigate to="/home" replace />} />
                    <Route path="home" element={<Home />} />
                    <Route
                        path="cam/*"
                        element={
                            accessToken ? (
                                <RemoteBoundary>
                                    <Suspense fallback={<Spin dot loading />}>
                                        <CamApp platform={platform} />
                                    </Suspense>
                                </RemoteBoundary>
                            ) : (
                                <Navigate to="/home" replace />
                            )
                        }
                    />
                    <Route path="*" element={<Navigate to="/home" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
