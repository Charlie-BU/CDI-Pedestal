import { Menu, Message } from "@cloud-materials/common";
import { IconAppsFill, IconHouseDashboard } from "@cloud-materials/common/ve-o-iconbox";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    LogoArcoDesign,
    LogoCAM,
    LogoCozeLoop,
    LogoFeishuOpenPlatform,
    LogoPromptMinder,
    LogoRailway,
} from "@/assets/icons";
import { useUser } from "@/hooks/useUser";
import { isMenuVisible, parseHiddenMenus } from "@/navigation";
import styles from "./index.module.less";

/** PRODUCT_PATHS：CDI 侧导产品路由前缀。 */
const PRODUCT_PATHS = [
    "/cam",
    "/railway",
    "/coze-loop",
    "/prompt-minder",
    "/icon-gallery",
    "/arco-design",
    "/feishu-open-platform",
];

/** HIDDEN_MENUS：由构建环境决定的隐藏菜单及路由。 */
const HIDDEN_MENUS = parseHiddenMenus(import.meta.env.VITE_HIDE_MENUS);

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { accessToken, openLoginModal } = useUser();
    const selected = PRODUCT_PATHS.find((path) => location.pathname.startsWith(path))
        || (isMenuVisible("/", HIDDEN_MENUS) ? "/" : undefined);

    const handleMenuItemClick = (key: string) => {
        if (key !== "/" && !accessToken) {
            Message.warning(t("login.required"));
            openLoginModal();
            return;
        }
        navigate(key);
    };

    return (
        <Menu
            selectedKeys={selected ? [selected] : []}
            onClickMenuItem={handleMenuItemClick}
            className={styles.menu}
        >
            {isMenuVisible("/", HIDDEN_MENUS) && <Menu.Item
                key="/"
                style={{ display: "flex", alignItems: "center" }}
            >
                <IconHouseDashboard className={styles.icon} />
                {t("nav.home")}
            </Menu.Item>}
            {isMenuVisible("/cam", HIDDEN_MENUS) && <Menu.Item
                key="/cam"
                style={{ display: "flex", alignItems: "center" }}
            >
                <img className={styles.productIcon} src={LogoCAM} alt="" />
                {t("nav.cam")}
            </Menu.Item>}
            {isMenuVisible("/prompt-minder", HIDDEN_MENUS) && <Menu.Item
                key="/prompt-minder"
                style={{ display: "flex", alignItems: "center" }}
            >
                <img className={styles.productIcon} src={LogoPromptMinder} alt="" />
                {t("nav.promptMinder")}
            </Menu.Item>}
            {isMenuVisible("/icon-gallery", HIDDEN_MENUS) && <Menu.Item
                key="/icon-gallery"
                style={{ display: "flex", alignItems: "center" }}
            >
                <IconAppsFill className={styles.icon} />
                {t("nav.iconGallery")}
            </Menu.Item>}
            {isMenuVisible("/arco-design", HIDDEN_MENUS) && <Menu.Item
                key="/arco-design"
                style={{ display: "flex", alignItems: "center" }}
            >
                <img className={styles.productIcon} src={LogoArcoDesign} alt="" />
                {t("nav.arcoDesign")}
            </Menu.Item>}
            {isMenuVisible("/railway", HIDDEN_MENUS) && <Menu.Item
                key="/railway"
                style={{ display: "flex", alignItems: "center" }}
            >
                <img className={styles.productIcon} src={LogoRailway} alt="" />
                {t("nav.railway")}
            </Menu.Item>}
            {isMenuVisible("/coze-loop", HIDDEN_MENUS) && <Menu.Item
                key="/coze-loop"
                style={{ display: "flex", alignItems: "center" }}
            >
                <img className={styles.productIcon} src={LogoCozeLoop} alt="" />
                {t("nav.cozeLoop")}
            </Menu.Item>}
            {isMenuVisible("/feishu-open-platform", HIDDEN_MENUS) && <Menu.Item
                key="/feishu-open-platform"
                style={{ display: "flex", alignItems: "center" }}
            >
                <img className={styles.productIcon} src={LogoFeishuOpenPlatform} alt="" />
                {t("nav.feishuOpenPlatform")}
            </Menu.Item>}
        </Menu>
    );
};

export default Sidebar;
