# Spring Boot Backend

这个目录是越剧项目的 Spring Boot 后端，已统一承接内容、账号、剧目互动、个人中心与 AI 代理接口。

## 运行

```bash
cd backend-spring
mvnw.cmd spring-boot:run
```

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

开发环境下，Vite 已配置为把所有 `/api/**` 请求代理到 Spring Boot `8080`。
