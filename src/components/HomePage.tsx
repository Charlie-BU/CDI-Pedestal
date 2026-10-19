import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/useUser";
import { getHomePageUrl } from "@/runtimeConfig";
import styles from "./HomePage.module.less";

/** HomePage：展示外部首页或基座默认内容。 */
export default function HomePage({ children }: { children: ReactNode }) {
    const { t, i18n } = useTranslation();
    const [useDefault, setUseDefault] = useState(false);
    const url = getHomePageUrl();
    const frame = useRef<HTMLIFrameElement>(null);
    const { accessToken, openLoginModal } = useUser();
    const sendContext = useCallback(() => {
        if (!url || useDefault) return;
        frame.current?.contentWindow?.postMessage({ type: "cdi:context", locale: i18n.resolvedLanguage || "zh-CN" }, new URL(url).origin);
    }, [url, useDefault, i18n.resolvedLanguage]);
    useEffect(() => {
        if (!url || useDefault) return;
        sendContext();
        const origin = new URL(url).origin;
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== origin || !frame.current?.contentWindow || event.source !== frame.current.contentWindow) return;
            if (!event.data || typeof event.data !== "object") return;
            if (event.data.type === "cdi:homepage-ready") sendContext();
            if (event.data.type === "cdi:open-login" && !accessToken) openLoginModal();
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [url, useDefault, accessToken, openLoginModal, sendContext]);
    if (!url || useDefault) return <div style={{ height: "100%", overflow: "auto" }}>{children}</div>;
    return <div className={styles.home}>
        <div className={styles.toolbar}>
            <Button size="small" onClick={() => setUseDefault(true)}>{t("home.useDefault")}</Button>
        </div>
        <iframe ref={frame} onLoad={sendContext} title={t("home.frameTitle")} src={url}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer" className={styles.frame} />
    </div>;
}
