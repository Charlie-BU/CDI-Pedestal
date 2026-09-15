# 子应用本地调试：需求与实现说明

本文说明 CDI-Pedestal 的子应用本地调试功能，供开发者使用、部署和后续维护。实现记录日期：2026-09-16。

**核心约定：线上基座可以加载开发者本地的子应用前端，并让子应用请求本地后端；基座自身的 `CDIService` 始终使用 `/api/cam`，不受调试配置影响。**

## 1. 背景与目标

原有流程要求开发者在本地同时启动 CDI 基座和子应用，才能在完整的导航、登录态和平台上下文中调试子应用。

本次实现允许开发者直接访问已部署的 CDI，只启动需要调试的本地前端或后端。基座继续提供导航、登录、用户信息、语言和平台上下文，调试目标由当前浏览器标签页中的配置决定。

### 1.1 功能要求

| 项目 | 最终行为 |
| --- | --- |
| 开启方式 | 访问基座 HTML 时附加 `X-LOCAL-DEBUG: 1` |
| 按钮位置 | 顶导语言按钮右侧、用户头像左侧 |
| 配置入口 | 点击「本地调试」打开 Modal |
| 弹窗样式 | 复用登录弹窗使用的 `CModal.openArcoForm` |
| 表单结构 | 按子应用分组，每组包含前端 URL 和后端 URL |
| 字段要求 | 所有字段允许为空，前后端可以独立配置 |
| 空值行为 | 前端使用默认构建入口，后端使用原有同源代理及部署环境变量 |
| 保存方式 | 写入当前标签页的 `sessionStorage`，随后整页刷新 |
| 基座 API | `CDIService` 固定使用 `/api/cam` |
| 失败行为 | 配置的目标不可用时显示加载或请求失败，不自动切回线上目标 |

入口显示条件只有请求头开关，不额外要求登录；访问 CAM 路由仍受原有登录态约束。本功能不增加独立的开发者身份认证。

### 1.2 当前覆盖范围

当前通过 Module Federation 接入的子应用为 **CAM**，因此表单当前包含一个 CAM 分组。

Railway、扣子罗盘、Prompt Minder、Icon Gallery、Arco Design、飞书开放平台等菜单是第三方 iframe 页面，没有由基座管理的 Federation 前后端配置，不纳入本次表单。

前后端 URL 通过 Modal 填写。实现不读取 `X-CAM-FE`、`X-CAM-SERVER`，也不提供 `/__cdi/runtime-config` 服务。

## 2. 请求流向与职责边界

### 2.1 正常模式

```mermaid
flowchart LR
    Browser[开发者浏览器] --> Shell[线上 CDI 静态页面]
    Browser --> Remote[默认 CAM 前端入口]
    ShellAPI[基座 CDIService] --> Proxy[同源 /api/cam]
    CamAPI[CAM 请求客户端] --> Proxy
    Proxy --> Upstream[CAM_UPSTREAM_BASE_URL 对应后端]
```

默认前端入口来自构建变量 `VITE_CAM_REMOTE_ENTRY`。默认 API 使用 `/api/cam/v1/*`，由 Caddy 去掉 `/api/cam` 前缀后转发到后端的 `/v1/*`。

### 2.2 前后端均配置为本地时

```mermaid
flowchart LR
    Browser[开发者浏览器] --> Shell[线上 CDI 静态页面]
    Browser --> LocalFE[本地 CAM 前端 localhost:9100]
    ShellAPI[基座 CDIService] --> Proxy[同源 /api/cam]
    Proxy --> OnlineAPI[线上默认后端]
    CamAPI[CAM 请求客户端] --> LocalAPI[本地 CAM 后端 localhost:9101]
    Shell -->|platform.apiBase| CamAPI
```

这些浏览器请求中的 `localhost` 指开发者电脑。线上 Caddy 不会把 upstream 改为开发者填写的地址：线上服务器访问 localhost 只能访问服务器自身，无法访问开发者电脑。

