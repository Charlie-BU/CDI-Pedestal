---
name: commit-quality-reviewer
description: 对 CDI-Pedestal 指定改动范围执行差异质检，默认审查当前工作区；用户要求 review、代码质检、提交前检查或 commit 时使用。
---

# Commit Diff Quality Reviewer

用于审查 CDI-Pedestal 指定范围的 diff。它是 CAM 的 Module Federation host，负责 Shell、登录态、`/cam/*` 路由、`/api/cam` 代理和 host-to-remote 合同。只审查 diff 覆盖内容，不将历史问题伪装成本次问题。

## 三问主检

所有结论优先回答：改动是否合理；是否引入新问题；是否破坏调用方、CAM remote、配置、代理或运行链路。

## 范围、基线与白名单

- `working_tree_only`：默认，只审查未提交改动。
- `last_commit_only`：仅在用户明确说“上次/最近一次/已提交改动”时审查 `HEAD~1..HEAD`。
- `last_commit_plus_working_tree`：仅在用户明确要求混合范围时使用。
- `base_commit` 默认记录 `HEAD~1`；用户给出 commit id 时使用它。若用户要求“某次 commit 对比”却未给 id，先询问。
- 审查前读取本 skill 的 `docs/whitelist.md`。仅短期、可解释的问题可标记 `WAIVED`；密钥或隐私泄露、注入、认证绕过、无保护的不可逆破坏永不豁免。

## 执行步骤

1. 确认仓库为 `cdi-pedestal`，并检查 `vite.config.ts`、`src/platform.ts`、`src/services/CDIService.ts`、`src/cam-auto-generate/` 与相关消费者。
2. 解析范围、基线、文件列表与关键 hunks；对每个关键改动补读导入、类型、调用方、路由、配置和错误路径。
3. 先做三问主检，再按通用基线与项目清单审查；只报告高置信度（通常超过 80%）问题。
4. 记录实际执行的验证。无法运行、环境缺失和未授权外部验证都必须明确标为未验证。

## 通用审查基线

- `CRITICAL`：密钥、密码、token 或隐私数据泄露；脚本/模板/注入风险；认证或授权绕过；无保护的不可逆数据删除或结构破坏。
- `HIGH`：功能回归、空值/错误路径崩溃、吞错、竞态或资源泄漏；公共合同破坏且没有迁移或兼容策略。
- `MEDIUM`：明显重复 I/O、N+1、热路径性能退化；关键失败路径无足够上下文；高风险改动没有最小验证。
- `LOW`：调试输出、注释旧代码、陈旧 TODO、重复逻辑、歧义命名、散落魔法值。

## CDI-Pedestal 项目清单

### CRITICAL

- `VITE_*`、源码、浏览器存储、日志或构建产物泄露服务端密钥、`CLOUD_MATERIALS_GITHUB_TOKEN`、access token 或用户资料。
- 任意路径绕过同源 `/api/cam` 代理、伪造登录态或跳过 `onUnauthorized`，导致跨账号/越权访问。
- 缓存键未隔离用户或令牌，导致一个账号读取另一个账号的 CAM 数据。

### HIGH

- `PlatformContextValue` 的 user、access token、API base、locale 或未授权回调变更后，`cam/App` 消费端没有同步。
- 修改 `VITE_CAM_REMOTE_ENTRY`、manifest、shared React/React Router 单例、public path 或路由后导致 remote 不能加载、出现双 React 或错误页面回退。
- `/api/cam/v1/* -> /v1/*` 的 Vite/Caddy 重写、环境变量或部署配置改变，导致浏览器请求错误地直连后端或请求路径失真。
- `CDIService` 的 Bearer token、Axios options、超时、错误传播、GET-only stale-while-revalidate 语义退化；缓存 miss、存储失败或后台刷新失败阻塞主请求。
- 手工修改 `src/cam-auto-generate/`，或生成合同改变但服务/调用方没有同步。

### MEDIUM / LOW

- Shell 布局、登录/退出、路由守卫或 i18n 改动没有覆盖加载、成功、未授权、空态与清理状态。
- `zh-CN.json` 与 `en-US.json` 文案漂移；资源、Docker/Caddy 与 README 的运行约定不一致。
- 仅针对生产代码中的临时调试、重复请求、过宽泛的 `catch` 或不透明缓存回调给出 LOW/MEDIUM 结论。

