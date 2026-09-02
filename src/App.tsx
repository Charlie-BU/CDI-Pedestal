import { lazy, Suspense, useEffect, useMemo } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { Spin } from "@cloud-materials/common";
import Layout from "@/components/Layout";
import { useUser } from "@/hooks/useUser";
import { useTranslation } from "react-i18next";
import type { PlatformContextValue } from "@/platform";
import RemoteBoundary from "@/components/RemoteBoundary";
import { preloadCAMRemote } from "@/preloadCAMRemote";

const CAMApp = lazy(() => import("cam/App"));

type IdleCallbackWindow = {
    requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
};

const LoadingFallback = () => (
    <div className="shell-loading">
        <Spin dot loading />
    </div>
);

const Home = () => (
    <div style={{ padding: 32 }}>
        <h1 style={{ marginTop: 0 }}>CDI</h1>
        <p>请从左侧导航选择要使用的平台。</p>
    </div>
);

const Railway = () => (
    <div style={{ padding: 32 }}>
        <h1 style={{ marginTop: 0 }}>Railway</h1>
        <p>Railway 不允许被嵌入其他网站，请在新标签页中打开。</p>
        <a
            href="https://railway.com/"
            target="_blank"
            rel="noreferrer"
        >
            打开 Railway
        </a>
    </div>
);

const CozeLoop = () => (
    <div style={{ padding: 32 }}>
        <h1 style={{ marginTop: 0 }}>扣子罗盘</h1>
        <p>扣子罗盘不允许被嵌入其他网站，请在新标签页中打开。</p>
        <a
            href="https://loop.coze.cn/console"
            target="_blank"
            rel="noreferrer"
        >
            打开扣子罗盘
        </a>
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

    useEffect(() => {
        if (!accessToken) return;

        // 用户完成登录后，提前在空闲时预加载 CAM 远程模块，减少首次进入页面的等待。
        const preload = () => void preloadCAMRemote();
        const idleWindow = window as unknown as IdleCallbackWindow;
        if (idleWindow.requestIdleCallback) {
            // 优先利用浏览器空闲时间执行，避免和当前首屏渲染抢占资源。
            const idleCallback = idleWindow.requestIdleCallback(preload, {
                timeout: 3000,
            });
            return () => idleWindow.cancelIdleCallback?.(idleCallback);
        }

        // 不支持 requestIdleCallback 时，退化为延迟触发，仍然尽量避开关键渲染阶段。
        const timer = window.setTimeout(preload, 1000);
        return () => window.clearTimeout(timer);
    }, [accessToken]);

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
                    <Route index element={<Home />} />
                    <Route
                        path="cam/*"
                        element={
                            accessToken ? (
                                <RemoteBoundary>
                                    <Suspense fallback={<LoadingFallback />}>
                                        <CAMApp platform={platform} />
                                    </Suspense>
                                </RemoteBoundary>
                            ) : (
                                <Navigate to="/" replace />
                            )
                        }
                    />
                    <Route
                        path="railway"
                        element={
                            accessToken ? <Railway /> : <Navigate to="/" replace />
                        }
                    />
                    <Route
                        path="coze-loop"
                        element={
                            accessToken ? <CozeLoop /> : <Navigate to="/" replace />
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
