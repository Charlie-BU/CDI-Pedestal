import { Outlet } from "react-router-dom";
import { Layout as ArcoLayout, Watermark } from "@cloud-materials/common";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import styles from "./index.module.less";
import { useUser } from "@/hooks/useUser";

const Layout = () => {
    const { user } = useUser();

    return (
        <ArcoLayout className={styles.layout}>
            <ArcoLayout.Header className={styles.header}>
                <Header />
            </ArcoLayout.Header>
            <ArcoLayout className={styles.body}>
                <ArcoLayout.Sider className={styles.sider} width={200}>
                    <Sidebar />
                </ArcoLayout.Sider>
                <ArcoLayout.Content className={styles.content}>
                    <Watermark
                        content={user?.username || "Guest"}
                        fontStyle={{ color: "#9ca2a919" }}
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

