import { Menu, Message, Popover } from "@cloud-materials/common";
import { IconAppsFill, IconHouseDashboard } from "@cloud-materials/common/ve-o-iconbox";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/useUser";
import { useApplications } from "@/hooks/useApplications";
import { applicationName, APPLICATION_SETTINGS_PATH, matchApplication } from "@/subApplications";
import ApplicationIcon from "@/components/ApplicationIcon";
import styles from "./index.module.less";

/** Sidebar：数据库菜单后始终追加基座子应用配置入口。 */
export default function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { accessToken, openLoginModal } = useUser();
    const { apps, identity } = useApplications();
    const visible = identity === accessToken ? apps.filter((app) => app.enabled && app.show_in_menu) : [];
    const selected = location.pathname === APPLICATION_SETTINGS_PATH ? APPLICATION_SETTINGS_PATH : matchApplication(visible, location.pathname)?.route_path || "/";
    const navigateTo = (key: string) => {
        const app = visible.find((item) => item.route_path === key);
        if (!accessToken && (key === APPLICATION_SETTINGS_PATH || app?.require_login)) {
            Message.warning(t("login.required")); openLoginModal(); return;
        }
        navigate(key);
    };
    const items = [
        { key: "/", label: t("nav.home"), icon: <IconHouseDashboard className={styles.icon} /> },
        ...visible.map((app) => ({ key: app.route_path, label: applicationName(app, i18n.resolvedLanguage), icon: <ApplicationIcon className={styles.productIcon} src={app.icon_url} /> })),
        { key: APPLICATION_SETTINGS_PATH, label: t("applications.title"), icon: <IconAppsFill className={styles.icon} /> },
    ];
    if (collapsed) return <div role="menu" className={styles.collapsedMenu}>
        {items.map((item) => <Popover key={item.key} position="right" className={styles.navigationPopover} trigger="hover" triggerProps={{ popupHoverStay: true, mouseLeaveDelay: 200 }} content={
            <button type="button" className={`${styles.popoverItem} ${selected === item.key ? styles.selected : ""}`} onClick={() => navigateTo(item.key)}>
                <span className={styles.iconSlot}>{item.icon}</span><span>{item.label}</span>
            </button>
        }>
            <button type="button" role="menuitem" aria-label={item.label} aria-current={selected === item.key ? "page" : undefined}
                className={`${styles.collapsedItem} ${selected === item.key ? styles.selected : ""}`} onClick={() => navigateTo(item.key)}>
                <span className={styles.iconSlot}>{item.icon}</span>
            </button>
        </Popover>)}
    </div>;
    return <Menu selectedKeys={[selected]} onClickMenuItem={navigateTo} className={styles.menu}>
        {items.map((item) => <Menu.Item key={item.key} className={styles.expandedItem}>
            <span className={styles.iconSlot}>{item.icon}</span><span className={styles.label}>{item.label}</span>
        </Menu.Item>)}
    </Menu>;
}
