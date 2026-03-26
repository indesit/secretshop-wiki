# HANDOFF

## Контекст
Сесія була довга й технічна: документація, домен, Caddy, логотип, Authelia. Автокомпакція контексту падала по таймауту, тому цей handoff фіксує стан для продовження з нового чату.

## Уже зроблено

### 1. Wiki / docs
- Раніше в репозиторії вже було завершено великий блок по VitePress wiki:
  - автогенерація sidebar через `scripts/generate-sidebar.mjs`
  - автогенерація curated index pages через `scripts/generate-indexes.mjs`
  - стандартизація `DocumentMeta`, `RelatedDocuments`, `RoleCard`, `DecisionRule`
  - оформлено розділи `returns-and-warranty` та `cash/cash-discipline`
- Додано лого на головну сторінку:
  - файл: `docs/public/img/secretshop-logo.jpg`
  - підключення: `docs/index.md`
- Коміт:
  - `9313294` — `style(docs): add logo to home page`

### 2. Домен і Caddy
- DNS для `wiki.secretshop.ua` спочатку був `NXDOMAIN`, потім почав резолвитись на сервер.
- `Caddy` встановлено вручну користувачем на сервері, бо у цій Telegram-сесії недоступні elevated-команди.
- Поточний `Caddyfile` був спрощений до двох vhost'ів без auth, щоб відновити робочий стан.
- Після виправлення `Caddyfile`:
  - `caddy validate --config /etc/caddy/Caddyfile` → `Valid configuration`
  - `systemctl restart caddy` → успішно
- `https://wiki.secretshop.ua` повертає `HTTP/2 200`.

### 3. VitePress host allowlist
- Було виправлено помилку:
  - `Blocked request. This host ("wiki.secretshop.ua") is not allowed.`
- У `docs/.vitepress/config.ts` додано:
  - `vite.server.allowedHosts = ['wiki.secretshop.ua']`
- Коміт:
  - `01ab228` — `fix(docs): allow wiki domain host for vitepress dev`

### 4. Authelia
- Обрано стек `Authelia + Caddy`.
- Docker на сервері довелося встановлювати окремо; спочатку були проблеми з пакетами compose.
- Користувач згенерував принаймні один Argon2 hash для користувача/адміна через:
  - `docker run --rm authelia/authelia:latest authelia crypto hash generate argon2 --password '...'`
- Була проблема з `docker-compose.yml`: shell/копіпаста ламали YAML-відступи.
- На момент останнього підтвердження користувач написав `успіх`, тобто YAML було виправлено настільки, що можна було рухатись далі.

## Важливі технічні деталі

### Поточний стан wiki
- `ss -ltnp | egrep ':5173 |:5173$'` показував, що dev-server слухає `0.0.0.0:5173`.
- `curl -I http://127.0.0.1:5173` → `HTTP/1.1 200 OK`
- `curl -I https://wiki.secretshop.ua` → `HTTP/2 200`

### Поточний стан Caddy
У робочому мінімальному варіанті `Caddyfile` має сенс бути таким:

```caddy
auth.secretshop.ua {
    reverse_proxy 127.0.0.1:9091
}

wiki.secretshop.ua {
    reverse_proxy 127.0.0.1:5173
}
```

Через попередні проблеми з копіпастою важливо пам'ятати:
- не вставляти в сам файл literal shell-команди типу `cat > /etc/caddy/Caddyfile <<'EOF'`
- безпечніше записувати через `printf '%s\n' ... > /etc/caddy/Caddyfile`

## Що лишилось зробити

### Пріоритет 1 — оживити Authelia
Треба перевірити:
```bash
cd /opt/wiki-auth
docker compose ps
docker compose logs --tail=100
ss -ltnp | egrep ':9091 |:9091$' || true
curl -I http://127.0.0.1:9091
curl -I https://auth.secretshop.ua
```

Мета:
- контейнер `authelia` має бути `Up`
- порт `9091` має слухати localhost
- `auth.secretshop.ua` має перестати віддавати `502`

### Пріоритет 2 — підключити auth до wiki
Після того як `auth.secretshop.ua` оживе, повернутись до Caddy auth integration.

Попередньо планувався такий варіант:

```caddy
auth.secretshop.ua {
    reverse_proxy 127.0.0.1:9091
}

wiki.secretshop.ua {
    forward_auth 127.0.0.1:9091 {
        uri /api/authz/forward-auth
        copy_headers Remote-User Remote-Groups Remote-Email Remote-Name
    }

    reverse_proxy 127.0.0.1:5173
}
```

Але цей блок **ще не вмикали фінально**, бо спершу треба довести до ладу саму Authelia.

### Пріоритет 3 — role-based access
Бізнес-вимога:
- неавторизований користувач не має доступу до wiki
- мінімум 2 ролі:
  - `admins`
  - `users`
- окрема гілка/секція wiki має бути доступна тільки admin'ам

Рекомендований підхід:
- path-based доступ, наприклад `/admin/`
- `users` бачать звичайну wiki
- `admins` бачать усе, включно з `/admin/`

## Зафіксовані проблеми / lessons learned
- У цьому оточенні elevated exec недоступний із Telegram-сесії, тому системні команди користувач запускає сам на сервері.
- Копіпаста heredoc-команд через чат кілька разів ламала YAML і Caddyfile.
- Для текстових конфігів у подальших кроках краще:
  - або давати дуже короткі команди,
  - або використовувати `printf '%s\n'`,
  - або просити користувача редагувати файли через `nano` з чітким контрольним виводом.

## Корисні перевірки
```bash
# wiki backend
ss -ltnp | egrep ':5173 |:5173$' || true
curl -I http://127.0.0.1:5173
curl -I https://wiki.secretshop.ua

# authelia backend
cd /opt/wiki-auth
docker compose ps
docker compose logs --tail=100
ss -ltnp | egrep ':9091 |:9091$' || true
curl -I http://127.0.0.1:9091
curl -I https://auth.secretshop.ua

# caddy
caddy validate --config /etc/caddy/Caddyfile
systemctl status caddy --no-pager
journalctl -u caddy -n 100 --no-pager
```
