# 用户水母头像

Header 与个人资料共用 `UserAvatar`。配置来自当前用户响应的可选 `jelly_config`，由手写 AuthenticatedUser 扩展类型消费，不修改生成客户端或平台合同。空值、无效/不支持的配置保留原用户名首字母。水母代码通过 lazy import 按需加载；外层转发事件和 ref，保留 Popover 点击入口。

`src/components/User/jelly` 镜像 Team 使用的客户端像素绘制器、完整画布适配、外观类型与预设解析。配置中的第一套像素 preset、自绘表情和 customBell 遵循客户端归一化；无 classic 图像分支。Team 的缺省策略是固定蓝色默认水母，CDI 的缺省策略是首字母，两者策略独立。

验证：pnpm check 通过（115 项测试、测试类型检查、Lint、构建）；新增合成预览后另经测试类型检查和 Lint。UserAvatar 测试覆盖配置展示、无配置/无效配置/不支持 classic 的首字母回退、配置移除及点击事件传递。

浏览器使用实际 Header/Profile 与合成用户状态，确认顶部 32px 水母可点击打开个人资料，资料卡 40px 显示同一水母；清空配置后顶部恢复首字母。没有使用真实登录或业务 API；不视为生产账号验收。预览启动命令 `pnpm exec vite --config test/browser/vite.config.ts`，页面 `/test/browser/jelly-avatar.html`。

上线前需用户手动为 CAM/CDI user 表添加 nullable JSON 列，并先发布 CAM-Server 的读取支持。尚未确认 SQL 执行，未推送部署。

资料卡尺寸微调：保留 40px 头像布局占位，将水母 fill 从 1.75 调至 1.35（约缩小 23%）；顶部 32px 头像保持原比例。浏览器已核对资料卡展开后的效果，截图 `output/jelly/profile-smaller.jpg`；生产构建与 diff 检查通过。
