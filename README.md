# CDI-Pedestal

CDI 主站基座，负责导航、登录态、数据库驱动的子应用加载与配置管理。

## 本地运行

```bash
pnpm install
pnpm dev
```

默认端口 9000。配置 `CDI_UPSTREAM_BASE_URL` 指向基座后端 API（当前由 CAM-Server 提供认证和应用目录接口）。子应用信息通过数据库管理，不再使用 VITE_CAM_REMOTE_ENTRY 或 VITE_HIDE_MENUS。基座 CDIService 固定使用 `/api/cdi`。

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
