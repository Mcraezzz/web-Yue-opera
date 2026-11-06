# 越韵清音

> 模型权重和全剧视频按项目所有者要求单独保存，恢复方法见 [大文件恢复说明](docs/LARGE_ASSETS.md)。PSD 和设计输出 PNG 使用 Git LFS，克隆后请执行 `git lfs pull`。

“越韵清音”是一个以越剧文化传播为主题的前后端 Web 项目，完整名称为“越韵清音—越剧文化知识与多模态智能交互平台”。项目采用 React + Vite 构建前端，Spring Boot + MySQL 提供后端 API，并接入火山方舟兼容接口、FunASR、librosa、ffmpeg 等工具，形成越剧知识展示、剧目互动、AI 问答/识图/生图和音视频智能解析的一体化体验。

线上访问地址：http://8.148.250.84/

## 当前功能

- 首页：沉浸式越剧文化入口、历史节点、经典剧目/流派/台前幕后入口、AI 入口、今日戏单和越剧小测。
- 越剧小测：题库位于 `src/data/yuejuQuiz.ts`，当前 60 题，每次随机抽取 10 题并即时显示答案解析。
- 越剧长卷：用时间线展示越剧起源、男班、女班、进入上海、新越剧改革等发展脉络。
- 经典剧目：从 `/api/plays` 读取 6 个代表剧目，支持本地视频播放、点赞、收藏、评论、分享和浏览历史。
- 经典唱段：`public/data/classic-arias.json` 当前包含 6 条唱段音频，展示同步唱词、关键词、剧情/流派/技巧说明、情绪曲线和能量柱状图。
- 视频智能曲线：`public/data/video-feature-analyses.json` 当前覆盖 6 个本地全剧视频，每个视频约 180 个特征点，可随播放器进度展示音高、节奏、能量和情绪曲线。
- 用户唱段练习：在经典剧目页上传个人音频，前端用 Web Audio API 本地生成音高、能量、情绪曲线，并可与目标唱段进行相似度评分。
- 名家流派：展示越剧流派、代表艺术家和艺术特色。
- 台前幕后：以翻转卡片、热点和详情板块展示服饰、头面、妆容、布景、排练、乐队等舞台系统。
- 新闻资讯：从 `/api/news` 读取新闻条目，点击新闻时可写入浏览历史。
- 全站搜索：通过 `/api/search` 使用站内知识检索，支持剧目、新闻、流派、演员、历史、唱腔、舞台、服饰、视频等分类。
- AI 入戏：包含 AI 问戏、图片识别和 AI 造梦工坊；登录后保存 AI 对话和生图历史。
- 账号系统：支持注册、登录、退出、跨标签页状态同步，个人中心展示点赞、收藏、评论和浏览历史。

## 技术栈

- 前端：React 19、React Router HashRouter、TypeScript、Vite、react-icons、原生 CSS。
- 后端：Java 21、Spring Boot 4.0.6、Spring Web MVC、Spring JDBC、Spring Validation、Jackson、MySQL Connector/J。
- 数据库：MySQL，启动时由 `DatabaseInitializer` 自动建表并写入演示数据。
- AI 服务：火山方舟兼容 API，默认模型为 `doubao-seed-2-0-lite-260428`，默认通过 `AI_THINKING_TYPE=disabled` 关闭深度思考以提升响应速度，生图模型为 `doubao-seedream-5-0-260128`。
- 音视频分析：FunASR paraformer-zh 关键词辅助、librosa 音频特征、ffmpeg/imageio-ffmpeg 音频抽取，另预留 Whisper、WhisperX、CosyVoice 路线。
- 设计与材料生成：Pillow、ReportLab、Playwright，用于易拉宝、简介图、截图和参赛说明书生成。

## 目录结构

```text
.
├─ src/                         # React 前端源码
│  ├─ components/               # Layout、Navbar、AuthModal、ChatWidget
│  ├─ pages/                    # 首页、长卷、剧目、流派、新闻、AI、搜索、个人中心等页面
│  ├─ hooks/                    # AI 与浏览历史相关 Hook
│  ├─ data/                     # 首页小测题库
│  └─ assets/                   # 页面图片与 AI 生成图
├─ backend-spring/              # Spring Boot 后端
│  └─ src/main/java/com/yueju/backend/
│     ├─ controller/            # REST API 控制器
│     ├─ service/               # 认证、内容、互动、AI、搜索、媒体分析服务
│     ├─ dto/                   # 接口 DTO
│     └─ config/                # CORS 配置
├─ public/
│  ├─ data/                     # 前端直接读取的唱段/视频分析 JSON
│  ├─ audio/                    # 经典唱段音频
│  └─ videos/                   # 本地全剧视频
├─ data/                        # 离线生成的分析数据
├─ scripts/                     # 开发启动、媒体分析、资产/物料生成脚本
├─ docs/                        # 媒体智能化方案与比赛材料
├─ deploy/                      # Nginx、systemd、服务器部署说明
├─ design_input/                # 宣传物料输入模板
├─ design_output/               # 宣传图、易拉宝、截图等输出
├─ package.json                 # 前端脚本与依赖
├─ vite.config.ts               # Vite 配置与 /api 开发代理
├─ README.md
└─ PROJECT_REPORT.md
```