### 2.3 CDIService 固定地址

[src/services/CDIService.ts](../src/services/CDIService.ts) 保持：

```ts
const http = axios.create({
    baseURL: "/api/cam",
    timeout: 60000,
    headers: { "Content-Type": "application/json" },
});
```

本地调试配置不会改变该实例的默认 baseURL。基座通过它发起的登录、注册、用户资料、账号管理等请求继续访问默认线上服务。

子应用后端覆盖通过 [src/App.tsx](../src/App.tsx) 传递：

```ts
apiBase: getApiBase("cam")
```

CAM-FE 的 `src/remote.tsx` 接收 `platform.apiBase`，调用其统一请求层的 `setApiBase()`。本次复用了既有 `PlatformContextValue.apiBase: string` 合同，没有新增平台字段，也没有修改 CAM-FE 的生产代码。

边界按**发起请求的客户端**区分，而不是按接口路径、当前路由或接口名称区分。不能因为当前位于 `/cam/*`，就让基座 `CDIService` 跟随子应用切换。

## 3. 开关从请求头传入页面

页面 JavaScript 不能直接读取首次 HTML 请求的请求头，因此通过服务端输出一个 meta 值传递开关。

### 3.1 源码与生产构建

[index.html](../index.html) 中预留：

```html
<meta name="cdi-local-debug" content="__CDI_LOCAL_DEBUG__" />
```

[build/localDebugHeader.ts](../build/localDebugHeader.ts) 在生产构建的 HTML 处理末期，把占位符替换为 Caddy 模板表达式：

```gotemplate
{{if eq (.Req.Header.Get "X-LOCAL-DEBUG") "1"}}1{{else}}0{{end}}
```

[Caddyfile](../Caddyfile) 对 HTML 执行模板。浏览器实际收到的结果为：

```html
<meta name="cdi-local-debug" content="1" />
```

未带头或头值不是字符串 `1` 时，结果为 `0`。`true` 不会开启调试。服务端仅输出固定的 `0` 或 `1`，不把请求头原文拼入页面。

`isLocalDebugEnabled()` 读取该 meta，仅在 `content` 严格等于 `1` 时返回 true。按钮显隐与配置读取使用同一个判断。

### 3.2 开发和预览环境

Vite 插件同时处理 `pnpm dev` 和 `pnpm preview`：

- 对 `GET` 且 `Accept` 包含 `text/html` 的页面请求读取请求头。
- 开发环境读取源码 HTML、替换占位符，再调用 Vite 的 HTML 转换。
- 预览环境读取构建后的 HTML、替换 Caddy 模板表达式。
- `/api`、`/health`、Vite 内部资源以及源码、依赖路径跳过该处理。
- 对处理后的 HTML 设置相同的缓存头。

因此本地不需要安装 Caddy，也能验证请求头开关。单纯用其他静态文件服务器托管 `dist` 不会自动解析 Caddy 模板。

### 3.3 缓存与刷新

HTML 响应设置：

```http
Cache-Control: private, no-store
Vary: X-LOCAL-DEBUG
```

Caddy 在 SPA 回退至 `index.html` 后设置这些头，使首页和深层路由使用一致的开关行为。JS、CSS 等静态资源不执行 HTML 模板，也不因本功能统一改为 `no-store`。

请求头必须作用于**HTML 文档请求**，包括首次打开、刷新和直接访问 `/cam/*`。只给接口或 JS 请求加头不会开启按钮；SPA 内部路由切换也不会重新读取 HTML 请求头。更改请求头规则后需整页刷新。

## 4. 配置模型与地址解析

### 4.1 子应用注册表

[src/localDebug.ts](../src/localDebug.ts) 维护 `DEBUG_APPLICATIONS`：

```ts
{
    id: "cam",
    label: "CAM",
    frontendEnv: "VITE_CAM_REMOTE_ENTRY",
    backendEnv: "CAM_UPSTREAM_BASE_URL",
    defaultApiBase: "/api/cam",
}
```

