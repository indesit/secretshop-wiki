# Prod deploy automation (VPS) — wiki.secretshop.ua

Цей документ описує, як перевести `wiki.secretshop.ua` з dev-сервера (`vitepress dev`) на **production static hosting** і зробити **автоматичний деплой** з GitHub.

## Цільова архітектура
- `wiki.secretshop.ua` → **Caddy** → роздача статичного `/root/company-wiki/dist`
- Оновлення `dist` робить systemd timer, який:
  - `git fetch/reset --hard origin/main`
  - `npm ci`
  - `npm run build`

> Примітка: авторизацію (Authelia) додаємо окремо після стабілізації прод-режиму.

---

## 1) Caddy: перейти на static `dist`

`/etc/caddy/Caddyfile` (мінімальний):

```caddy
wiki.secretshop.ua {
    root * /root/company-wiki/dist
    file_server
}
```

Перевірка/перезапуск:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl restart caddy
curl -I https://wiki.secretshop.ua
```

---

## 2) Деплой-скрипт (в репозиторії)

Скрипт: `scripts/deploy/update-wiki-prod.sh`

Ручний запуск для тесту:

```bash
bash /root/company-wiki/scripts/deploy/update-wiki-prod.sh
```

---

## 3) systemd service + timer (автодеплой кожні N хвилин)

### Файл сервісу
`/etc/systemd/system/secretshop-wiki-update.service`

```ini
[Unit]
Description=SecretShop Wiki - update + build static site
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=/root/company-wiki
ExecStart=/usr/bin/env bash /root/company-wiki/scripts/deploy/update-wiki-prod.sh

# Безпека (мінімум, можна посилити пізніше)
User=root
Group=root

[Install]
WantedBy=multi-user.target
```

### Файл таймера
`/etc/systemd/system/secretshop-wiki-update.timer`

```ini
[Unit]
Description=SecretShop Wiki - periodic update

[Timer]
OnBootSec=2m
OnUnitActiveSec=5m
Persistent=true

[Install]
WantedBy=timers.target
```

Увімкнути:

```bash
systemctl daemon-reload
systemctl enable --now secretshop-wiki-update.timer
systemctl list-timers --all | grep secretshop-wiki
```

Подивитись лог:

```bash
journalctl -u secretshop-wiki-update.service -n 200 --no-pager
```

---

## 4) Тригер «деплой одразу після push» (опційно)

Найкраще — GitHub Actions → SSH deploy (або webhook), але якщо хочеться максимально просто без секретів у GitHub, то timer раз на 1–5 хвилин зазвичай достатній.

Якщо треба саме push-trigger — зробимо окремо (з deploy key + GitHub Actions).
