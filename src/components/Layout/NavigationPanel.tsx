import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useTranslation } from "react-i18next";
import Sidebar from "./Sidebar";
import styles from "./index.module.less";

/** NAVIGATION_STORAGE_KEY：当前标签页侧导偏好的存储键。 */
const NAVIGATION_STORAGE_KEY = "cdi.navigation.v1";
/** MIN_WIDTH：侧导展开时的最小宽度。 */
const MIN_WIDTH = 200;
/** MAX_WIDTH：侧导展开时的最大宽度。 */
const MAX_WIDTH = 400;
/** clampWidth：将侧导宽度限制在可用范围。 */
const clampWidth = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
/** readPreferences：读取并校验会话中的侧导偏好。 */
const readPreferences = () => {
    try {
        const saved = JSON.parse(sessionStorage.getItem(NAVIGATION_STORAGE_KEY) || "null");
        return {
            collapsed: saved?.collapsed === true,
            width: typeof saved?.width === "number" && Number.isFinite(saved.width) ? clampWidth(saved.width) : MIN_WIDTH,
        };
    } catch {
        return { collapsed: false, width: MIN_WIDTH };
    }
};

/** NavigationPanel：支持会话记忆、折叠和调整宽度的侧导。 */
export default function NavigationPanel() {
    const { t } = useTranslation();
    const [preferences, setPreferences] = useState(readPreferences);
    const [resizing, setResizing] = useState(false);
    const drag = useRef<{ pointerId: number; startX: number; width: number } | null>(null);
    const { collapsed, width } = preferences;

    useEffect(() => {
        try { sessionStorage.setItem(NAVIGATION_STORAGE_KEY, JSON.stringify(preferences)); }
        catch { /* 存储不可用时仍允许正常调整侧导。 */ }
    }, [preferences]);

    const startResize = (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, startX: event.clientX, width };
        setResizing(true);
    };
    const moveResize = (event: PointerEvent<HTMLDivElement>) => {
        const active = drag.current;
        if (!active || active.pointerId !== event.pointerId) return;
        setPreferences((current) => ({ ...current, width: clampWidth(active.width + event.clientX - active.startX) }));
    };
    const stopResize = () => { drag.current = null; setResizing(false); };
    const resizeByKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
        const next = event.key === "Home" ? MIN_WIDTH : event.key === "End" ? MAX_WIDTH
            : event.key === "ArrowLeft" ? width - 10 : event.key === "ArrowRight" ? width + 10 : null;
        if (next === null) return;
        event.preventDefault();
        setPreferences((current) => ({ ...current, width: clampWidth(next) }));
    };

    return <aside className={`${styles.sider} ${resizing ? styles.resizing : ""}`} style={{ width: collapsed ? 64 : width }}>
        <nav id="shell-navigation" aria-label={t("nav.navigation")} className={styles.navigationMenu}>
            <Sidebar collapsed={collapsed} />
        </nav>
        <div className={styles.navigationToolbar}>
            <button type="button" className={styles.collapseButton}
                aria-label={t(collapsed ? "nav.expand" : "nav.collapse")}
                title={t(collapsed ? "nav.expand" : "nav.collapse")}
                aria-expanded={!collapsed} aria-controls="shell-navigation"
                onClick={() => setPreferences((current) => ({ ...current, collapsed: !current.collapsed }))}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <path d="M9 4v16" />
                    <path d={collapsed ? "m13 9 3 3-3 3" : "m16 9-3 3 3 3"} />
                </svg>
            </button>
        </div>
        {!collapsed && <div role="separator" tabIndex={0} aria-label={t("nav.resize")}
            aria-orientation="vertical" aria-valuemin={MIN_WIDTH} aria-valuemax={MAX_WIDTH} aria-valuenow={width}
            className={styles.resizeHandle} onPointerDown={startResize} onPointerMove={moveResize}
            onPointerUp={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                stopResize();
            }} onPointerCancel={stopResize} onLostPointerCapture={stopResize} onKeyDown={resizeByKeyboard} />}
        {resizing && <div className={styles.resizeOverlay} />}
    </aside>;
}
