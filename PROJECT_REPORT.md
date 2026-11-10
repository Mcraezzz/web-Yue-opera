# 越韵清音 Web 项目综合报告

更新日期：2026-11-10

本次架构改进与后续计划见 [中英文架构说明](docs/ARCHITECTURE.md)。

## 1. 项目定位

“越韵清音—越剧文化知识与多模态智能交互平台”是一个围绕越剧文化传播、知识检索、用户互动和 AI 辅助理解搭建的前后端项目。它不是单纯静态展示页，而是一个包含账号体系、数据库持久化、AI 问答/识图/生图、经典唱段智能解析、本地视频播放和宣传材料生成链路的数字文化平台。

当前项目的核心价值在于把越剧文化从“图文介绍”扩展为可浏览、可搜索、可互动、可提问、可生成、可听析、可练习的综合体验：

- 普通用户可以通过首页、长卷、剧目、流派、台前幕后和新闻快速建立越剧基础认知。
- 登录用户可以保存点赞、收藏、评论、浏览历史、AI 对话和 AI 生图记录。
- AI 模块可以围绕站内知识回答问题，支持图片识别提示和越剧风格图片生成。
- 经典剧目页已经成为多模态重点页：本地视频、唱段音频、同步字幕、关键词、情绪/能量/音高曲线和用户演唱练习评测都集中在这里。

## 2. 总体架构

```text
浏览器
  └─ React 19 + TypeScript + Vite + HashRouter
      ├─ 静态资源：public/data、public/audio、public/videos、src/assets
      ├─ 页面逻辑：Home、Repertoire、Schools、AIEnter、Profile 等
      └─ /api/**
          ├─ 开发环境：Vite proxy -> Spring Boot :8080
          └─ 生产环境：Nginx reverse proxy -> Spring Boot :8080

Spring Boot 4.0.6 / Java 21
  ├─ Controller / Service / DTO 分层
  ├─ MySQL 数据持久化
  ├─ Token 认证与内容审核
  ├─ 站内知识检索与 RAG 上下文构造
  ├─ 火山方舟兼容 AI API 代理
  └─ 本地媒体分析脚本调度

离线/辅助脚本
  ├─ FunASR / Whisper / WhisperX 字幕与关键词路线
  ├─ librosa / ffmpeg 音频特征分析
  ├─ Pillow / ReportLab / Playwright 宣传物料生成
  └─ 火山方舟生图接口批量生成站内资产
```

## 3. 目录结构分析

```text
.
├─ src/                         # 前端源码
│  ├─ App.tsx                   # 路由表
│  ├─ main.tsx                  # React 入口，使用 HashRouter
│  ├─ index.css                 # 全局样式
│  ├─ components/               # Layout、Navbar、AuthModal、ChatWidget
│  ├─ pages/                    # 核心页面
│  ├─ hooks/                    # useAiChat、useHistory
│  ├─ data/                     # yuejuQuiz.ts，60 题小测题库
│  └─ assets/                   # 页面图片与生成图片
├─ backend-spring/              # Spring Boot 后端
│  ├─ pom.xml                   # Java 21 / Spring Boot 4.0.6 / MySQL
│  └─ src/main/java/com/yueju/backend/
│     ├─ controller/            # REST API
│     ├─ service/               # 认证、内容、互动、AI、搜索、媒体分析
│     ├─ dto/                   # API 数据结构
│     └─ config/                # CORS
├─ public/
│  ├─ data/                     # classic-arias、video-feature、media-analyses JSON
│  ├─ audio/                    # 6 条经典唱段 MP3
│  └─ videos/                   # 6 个本地全剧/片段 MP4
├─ data/                        # 离线分析数据与运行日志
├─ scripts/                     # 启动、媒体分析、资产生成、比赛材料生成
├─ docs/                        # 媒体智能化方案、比赛材料
├─ deploy/                      # Nginx、systemd、部署说明
├─ design_input/                # 宣传物料模板和输入图
├─ design_output/               # 海报、易拉宝、截图、PSD/PDF/JPG 输出
├─ dist/                        # 前端构建产物
├─ yueju-deploy-package/        # 部署包展开目录
├─ tmp/                         # 截图、抽帧、下载、ffmpeg 临时资源
└─ logs / edge-debug-profile*   # 本地运行与调试输出
```

