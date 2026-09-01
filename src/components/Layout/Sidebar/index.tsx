import { Menu, Message } from "@cloud-materials/common";
import { IconHouseDashboard } from "@cloud-materials/common/ve-o-iconbox";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogoCAM } from "@/assets/icons";
import { useUser } from "@/hooks/useUser";
import styles from "./index.module.less";

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { accessToken } = useUser();
    const selected = location.pathname.startsWith("/cam") ? "/cam" : "/home";

    const handleMenuItemClick = (key: string) => {
        if (key !== "/home" && !accessToken) {
            Message.warning(t("login.required"));
            return;
        }
        navigate(key);
    };

    return (
        <Menu
            selectedKeys={[selected]}
            onClickMenuItem={handleMenuItemClick}
            className={styles.menu}
        >
            <Menu.Item
                key="/home"
                style={{ display: "flex", alignItems: "center" }}
            >
                <IconHouseDashboard className={styles.icon} />
                {t("nav.home")}
            </Menu.Item>
            <Menu.Item
                key="/cam"
                style={{ display: "flex", alignItems: "center" }}
            >
                <img className={styles.productIcon} src={LogoCAM} alt="" />
                API 管理 CAM
            </Menu.Item>
        </Menu>
    );
};

export default Sidebar;
