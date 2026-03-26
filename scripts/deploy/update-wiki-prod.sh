#!/usr/bin/env bash
set -euo pipefail

# секретшоп wiki: оновлення коду + збірка статичного dist
# запускається від root (systemd timer) або вручну

REPO_DIR="/root/company-wiki"
BRANCH="main"

cd "$REPO_DIR"

# 1) оновити код
if [ ! -d .git ]; then
  echo "ERROR: $REPO_DIR is not a git repo" >&2
  exit 1
fi

git fetch --prune origin
# максимально детерміновано: рівно як в origin/main
# (якщо потрібні локальні зміни — робіть через гілки/PR, не на сервері)
git reset --hard "origin/${BRANCH}"

echo "[wiki] commit: $(git rev-parse --short HEAD)"

# 2) залежності
# (для vitepress build потрібні devDependencies)
npm ci

# 3) зібрати
npm run build

# 4) опційно: перевірки (можна увімкнути пізніше)
# npm run validate

# 5) caddy reload (не обов'язково, але корисно якщо мінявся Caddyfile)
if command -v systemctl >/dev/null 2>&1; then
  systemctl reload caddy >/dev/null 2>&1 || true
fi

echo "[wiki] build done: $REPO_DIR/dist"