`dist/`、`node_modules/`、`tmp/`、`edge-debug-profile*`、日志文件和部署压缩包属于生成/运行产物，不是核心业务源码。

## 4. 前端功能与路由

前端入口为 `src/main.tsx`，使用 `HashRouter`，适合静态托管场景。`src/App.tsx` 当前路由如下：

| 路径 | 页面 | 功能 |
| --- | --- | --- |
| `/` | `Home` | 首页、文化入口、今日戏单、越剧小测 |
| `/scroll` | `ScrollPage` | 越剧发展长卷 |
| `/repertoire` | `Repertoire` | 经典剧目、视频、唱段智能解析、用户练声 |
| `/schools` | `Schools` | 名家流派与艺术家 |
| `/news` | `News` | 新闻资讯 |
| `/backstage` | `StageAndBackstage` | 台前幕后、服饰头面、舞台系统 |
| `/ai` | `AIEnter` | AI 问戏、AI 识图、AI 生图 |
| `/search` | `Search` | 全站搜索与分类索引 |
| `/profile` | `Profile` | 个人中心 |
| `*` | `Home` | 兜底回首页 |

### 4.1 通用组件

- `Layout`：全站外壳，负责导航、页脚、登录弹窗、悬浮 AI、回到顶部、页面 reveal 动画和全局按钮涟漪效果。
- `Navbar`：顶部导航、移动端菜单、登录状态展示、退出登录、跨标签页状态同步。
- `AuthModal`：登录/注册弹窗，调用 `/api/auth/login` 和 `/api/auth/register`，成功后写入 `localStorage.yueju_token` 与 `localStorage.yueju_user`。
- `ChatWidget`：全站悬浮 AI，支持问答和生图；在 `/ai`、`/profile` 页面隐藏，避免与完整页面冲突。

### 4.2 重点页面

`Home` 包含沉浸式首屏、越剧简介、历史节点、经典剧目入口、名家/舞台入口、AI 入口、今日戏单和小测。今日戏单会依据登录用户或访客 ID 加当天日期生成稳定推荐；登录用户可直接收藏推荐剧目。

`Repertoire` 是当前最复杂的页面。它从 `/api/plays` 加载剧目列表，提供本地视频播放、点赞、收藏、评论、分享和浏览历史记录；同时读取 `public/data/classic-arias.json` 与 `public/data/video-feature-analyses.json`，展示经典唱段、同步唱词、关键词、剧情/流派/技巧说明、情绪曲线、能量柱、视频实时唱腔特征和剧情节点。页面还内置“用户唱段上传与练习评测”，使用浏览器 Web Audio API 分析用户上传音频，并与目标唱段进行情绪、能量和音准相似度比较。

`AIEnter` 包含两种主模式：AI 问戏和 AI 造梦工坊。AI 问戏支持文字问题、热门问题、主题标签、收藏最近问题，也支持上传图片并设置“识图前置 Prompt”；AI 造梦工坊支持风格、比例和模板 prompt，生成越剧视觉图像，并展示历史结果。

`Search` 调用 `/api/search`，支持关键词、分类、精选入口、搜索建议和结果跳转。分类包括剧目、新闻、流派、演员、历史、唱腔、舞台、服饰、视频等。

`Profile` 从 `/api/profile` 加载用户活动，展示点赞、收藏、评论和浏览历史，并支持清空历史与退出登录。

## 5. 后端结构与接口

后端位于 `backend-spring/`，采用 Controller、Service、DTO 分层。

### 5.1 控制器