`id` 用于配置存储和 Federation alias 匹配。`label` 用于表单分组标题。

**`frontendEnv`、`backendEnv` 是默认来源的说明元数据，不是自动读取环境变量的机制。** 前端默认值由调用方传给 `getRemoteEntry()`；后端默认值保留同源代理，由服务端读取 upstream 环境变量。浏览器无需获取或暴露后端部署地址。

### 4.2 保存结构

存储键：`cdi-local-debug-v1`。

示例值：

```json
{
  "cam": {
    "frontend": "http://localhost:9100",
    "backend": "http://localhost:9101"
  }
}
```

- 配置保存在当前站点、当前标签页的 `sessionStorage`，不写 Cookie、共享服务端状态或持久化的 `localStorage`。
- 普通刷新会保留配置；生命周期遵循浏览器的页面会话规则。复制标签页或会话恢复可能继承初始存储，不能把「新标签页必为空」当成实现保证。
- 开关关闭时忽略保存的配置，但不删除它；重新带头刷新后可以再次读取。
- 只处理注册表中的子应用，未知子应用键会被忽略。
- 缺失字段或非字符串字段按空值处理。
- 读取、JSON 解析或地址规范化失败时，当前实现整体返回空配置，不部分应用损坏的存储。
- 保存失败会提示错误，不执行刷新。

### 4.3 URL 校验

`normalizeDebugUrl()` 使用 `URL` 解析地址，统一执行：

1. 去除首尾空白，纯空白视为空值。
2. 非空时要求完整、可解析的 HTTP 或 HTTPS URL。
3. 拒绝地址中的用户名、密码、查询参数和 fragment。
4. 去除末尾斜杠，保存规范化后的地址。

示例：

| 输入 | 处理结果 |
| --- | --- |
| 空字符串或空格 | 使用默认值 |
| ` http://localhost:9100/ ` | 保存为 `http://localhost:9100` |
| `https://dev.example/cam/` | 保存为 `https://dev.example/cam` |
| `localhost:9100` | 校验失败，需要协议 |
| `//localhost:9100` | 校验失败，需要协议 |
| `javascript:alert(1)` | 校验失败 |
| `https://user:password@dev.example` | 校验失败 |
| `https://dev.example/?token=x` | 校验失败 |

当前实现允许任意符合上述规则的主机，并未限制为 loopback 地址，也不会在保存前探测目标可达性。保存成功只代表校验和存储成功，不代表目标服务已经可用。

### 4.4 前端入口解析

`getRemoteEntry(id, fallback)`：

- 无有效覆盖时返回传入的默认入口。
- 非空地址路径以 `.json`、`.js` 或 `.mjs` 结尾时，视为完整入口。
- 其他地址追加 `/mf-manifest.json`。

| 表单中的前端 URL | 最终加载入口 |
| --- | --- |
| 空 | `VITE_CAM_REMOTE_ENTRY` 的构建值 |
| `http://localhost:9100` | `http://localhost:9100/mf-manifest.json` |
| `https://dev.example/cam` | `https://dev.example/cam/mf-manifest.json` |
| `http://localhost:9100/remoteEntry.js` | 保持原地址 |

显式 `.json` 入口需要实际返回兼容的 Federation manifest；显式 JS 入口需要是当前 `type: "module"` 支持的 Federation 入口。后缀校验不验证远程文件内容。

### 4.5 后端解析及组合行为

`getApiBase("cam")` 返回非空的后端覆盖值，否则返回 `/api/cam`。后端字段填写**服务根地址**，例如 `http://localhost:9101`；请求客户端继续提供 `/v1/*` 路径，不要在字段中重复填写 `/v1`。

