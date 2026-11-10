# Spring Boot Backend

这个目录是越剧项目的 Spring Boot 后端，已统一承接内容、账号、剧目互动、个人中心与 AI 代理接口。

## 架构更新 / Architecture Update

见 [中英文架构说明](../docs/ARCHITECTURE.md)。媒体运维写接口和演示账号初始化默认关闭；CORS 使用来源白名单；错误响应保持 HTTP 状态码。测试不会运行开发数据库初始化器。

See the [bilingual architecture review](../docs/ARCHITECTURE.md). Media operator writes and demo-account seeding are opt-in. CORS uses explicit origins, HTTP error statuses are preserved, and smoke tests do not run the developer database initializer.

## 运行

在项目根目录运行（自动读取 `.env`，支持 Windows / Unix）：

```bash
npm run dev:spring
```

From the project root, the same command loads `.env`; inherited environment variables take precedence.

默认配置：

- 服务端口：`8080`
- 数据库：`web_yueju`
- 用户名：`root`
- 密码：`password`

也可以通过环境变量覆盖：

```bash
set DB_HOST=127.0.0.1
set DB_PORT=3306
set DB_USER=root
set DB_PASSWORD=password
set DB_NAME=web_yueju
set SPRING_PORT=8080
set AI_THINKING_TYPE=disabled
mvnw.cmd spring-boot:run
```

## 已实现接口

- `GET /api/health`
- `GET /api/plays`
- `GET /api/news`
- `GET /api/search?keyword=&category=`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/profile`
- `GET /api/play-interactions?playId=`
- `POST /api/play-interactions/{playId}/like`
- `POST /api/play-interactions/{playId}/collection`
- `POST /api/play-interactions/{playId}/comments`
- `POST /api/play-interactions/{playId}/share`
- `POST /api/ai/chat`
- `POST /api/ai/image`

开发环境下，Vite 将 `/api/**` 代理到 Spring Boot，默认端口 `8080`，可通过 `SPRING_PORT` 同步调整。
