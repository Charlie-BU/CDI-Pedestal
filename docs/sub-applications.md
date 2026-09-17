# 数据库驱动的子应用配置

## 1. 本次实现

基座启动后，通过固定的 CAM-Server 地址读取运行目录。菜单、顶层路由、Federation 注册、iframe 和本地调试表单都使用该目录。侧导按“首页 → 已启用且显示在菜单中的子应用 → 子应用配置”排列。配置页是基座自身页面，路径 `/sub-applications`，不会随目录为空或应用被禁用而消失。

`sub_application` **没有 version 字段**；提交也不携带版本号。不实现乐观锁，管理员对同一配置的后续保存可以覆盖之前保存的值。

## 2. 地址边界

- 基座 `CDIService` 固定 `baseURL=/api/cdi`，登录、用户资料、目录、配置管理全部走该实例。
- `CDI_UPSTREAM_BASE_URL` 表示基座后端 API 地址，供 Vite/Caddy 转发 `/api/cdi` 请求；当前由 CAM-Server 提供认证和配置接口。部署时使用此变量名。
- 子应用前端地址、后端地址、名称、类型、路径、图标、排序和显示开关保存在 CAM-Server 数据库。
- 不再读取 `VITE_CAM_REMOTE_ENTRY`、`VITE_HIDE_MENUS`；不在基座静态登记子应用。
- 正常子应用收到 `platform.apiBase=backend_url`，由浏览器直接访问配置的后端。例如 backend_url 为 `https://cam-api.example`，请求路径为 `/v1/service/list` 时，浏览器访问 `https://cam-api.example/v1/service/list`。CAM-Server 不提供子应用请求转发路由。
- 本地调试仅覆盖子应用 `platform.apiBase`，基座请求地址保持固定。

## 3. 数据结构

表在 CAM-Server 的 `database/models.py` 中定义，共用现有数据库连接和用户表。

| 字段 | 用途与约束 |
| --- | --- |
| id | 主键 |
| app_key | 唯一稳定标识，创建后不可修改，小写字母开头，允许数字、下划线和连字符 |
| name_zh / name_en | 中英文名称，必填，最多 128 字符 |
| description_zh / description_en | 中英文说明，可空 |
| icon_url | HTTP(S) 地址或基座根相对路径，可空 |
| app_type | federation 或 iframe |
| route_path | 唯一小写路径；不允许首页、配置页、API/资源保留路径及应用间父子路径重叠 |
| frontend_url | HTTP(S) 前端地址，必填；Federation 可填服务根地址/目录（自动补 `/mf-manifest.json`），或完整 manifest/remote entry URL |
| remote_name / exposed_module | Federation 容器名称与导出，例如 cam / ./App；iframe 清空 |
| backend_url | 服务根地址，可空；iframe 清空 |
| sort_order | 0～1000000 的整数，按该值及 id 排序 |
| enabled | 是否在运行目录启用 |
| show_in_menu | 是否显示菜单；关闭后已启用应用仍可直接访问路由 |
| require_login | 是否要求登录；默认开启 |
| created_at / updated_at | 创建、更新时间 |
| created_by / updated_by | 操作者用户 ID，迁移记录可空 |
| deleted_at | 软删除时间 |

软删除保留原标识和路径的唯一占用，不自动恢复或复用。

## 4. 后端接口

独立 SubRouter：`subRouters/v1/sub_application.py`，在 `app.py` 注册。以下为 CAM-Server 原始路径；浏览器统一在前面加 `/api/cdi`。

| 方法与路径 | 请求 | 权限 |
| --- | --- | --- |
| GET /v1/sub-application/list | page、page_size≤100、search、app_type、enabled | 可匿名及普通登录用户访问；需登录应用的入口对匿名用户置空 |
| GET /v1/sub-application/detail | id | L0 |
| POST /v1/sub-application/create | 配置字段对象 | L0 |
| POST /v1/sub-application/update | {id, values}，values 可部分更新 | L0 |
| POST /v1/sub-application/set-enabled | {id, enabled} | L0 |
| POST /v1/sub-application/delete | {id} | L0 |
| POST /v1/sub-application/reorder | {ids: 全部未删除应用 ID 的有序数组} | L0 |

五个写接口在 authentication.py 的 API_PERMISSION_MAP 中统一要求 L0，并由 service 再次检查权限；详情接口也在 service 检查用户级别，不能通过直接调用绕过页面限制。运行目录将 backend_url 的值放入 `api_base`，供浏览器直连；需登录应用对匿名用户清空该地址。路由直接返回 service 结果；异常按其他子路由的惯例返回 HTTP 500 和错误文本，前端使用通用失败提示。