| 调试开关 | 前端字段 | 后端字段 | CAM 前端 | CAM 业务请求 | 基座 CDIService |
| --- | --- | --- | --- | --- | --- |
| 关闭 | 任意 | 任意 | 默认入口 | 默认代理 | 默认代理 |
| 开启 | 空 | 空 | 默认入口 | 默认代理 | 默认代理 |
| 开启 | 本地地址 | 空 | 本地入口 | 默认代理 | 默认代理 |
| 开启 | 空 | 本地地址 | 默认入口 | 本地后端 | 默认代理 |
| 开启 | 本地地址 | 本地地址 | 本地入口 | 本地后端 | 默认代理 |

这里的默认代理始终是 `/api/cam`，最终由 `CAM_UPSTREAM_BASE_URL` 决定服务端 upstream。

## 5. Modal 与交互实现

[src/components/LocalDebug/index.tsx](../src/components/LocalDebug/index.tsx) 提供按钮和弹窗入口：

1. 未启用调试时不渲染按钮。
2. 点击后调用 `CModal.openArcoForm()`，复用登录弹窗的容器、遮罩、关闭和页脚行为。
3. 通过 `initialValues: readDebugSettings()` 回填当前配置。
4. 使用纵向 Form 布局，每个子应用用 `fieldset` 和 `legend` 分隔。
5. 前后端输入框均可清空，使用自定义 URL validator，无必填规则。
6. 字段下方说明空值对应的默认环境变量来源。
7. 点击「保存并刷新」先校验、再保存、最后执行 `window.location.reload()`。
8. 取消或关闭不保存；恢复默认值通过清空字段并保存完成。

分组边框、圆角、颜色使用现有主题变量。文案位于两份 locale 文件的 `localDebug` 下，包含按钮、标题、说明、字段标签、校验错误、保存按钮和保存失败提示。

整页刷新用于重新初始化远程模块、共享依赖、平台上下文和请求目标。本次没有实现不刷新页面的模块热替换或配置实时订阅。

## 6. Federation 注册与预加载

### 6.1 注册入口覆盖

[vite.config.ts](../vite.config.ts) 仍以 `VITE_CAM_REMOTE_ENTRY` 注册默认 `cam` remote，且该构建变量仍为必填。

新增 [src/localDebugRuntimePlugin.ts](../src/localDebugRuntimePlugin.ts)，在 `beforeRegisterRemote` 钩子中设置最终入口：

```ts
remote.entry = getRemoteEntry(remote.alias || remote.name, remote.entry);
```

优先匹配 alias 的原因是 Vite Federation 插件会为 runtime remote 生成内部名称，不能假定其 `name` 一定等于 `cam`。该钩子也覆盖延迟注册场景，避免只在初始化时处理 remote 列表而漏掉后续注册。

### 6.2 共享依赖加载策略

使用 `shareStrategy: "loaded-first"`，先采用基座已加载的共享依赖。原有 React、React Router 等 singleton 和 dedupe 配置保留。

这一策略避免基座启动阶段必须等待远程子应用。如果本地前端离线，开发者仍能打开顶导配置弹窗修改地址。该策略是构建级配置，正常访问也使用同一策略，不只在带调试头时生效。

### 6.3 预加载使用同一入口

[src/preloadCAMRemote.ts](../src/preloadCAMRemote.ts) 同样调用 `getRemoteEntry()`：

- manifest 地址：以 `credentials: "omit"` 拉取 manifest，解析 remote entry 后添加 `modulepreload`。
- `.js` / `.mjs` 地址：直接添加 `modulepreload`，不尝试按 JSON 解析。
- 一次页面生命周期内复用预加载 Promise，避免重复预取。
- 预加载失败记录诊断信息，不阻塞基座。

原有已登录后的空闲预加载时机保留；进入 `/cam/*` 时仍通过 `lazy(() => import("cam/App"))` 加载子应用，失败由 `RemoteBoundary` 展示恢复入口。

## 7. 认证、请求与缓存

### 7.1 认证关系

调试模式不创建独立登录会话。基座继续从默认后端获取登录 token 和用户信息，再通过平台上下文交给子应用。

