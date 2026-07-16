# Post-migration audit: Outline — звіт про виконання

**Статус: ЗАКРИТО** — 2026-04-27

---

## Що було зроблено

### 1. Секрети та конфігурація (ЗАКРИТО)

- `.gitignore` розширено: `*.env`, `!*.env.example` — `outline.env` і `scripts/ai-agent/.env` більше не потраплять у репо.
- `ops/outline/outline.env.example` створено з усіма ключами і підказками.
- `ops/outline/docker-compose.yml` очищено від хардкод-паролів (`outline_password`, `minioadmin`): `postgres` і `minio` читають `POSTGRES_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` з `env_file: ./outline.env`.
- **Дія, що залишилася**: ротувати `OUTLINE_API_TOKEN` в `outline.env` і `TELEGRAM_BOT_TOKEN` в `scripts/ai-agent/.env` — вони були прочитані в межах сесії.

### 2. Подвійні заголовки H1 (ЗАКРИТО)

**Проблема**: Outline рендерить `title` як H1 сторінки; всі 91 документ мали `# H1` в body → подвійний заголовок у UI.

**Рішення**: додано `deduplicateH1(content, fmTitle)` у `scripts/outline/cleaners.mjs`.
Логіка: якщо перший `# H1` у body збігається з `title` з frontmatter — видаляється при публікації. Різний H1 (навмисний) зберігається. Функція викликається в обох шляхах: `cleanForOutline` і `enhanceForOutline`.

### 3. Назви колекцій — мова (ЗАКРИТО)

**Проблема**: Назви колекцій були російською (`Касса`, `Компания`, `Отдел кадров` тощо) у трьох файлах.

**Рішення**:
- Єдиний canonical словник `COLLECTION_MAP` винесено в `cleaners.mjs` + `defaultCollectionForCanonicalPath()` — один рядок правди.
- `publish.mjs` і `sync.mjs` імпортують функцію, власні копії прибрано.
- `migrate_to_outline.cjs` оновлено безпосередньо (CJS, не імпортує ESM).
- Нові назви (українська): Каса, Компанія, Глосарій, HR, Товар, Повернення та гарантія, Продажі, Магазини, Шаблони.

> **Важливо**: якщо в Outline вже існують колекції зі старими російськими назвами, `ensureCollectionByName` створить нові колекції з українськими назвами замість оновлення старих. Перед наступним повним синком перейменуй колекції в Outline UI вручну відповідно до нового `COLLECTION_MAP`, або запусти `sync.mjs --dry-run` і переглянь список.

### 4. VitePress-компоненти — артефакти (ЗАКРИТО ще до аудиту)

`cleaners.mjs` вже містив повний набір трансформерів:
- `convertRoleCards` → `### title — subtitle`
- `convertEscalationBoxes` → `> emoji **title**`
- `convertDecisionRules` → `> **title** → verdict`
- `removeDocumentMeta`, `removeRelatedDocuments`, `removeIconComponents`
- `convertGithubAlerts` (`[!WARNING]` → `> **WARNING:**`)
- `removeRemainingSelfClosingTags` (PascalCase catch-all)

Всі трансформери активні в обох pipeline (`cleanForOutline` і `enhanceForOutline`).

### 5. Внутрішні посилання (ВІДКРИТЕ — не автоматизовано)

Relative links (`./foo.md`, `/stores/bar`) у Markdown після публікації в Outline стають broken — Outline не розуміє VitePress-шляхи. `buildRelatedLinks` у `cleaners.mjs` конвертує `related_documents` у `[[slug]]` Outline wiki-links, але inline-посилання в body не трансформуються.

**Практичний план**:
- Для нових документів: ставити `related_documents` у frontmatter — вони конвертуються автоматично.
- Для inline-посилань: масова заміна потребує маппінгу `VitePress-path → Outline document UUID`. Це реалістично тільки після повного синку через API (`documents.list` по всіх колекціях → побудова мапи).
- Для поточного стану: Outline — consumption layer, не editing layer. Broken links в Outline не блокують роботу з repo.

### 6. Governance-метадані після відмови від frontmatter (ВИРІШЕНО АРХІТЕКТУРНО)

`extractMetadataTable` і `enhanceForOutline` рендерять ключові поля frontmatter у markdown-таблицю на початку документа:

```
| Параметр | Значення |
|----------|----------|
| Статус | approved |
| Власник | founders |
| Цикл перегляду (днів) | 365 |
```

Плюс footer-таблиця з canonical_path і датою. Це достатньо для читання governance-стану без прямого доступу до frontmatter.

**Що НЕ підтримується в Outline**: редагування через Outline не оновлює frontmatter у repo (repo-first doctrine — це навмисне обмеження).

### 7. Outline deployment quality

Поточний стан після виправлень:

| Компонент | Стан |
|---|---|
| docker-compose.yml | ✅ Без хардкод-секретів |
| outline.env | ✅ Покритий .gitignore; є .env.example |
| MinIO storage | ✅ Credentials з env_file |
| Reverse proxy (Caddy) | ✅ Налаштований, wiki.secretshop.ua |
| Auth (Authelia OIDC) | ⚠️ Конфіг є, але активація не підтверджена |
| Role-based access | ⚠️ Authelia — окрема гілка робіт (archive/HANDOFF.md) |
| API token ротація | ❗ Потребує ручної дії |

---

## Залишкові дії (не автоматизовані)

1. **Ротувати токени**: `OUTLINE_API_TOKEN` у `outline.env`, `TELEGRAM_BOT_TOKEN` у `scripts/ai-agent/.env`.
2. **Перейменувати колекції в Outline UI**: привести у відповідність до нового `COLLECTION_MAP` перед наступним повним синком.
3. **Активувати Authelia**: окрема задача, описана в `archive/HANDOFF.md`.
4. **Inline-link mapper**: після повного синку побудувати UUID-маппінг для конвертації VitePress-посилань → Outline wiki-links (P3, не блокує поточну роботу).
