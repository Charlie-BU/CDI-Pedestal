# 使用 @cloud-materials/common 消费包

本项目通过 `package.json` 中锁定的 GitHub Release `.tgz` 消费
`@cloud-materials/common`，不再 clone 组件库源码，也不需要访问字节内部 npm。

```bash
pnpm install --frozen-lockfile
```

组件库将所有非 React 运行时依赖打入产物；`react`、`react-dom` 保持为
peer dependency。生产构建中，CDI-Pedestal 与 CAM 将它们以及
`@cloud-materials/common` 声明为 Module Federation 单例，因此 CAM 被基座加载时
复用基座已经初始化的组件库实例。

## 发布与升级规则

升级组件库时，先发布新的、不可变的 GitHub Release tag 和资产文件名，再同时更新
CDI-Pedestal 与 CAM-FE 的依赖 URL 和 `pnpm-lock.yaml`。不要覆盖已有 Release 的同名资产：
即使 Release 页面显示了新文件，pnpm 仍可能依据 URL 和 lockfile 完整性复用旧 tarball。

推荐格式：tag 使用 `v1.20.1-cdi.1`，资产使用
`cloud-materials-common-1.20.1-cdi.1.tgz`。不要长期使用可覆盖的 `release` tag。

## 替换既有 Release 资产后的恢复步骤

如果因故替换了同名资产，两个消费项目都必须执行以下完整流程：

1. 修改两个 `package.json` 中的组件库 URL，改为新 tag/文件名。若历史原因只能保持同名，
   必须追加并变更查询参数，例如 `?asset=20260902-125705`，使 pnpm 视为新下载地址。
2. 分别在 CDI-Pedestal 和 CAM-FE 运行：

   ```bash
   pnpm install --force --no-frozen-lockfile
   rm -rf node_modules/.vite
   ```

3. 停止并重新启动两个开发服务（9000 与 9100）。只执行 `pnpm install` 不会使已运行的
   Vite 进程加载新的依赖，也不会自动清除其预构建缓存。

4. 提交两个仓库更新后的 `package.json` 和 `pnpm-lock.yaml`。

## 白屏排查：`Dynamic require of "react" is not supported`

这个异常表示浏览器加载到了仍含 CommonJS `require("react")` 的旧组件库构建，而不是
登录、路由或后端接口错误。先检查**已安装文件**：

```bash
rg 'mt\("react"\)|mt\("react-dom"\)' \
  node_modules/@cloud-materials/common/dist --glob '*.js'
```

如果命令有输出，说明更新尚未生效；按上一节更新 URL、lockfile、安装目录和
`node_modules/.vite`。修复版产物的该命令应无输出。
