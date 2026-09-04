import {
    Avatar,
    Divider,
    IconCheckCircleFill,
    IconGoogle,
    IconInfoCircleFill,
    IconLock,
    IconPoweroff,
    Popover,
    Space,
    Typography,
} from "@cloud-materials/common";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { GetMyInfo200ResponseUser } from "@/cam-auto-generate/CDIService/namespaces";
import styles from "./index.module.less";

interface Props {
    userInfo: GetMyInfo200ResponseUser & {
        has_password?: boolean;
        auth_providers?: string[];
    };
    logout: () => void;
    openModifyPasswordModal: () => void;
    openSetPasswordModal: () => void;
    openGoogleLinkModal: () => void;
}

const Profile = ({
    userInfo,
    logout,
    openModifyPasswordModal,
    openSetPasswordModal,
    openGoogleLinkModal,
}: Props) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const googleBound = userInfo.auth_providers?.includes("google") ?? false;
    return (
        <div className={styles.profile}>
            <svg className={styles.googleGradientDefinition} aria-hidden="true">
                <defs>
                    <linearGradient id="profile-google-gradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#4285f4" />
                        <stop offset="34%" stopColor="#ea4335" />
                        <stop offset="67%" stopColor="#fbbc05" />
                        <stop offset="100%" stopColor="#34a853" />
                    </linearGradient>
                </defs>
            </svg>
            <Space className={styles.summary}>
                <Avatar size={40}>{userInfo.nickname?.[0] || userInfo.username[0]}</Avatar>
                <div>
                    <div className={styles.userNameRow}>
                        <Typography.Text bold className={styles.userName}>
                            {userInfo.nickname || userInfo.username}
                        </Typography.Text>
                        <Popover
                            position="top"
                            content={
                                <div
                                    className={googleBound
                                        ? styles.googleStatusBound
                                        : styles.googleStatusUnbound}
                                >
                                    {googleBound
                                        ? <IconCheckCircleFill />
                                        : <IconInfoCircleFill />}
                                    <span>
                                        {t(googleBound
                                            ? "profile.googleBound"
                                            : "profile.googleUnbound")}
                                    </span>
                                </div>
                            }
                        >
                            <button
                                type="button"
                                className={`${styles.googleIconButton} ${
                                    googleBound
                                        ? styles.googleIconBound
                                        : styles.googleIconUnbound
                                }`}
                                aria-label={t(googleBound
                                    ? "profile.googleBound"
                                    : "profile.googleBindAction")}
                                onClick={googleBound ? undefined : openGoogleLinkModal}
                            >
                                <IconGoogle />
                            </button>
                        </Popover>
                    </div>
                    <div className={styles.email}>{userInfo.email}</div>
                </div>
            </Space>
            <Divider className={styles.divider} />
            {userInfo.has_password === false ? (
                <button className={styles.item} onClick={openSetPasswordModal}>
                    <IconLock /> {t("common.setPassword")}
                </button>
            ) : (
                <button className={styles.item} onClick={openModifyPasswordModal}>
                    <IconLock /> {t("common.modifyPassword")}
                </button>
            )}
            <button className={styles.item} onClick={() => { logout(); navigate("/"); }}>
                <IconPoweroff /> {t("common.logout")}
            </button>
        </div>
    );
};

export default Profile;
