---
name: commit-update-writer
description: 基于指定 CDI-Pedestal 改动范围分析 Shell、CAM remote、代理与 API client 链路，并将工程记录增量写入 docs/COMMITLOG.md。仅在用户明确要求改动记录、commit update 或 commitlog 时使用。
---

# Commit Update Writer

此 skill 记录 CDI-Pedestal 的工程改动，不是复述 diff 或产品公告。CDI-Pedestal 是 CAM 的 Module Federation host：写作必须说明 Shell、平台合同、remote、代理、认证/缓存和部署配置的真实上下游影响。

## 范围与输入

- 默认 `working_tree_only`，只分析未提交改动。
- 用户明确说“上次/最近一次/已提交改动”时使用 `last_commit_only`，范围为 `HEAD~1..HEAD`。
- 仅在明确要求混合时使用 `last_commit_plus_working_tree`。
- `base_commit` 默认是 `HEAD~1`，用于记录；用户给出 commit id 时以其为基线。要求“某次 commit”却未给 id 时先询问。

在草稿中先明确 `compare_scope`；范围与用户指令不一致时停止，不得把已提交与未提交差异静默混写。

## 强制写入规则

1. 每次先读 `reference/language-style.md`，再读取 diff 与必要上下文。
2. 写入目标固定为 `docs/COMMITLOG.md`；文件不存在时创建。只在最上方插入新条目，不改写、删除或重排既有内容。
3. 条目写入当前本地时间，格式 `YYYY-MM-DD HH:mm`；必须包含 `Base Commit`、`Compare Scope`、实际验证状态及建议 Conventional Commit message。
4. 记录事实而不是计划。已验证、未验证、风险和后续建议必须可追溯到实际 diff、源码或命令结果。

## 分析范围

除 hunks 外，补读直接上游和下游：`PlatformContextValue` 的 CAM-FE 消费方、`cam/App` remote、React/Router shared 单例、`VITE_CAM_REMOTE_ENTRY`、`/api/cam/v1/*` 的 Vite/Caddy 重写、`CDIService`、生成 client、缓存、i18n、Docker/Caddy 与运行入口。

重点还原：改动前行为；所解决的问题和约束；改动后的实现与取舍；对 host、remote、浏览器请求、用户会话、缓存和部署的影响。不要把 remote 未验证、真实后端未授权或构建未执行写成已完成事实。

## 执行步骤

1. 判定范围和基线，收集文件级/hunk 级 diff（新增、修改、删除、重命名）。
2. 为关键改动构建“上游依赖 → 当前改动 → 下游影响”链路，并检查消费者是否同步。
3. 对照 `AGENTS.md`、`docs/UTSpec.md` 与实际命令结果，区分验证、限制与后续动作。
4. 按文风参考生成一条记录并插到 `docs/COMMITLOG.md` 顶部。
5. 给出一条不超过约 72 字符、单一意图的 `<type>(<scope>): <subject>` 建议提交信息。

## 条目模板

```markdown
## COMMITLOG - <YYYY-MM-DD HH:mm> - <一句话主题>

### 撰写时间

- <YYYY-MM-DD HH:mm>

### Base Commit

- `<sha>`

### Compare Scope

- `<working_tree_only | last_commit_only | last_commit_plus_working_tree>`

### 背景与改动目标

<先说明问题、约束和目标，再说明实现。>

### 关键链路解析

- 上游依赖：<PlatformContext、remote、代理、client 或配置>
- 当前改动：<真实模块、行为与取舍>
- 下游影响：<CAM-FE、路由、会话、缓存或部署消费者>

### 验证与风险

- 已验证：<实际命令及结果>
- 未验证：<范围和原因>
- 风险/后续：<仍需关注的边界>

### 建议 Commit Message

- `<type>(<scope>): <subject>`
```

## 边界

- 不写入 README、发布日志或其他文件，除非用户明确改口。
- 不自动提交、创建 PR、调用真实后端或执行 E2E；这些操作需要单独授权。
- 不编造性能、兼容性、安全性或测试结论，不用“完全解决”“无风险”等绝对表述。
