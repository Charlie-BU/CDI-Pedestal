# CDI-Pedestal

CDI 主站基座，负责导航、登录态、数据库驱动的子应用加载与配置管理。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认端口 9000。配置 `CDI_UPSTREAM_BASE_URL` 指向基座后端 API（当前由 CAM-Server 提供认证和应用目录接口）。子应用信息通过数据库管理，不再使用 VITE_CAM_REMOTE_ENTRY 或 VITE_HIDE_MENUS。基座 CDIService 固定使用 `/api/cdi`。

在 `.env` 中通过 `VITE_COLOR_THEME` 配置 `body` 的 `data-color-theme`，未配置、空值或仅含空白时默认使用 `cream`。例如 `VITE_COLOR_THEME=cream`；设为 `default` 可使用组件库默认配色。修改后需重启开发服务，生产环境需重新构建。

## 子应用管理

侧导最后一项“子应用配置”由 L0 用户管理，支持 Federation 与 iframe、新增编辑、启停、排序、软删除。空目录也可进入配置页。

- [数据结构、接口、迁移部署与验证](docs/sub-applications.md)
- [通过线上基座调试本地子应用](docs/local-debug.md)
- [组件库消费与缓存排障](docs/cloud-materials-common.md)
- [测试规范](docs/UTSpec.md)

Federation 子应用导出接收 `PlatformContextValue` 的 React 组件，使用传入的 apiBase、用户、令牌、语言和未授权回调。平台合同见 `src/platform.ts`。

## 验证

```bash
pnpm check
```

## 品牌文案配置

构建时通过 `VITE_CONTENT_OVERRIDE` 配置中英文标题和副标题，例如：

```json
{"zh-CN":{"brand":{"title":"示例平台","subtitle":"示例平台说明"}},"en-US":{"brand":{"title":"Example Platform","subtitle":"Example platform description"}}}
```

页头、首页和浏览器标题读取 `brand.title`，页头副标题读取 `brand.subtitle`。初始 HTML 使用默认语言 zh-CN 的标题，启动后按用户语言更新。Docker 构建使用同名 build arg；修改配置后需要重新构建发布。

基座向 Federation 子应用传递可选的 `platform.brandName`，随当前语言变化。AirJelly Team 使用该名称展示成员与平台入口说明；旧基座未提供时默认显示 CDI。独立打开 Team 时默认显示 CDI。iframe 不接收此平台上下文。
