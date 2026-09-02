# CDI-Pedestal 单元测试规范

本文适用于 CDI-Pedestal：一个 React 18 + TypeScript + Vite 的 CDI Shell。它负责登录态、顶层导航、`/cam/*` 路由、CAM Module Federation remote 的加载，以及面向 CAM 的 `/api/cam` 代理与用户隔离缓存；CAM 业务页面仍属于 CAM-FE。本规范不在前端测试中访问真实 CAM 后端、已部署 remote、真实账号或浏览器登录态。

本文不引入 CI。提交前由开发者在本地执行受影响测试与质量检查；将来接入 CI 时应复用本文的命令和边界，不能为 CI 放宽隔离要求。

## 1. 目标与边界

- 用确定性、离线的测试守住 Shell 路由、平台合同、remote 装载、请求构造、缓存与未授权处理。
- 覆盖 hand-written 代码的行为和合同；`src/cam-auto-generate/` 是生成目录，不手改、不逐行测试。应测试其上层 `CDIService` 适配器、请求配置和错误映射。
- 测试失败应能定位为纯逻辑、Hook/组件、请求/缓存适配或 host-to-remote 集成问题，不依赖真实 token、真实用户资料、外网或已部署 manifest。
- 单测不替代 CDI-Pedestal + CAM-FE 的浏览器 E2E 或真实后端联调。此类场景应使用明确标记的 external/E2E 流程，并在用户授权后单独执行。

## 2. 基线工具与执行方式

当前仓库尚未接入测试运行器。首次引入测试时，统一使用 **Vitest + jsdom + React Testing Library**，匹配现有 React 18、Vite 7、ESM 与 pnpm 链路；不得混用 Jest、Node 原生测试或多套断言库。

首次接入时增加：

```bash
pnpm add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event fake-indexeddb
```

并增加如下脚本（覆盖率为可选辅助，不替代行为断言）：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:typecheck": "tsc --noEmit -p tsconfig.test.json",
    "test:coverage": "vitest run --coverage",
    "check": "pnpm test && pnpm test:typecheck && pnpm lint && pnpm build"
  }
}
```

新增 `vitest.config.ts`，复用 React 插件并配置 `environment: "jsdom"`、`include: ["test/**/*.{test,spec}.{ts,tsx}"]`、`setupFiles: ["./test/setup.ts"]`。`test/setup.ts` 统一导入 `@testing-library/jest-dom/vitest`、`fake-indexeddb/auto`，并提供 `requestIdleCallback`、`cancelIdleCallback` 与组件库所需浏览器 API 的最小 stub。新增 `tsconfig.test.json` 时继承 `tsconfig.app.json`，只纳入 `test/` 与 Vitest 类型；测试不能进入生产构建。

接入后使用：

```bash
pnpm test
pnpm test:watch
pnpm exec vitest run test/services/cache.test.ts
pnpm exec vitest run --testNamePattern='不同 token 不共享缓存' test/services/cache.test.ts
pnpm test:typecheck
pnpm lint
pnpm build
```

## 3. 目录、命名与结构

测试与源码分离，放在仓库根 `test/`：

```text
CDI-Pedestal/
├── src/
│   ├── cam-auto-generate/       # 生成代码，不直接测试
│   ├── components/
│   ├── hooks/
│   └── services/
└── test/
    ├── components/app-routing.test.tsx
    ├── components/remote-boundary.test.tsx
    ├── hooks/use-user.test.tsx
    ├── services/cache.test.ts
    ├── services/cdi-service.test.ts
    ├── integration/platform-remote.test.tsx
    ├── fixtures/
    ├── helpers/
    └── setup.ts