## 验证

先阅读根目录 `AGENTS.md` 与 `docs/UTSpec.md`。当前没有已提交测试运行器，禁止杜撰 Vitest/Jest/Playwright 结果。

- 源码、样式或配置变更：运行 `pnpm lint`。
- TypeScript、Vite、federation、generated client、资源或打包入口变更：运行 `pnpm build`。
- 修改 host-to-remote 合同：同时验证 CAM-FE 构建；具体未验证范围如实报告。
- 真实后端、部署 remote、账号或数据只在用户明确授权后使用。

## 审阅后的可选 E2E 验收

审查完成后，若 diff 影响登录、导航、CAM remote 加载、请求认证、代理、用户可见业务流程或其失败路径，必须单独询问用户是否需要开发态浏览器 E2E 验收。审查本身不包含 E2E，不得把 lint、build 或静态检查表述为 E2E 通过。

仅在用户确认后执行，并先完整阅读官方 `computer-use` skill。只使用当前源码的开发态服务：Pedestal 默认 `http://localhost:9000`，CAM remote 默认 `http://localhost:9100`。不得用 Railway/生产 Caddy 地址、已部署 manifest 或其他项目窗口替代；不重启、终止或干扰用户已运行的开发进程。

1. 先建立验收矩阵：每个改动对应的直接行为、host/remote 消费方、代理/认证/路由下游和关键失败路径。
2. 确认浏览器页面实际来自当前本地开发地址；服务探测受沙箱影响时，以已核验的浏览器页面为准，不据此启动重复服务。
3. 走完整用户路径。至少验证一条成功路径及适用的未授权、失败、空态或回退路径。没有测试账号、需要真实数据、付费、第三方授权或不可逆操作时停下并请求范围授权。
4. 观察浏览器控制台、网络请求与可见状态：remote 入口/资源是否来自 CAM，`/api/cam` 是否正确重写，401 是否回到 host 的未授权处理，错误是否保留可诊断信息。
5. 结束时恢复临时 DevTools、测试页和非持久 UI 状态；不删除用户数据。报告每项矩阵的 PASS/FAIL/NOT VERIFIED、证据、异常归因和遗留风险。

## 提交模式

仅在用户明确要求 commit 时执行。存在未豁免的 `CRITICAL` 或 `HIGH` 时停止提交。先审查同一范围，再逐项 `git add <明确文件>`、复核 staged diff，排除 `.env`、token、日志和硬编码本地路径；使用单一意图的 Conventional Commit：`<type>(<scope>): <imperative summary>`。不得 `git add .`、`git add -A` 或 `--no-verify`。

当范围为 `last_commit_only` 时，在审查结果末尾建议（但不自动执行）`commit-update-writer` 为该次改动写入 `docs/COMMITLOG.md`。

## 输出格式

先给 Findings，再给 Testing 和 Summary；无问题时也明确说明。每个问题列出 File、Evidence、Risk、Fix 与 `OPEN | WAIVED` 状态。

```markdown
## Core Check

- Reasonableness: PASS | WARN | FAIL
- New Issues Introduced: NO | YES
- Dependency Impact: SAFE | RISKY | BROKEN

## Findings

- [HIGH] <标题>
  - File: <path>
  - Evidence: <代码或行为>
  - Risk: <风险>
  - Fix: <可执行建议>
  - Status: OPEN | WAIVED

## Testing

- PASS | FAIL | NOT RUN: `<command>` — <范围或原因>

## Summary

| Severity | Count(Open) | Count(Waived) |
| -------- | ----------: | ------------: |
| CRITICAL |           0 |             0 |
| HIGH     |           0 |             0 |
| MEDIUM   |           0 |             0 |
| LOW      |           0 |             0 |

Decision: BLOCK | WARN | PASS
Base Commit: <sha>
Compared Scope: <scope>
Compared Range: <actual range>
```

`BLOCK` 表示存在 OPEN 的 `CRITICAL`；`WARN` 表示无 CRITICAL 但存在 OPEN 的 `HIGH`；其余为 `PASS`。
