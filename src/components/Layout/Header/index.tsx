import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Avatar,
    Dropdown,
    IconDown,
    IconLanguage,
    IconUser,
    Menu,
    PageHeader,
    Popover,
    Space,
} from "@cloud-materials/common";
import { useTranslation } from "react-i18next";
import Profile from "@/components/User/Profile";
import { useUser } from "@/hooks/useUser";
import { LogoCDI } from "@/assets/icons";
import styles from "./index.module.less";

const Header = () => {
    const navigate = useNavigate();
    const { i18n, t } = useTranslation();
    const [showProfile, setShowProfile] = useState(false);
    const {
        user,
        logout,
        openLoginModal,
        openModifyPasswordModal,
        openSetPasswordModal,
        openGoogleLinkModal,
    } = useUser();

    const languageMenu = (
        <Menu>
            <Menu.Item key="zh-CN" onClick={() => void i18n.changeLanguage("zh-CN")}>
                {t("language.zhCN")}
            </Menu.Item>
            <Menu.Item key="en-US" onClick={() => void i18n.changeLanguage("en-US")}>
                {t("language.enUS")}
            </Menu.Item>
        </Menu>
    );

    return (
        <PageHeader
            className={styles.header}
            title={
                <button className={styles.brand} onClick={() => navigate("/")}>
                    <img className={styles.logo} src={LogoCDI} alt="" />
                    <span>CDI</span>
                </button>
            }
            subTitle={t("brand.subtitle")}
            extra={
                <Space size="large">
                    <Dropdown droplist={languageMenu} position="bottom">
                        <button className={styles.action}>
                            <Space>
                                <IconLanguage />
                                {i18n.resolvedLanguage === "zh-CN"
                                    ? t("language.zhCN")
                                    : t("language.enUS")}
                                <IconDown />
                            </Space>
                        </button>
                    </Dropdown>
                    {user ? (
                        <Popover
                            position="br"
                            trigger="click"
                            popupVisible={showProfile}
                            onVisibleChange={setShowProfile}
                            content={
                                <Profile
                                    userInfo={user}
                                    logout={logout}
                                    openModifyPasswordModal={openModifyPasswordModal}
                                    openSetPasswordModal={openSetPasswordModal}
                                    openGoogleLinkModal={openGoogleLinkModal}
                                />
                            }
                        >
                            <Avatar size={32} className={styles.avatar}>
                                {user.nickname?.[0] || user.username[0]}
                            </Avatar>
                        </Popover>
                    ) : (
                        <Avatar size={32} className={styles.guest} onClick={openLoginModal}>
                            <IconUser />
                        </Avatar>
                    )}
                </Space>
            }
        />
    );
};

export default Header;
