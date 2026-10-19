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

## 外部静态首页

配置 `CDI_HOME_PAGE_URL=https://home.example.com/` 后，首页在保留基座顶栏、侧栏和页脚的内容区内展示外部 iframe。留空、配置无效或公开配置读取失败时保留默认首页。外部页不可用时，可点击“返回默认首页”；重新进入首页后再次尝试外部页。应用目录错误提示仍在默认页保留。

- Docker 部署：在容器运行环境设置 `CDI_HOME_PAGE_URL`，重启部署即可切换 URL，无需重新构建镜像。启动脚本使用 JSON 序列化生成 `/srv/runtime-config.json`，只包含公开首页地址。该地址会被浏览器读取，不要放入凭据。
- 本地开发及 `pnpm preview`：从 `.env` 读取同名变量，修改后重启服务。直接托管 `dist` 时，需自行生成 `runtime-config.json`；默认文件使用空地址。
- 配置文件请求禁用缓存，启动读取最多等待 3 秒；外部页面内容的缓存策略由静态站点管理。
- 地址必须是无账号密码的绝对 HTTP(S) URL；HTTPS 基座只接受 HTTPS 地址。为保持隔离并防止递归嵌入，首页必须部署在与基座不同的 origin（协议、域名或端口至少一项不同）。
- 外部站点应以响应头配置 `Content-Security-Policy: frame-ancestors https://你的基座域名`，避免与 `X-Frame-Options: DENY/SAMEORIGIN` 冲突；基座若额外配置 CSP，须在 `frame-src` 中允许静态站点。
- iframe 允许脚本、独立来源和新窗口，不开放表单、下载、顶层跳转等权限。新窗口链接建议使用 `target="_blank" rel="noopener noreferrer"`。不传递基座 token、用户资料或平台合同；iframe 自己的 Cookie 仍受浏览器策略管理。
- 主题和语言不会自动继承。第一版用于独立展示内容，未接入站内路由消息协议；业务入口继续使用侧栏，外链可在新窗口打开。
- 浏览器的 iframe `load/error` 无法可靠识别跨域 HTTP 错误及嵌入策略拒绝，因此保留手动恢复入口，不将 `load` 当作展示成功。上线时需用目标站点实际验证响应头、滚动、移动布局和链接行为。

### 官网按钮打开基座登录弹窗

外部官网的登录按钮点击后发送以下消息，将打开基座现有登录弹窗（与顶栏未登录头像相同）：

```js
// 替换为实际基座 origin，协议、域名和端口必须一致。
const shellOrigin = "https://你的基座域名";
document.querySelector("#login-button").addEventListener("click", () => {
    window.parent.postMessage({ type: "cdi:open-login" }, shellOrigin);
});
```

基座只接收当前首页 iframe 窗口发送、且来源与 `CDI_HOME_PAGE_URL` 的 origin 一致的消息。已登录时忽略请求；离开首页或返回默认首页后停止监听。不通过 URL、消息或回调向官网传递 token。官网如果重定向到其他 origin，需将配置改为最终地址。此协议只打开弹窗，不包含登录成功后的跳转或登录状态通知。

### 外部首页语言同步

首页 iframe 加载、收到来源与窗口匹配的 `cdi:homepage-ready`，以及基座语言切换时，发送 `{ type: "cdi:context", locale: "zh-CN" | "en-US" }` 到配置的首页 origin。语言切换不重载 iframe；不发送用户资料或凭据。外部页应校验父窗口与基座 origin 后更新文案。
