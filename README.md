# CDI-Pedestal

CDI 主站 Shell。负责统一顶导、侧导、底导、登录态和产品路由；各产品继续在独立 repo 中构建和发布。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认端口为 `9000`。`VITE_CAM_REMOTE_ENTRY` 为必填构建变量；示例值为 `http://localhost:9100/mf-manifest.json`，因此本地运行时需要同时启动 CAM。也可以将其设置为其他已部署的 CAM 远程入口。

基座统一代理 CAM：所有 CAM 请求均使用 `/api/cam/v1/*`，并被改写为 CAM 后端的 `/v1/*`，包括登录、注册、用户资料和业务接口。

## 主站与子应用契约

主站通过 Module Federation 加载 `cam/App`，并传入 `PlatformContextValue`：当前用户、访问令牌、CAM API 基地址、语言和未授权回调。子应用不渲染全局导航，也不拥有主站登录 UI。
