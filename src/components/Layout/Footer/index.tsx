import styles from "./index.module.less";
import { useTranslation } from "react-i18next";

const Footer = () => {
    const { t } = useTranslation();
    return (
        <div className={styles.footer}>
            {t("footer.copyright", { year: new Date().getFullYear() })}
            <a href="mailto:15947513567charlie@gmail.com">{t("footer.author")}</a>
            {t("footer.rights")}
        </div>
    );
};

export default Footer;