因此，本地 CAM 后端必须能验证该 token，并具备所需的用户或权限数据。如果本地后端不接受线上 token，业务接口可能返回 401；按现有平台合同，子应用的未授权处理可能触发基座登出。

前端资源加载不应携带业务 Bearer token。业务请求中的 token 仍由各自统一请求层处理，不在调试配置中保存凭据。

### 7.2 缓存行为

基座 `createCacheKey()` 已把 `baseURL` 纳入键，继续保留 token 哈希、method、URL 和 params。`CDIService` 用最终请求配置及默认 baseURL 生成键；自定义 `cacheKey` 也被纳入账号和目标地址的隔离范围。

该缓存调整不意味着基座默认地址可以跟随调试配置变化。

CAM-FE 原有自动缓存键已经包含其实际 baseURL，因此普通自动缓存可以区分线上和本地目标。若业务调用方显式指定 CAM 的自定义缓存键，仍需自行保证目标和账号隔离，不能假设本次基座改动会重写所有子应用自定义键。

## 8. 开发者使用步骤

1. 启动需要调试的 CAM-FE 或 CAM-Server，只改前端或只改后端时可只填写对应字段。
2. 确认本地 FE 提供 manifest／remote entry 及其引用的 JS、CSS 等资源；确认本地后端提供 `/v1/*`。
3. 使用请求头扩展，将 `X-LOCAL-DEBUG: 1` 限定添加到目标 CDI 站点的 HTML 请求。
4. 打开或刷新线上 CDI，确认语言按钮右侧出现「本地调试」。
5. 打开弹窗，按需填写 `http://localhost:9100` 和 `http://localhost:9101`。
6. 点击「保存并刷新」，重新打开弹窗可查看保存值。
7. 通过正常基座登录流程登录，进入 CAM 调试。
8. 在浏览器 Network 中分别检查：基座请求仍为 `/api/cam/v1/*`；CAM 业务请求使用配置的后端；前端入口使用配置的 FE。
9. 调试结束后，清空相关字段并保存可恢复默认目标；移除请求头规则并刷新可隐藏入口并忽略已保存配置。

首次访问、刷新和深层路由访问都需要请求头规则继续生效。当前实现不提供自动安装扩展、生成本地证书或自动配置本地服务 CORS 的功能。

## 9. 部署要求

### 9.1 发布内容

需要一并发布：

- 包含 meta 模板及新前端逻辑的构建产物。
- 启用 HTML `templates` 和缓存头的 `Caddyfile`。

现有 Dockerfile 已复制这两部分，正常重新构建并部署镜像即可带入改动。无需新增配置服务或 `X-CAM-*` 环境变量。

`VITE_CAM_REMOTE_ENTRY` 仍在构建阶段决定默认 FE；`CAM_UPSTREAM_BASE_URL` 仍在部署阶段决定默认后端代理。调试表单不会修改这些环境变量。

### 9.2 网关与浏览器条件

- 前置网关需透传 `X-LOCAL-DEBUG`，CDN 不得覆盖 HTML 的不缓存策略。
- 本地 FE 需允许线上 CDI Origin 跨域加载入口及后续资源。
- 本地后端需允许该 Origin，以及业务所需的 OPTIONS、Authorization、Content-Type 和 HTTP 方法。
- 线上 HTTPS 页面访问本地 HTTP 服务时，还需满足目标浏览器的本地网络访问、混合内容和站点 CSP 策略；不能把开发环境 HTTP 冒烟测试当作线上 HTTPS 兼容性保证。
- HMR 使用的 WebSocket 地址和协议也需要可达；地址覆盖本身不保证热更新可用。

请求头只是功能开关，不是权限凭证。当前实现未加入开发者权限校验、主机白名单或服务端全局开关；部署环境若需要这些限制，需在网关或后续功能中明确实现。

## 10. 验证与验收

### 10.1 已有自动化测试

