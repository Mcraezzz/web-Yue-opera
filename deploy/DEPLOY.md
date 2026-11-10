# Yueju Deployment

This project is intended to run as:

- Nginx serves the frontend `dist`.
- Nginx proxies `/api/**` to Spring Boot on `127.0.0.1:8080`.
- Spring Boot connects to MySQL.

## Server Paths

Recommended paths:

```bash
/var/www/yueju
/opt/yueju
```

## 1. Install Runtime

On Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y nginx mysql-server openjdk-21-jre
```

## 2. Create MySQL Database

```sql
CREATE DATABASE web_yueju CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'yueju'@'%' IDENTIFIED BY 'replace-with-strong-password';
GRANT ALL PRIVILEGES ON web_yueju.* TO 'yueju'@'%';
FLUSH PRIVILEGES;
```

## 3. Upload Files

Copy frontend build files:

```bash
sudo mkdir -p /var/www/yueju
sudo cp -r dist/* /var/www/yueju/
```

Build with `./mvnw package` in `backend-spring/` first (Windows: `.\mvnw.cmd package`). From the project root, copy the backend jar and environment template:

```bash
sudo mkdir -p /opt/yueju
sudo cp backend-spring/target/backend-spring-0.0.1-SNAPSHOT.jar /opt/yueju/backend-spring.jar
sudo cp deploy/backend.env.example /opt/yueju/.env
sudo nano /opt/yueju/.env
```

Fill `.env` with real DB password and server-side AI API key.

## 4. Start Backend With systemd

```bash
sudo cp deploy/yueju-backend.service /etc/systemd/system/yueju.service
sudo systemctl daemon-reload
sudo systemctl enable --now yueju
sudo systemctl status yueju
```

Backend health check:

```bash
curl http://127.0.0.1:8080/api/health
```

## 5. Configure Nginx

```bash
sudo cp deploy/nginx-yueju.conf /etc/nginx/sites-available/yueju.conf
sudo nano /etc/nginx/sites-available/yueju.conf
sudo ln -s /etc/nginx/sites-available/yueju.conf /etc/nginx/sites-enabled/yueju.conf
sudo nginx -t
sudo systemctl reload nginx
```

Replace `example.com` with your real domain.

## 6. HTTPS

After DNS points to the server:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d example.com -d www.example.com
```

## Frontend API Address

The frontend uses relative API paths such as `/api/plays` and `/api/ai/chat`.
No frontend code change is needed when Nginx proxies `/api/` to Spring Boot.


## Architecture Configuration (2026-11-10)

See [ARCHITECTURE.md](../docs/ARCHITECTURE.md) for Chinese and English details.

- Keep `MEDIA_LOCAL_ANALYSIS_ENABLED=false` on public deployments unless the operator endpoint is deliberately required. Enabling it requires a separate `MEDIA_OPERATOR_KEY` of at least 32 characters and the `X-Media-Operator-Key` header. Never bundle this key into frontend code.
- `DEMO_ENABLED=false` prevents new demo accounts; it does not remove existing accounts or rotate their passwords/tokens. Existing installations need a separate account review.
- The same-origin Nginx template uses an empty `CORS_ALLOWED_ORIGINS`. If a separate frontend origin calls the backend directly, list that complete origin explicitly.
- API proxy buffering is disabled for streamed AI output; `proxy_read_timeout` is 300 seconds. Validate changes with `nginx -t` before reloading.
- RAG is optional and disabled in the example. Provision its models, dependencies, and service separately before setting `RAG_ENABLED=true`.
- The repository update does not deploy or restart an existing server.