## 本地运行

安装 Node.js、Java 21 和 MySQL，创建数据库：

```sql
CREATE DATABASE web_yueju DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

复制并填写环境变量：

```powershell
Copy-Item .env.example .env
```

`.env` 中至少需要配置 MySQL 连接信息；如需使用 AI 问答、识图和生图，还需填写 `VOLCENGINE_API_KEY`。真实密钥只应保存在服务端环境变量中。

安装依赖并启动：

```powershell
npm install
npm run dev
```

也可以分开启动：

```powershell
npm run dev:web
npm run dev:spring
```

默认地址：

- 前端：http://localhost:5173
- 后端：http://localhost:8080
- 开发代理：Vite 会将 `/api` 转发到 `http://localhost:8080`

## 常用命令

```powershell
npm run dev        # 同时启动 Vite 和 Spring Boot
npm run dev:web    # 只启动前端
npm run dev:spring # 只启动后端
npm run build      # TypeScript 检查并构建前端
npm run lint       # ESLint 检查
npm run preview    # 预览前端构建产物
```

后端打包：

```powershell
cd backend-spring
.\mvnw.cmd -DskipTests package
```

常用检查：

```bash
curl http://127.0.0.1:8080/api/health
curl -X POST http://127.0.0.1:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"123456"}'
```

## AI 与媒体数据

- AI 问答接口：`POST /api/ai/chat`、`POST /api/ai/chat/stream`
- AI 识图接口：`POST /api/ai/chat/vision`
- AI 生图接口：`POST /api/ai/image`
- AI 历史接口：`/api/ai/chat/history`、`/api/ai/image/history`
- 媒体分析接口：`GET /api/media-analyses`、`POST /api/media-analyses/analyze-local`
- 前端唱段数据：`public/data/classic-arias.json`
- 前端视频特征：`public/data/video-feature-analyses.json`

媒体分析脚本集中在 `scripts/`：

- `build-classic-arias.py`：截取 6 条唱段音频，生成唱词、关键词和 librosa 曲线数据。
- `curate-classic-aria-captions.py`：校订唱段字幕，标注 FunASR 仅用于关键词辅助。
- `analyze-yueju-video-features.py`：分析 6 个本地视频，生成 180 点全片特征曲线。
- `enrich-video-plot-nodes.py`：为视频曲线补充剧情节点。
- `generate-media-analysis.py`：通用媒体分析脚本，支持 media-only、FunASR、Whisper、WhisperX、transcript-only。
- `generate-yueju-assets.mjs`：调用火山方舟生图接口批量生成站内图片资产。

## 数据持久化与认证

后端启动时自动创建以下主要表：

- `users`、`auth_tokens`
- `plays`、`news`、`search_items`
- `play_likes`、`play_collections`、`play_comments`、`play_shares`
- `ai_chat_messages`、`ai_image_generations`
- `browsing_history`

认证方式为数据库持久化 Token，不是 JWT。Token 原文保存在浏览器 `localStorage.yueju_token` 中，数据库只保存 SHA-256 哈希；密码使用 PBKDF2WithHmacSHA512、16 字节 salt、100000 次迭代和 512 bit 输出。用户名、昵称和评论会经过基础内容审核，过滤保留名、HTML、推广链接和部分敏感词。

## 部署提示

推荐生产环境由 Nginx 托管前端 `dist/`，并将 `/api` 反向代理到 Spring Boot `127.0.0.1:8080`。部署参考位于 `deploy/`：

- `deploy/DEPLOY.md`
- `deploy/nginx-yueju.conf`
- `deploy/yueju-backend.service`
- `deploy/backend.env.example`

部署包与构建产物目录如 `dist/`、`yueju-deploy-package/`、`node_modules/`、日志文件、调试浏览器 profile 和 `tmp/` 不属于核心源码，维护时应避免把它们当作业务代码修改。
