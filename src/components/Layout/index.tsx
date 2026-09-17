import { Outlet, useLocation } from "react-router-dom";
import { Layout as ArcoLayout, Watermark } from "@cloud-materials/common";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import styles from "./index.module.less";
import { useUser } from "@/hooks/useUser";

import { useApplications } from "@/hooks/useApplications";
import { matchApplication } from "@/subApplications";

/** getWatermarkColor：从组件库灰色色板生成水印颜色。 */
const getWatermarkColor = () => {
    const gray = getComputedStyle(document.body).getPropertyValue("--gray-6").trim();
    return gray ? `rgba(${gray}, 0.1)` : undefined;
};

const Layout = () => {
    const { user } = useUser();
    const location = useLocation();
    const { apps } = useApplications();
    const isEmbeddedPage = matchApplication(apps, location.pathname)?.app_type === "iframe";

    return (
        <ArcoLayout className={styles.layout}>
            <ArcoLayout.Header className={styles.header}>
                <Header />
            </ArcoLayout.Header>
            <ArcoLayout className={styles.body}>
                <ArcoLayout.Sider className={styles.sider} width={200}>
                    <Sidebar />
                </ArcoLayout.Sider>
                <ArcoLayout.Content
                    className={isEmbeddedPage ? `${styles.content} ${styles.embeddedContent}` : styles.content}
                >
                    <Watermark
                        content={user?.username || "Guest"}
                        fontStyle={{ color: getWatermarkColor() }}
                        style={{ height: "100%" }}
                    >
                        <Outlet />
                    </Watermark>
                </ArcoLayout.Content>
            </ArcoLayout>
            <ArcoLayout.Footer className={styles.footer}>
                <Footer />
            </ArcoLayout.Footer>
        </ArcoLayout>
    );
};

export default Layout;