```

- 使用 `<module>.test.ts` 或 `<component>.test.tsx`；同一目录保持一种后缀风格。
- `describe` 命名被测模块或合同，`it`/`test` 描述可观察结果；单文件聚焦一个职责。
- `fixtures/` 仅放脱敏、稳定的 user、token、API response 和 remote Fake；`helpers/` 仅放 render wrapper、工厂、时间/请求控制。不得把业务逻辑搬到 helper 以逃避测试。
- 跨 Shell 与 remote、路由与请求层的组合场景放入 `test/integration/`，并在 `describe` 中标明集成场景。

## 4. Mock 与隔离原则

| 边界 | 单测做法 |
| --- | --- |
| CAM HTTP API / Axios | 在 `CDIService` 请求边界注入或 mock Axios transport，断言 method、URL、params、header 与错误映射；绝不访问真实后端。 |
| CAM federation remote | 以受控 `cam/App` Fake 或 mock lazy import 验证 props、fallback 与错误边界；不请求真实 `mf-manifest.json`。 |
| IndexedDB / localStorage | 使用 `fake-indexeddb` 和每例独立的内存存储；清理 DB、storage、spy 与模块状态，不读写真实浏览器登录态。 |
| 时间、idle callback、timer | 使用 Vitest fake timer 或显式 Fake；验证触发与清理，不用固定等待时间。 |
| i18n、Router、组件库 | 使用最小真实 provider 或稳定 Fake；断言用户可见内容、路由结果与公开行为，不断言内部 class/动画。 |

禁止：真实网络、真实 access token、用户资料、生产 URL、构建密钥进入 fixture、快照、错误、日志或终端输出；mock 被测单元核心实现；对完整页面/原始响应做大型快照；通过内部调用次数替代用户可见结果与请求副作用断言。

## 5. 分层覆盖要求

### 5.1 纯逻辑与缓存：`src/services/cache.ts`

- `createCacheKey` 对相同 method、URL、params（即使对象键顺序不同）稳定；不同 token、URL、method 或 params 不共享 key；断言 key 不包含原始 token。
- `isSameCachedData` 覆盖相同/不同结构、空值与键顺序；`cacheResponse`/`getCachedResponse` 覆盖写入、读取、DB 错误和连接关闭。
- `clearCachedResponsesForToken` 只删除当前 token hash 前缀，保留其他账号及匿名缓存；用独立 DB fixture 验证 cursor 分支。

### 5.2 CAM API client：`src/services/CDIService.ts`

- 无缓存或非 GET 请求只走网络，并保留调用方的 Axios 配置、超时与错误语义。
- 有缓存的 GET：miss 时返回网络结果并异步写入；hit 时立即返回旧值、后台刷新仅在数据变化时写回并调用 `onCacheUpdated`。
- IndexedDB 不可用、缓存写入失败、后台刷新失败都不得阻塞或替换主请求成功结果；后台失败不应将 token 或响应泄漏到日志。
- Bearer token 只在存在时加到 header，切换 token 后请求与缓存隔离。断言公开错误/cause，不冻结 Axios 原始错误文本。

### 5.3 Hook、认证与 Shell 路由

- `useUser` 覆盖无 token 初始状态、拉取当前用户、登录/退出、未授权清理与请求失败；退出应清除当前账号的缓存而不能影响其他隔离测试数据。
- `App` 覆盖 `/`、无 token 访问 `/cam/*` 的重定向、带 token 时传给 `cam/App` 的完整 `PlatformContextValue`、未知路由回退、Railway/Coze 的安全外链属性。
- `PlatformContextValue` 变更时覆盖 user、accessToken、`apiBase: "/api/cam"`、locale 与 `onUnauthorized`。host 侧与 CAM-FE remote 的合同测试必须一起更新。
- `RemoteBoundary` 覆盖 remote import/render 失败的可理解 fallback 与恢复路径；不吞掉可诊断错误。

### 5.4 预加载、i18n 与配置

- 已登录时优先使用 `requestIdleCallback` 预加载 CAM remote，并在卸载时取消；不支持时退化 timer，timer 不得在卸载后触发。
- locale 切换应向 remote 传递当前 resolved language；用户可见新增文案同步测试 `zh-CN.json` 与 `en-US.json` 的 key。
- Vite/federation/代理改动至少验证配置意图：缺失 `VITE_CAM_REMOTE_ENTRY` 失败明确；`/api/cam` 重写不丢失 `/v1/*`；React/React Router 保持 singleton 与 dedupe。配置本身不需要真实启动后端。

### 5.5 集成合同

使用 Fake remote 验证 host 在 Suspense fallback 后装载 `cam/App`，传入当前平台值，并在 remote 触发 `onUnauthorized` 时回到 host 的登出流程。测试只覆盖合同与用户可见回退，不模拟 CAM 的内部业务页面。

## 6. 测试数据与断言

- 使用 `test-access-token-a`、`test-user-a`、`test-service-001` 等虚构值；不得出现真实用户、token、后端域名或私有仓库凭据。
- 每例创建自己的可变输入；不要修改共享 fixture 后复用。
- 组件优先使用 `getByRole`、`getByLabelText`、`findByText` 与 `userEvent`，按用户行为定位，不依赖 CSS class。
- 对对象断言最小必要字段；安全相关输出加反向断言，确认 token/隐私字段不被序列化。
- `afterEach` 恢复 fake timers、`localStorage`、IndexedDB 数据、mock/spy、环境变量与 lazy module 状态。

## 7. 提交前本地闭环

当前未接入测试运行器时，新增或显著改变 hand-written 逻辑应优先同时落地本节的测试基线与最小测试，而不能把“暂无测试”当作永久豁免。

接入后：

1. 明确改动属于缓存、请求、Shell/路由、remote 合同、i18n 或配置，并列出正常、边界、失败与清理路径。
2. 先运行最小受影响测试；失败时最小化修复实现/预期并重跑。
3. 运行 `pnpm test`、`pnpm test:typecheck`、`pnpm lint` 与 `pnpm build`；可用 `pnpm check` 汇总。
4. host-to-remote 合同变更还需运行 CAM-FE 对应测试/构建；真实后端与浏览器 E2E 只有在用户授权后单独报告。
5. 检查 fixture、快照、mock、日志和提交内容不包含 token、Cookie、真实用户数据、生产 URL 或密钥。

纯文档或不影响交互行为的样式改动可说明无需新增单测，但仍应运行受影响的 lint/build。

## 8. 评审检查清单

- [ ] 新增/变更的 hand-written 逻辑有适当的 `test/*.test.ts(x)`；生成 client 没有被手改或直接深度 mock。
- [ ] 缓存覆盖用户隔离、miss、hit、后台刷新、存储失败和清理。
- [ ] Shell/remote 合同覆盖成功、未授权、fallback、路由回退与卸载清理。
- [ ] HTTP、IndexedDB、时间、storage、remote 和浏览器 API 均已隔离；没有真实网络。
- [ ] 真实 token、用户资料、私有地址与构建凭据不进入测试产物。
- [ ] 已运行受影响测试、`pnpm test`、`pnpm test:typecheck`、`pnpm lint`、`pnpm build`，或如实说明尚未接入/未运行原因。

## 9. 演进原则

真实浏览器、多 remote、跨服务登录流程或视觉回归属于单独 E2E；不得放宽本文离线、确定性单测边界。只有 Vitest、Testing Library、Fake remote 或可注入 transport 无法清晰表达的场景，才评估新工具，并保持目录、隐私和本地闭环要求不变。
