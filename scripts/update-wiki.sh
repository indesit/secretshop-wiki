#!/bin/bash
# LEGACY dev-mode updater: git pull для vitepress dev. Викликається з crontab
# щохвилини (див. `crontab -l`, лог: update.log). Цільовий prod-шлях —
# scripts/deploy/update-wiki-prod.sh + systemd timer (ops/PROD_DEPLOY_AUTOMATION.md,
# backlog B-30). Не видаляти, поки cron не переведено на prod-скрипт.

# Переходимо в папку проекту
cd /root/company-wiki || exit

# Отримуємо зміни з GitHub
# Використовуємо --no-rebase щоб уникнути конфліктів у разі випадкових локальних змін
git pull origin main --no-rebase -q

# Оскільки VitePress в режимі dev автоматично підхоплює зміни файлів,
# перезавантажувати сервер не обов'язково.
# Але якщо були змінені залежності (package.json), можна додати npm install.
# npm install -q
