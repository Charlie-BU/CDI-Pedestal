/** SubApplication：数据库下发的子应用运行配置。 */
export interface SubApplication {
    id: number;
    app_key: string;
    name_zh: string;
    name_en: string;
    description_zh: string;
    description_en: string;
    icon_url: string;
    app_type: "federation" | "iframe";
    route_path: string;
    frontend_url: string;
    remote_name: string;
    exposed_module: string;
    sort_order: number;
    enabled: boolean;
    show_in_menu: boolean;
    require_login: boolean;
    api_base: string;
    has_backend: boolean;
}

/** ApplicationConfig：列表与管理表单使用的配置字段。 */
export type ApplicationConfig = Omit<SubApplication, "api_base" | "has_backend"> & {
    backend_url: string;
    created_at: string;
    updated_at: string;
    created_by: number | null;
    updated_by: number | null;
    deleted_at: string | null;
};
/** ApplicationInput：创建与编辑表单数据，不含版本字段。 */
export type ApplicationInput = Omit<ApplicationConfig, "id" | "created_at" | "updated_at" | "created_by" | "updated_by" | "deleted_at">;
/** applicationName：按当前语言选择子应用名称。 */
export const applicationName = (app: Pick<SubApplication, "name_zh" | "name_en">, language?: string) => language?.startsWith("zh") ? app.name_zh : app.name_en;
/** matchApplication：以完整路径段匹配子应用及其内部路由。 */
export const matchApplication = (apps: SubApplication[], pathname: string) => apps.find((app) => app.enabled && (pathname === app.route_path || pathname.startsWith(`${app.route_path}/`)));
/** APPLICATION_SETTINGS_PATH：固定置于侧导末尾的管理页面。 */
export const APPLICATION_SETTINGS_PATH = "/sub-applications";

/** normalizeApplication：校验接口返回的应用类型并收窄为前端支持的类型。 */
export function normalizeApplication<T extends { app_type: string }>(item: T): Omit<T, "app_type"> & Pick<SubApplication, "app_type"> {
    const app_type = item.app_type;
    if (app_type !== "federation" && app_type !== "iframe") throw new Error("INVALID_APPLICATION_TYPE");
    return { ...item, app_type };
}
