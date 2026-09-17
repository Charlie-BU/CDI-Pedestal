import { Menu, Message } from "@cloud-materials/common";
import { IconAppsFill, IconHouseDashboard } from "@cloud-materials/common/ve-o-iconbox";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUser } from "@/hooks/useUser";
import { useApplications } from "@/hooks/useApplications";
import { applicationName, APPLICATION_SETTINGS_PATH, matchApplication } from "@/subApplications";
import styles from "./index.module.less";

/** Sidebar：数据库菜单后始终追加基座子应用配置入口。 */
export default function Sidebar() {
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
    return <Menu selectedKeys={[selected]} onClickMenuItem={navigateTo} className={styles.menu}>
        <Menu.Item style={{ display: "flex", alignItems: "center" }} key="/"><IconHouseDashboard className={styles.icon} />{t("nav.home")}</Menu.Item>
        {visible.map((app) => <Menu.Item style={{ display: "flex", alignItems: "center" }} key={app.route_path}>
            {app.icon_url ? <img className={styles.productIcon} src={app.icon_url} alt="" /> : <IconAppsFill className={styles.icon} />}
            {applicationName(app, i18n.resolvedLanguage)}
        </Menu.Item>)}
        <Menu.Item style={{ display: "flex", alignItems: "center" }} key={APPLICATION_SETTINGS_PATH}><IconAppsFill className={styles.icon} />{t("applications.title")}</Menu.Item>
    </Menu>;
}
