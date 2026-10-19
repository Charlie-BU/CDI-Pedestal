import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Spin } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/useUser";
import { getHomePageMode, getHomePageUrl } from "@/runtimeConfig";
import styles from "./HomePage.module.less";

/** HomePage：展示外部首页或基座默认内容。 */
export default function HomePage({ children }: { children: ReactNode }) {
    const { t, i18n } = useTranslation();
    const [loadedUrl, setLoadedUrl] = useState("");
    const url = getHomePageUrl();
    const frame = useRef<HTMLIFrameElement>(null);
    const { accessToken, openLoginModal } = useUser();
    const sendContext = useCallback(() => {
        if (!url) return;
        const backgroundColor = getComputedStyle(document.body).getPropertyValue("--color-bg-3").trim();
        frame.current?.contentWindow?.postMessage({ type: "cdi:context", locale: i18n.resolvedLanguage || "zh-CN", authenticated: Boolean(accessToken), ...(backgroundColor ? { backgroundColor } : {}) }, new URL(url).origin);
    }, [url, i18n.resolvedLanguage, accessToken]);
    useEffect(() => {
        if (!url) return;
        sendContext();
        const origin = new URL(url).origin;
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== origin || !frame.current?.contentWindow || event.source !== frame.current.contentWindow) return;
            if (!event.data || typeof event.data !== "object") return;
            if (event.data.type === "cdi:homepage-ready") {
                setLoadedUrl(url);
                sendContext();
            }
            if (event.data.type === "cdi:open-login" && !accessToken) openLoginModal();
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [url, accessToken, openLoginModal, sendContext]);
    if (getHomePageMode() === "default") return <div style={{ height: "100%", overflow: "auto" }}>{children}</div>;
    const loaded = Boolean(url) && loadedUrl === url;
    return <div className={styles.home}>
        {!loaded && <div className={styles.loading} role="status" aria-label={t("home.loading")}><Spin loading dot /></div>}
        {url && <iframe ref={frame} onLoad={sendContext} title={t("home.frameTitle")} src={url}
            aria-hidden={!loaded} tabIndex={loaded ? undefined : -1}
            style={{ visibility: loaded ? "visible" : "hidden" }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer" className={styles.frame} />}
    </div>;
}
