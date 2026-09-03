/** MenuPath：基座菜单及其对应顶层路由路径。 */
export type MenuPath =
    | "/"
    | "/cam"
    | "/prompt-minder"
    | "/icon-gallery"
    | "/arco-design"
    | "/railway"
    | "/coze-loop"
    | "/feishu-open-platform";

/** MENU_PATHS：基座菜单及顶层路由的路径集合。 */
export const MENU_PATHS: readonly MenuPath[] = [
    "/",
    "/cam",
    "/prompt-minder",
    "/icon-gallery",
    "/arco-design",
    "/railway",
    "/coze-loop",
    "/feishu-open-platform",
];

/** normalizeMenuPath：将环境变量中的菜单名称标准化为菜单路径。 */
function normalizeMenuPath(value: string): MenuPath | undefined {
    const trimmed = value.trim();
    const path = trimmed === "home" ? "/" : trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return MENU_PATHS.includes(path as MenuPath) ? (path as MenuPath) : undefined;
}

/** parseHiddenMenus：解析 VITE_HIDE_MENUS 的 JSON 菜单路径数组。 */
export function parseHiddenMenus(raw: string | undefined): ReadonlySet<MenuPath> {
    if (!raw) return new Set();

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();

        return new Set(
            parsed
                .filter((value): value is string => typeof value === "string")
                .map(normalizeMenuPath)
                // 首页是未登录用户的固定落地页，不能被构建配置移除。
                .filter((path): path is MenuPath => path !== undefined && path !== "/"),
        );
    } catch {
        return new Set();
    }
}

/** isMenuVisible：判断菜单及其对应路由是否启用。 */
export function isMenuVisible(
    path: MenuPath,
    hiddenMenus: ReadonlySet<MenuPath>,
): boolean {
    return !hiddenMenus.has(path);
}
