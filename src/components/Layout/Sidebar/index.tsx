import { Menu } from "@cloud-materials/common";
import { IconHouseDashboard } from "@cloud-materials/common/ve-o-iconbox";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogoCAM } from "@/assets/icons";
import styles from "./index.module.less";

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const selected = location.pathname.startsWith("/cam") ? "/cam" : "/home";

    return (
        <Menu
            selectedKeys={[selected]}
            onClickMenuItem={(key) => navigate(key)}
            className={styles.menu}
        >
            <Menu.Item key="/home">
                <IconHouseDashboard className={styles.icon} />
                {t("nav.home")}
            </Menu.Item>
            <Menu.Item key="/cam">
                <img className={styles.productIcon} src={LogoCAM} alt="" />
                API 管理 CAM
            </Menu.Item>
        </Menu>
    );
};

export default Sidebar;
