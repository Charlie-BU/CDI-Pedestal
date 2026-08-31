import styles from "./index.module.less";

const Footer = () => (
    <div className={styles.footer}>
        Copyright © 2025 - {new Date().getFullYear()}{" "}
        <a href="mailto:15947513567charlie@gmail.com">Charlie BU</a>. All Rights Reserved.
    </div>
);

export default Footer;