列表默认每页 20 条，不传 enabled 时同时返回启用和停用应用；已删除记录始终排除。基座目录使用同一 `/list` 接口，指定 enabled=true、每页 100 条，并逐页加载至全部取完。列表同时提供配置字段与 api_base、has_backend，不再保留独立运行目录接口。

## 5. 基座页面与加载

配置页包含搜索、类型/状态筛选、分页、新增、编辑、启停、上下移动、删除。新增/编辑复用登录弹窗使用的 `CModal.openArcoForm`，按基本信息、接入配置、显示设置分组；展示文本同时维护中英文。

登录身份改变时清空旧目录并重新加载；过期请求不会覆盖新身份目录。页面重新获得焦点、管理操作成功后也刷新目录。目录失败时显示错误和重试；首页、登录与配置页仍保留。

Federation 使用 Vite 创建的同一 host 实例，按目录动态 registerRemotes/loadRemote，继续共享 React、React Router 等依赖。子应用必须符合 `src/platform.ts` 的平台合同并导出接收 platform 的 React 组件；任意普通网页不能直接当 Federation 应用加载，应选 iframe。

已加载的远程入口、导出或前端路由改变时显示刷新提示，避免在同一共享作用域强制替换模块。显示名称等变化不会重新创建已加载组件。后端 URL 改变后，目录刷新会检测已加载应用的连接配置变化并提示整页刷新，再使用新地址。

iframe 使用完整前端 URL，不拼 manifest；目标站点仍需允许被嵌入。iframe 不接收 Federation 的 platform 合同，不接入后端配置。

## 6. 本地调试衔接

HTML 请求 `X-LOCAL-DEBUG: 1` 时出现本地调试按钮。表单根据当前可访问的已启用目录生成，按 app_key 存储当前标签页的 sessionStorage 覆盖。空值回退到数据库配置。Federation 支持前后端分别覆盖；iframe 仅覆盖前端 URL。详细说明见 [本地调试](local-debug.md)。

调试地址不写入数据库，不影响其他用户；关闭本地调试或禁用应用后，已保存覆盖不生效。覆盖目标失败不会自动回落线上。

## 7. 部署迁移步骤

1. 备份 CAM-Server 数据库。安装锁文件中的后端依赖，保留现有 DATABASE_URI 和认证配置。
2. 在数据库客户端连接 CAM-Server 使用的 **PostgreSQL 数据库**，手动执行 [001_sub_applications.sql](../../CAM-Server/docs/sql/001_sub_applications.sql)。SQL 使用 public schema，依赖既有 `public."user"` 表；如部署使用其他 schema，请先调整 SQL 的 search_path。

   SQL 只创建缺失的 sub_application 表，包含事务，无 version 字段。已有但结构不同的表不会被自动修复。后端启动保留全部模型的 create_all 自动建表逻辑，包含 sub_application 表；仍提供 SQL 供管理员手动迁移。create_all 只创建缺失表，不升级已有表结构。
   如果已经执行过旧版建表 SQL，请先手动执行 [历史调试字段清理 SQL](../../CAM-Server/docs/sql/003_remove_local_debug_flag.sql)；新环境无需执行。
3. 如需导入旧菜单，编辑并手动执行 [002_seed_sub_applications.sql](../../CAM-Server/docs/sql/002_seed_sub_applications.sql)：

   - 将参数区 `REPLACE_CAM_FRONTEND` 替换为原 CAM 完整 manifest/remote entry URL。
   - 将 `REPLACE_CAM_BACKEND` 替换为后端服务根 URL，不重复添加 /v1；地址不可包含凭据、查询串或 fragment。
   - `hidden_menus` 默认为空数组；可改为 `ARRAY['/cam', '/railway']::text[]`，对应应用初始化为禁用。
   - SQL 补齐 CAM 和原有六个 iframe 应用；相同 app_key（包含软删除）不覆盖、不恢复。重复执行不会重复插入；其他唯一约束冲突会回滚整个事务。
   - 未替换占位值时主动报错；出错后先 ROLLBACK，再修正并重新执行完整 SQL。也可跳过此可选步骤，之后通过配置页新增应用。

4. 先发布支持目录接口的 CAM-Server，核验 L0 用户和目录接口，再发布基座及 Caddyfile。基座保留 CDI_UPSTREAM_BASE_URL 指向此服务；移除旧的两个 VITE 子应用变量。
5. 用 L0 登录，进入侧导最后的“子应用配置”，核对 URL、菜单顺序、登录要求和 iframe 可嵌入性。验证普通用户可读取列表，但不能修改配置、匿名目录脱敏、子应用后端直连和本地调试。