| 测试文件 | 验证内容 |
| --- | --- |
| [test/local-debug.test.ts](../test/local-debug.test.ts) | 请求头开关、独立覆盖、清空回退、显式入口、URL 校验、损坏存储、未知应用、Federation alias |
| [test/components/local-debug.test.tsx](../test/components/local-debug.test.tsx) | 按钮显隐、CAM 分组、空字段、默认来源说明、非法地址提示 |
| [test/services/cdi-debug-routing.test.ts](../test/services/cdi-debug-routing.test.ts) | 配置子应用后端时 CDIService 仍为 `/api/cam`，子应用解析结果可变化；保留 Authorization、请求路径和取消信号 |
| [test/services/preload-cam-remote.test.ts](../test/services/preload-cam-remote.test.ts) | manifest 预加载不携带凭据，显式 JS 入口不按 JSON 拉取 |
| [test/services/cache.test.ts](../test/services/cache.test.ts) | 账号隔离、后端地址隔离、缓存读写和按账号清理 |

运行方式：

```bash
# 在 CDI-Pedestal 仓库根目录运行
pnpm check

# 单独验证本次的地址边界
pnpm exec vitest run test/services/cdi-debug-routing.test.ts test/local-debug.test.ts
```

最后一次代码检查结果：基座 10 个测试文件、36 项测试通过，`test:typecheck`、lint 和构建通过；CAM-FE 的请求／平台相关 4 项测试及构建通过。构建仍存在体积提示，不影响构建成功。

### 10.2 已完成的本机验证及其边界

- 生产构建页面：按钮位置、复用的 Modal 样式、配置保存并刷新、回填、清空字段、无请求头时隐藏按钮。
- 本地假子应用：成功加载指定的 JS entry，子应用收到正确的 `platform.apiBase`。
- 实际 Caddy 2.10.2：首页、`/index.html` 和 `/cam/services` 下，对无头、`0`、`1`、`true` 共 12 组请求验证 meta 和 HTML 缓存头；确认 JS 保持静态响应，默认 `/api/cam` 代理正确改写为 `/v1`。
- `CDIService` 固定地址的最终修正通过专门的请求适配测试和完整 `pnpm check` 验证。较早联调曾使用本地假登录后端，该登录流向不代表最终设计；最终基座登录必须走默认代理。

上述验证使用本机 HTTP、测试资源和虚构账号，没有完成实际线上 HTTPS 域名、真实 CAM 业务数据、真实 token 兼容性或 HMR 的端到端验收。功能尚未因这些本机验证而自动部署到线上。

### 10.3 部署后验收清单

- [ ] 不带头：入口隐藏，默认 CAM 加载和业务请求正常。
- [ ] 带头、全空：入口显示，前后端均使用默认目标。
- [ ] 仅 FE：本地前端加载成功，子应用请求默认后端。
- [ ] 仅后端：默认前端请求本地后端，基座登录和资料请求仍走默认代理。
- [ ] 两者均填写：前后端都使用本地目标，基座 CDIService 不变。
- [ ] 输入非法 URL：阻止保存并展示校验提示。
- [ ] 保存、刷新、再次打开：字段正确回填；清空保存后恢复默认值。
- [ ] 本地 FE 离线：仍能打开基座配置入口；CAM 加载失败可见。
- [ ] 本地后端离线或不接受 token：错误可见，不自动发送到线上替代目标。
- [ ] 直接访问深层路由：请求头和缓存行为与首页一致。
- [ ] 目标浏览器允许本地资源、业务跨域和 HMR/WebSocket。

## 11. 常见问题排查