| 控制器 | 主要接口 |
| --- | --- |
| `ContentController` | `/api/health`、`/api/plays`、`/api/news`、`/api/search` |
| `AuthController` | `/api/auth/register`、`/api/auth/login`、`/api/auth/logout` |
| `PlayInteractionController` | `/api/play-interactions`、点赞、收藏、评论、分享 |
| `ProfileController` | `/api/profile`、`/api/history` |
| `AiController` | AI 问答、流式问答、识图、生图、历史读取/清空 |
| `MediaAnalysisController` | 公开读取 `/api/media-analyses` |
| `MediaAnalysisAdminController` | 默认关闭的 `/api/media-analyses/analyze-local`，需独立运维密钥 |
| `ApiExceptionHandler` | 统一 JSON 错误响应 |

### 5.2 服务层

- `DatabaseInitializer`：启动时建表并写入 demo 用户、6 个剧目、新闻和 67 条左右搜索知识条目。
- `AuthService`：注册、登录、Token 创建/验证/退出、密码哈希。
- `ContentService`：健康检查、剧目/新闻读取、搜索分类。
- `KnowledgeSearchService`：站内知识检索，整合 `plays`、`news`、`search_items`，使用领域词、语义扩展和 BM25 风格评分生成搜索结果，也为 AI 构造 RAG 上下文。
- `PlayInteractionService`：剧目互动、评论审核、浏览历史、个人中心活动数据。
- `AiService`：代理火山方舟兼容 AI API，负责聊天、流式聊天、识图、生图、历史保存和本地兜底回答。
- `MediaAnalysisService`：读取外部媒体分析 JSON，合并内置示例；也可调用 `scripts/generate-media-analysis.py` 对本地媒体做分析。
- `ContentModerationService`：基础内容审核，覆盖用户名、昵称、评论，过滤 HTML、推广链接、保留名和部分敏感词。

## 6. 数据库设计

后端启动后自动创建以下表：

| 表名 | 用途 |
| --- | --- |
| `users` | 用户账号、密码哈希、昵称、简介 |
| `auth_tokens` | Token 哈希、用户 ID、过期时间、最近使用时间 |
| `plays` | 剧目基础信息、图片 key、点赞/收藏计数 |
| `news` | 新闻标题、分类、摘要、日期、来源链接 |
| `search_items` | 扩展知识检索条目 |
| `play_likes` | 用户点赞关系 |
| `play_collections` | 用户收藏关系 |
| `play_comments` | 用户评论 |
| `play_shares` | 分享记录 |
| `ai_chat_messages` | AI 对话历史 |
| `ai_image_generations` | AI 生图 prompt、最终 prompt、图片 URL |
| `browsing_history` | 浏览历史、路径、浏览次数和最近访问时间 |

demo 账号默认不创建；显式配置 `DEMO_ENABLED=true` 与至少 12 字符的 `DEMO_PASSWORD` 后只创建缺失账号，不覆盖已有密码。认证方式不是 JWT，而是数据库持久化随机 Token：浏览器保存 Token 原文，数据库保存 SHA-256 哈希。密码使用 PBKDF2WithHmacSHA512、16 字节 salt、100000 次迭代和 512 bit 输出。

## 7. AI、模型与工具链

### 7.1 后端 AI 服务

配置来自 `backend-spring/src/main/resources/application.properties` 和 `.env`：

- `VOLCENGINE_API_BASE`：默认 `https://ark.cn-beijing.volces.com/api/v3`
- `VOLCENGINE_API_KEY`：服务端密钥，前端不暴露
- `CHAT_MODEL`：默认 `doubao-seed-2-0-lite-260428`
- `VISION_MODEL`：默认复用 `CHAT_MODEL`
- `IMAGE_MODEL`：默认 `doubao-seedream-5-0-260128`
- `AI_THINKING_TYPE`：默认 `disabled`，关闭深度思考以提升问答首字响应速度；如需折中质量与速度，可改为 `auto`
- `CHAT_TIMEOUT_SECONDS`：默认 20 秒
- `CHAT_CACHE_SECONDS`：默认 600 秒；代码中已有缓存结构，但当前聊天主流程没有实际命中/写入缓存调用

`AiService` 的调用方式：

