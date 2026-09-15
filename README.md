# CDI-Pedestal

CDI 主站 Shell。负责统一顶导、侧导、底导、登录态和产品路由；各产品继续在独立 repo 中构建和发布。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认端口为 `9000`。`VITE_CAM_REMOTE_ENTRY` 为必填构建变量；示例值为 `http://localhost:9100/mf-manifest.json`，进入 CAM 页面时需要对应子应用可访问；基座和调试配置弹窗可独立打开。也可以将其设置为其他已部署的 CAM 远程入口。

`VITE_HIDE_MENUS` 可选，使用 JSON 数组隐藏基座菜单及对应顶层路由，例如 `VITE_HIDE_MENUS='["/cam", "/railway"]'`。数组元素可使用菜单 path，也兼容不带 `/` 的名称，如 `cam`；无效 JSON 或未知菜单会被忽略。

默认由基座统一代理 CAM：所有 CAM 请求均使用 `/api/cam/v1/*`，并被改写为 CAM 后端的 `/v1/*`，包括登录、注册、用户资料和业务接口。

## 组件库 Release 更新与开发缓存

`@cloud-materials/common` 从 GitHub Release 的 `.tgz` 安装。发布、升级、缓存恢复和
白屏排查见 [组件库消费包文档](docs/cloud-materials-common.md)；该文档与 CAM-FE 的同名文档
保持一致。

## 主站与子应用契约

主站通过 Module Federation 加载 `cam/App`，并传入 `PlatformContextValue`：当前用户、访问令牌、CAM API 基地址、语言和未授权回调。子应用不渲染全局导航，也不拥有主站登录 UI。

## 使用线上基座调试本地子应用

需求、实现架构、配置规则、部署、验证和排障详见 [子应用本地调试实现说明](docs/local-debug.md)。

1. 启动本地 CAM-FE 和／或 CAM-Server。前端必须提供 Federation manifest 或 remote entry，并允许基座 Origin 跨域加载；后端必须允许该 Origin 的 CORS、OPTIONS、Authorization 和 Content-Type。本地后端需要能验证基座登录使用的 token。
2. 通过请求头扩展为 CDI **HTML 文档请求**添加 `X-LOCAL-DEBUG: 1`（包括刷新和 `/cam/*` 深层路由），然后刷新线上基座。无需 `X-CAM-FE` / `X-CAM-SERVER`。
3. 点击顶导语言按钮右侧的「本地调试」。弹窗按子应用分组；目前托管子应用为 CAM，第三方 iframe 菜单不属于 Federation 子应用。
4. 前端 URL 可填 `http://localhost:9100`，自动补 `/mf-manifest.json`；也可填完整的 `mf-manifest.json` 或 `remoteEntry.js` 地址。后端 URL 填服务根地址，如 `http://localhost:9101`，实际请求路径为 `/v1/*`，不要重复填写 `/v1`。
5. 点击「保存并刷新」。配置存于当前标签页的 sessionStorage，刷新后保留，关闭标签页后清除。只有 HTML 开关为 1 时才应用；取消不保存，清空字段后保存恢复默认配置。浏览器拒绝会话存储时会提示保存失败。

所有字段均可留空，前后端可以独立覆盖：

| 字段 | 空值行为 |
| --- | --- |
| CAM 前端 | 使用构建变量 `VITE_CAM_REMOTE_ENTRY` |
| CAM 后端 | 保持 `/api/cam` 同源代理，由 Caddy 使用部署变量 `CAM_UPSTREAM_BASE_URL` |

非空后端 URL 仅通过子应用的 `platform.apiBase` 生效，由浏览器直接访问，保留 `/v1/*` 接口路径。基座 `CDIService` 始终使用 `/api/cam`，登录、注册和用户资料等基座请求不随调试配置切换。缓存同时按账号和实际后端隔离。线上服务器不会代理到开发者的 localhost。覆盖目标不可用时不自动切回线上。

### 部署与加载约定

- 需要一起部署构建产物和新的 `Caddyfile`。Caddy 只对 HTML 执行模板，并将请求头转为固定的 `0` / `1` meta 值，不反射任意头内容。静态 JS/CSS 不执行模板。
- HTML 使用 `Cache-Control: private, no-store` 和 `Vary: X-LOCAL-DEBUG`。前置网关需透传该头，CDN 不能强制缓存 HTML。普通静态文件服务器不会解析 Caddy 模板；本地 `pnpm dev` / `pnpm preview` 已有等效处理。
- Federation 使用 `loaded-first`，优先采用基座共享依赖，子应用注册时通过 alias 解析调试入口；预加载采用同一配置。子应用离线不阻塞顶导，配置变化通过整页刷新重新初始化。
- HTTPS 基座访问本地服务还需满足浏览器本地网络访问权限、混合内容与站点 CSP 策略；本地 HMR/WebSocket 也需可达。该开关是开发入口，不是额外的权限认证机制。
- 新子应用接入时，在 `src/localDebug.ts` 的 `DEBUG_APPLICATIONS` 中登记前后端环境变量和默认 API 前缀，并接入对应的 Federation alias、预加载及统一请求客户端。
