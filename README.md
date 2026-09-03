# CDI-Pedestal

CDI 主站 Shell。负责统一顶导、侧导、底导、登录态和产品路由；各产品继续在独立 repo 中构建和发布。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认端口为 `9000`。`VITE_CAM_REMOTE_ENTRY` 为必填构建变量；示例值为 `http://localhost:9100/mf-manifest.json`，因此本地运行时需要同时启动 CAM。也可以将其设置为其他已部署的 CAM 远程入口。

`VITE_HIDE_MENUS` 可选，使用 JSON 数组隐藏基座菜单及对应顶层路由，例如 `VITE_HIDE_MENUS='["/cam", "/railway"]'`。数组元素可使用菜单 path，也兼容不带 `/` 的名称，如 `cam`；无效 JSON 或未知菜单会被忽略。

基座统一代理 CAM：所有 CAM 请求均使用 `/api/cam/v1/*`，并被改写为 CAM 后端的 `/v1/*`，包括登录、注册、用户资料和业务接口。

## 组件库 Release 更新与开发缓存

`@cloud-materials/common` 从 GitHub Release 的 `.tgz` 安装。发布、升级、缓存恢复和
白屏排查见 [组件库消费包文档](docs/cloud-materials-common.md)；该文档与 CAM-FE 的同名文档
保持一致。

## 主站与子应用契约

主站通过 Module Federation 加载 `cam/App`，并传入 `PlatformContextValue`：当前用户、访问令牌、CAM API 基地址、语言和未授权回调。子应用不渲染全局导航，也不拥有主站登录 UI。