- 文本问答优先尝试 `/responses`，失败后退到 `/chat/completions`。
- 流式问答使用 `/chat/completions` 的 stream。
- 识图优先尝试 `/responses` 的 `input_image`，失败后退到 `/chat/completions` 的图片消息格式。
- 生图调用 `/images/generations`，运行时请求 `2K`、`watermark: true`。
- 当模型不可用或密钥未配置时，文本问答会基于站内检索结果给出本地兜底回答；识图会返回“导览框架”式兜底提示；生图要求必须配置密钥。

AI 问答不是纯直连模型。它会在直连失败后使用 `KnowledgeSearchService.buildRagContext()` 构造站内知识片段，再尝试带 RAG 上下文的模型回答；如果仍失败，则使用本地规则回答。

### 7.2 媒体智能分析

当前已形成两类数据：

- `public/data/classic-arias.json`：6 条经典唱段，包含音频、字幕、关键词、说明、情绪曲线和音频特征。数据源说明为“字幕：本地视频抽帧核对/联网唱词校订；关键词：FunASR paraformer-zh；曲线：librosa”。
- `public/data/video-feature-analyses.json`：6 个本地视频，每个视频约 180 个特征点，后端为 `librosa`，可随播放进度展示音高、节奏、能量和情绪。

关键工具与模型：

- FunASR paraformer-zh：用于关键词辅助，不把 ASR 结果直接当最终字幕。
- librosa：提取 RMS 能量、节奏/ onset、音高，生成归一化曲线。
- ffmpeg / imageio-ffmpeg：从视频抽取音频、截取唱段。
- Web Audio API：前端本地分析用户上传的练习音频，不上传到后端。
- Whisper / WhisperX：通用分析脚本中预留的 ASR 路线。
- CosyVoice：文档中预留数字讲解员音色路线，当前页面主要展示讲解文案和可选 `narratorVoiceUrl`。

### 7.3 资产和材料生成

- `scripts/generate-yueju-assets.mjs`：调用火山方舟生图接口，批量生成剧目、流派、舞台、AI 示例图。
- `scripts/build_yilabao_poster.py`、`build_yilabao_photoshop_poster.py`：使用 Pillow 生成易拉宝/PSD 相关输出。
- `scripts/build_intro_image_920.py`：生成 920x640 作品简介图。
- `scripts/build_competition_pdfs.py`：使用 ReportLab 生成署名版/匿名版参赛说明书 PDF。
- `scripts/capture_poster_screenshots.mjs`：使用 Playwright 截图。

部分 Python/Node 辅助脚本依赖没有全部写入 `package.json` 或统一 requirements 文件，使用前需要按脚本导入单独安装，例如 `funasr`、`modelscope`、`librosa`、`imageio-ffmpeg`、`numpy`、`reportlab`、`Pillow`、`playwright`，以及 `scripts/sync-news.mjs` 所需的 `mysql2`。

## 8. 前端静态资源与当前规模

当前公开资源核对结果：

- 首页小测：60 道题。
- 本地视频：`public/videos` 下 6 个 MP4，覆盖《梁祝》《红楼梦》《西厢记》《祥林嫂》《碧玉簪》《追鱼》。
- 唱段音频：`public/audio` 下 6 个 MP3，包含《天上掉下个林妹妹》《十八相送》《天生雪》《何文秀·算命》《梁祝·化蝶》《五女拜寿·奉汤》。
- 唱段分析：`public/data/classic-arias.json` 下 6 条唱段。
- 视频特征：`public/data/video-feature-analyses.json` 下 6 条视频分析，每条 180 个特征点。
- `data/media-analyses.json` 当前是单条《梁山伯与祝英台》(吴凤花·陈飞) 通用媒体分析示例。

## 9. 构建、运行与部署

前端依赖和脚本见 `package.json`：

- `npm run dev`：执行 `scripts/dev.mjs`，同时启动 Spring Boot 和 Vite，按 `RAG_ENABLED` 可选启动 Python RAG；其启动失败不影响核心服务。
- `npm run dev:web`：只启动 Vite。
- `npm run dev:spring` / `npm run dev:api` / `npm start`：启动 Spring Boot。
- `npm run build`：执行 `tsc -b && vite build`。
- `npm run lint`：执行 ESLint。

