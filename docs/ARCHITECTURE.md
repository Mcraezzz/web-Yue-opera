# 架构审查与改进 / Architecture Review and Improvements

更新 / Updated: 2026-11-10

[中文](#中文) | [English](#english)

## 中文

### 当前架构与判断

项目适合继续采用单个 Spring Boot 后端与独立 React 前端。Python RAG 是可选辅助服务，媒体分析脚本属于运维处理流程。当前没有证据表明需要拆成多个业务微服务；先明确这些边界并补齐测试，维护成本更低。

```text
浏览器 React / HashRouter
  ├─ 静态页面、图片、音频、分析 JSON
  └─ /api → Vite 开发代理 / Nginx 生产代理
               └─ Spring Boot Controller → Service → JdbcTemplate → MySQL
                    ├─ AI 上游接口（服务端保存密钥）
                    ├─ 可选 Python RAG → 本地模型 / Qdrant
                    └─ 可选媒体运维接口 → Python 分析脚本
```

### 本次已实施

| 原问题 | 修改后的行为 |
| --- | --- |
| `npm run dev` 无条件启动 Python，缺少依赖会拖停整个项目 | RAG 默认关闭；显式启用后如启动失败，前后端继续运行，检索可回退到已有本地检索逻辑 |
| 启动器加载 `.env` 覆盖系统变量，单独启动后端又不加载 `.env` | 共用 `scripts/runtime.mjs`；系统环境变量优先；完整启动和独立后端启动使用同一配置逻辑 |
| 独立后端启动命令仅支持 Windows，Vite 代理端口写死 | 根据平台选择 Maven wrapper，Unix 通过 `sh` 启动；Vite 跟随 `SPRING_PORT` |
| 缺少子进程启动失败处理 | 必需服务启动失败或退出会停止同组服务；处理 SIGINT/SIGTERM 并清理子进程 |
| 每次启动重置 `demo` 的密码及资料 | `DemoAccountSeeder` 默认关闭；显式提供密码后仅创建缺失账号，不覆盖已有账号 |
| 匿名请求可触发最多 20 分钟的服务器媒体分析 | 读接口与运维写接口分离；写接口默认不注册，启用需独立运维密钥；单实例同时只允许运行一个分析任务 |
| 媒体分析使用开发者电脑的绝对路径 | 默认输入改为项目相对路径 `public/videos/liangzhu.mp4`；支持环境变量覆盖 |
| CORS 接受任意来源但漏掉 DELETE | 使用明确来源列表，支持 GET/POST/DELETE/OPTIONS；同域生产部署可配置空列表 |
| 非法 JSON 和错误 HTTP 方法可能返回 500 | 保持 400/405 等框架状态码与响应头，统一返回 `error` 字段；意外异常写入服务端日志 |
| Nginx 默认缓冲会延迟 AI 流式输出 | API 关闭代理缓冲，并配置 300 秒读取超时 |
| 启动测试会连接并修改开发数据库 | 启动烟雾测试替换数据库初始化器；新增不依赖真实数据库的边界测试 |

### 配置及迁移

现有 `.env` 不会被修改。新模板采用以下默认值：

| 配置 | 默认值 | 用法 |
| --- | --- | --- |
| `RAG_ENABLED` | `false` | 恢复模型并安装 Python 依赖后设为 `true` |
| `RAG_PYTHON` | `python` | 可指向虚拟环境中的 Python 可执行文件 |
| `SPRING_PORT` | `8080` | 开发后端与 Vite 代理使用同一端口 |
| `DEMO_ENABLED` | `false` | 仅在需要演示账号时启用 |
| `DEMO_PASSWORD` | 空 | 启用演示账号时必须至少 12 个字符 |
| `MEDIA_LOCAL_ANALYSIS_ENABLED` | `false` | 仅受信任运维环境启用 |
| `MEDIA_OPERATOR_KEY` | 空 | 启用媒体写接口时必须至少 32 个字符，通过 `X-Media-Operator-Key` 请求头提供，不放入前端 |
| `CORS_ALLOWED_ORIGINS` | 两个本地 5173 来源 | 逗号分隔完整来源；同域 Nginx 生产模板为空 |

关闭演示账号初始化不会删除已有 `demo` 账号，也不会改变旧密码。已有环境如曾使用公开演示密码，应由管理员另行处理该账号和既有会话。本次更新不操作线上数据库。

媒体写接口仍是同步运维接口，会占用请求线程；不要直接向普通用户开放。并发保护只覆盖单个 JVM，不是分布式任务队列。生产环境优先在服务器运行离线分析脚本；如需 Web 任务管理，应先实现任务队列、状态查询、配额与审计。

本地 RAG 所需的主要 Python 包包括 `fastapi`、`uvicorn`、`pymysql`、`qdrant-client`、`sentence-transformers`；模型恢复见 [LARGE_ASSETS.md](LARGE_ASSETS.md)。本次没有变更现有模型及其运行环境。

### 后续改进顺序

1. **数据库版本管理：** 将 `DatabaseInitializer` 中的建表与内容种子拆开，使用版本化迁移；目前新闻种子仍会更新同一 `sort_order` 的记录。迁移前需真实数据库备份与升级回滚验证。
2. **前端领域拆分：** 将大型 `Repertoire.tsx` 按播放器、唱段、练习和互动模块拆分；统一 API 客户端和认证状态。当前多个页面重复读取 token、处理 fetch 和错误，跨账号异步响应也需要专项验证。
3. **AI 与媒体任务隔离：** 将大型 `AiService` 按上游调用、历史存储、图片管理拆分；配置有界流式执行器，加入任务队列、用户限流及上游故障指标。
4. **数据访问层：** 将 SQL 从业务 Service 提取到领域 Repository，为事务边界和真实 MySQL 集成测试建立清晰入口。
5. **交付与可观测性：** 增加 CI、健康/就绪分离、结构化请求日志及请求标识；按页面拆包并测量首屏资源。后续再决定是否需要对象存储/CDN。

这些属于后续工作，不代表已在本次完成。保持现有接口和数据可用比一次性重写更重要。

### 验证与边界

- 启动器回归测试：`npm run test:runtime`，4 项。
- 后端测试：在 `backend-spring/` 运行 `./mvnw test`（Windows：`.\mvnw.cmd test`），7 项。
- 前端：`npm run build` 与 `npm run lint`。
- 本机验证环境：Windows、Node 24、Java 23（项目编译目标 Java 21）。Unix 启动命令有配置断言，尚未在 Linux 上运行整套服务。
- 未调用付费 AI、未重新运行大型模型分析、未在生产 Nginx 上验证配置。本次只同步仓库，不部署线上服务。

## English

### Architecture and Assessment

Keep the React frontend and a single Spring Boot backend. Treat Python RAG as an optional auxiliary service and media analysis as an operator workflow. There is no demonstrated need to split the business backend into microservices. Clear boundaries and regression coverage are the immediate priorities.

Requests flow from React through the Vite development proxy or production Nginx proxy to Spring controllers, services, JDBC, and MySQL. The backend integrates with the external AI provider and optionally with Python RAG and local Qdrant. Model weights and full videos remain external to Git.

### Implemented Changes

- **Optional RAG:** Disabled by default. A missing or failed Python process no longer terminates the frontend and backend. Existing search fallback remains available.
- **Shared startup configuration:** `scripts/runtime.mjs` loads `.env`, gives inherited environment variables precedence, and supports both combined development and backend-only startup.
- **Portable commands:** Windows uses `mvnw.cmd`; Unix uses `sh ./mvnw`, avoiding dependence on its executable bit. The Vite proxy follows `SPRING_PORT`.
- **Process lifecycle:** Required-service startup failures and exits stop sibling services; SIGINT/SIGTERM trigger cleanup.
- **Demo account isolation:** `DemoAccountSeeder` is disabled by default. Explicitly enabled seeding requires a password and never overwrites an existing account's credentials or profile.
- **Operator boundary:** Public media reads remain available. The write endpoint is registered only when explicitly enabled and requires a separate operator key. Each JVM permits one analysis job at a time, and a surviving Python process is terminated when the request execution ends.
- **Portable media path:** The default input is `public/videos/liangzhu.mp4`, replacing a developer-specific absolute path.
- **CORS and errors:** Explicit origins replace the wildcard; DELETE preflights are supported. Framework 4xx statuses and response headers are preserved, with a consistent `error` body. Unexpected exceptions are logged server-side.
- **Streaming proxy:** Nginx API buffering is disabled, with a 300-second read timeout.
- **Isolated tests:** The application smoke test no longer runs the database initializer against a developer's database. API boundary and seeding tests use isolated collaborators.

### Configuration and Migration

Existing `.env` files are preserved. New templates use:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RAG_ENABLED` | `false` | Enable after installing Python dependencies and restoring models |
| `RAG_PYTHON` | `python` | Select a virtual environment's Python executable |
| `SPRING_PORT` | `8080` | Shared development backend/proxy port |
| `DEMO_ENABLED` | `false` | Opt into demo-account creation |
| `DEMO_PASSWORD` | Empty | At least 12 characters when enabled |
| `MEDIA_LOCAL_ANALYSIS_ENABLED` | `false` | Opt into the operator write endpoint |
| `MEDIA_OPERATOR_KEY` | Empty | At least 32 characters; send via `X-Media-Operator-Key`, never from frontend code |
| `CORS_ALLOWED_ORIGINS` | Two local port-5173 origins | Comma-separated origins; empty in the same-origin production template |

Disabling demo seeding does not remove existing demo accounts or change old passwords. Administrators must separately address any previously deployed public demo credentials and sessions. This update does not modify production data.

Media writes remain synchronous and occupy a request thread. The concurrency guard is JVM-local, not a distributed queue. Prefer offline scripts in production; add durable jobs, status polling, quotas, and auditing before exposing user-driven analysis.

Primary RAG dependencies are `fastapi`, `uvicorn`, `pymysql`, `qdrant-client`, and `sentence-transformers`. Restore models as described in [LARGE_ASSETS.md](LARGE_ASSETS.md). Existing model installations are unchanged.

### Prioritized Follow-up Work

1. Introduce versioned schema migrations and separate content seeding. The current news seeder still updates matching `sort_order` records; migration requires database backups and upgrade/rollback tests.
2. Split `Repertoire.tsx` into playback, aria, practice, and interaction modules. Centralize HTTP requests and authentication state, and test late async responses across account switches.
3. Split `AiService` into upstream, history, and image-management responsibilities. Add bounded streaming execution, job queues, user limits, and upstream observability.
4. Move SQL into domain repositories and add transactional and real-MySQL integration coverage.
5. Add CI, separate liveness/readiness, structured request logs and request IDs, and measure route-level bundles before introducing object storage/CDN infrastructure.

These follow-ups are proposals, not completed changes.

### Validation and Limits

Four Node runtime tests and seven Java tests pass, along with the frontend production build and ESLint. Commands are `npm run test:runtime`, `npm run build`, `npm run lint`, and `./mvnw test` within `backend-spring` (`.\mvnw.cmd test` on Windows).

Validation ran on Windows with Node 24 and Java 23, targeting Java 21. Unix command selection is covered by an assertion, but a full Linux deployment was not run. Paid AI calls, large model inference, and production Nginx validation were not performed. This is a repository update, not a live deployment.
