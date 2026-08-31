# CDK-Pedestal

CDK 主站 Shell。负责统一顶导、侧导、底导、登录态和产品路由；各产品继续在独立 repo 中构建和发布。

## 本地运行

```bash
./setup-consumer.sh .
pnpm install
pnpm dev
```

默认端口为 `9100`。CAM 默认从 `http://localhost:9000/mf-manifest.json` 加载，因此需要同时启动 CAM；也可以通过 `VITE_CAM_REMOTE_ENTRY` 指定其他地址。

## 主站与子应用契约

主站通过 Module Federation 加载 `cam/App`，并传入 `PlatformContextValue`：当前用户、访问令牌、语言和登录/注册/退出操作。子应用不渲染全局导航，也不拥有主站登录 UI。