Vite 配置：

- `base: './'`
- React 插件：`@vitejs/plugin-react`
- 开发代理：`/api -> http://localhost:8080`

生产部署建议：

```text
Nginx
  ├─ 托管前端 dist/
  └─ /api/** 反向代理到 Spring Boot 127.0.0.1:8080

Spring Boot
  ├─ 读取后端环境变量
  ├─ 连接 MySQL
  ├─ 自动建表与种子数据
  └─ 代理 AI API / 提供业务接口
```

部署参考文件位于 `deploy/`：`DEPLOY.md`、`nginx-yueju.conf`、`yueju-backend.service`、`backend.env.example`。

## 10. 安全与内容治理

当前已经具备的安全措施：

- AI Key 只在服务端读取，前端不直接调用供应商接口。
- 密码加盐哈希，不明文保存。
- Token 入库前做 SHA-256 哈希，并设置 30 天有效期。
- 退出登录会删除服务端 Token。
- 需要账号身份的接口统一通过 `Authorization: Bearer <token>` 验证。
- 评论、用户名、昵称有基础内容审核。
- `ApiExceptionHandler` 统一输出 JSON 错误，避免前端解析 HTML 错误页。

仍建议补强：

- AI 接口限流、成本控制和调用审计。
- 生产环境收紧 CORS 来源。
- 评论审核与管理后台。
- Token 定期清理任务和异常登录审计。
- 将高风险 Token 存储从 `localStorage` 评估迁移到更安全的 Cookie 方案。

## 11. 当前亮点

1. 文化内容模块完整，覆盖历史、剧目、流派、舞台、新闻和搜索。
2. 经典剧目页已经从图文展示升级为多模态体验，包含视频、音频、字幕、曲线、剧情节点和练声评测。
3. AI 服务架构较稳妥：前端不暴露密钥，后端支持模型失败后的 RAG/本地兜底。
4. 用户数据闭环较完整：点赞、收藏、评论、分享、浏览历史、AI 历史都能落库。
5. 宣传材料和比赛材料生成脚本丰富，项目不只包含站点，也包含展示/交付素材生产能力。

## 12. 主要不足与维护建议

- 后台管理缺失：剧目、新闻、搜索条目、题库、评论目前主要靠代码或初始化数据维护。
- 测试体系不足：缺少系统化前端组件测试、后端接口测试和 E2E 测试。
- 前端 API 调用分散：多个页面直接使用 `fetch`，建议封装统一 API client，集中处理 Token、401、JSON 解析和错误提示。
- AI 成本保护不足：建议增加用户级限流、每日额度、失败重试策略和请求日志。
- 媒体脚本依赖未统一：建议增加 `requirements.txt` 或脚本说明，把 FunASR、librosa、imageio-ffmpeg、ReportLab、Pillow 等依赖归档。
- `AiService` 中已有聊天缓存字段和方法，但当前主流程未调用，可选择接入或删除以减少误解。
- `sync-news.mjs` 使用 `mysql2/promise`，但当前 `package.json` 未列出 `mysql2`，如果继续使用应补依赖或说明单独安装。
- 当前生产部署仍需关注视频体积、首屏性能、移动端资源加载和 CDN/缓存策略。

## 13. 结论

截至 2026-06-02，项目已经形成较完整的“越剧文化知识 + 多模态智能交互”应用：前端以 React/Vite 提供沉浸式文化体验，后端以 Spring Boot/MySQL 提供账号、内容、互动和 AI 代理能力，离线脚本以 FunASR、librosa、ffmpeg 等工具生成唱段和视频解析数据，宣传物料脚本进一步支撑比赛/展示交付。

后续如果继续推进，优先级建议为：补后台管理、统一 API client、完善测试、增强 AI 限流与内容治理、整理媒体脚本依赖、优化视频资源加载。这样项目可以从比赛展示作品进一步走向可长期维护的文化传播平台。
