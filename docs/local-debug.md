# 子应用本地调试

## 使用步骤

1. 启动本地子应用。Federation 前端需暴露 manifest 或 remote entry，后端需能验证基座传来的 token。
2. 用请求头扩展对基座 HTML 文档请求（含深层路由刷新）添加 `X-LOCAL-DEBUG: 1`，刷新页面。
3. 点击顶导语言按钮右侧“本地调试”，弹窗按数据库目录中的子应用分组，仅展示已启用且当前允许访问的应用。
4. Federation 前端可填 `http://localhost:9100`，自动补 `/mf-manifest.json`；也可填完整 JS/manifest URL。后端可填 `http://localhost:9101`，子应用仍追加原有 `/v1/*` 路径。iframe 仅有前端地址，直接使用完整 URL。
5. 保存并刷新后生效。取消不保存，清空字段后保存恢复数据库默认值。

所有调试字段可空，前后端独立覆盖。不会读取 X-CAM-FE / X-CAM-SERVER。

## 默认值和作用域

前端默认值来自数据库 frontend_url。后端默认值来自数据库 backend_url，由浏览器直接访问；无后端的应用 apiBase 为空。

基座 **CDIService 永远使用 `/api/cdi`**。登录、注册、用户资料、目录和管理接口均不受本地后端覆盖影响。调试后端仅通过子应用 platform.apiBase 传入，由浏览器直接访问；线上服务器不会代理访问开发者 localhost。

覆盖存在当前标签页 sessionStorage 的 `cdi-local-debug-v1` 项，以 app_key 分组。只有当前 HTML 开关为 1 且应用当前可访问时使用；未知/已禁用应用不应用覆盖。关闭标签页后清除。存储不可用时提示失败；覆盖目标离线不会自动切回线上。URL 只接受完整 HTTP(S) 地址，不允许凭据、查询串或 fragment。

## 实现入口

- `build/localDebugHeader.ts`：开发/预览读取 HTML 请求头；构建生成 Caddy 模板。
- `Caddyfile`：仅 HTML 执行模板，将请求头映射为 meta `cdi-local-debug` 的固定 0/1。
- `src/local-debug/index.ts`：目录驱动的覆盖解析和 sessionStorage。
- `src/local-debug/LocalDebugButton.tsx` 与 `DebugForm.tsx`：复用登录 Modal 样式的动态表单。
- `src/federationRuntime.ts`、`src/preloadApplications.ts`：使用同一解析结果注册和预加载。
- `src/components/SubApplicationView.tsx`：将实际 apiBase 传给远程组件。

## 部署与排障

HTML 使用 `Cache-Control: private, no-store` 与 `Vary: X-LOCAL-DEBUG`；网关须透传头且不能强制缓存 HTML。静态 JS/CSS 不执行模板。普通静态服务器不解析模板；使用 Caddy 或 pnpm dev/preview。

看不到按钮时检查 HTML 请求头、响应 meta 和缓存；表单没有应用时检查登录状态与目录加载。新增应用通过子应用配置页完成，无需修改静态列表或重新构建基座。

远程前端须允许基座 Origin 跨域加载，后端须允许相应 CORS、OPTIONS、Authorization 和 Content-Type。HTTPS 基座访问本地还受浏览器本地网络访问、混合内容及 CSP 策略约束。该请求头只开启开发入口，不替代认证。iframe 站点仍受 frame-ancestors/X-Frame-Options 约束。

完整数据模型、接口、部署和验证见 [数据库驱动的子应用配置](sub-applications.md)。

### 线上基座加载 Vite React 开发模块

基座在加载显式配置的前端调试入口前，先从入口所在目录加载 `@react-refresh`，调用真实运行时的 `injectIntoGlobalHook`，并安装 React 插件需要的 preamble 标记，再加载 Federation 模块。初始化按入口去重，兼容运行时的命名导出与默认导出。这样无需依赖子应用 `index.html` 注入的初始化脚本。

仅覆盖后端地址或未开启本地调试时不执行此逻辑。生产构建或非 Vite 调试地址没有该模块时，继续常规加载。开发服务器仍需允许基座跨域访问；此改动不绕过浏览器本地网络权限，也不保证所有子应用的热更新配置均可直接跨域工作。

本地调试的浏览器端模块统一在 `src/local-debug/`：`index.ts` 管理配置，`refresh.ts` 初始化开发运行时，`LocalDebugButton.tsx`、`DebugForm.tsx` 和 `index.module.less` 提供交互界面。Node 端请求头插件保留在 `build/localDebugHeader.ts`，与浏览器代码隔离。