空数据库不会自动注入默认应用；配置页可用于从零创建。回退基座到旧构建前需恢复它依赖的旧环境变量；数据库新表可保留。

## 8. 后端直连与验证

CAM-Server 仅提供子应用目录及配置管理接口。子应用 HTTP 请求由浏览器直接发往数据库 backend_url；前端模块加载与本地调试均沿用各自的 URL 配置。基座认证、用户资料和配置接口继续走固定的 `/api/cdi`，不随子应用后端地址变化。

子应用后端必须能从浏览器访问，并允许基座 Origin 的跨域请求以及所需 Authorization、Content-Type 和 OPTIONS。HTTPS 基座应配置浏览器可访问的 HTTPS 后端；本地调试还需满足浏览器本地网络权限及混合内容策略。数据库填写内网专用地址并不会让浏览器自动获得内网连接。

require_login 控制基座目录入口和前端访问；enabled 控制应用是否进入目录。这些配置不能替代子应用后端自己的认证与授权，也不会阻止用户直接访问已知的后端 URL。后端应自行校验令牌和业务权限。

验证命令：

```bash
# CDI-Pedestal
pnpm check
# CAM-FE：平台消费者回归
pnpm test
pnpm build
```

SQL 文件提供给管理员手动执行，当前未在 PostgreSQL 实例执行；建表 DDL 按 SQLAlchemy 模型编译核对。

测试覆盖目录身份竞争、动态 remote 注册、地址覆盖/回退、固定 CDIService、配置权限、无 version、唯一冲突、软删除、排序、后端 URL 下发及无代理路由。浏览器冒烟使用生产构建和临时运行目录/测试 remote，验证动态菜单、末尾配置入口和 platform.apiBase；不等同于真实部署网络及全部第三方 iframe 的端到端验证。


## 9. 生成客户端契约与调用

基座通过 `src/services/CDIService.ts` 导出的 CDIService 实例调用 CAM 生成的方法。页面与目录 Hook 直接调用生成方法，不再设置额外的子应用 service 封装层。UI 类型校验保留在 `src/subApplications.ts`；原 requestCDI 旁路入口已移除。

| 功能 | 生成方法 | 请求要点 |
| --- | --- | --- |
| 列表 | GetAllSubApplicationsGET | page、page_size 转为字符串；其他筛选参数原样传入；signal 经 options 传递 |
| 详情 | GetSubApplicationByIdGET | id 为查询字符串 |
| 新增 | CreateSubApplicationPOST | 配置字段作为请求体；HTTP 200，响应体 status 为 201 |
| 修改 | UpdateSubApplicationPOST | {id, values} |
| 启停 | SetSubApplicationEnabledPOST | {id, enabled}，enabled 必须是 boolean |
| 排序 | ReorderSubApplicationsPOST | {ids}，保留整数数组 |
| 删除 | DeleteSubApplicationByIdPOST | {id} |

鉴权沿用共享请求拦截器，从当前登录状态注入 Bearer Token；写方法的 Authorization 空占位仅用于满足生成类型，真实 Token 由拦截器填写。列表支持匿名访问，默认不启用响应缓存，避免读取过时配置。生成类型中的 app_type 为 string，UI 适配时检查为 federation 或 iframe 后再使用。

接入前已从最新生成代码采集上述七个真实请求，在临时 SQLite 下调用后端实际路由，并按生成响应类型递归核对字段、数组、基础类型和可空类型，全部通过。此验证不访问线上数据库；生成目录未作手工修改。

### 目录加载与缓存

首次进入且没有当前账号的缓存时，基座保持整页 loading，直到完整目录加载成功或请求失败，再渲染路由。目录按账号使用现有 IndexedDB 缓存策略保存全部分页结果；命中缓存后立即展示并后台请求最新目录。后续刷新保留当前页面，完整结果有变化时才更新菜单与路由，后台失败保留已有目录。切换账号会清空内存目录，旧请求不能覆盖新账号的数据；缓存读取或写入失败不阻塞网络结果。

### 拖拽排序

管理表格最左侧为拖拽手柄，拖动时预览整行，目标行高亮。放下后读取完整目录，移动源应用至目标位置，再通过 CDIService 的排序接口提交全部 ID；保留未显示的分页和筛选外应用。取消拖动或放回原行不提交。保存失败保留原列表并提示错误。手柄获得焦点后也可使用上下方向键调整当前页内的位置。
