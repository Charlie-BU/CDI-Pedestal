import type { ReactNode } from "react";
import { Outlet, useLocation } from "react-router-dom";

/** PersistentHome：首页保留在路由布局中，切换子应用时仅隐藏。 */
export default function PersistentHome({ children }: { children: ReactNode }) {
    const isHome = useLocation().pathname === "/";
    return <>
        <div hidden={!isHome} style={{ height: "100%" }}>{children}</div>
        {!isHome && <Outlet />}
    </>;
}
