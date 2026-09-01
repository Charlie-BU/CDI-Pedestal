import { Avatar, Divider, IconLock, IconPoweroff, Space, Typography } from "@cloud-materials/common";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { GetMyInfo200ResponseUser } from "@/cam-auto-generate/CDIService/namespaces";
import styles from "./index.module.less";

interface Props {
    userInfo: GetMyInfo200ResponseUser;
    logout: () => void;
    openModifyPasswordModal: () => void;
}

const Profile = ({ userInfo, logout, openModifyPasswordModal }: Props) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    return (
        <div className={styles.profile}>
            <Space className={styles.summary}>
                <Avatar size={40}>{userInfo.nickname?.[0] || userInfo.username[0]}</Avatar>
                <div>
                    <Typography.Text>{userInfo.nickname || userInfo.username}</Typography.Text>
                    <div className={styles.email}>{userInfo.email}</div>
                </div>
            </Space>
            <Divider className={styles.divider} />
            <button className={styles.item} onClick={openModifyPasswordModal}>
                <IconLock /> {t("common.modifyPassword")}
            </button>
            <button className={styles.item} onClick={() => { logout(); navigate("/home"); }}>
                <IconPoweroff /> {t("common.logout")}
            </button>
        </div>
    );
};

export default Profile;