| 现象 | 优先检查 |
| --- | --- |
| 按钮没有出现 | HTML 文档请求是否带 `X-LOCAL-DEBUG: 1`；是否整页刷新；meta 是否为 `1`；网关透传与 HTML 缓存 |
| meta 仍包含占位符或模板文本 | 是否同时发布新构建和 Caddyfile；是否使用了不支持模板的静态服务器 |
| 看到按钮但 CAM 仍加载默认 FE | 是否已保存；字段是否为空；当前标签页存储是否有效；runtime alias 是否匹配注册表 |
| FE 地址打开能访问，但 CAM 加载失败 | 是否为 Federation 入口；manifest 内的资源地址是否正确；JS/CSS 的 CORS、协议和 CSP 是否满足 |
| 修改后端后，基座登录仍请求线上 | 这是预期行为；只检查 CAM 请求客户端是否采用新的 `platform.apiBase` |
| 请求路径出现 `/v1/v1/...` | 后端字段重复填写了 `/v1`，应改成服务根地址 |
| 本地业务接口返回 401 | 本地后端是否能验证基座 token，用户或权限数据是否匹配 |
| 保存失败 | 浏览器是否允许 sessionStorage；配置是否通过校验 |
| 新开或恢复标签页带出旧配置 | 检查浏览器复制／恢复页面会话的行为，清空字段保存即可重置 |
| 修改代码后没有热更新 | 检查本地 Vite HMR 的主机、端口、协议和 WebSocket 可达性 |

## 12. 文件职责与扩展方式

| 文件 | 职责 |
| --- | --- |
| [index.html](../index.html) | HTML 开关占位符 |
| [build/localDebugHeader.ts](../build/localDebugHeader.ts) | 开发、预览请求头处理及生产模板注入 |
| [Caddyfile](../Caddyfile) | 生产 HTML 模板、缓存控制和默认 API 代理 |
| [vite.config.ts](../vite.config.ts) | 默认 remote、runtime 插件、共享加载策略 |
| [src/localDebug.ts](../src/localDebug.ts) | 子应用注册表、开关、存储、URL 校验与解析 |
| [src/localDebugRuntimePlugin.ts](../src/localDebugRuntimePlugin.ts) | 注册前覆盖远程入口 |
| [src/components/Layout/Header/index.tsx](../src/components/Layout/Header/index.tsx) | 顶导按钮位置 |
| [src/components/LocalDebug/index.tsx](../src/components/LocalDebug/index.tsx) | Modal 打开、回填、保存与刷新 |
| [src/components/LocalDebug/DebugForm.tsx](../src/components/LocalDebug/DebugForm.tsx) | 子应用分组表单与字段校验 |
| [src/components/LocalDebug/index.module.less](../src/components/LocalDebug/index.module.less) | 分组样式 |
| [src/App.tsx](../src/App.tsx) | 将解析后的 API 地址传给 CAM |
| [src/preloadCAMRemote.ts](../src/preloadCAMRemote.ts) | 使用同一入口预加载 |
| [src/services/CDIService.ts](../src/services/CDIService.ts) | 基座固定 API 地址、认证与缓存适配 |
| [src/services/cache.ts](../src/services/cache.ts) | 缓存键的账号及目标隔离 |
| [src/i18n/locales/zh-CN.json](../src/i18n/locales/zh-CN.json)、[en-US.json](../src/i18n/locales/en-US.json) | 中英文文案 |

接入新的托管子应用时：

1. 在 `DEBUG_APPLICATIONS` 增加稳定的 id、展示名、默认来源说明和默认 API 前缀，表单会自动生成对应分组。
2. 在 Federation 配置中注册同名 alias，并提供该应用真实的默认入口；仅填写 `frontendEnv` 不会自动注册或读取变量。
3. 将该应用的预加载逻辑接入 `getRemoteEntry()`，确保预加载与实际入口一致。
4. 将 `getApiBase(id)` 传给该子应用的统一请求客户端或平台合同，保持基座 `CDIService` 不变。
5. 为该应用配置默认同源代理、路径重写和服务端 upstream。
6. 验证 token、错误处理、取消请求和缓存目标隔离，补充对应配置、请求和合同测试。
7. 更新本文的覆盖范围和部署验收清单。

相关文档：[README](../README.md)、[单元测试规范](UTSpec.md)。
