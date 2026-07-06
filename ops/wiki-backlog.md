# Secret Shop Wiki — Backlog

Дата створення: 2026-06-08
Джерело: аудит проєкту (мета, стек, документація, вектор розвитку).
Принцип: цей файл — **єдина точка трекінгу** робіт по wiki. Repo = canonical. Оновлювати статуси прямо тут.

## Легенда

- **Пріоритет:** `P0` (критично/блокер) · `P1` (важливо) · `P2` (бажано).
- **Трек:** `GOV` governance · `QA` якість/автоматизація · `CONTENT` наповнення · `OPS` інфраструктура.
- **Статус:** `todo` · `in-progress` · `done` · `blocked` (чекає рішення власника/Макса).
- **Owner:** хто закриває (для бізнес-рішень — `founders` / `Макс`; для технічного — `wiki-eng`).

## Поточний стан (факти на 2026-06-08)

- **69 документів** у `status: draft`, 67 з `approval_required: true` — майже вся wiki не затверджена.
- **115 TODO** у `docs/`: легітимні плейсхолдери в `docs/templates/*` (за дизайном) + реальний content-debt у доках.
- **15 index-секцій** містили службовий маркер `<!-- TODO: add document list table -->`; з них **13 порожні** (немає документів), **2** мають по 1 документу.
- **18 відкритих бізнес-питань** (приймання / залишки / недостачі) — див. EPIC-CONTENT, перенесено з `ops/HANDOFF-2026-06-05-wiki-team.md`.

---

## EPIC-QA — Якість та автоматизація (технічний трек, у роботі)

| ID | P | Статус | Owner | Опис | Файли / acceptance |
|----|---|--------|-------|------|--------------------|
| B-10 | P1 | done | wiki-eng | Генератор індексів: явний allowlist + прибирання маркера `<!-- TODO: add document list table -->`; згенеровано таблиці для 2 секцій з документами, знято маркер у 13 порожніх; куровані сторінки (`company`, `cash-discipline`) недоторкані; ідемпотентно. Виправлено баг парсера YAML block-scalar (`title: >-`) | [scripts/generate-indexes.mjs](../scripts/generate-indexes.mjs); 15 `docs/**/index.md` |
| B-11 | P1 | done | wiki-eng | CI link-checker + TODO-budget (баз. 89). Link-checker одразу знайшов і виправлено 1 биту лінку (`reg-secret-shop-history.md`) | `scripts/check-links.mjs`, `scripts/check-todo-budget.mjs`; крок у [.github/workflows/validate.yml](../.github/workflows/validate.yml); `npm run check` |
| B-12 | P1 | todo | wiki-eng | AI-пошук: замінити keyword-retrieval на embeddings RAG (build-time індекс), кратний приріст релевантності на українській | [scripts/ai-api.mjs](../scripts/ai-api.mjs), [docs/.vitepress/theme/components/AISearch.vue](../docs/.vitepress/theme/components/AISearch.vue) |
| B-13 | P2 | todo | wiki-eng | Уніфікувати LLM-провайдера за однією абстракцією (Claude основний; Gemini/Ollama опційні через конфіг) | `scripts/ai-api.mjs`, `scripts/ai-agent/bot.py` |
| B-14 | P2 | todo | wiki-eng | Логувати запити AISearch без впевненої відповіді → авто-backlog тем для копірайтера (data-driven контент-план) | `scripts/ai-api.mjs` → цей файл |
| B-16 | P1 | done | wiki-eng | Outline: усунено дублі в меню. `index.md` не публікується; reconcile перенаповнив 9 укр. колекцій (68 доків); cleanup видалив 54 index-доки + 9 застарілих рос. колекцій (+Welcome). Фінал: 10 валідних колекцій, 0 stale, 0 index-доків. Скрипти отримали rate-limit retry+throttle і стійкість до помилок | `scripts/outline/*` |
| B-17 | P1 | todo | wiki-eng | Outline: інлайн-крос-лінки в справжніх доках биті. ~25 доків мають `[текст](/domain/.../slug)` у секціях «Суміжні документи»; cleaners їх не переписує → в Outline рендеряться як биті URL. Те саме стосується `[[slug]]`-блоку, який генерує `buildRelatedLinks` (Outline не підтримує wikilink-синтаксис). Треба двопрохідний rewrite canonical-path → Outline doc URL (мапа будується під час reconcile) або деградація до тексту | [cleaners.mjs](../scripts/outline/cleaners.mjs), [reconcile.mjs](../scripts/outline/reconcile.mjs); приклади: `sop-technical-incident.md:110-111`, `reg-birthday-customer-communication.md:203-205` |
| B-18 | P1 | done | wiki-eng | Аудит 2026-07-07: sync.mjs мав стару 1-арг дедуплікацію (створював дублі) і не мав 429-retry/throttle → всі 4 Outline-скрипти переведено на єдиний клієнт `api.mjs`; видалено легасі (`migrate_to_outline.cjs`, `clean_outline.cjs`, `cleanup_docs.mjs` + deps glob/gray-matter); env-приклади злито в один `outline.env.example`; skill-шаблони приведено до frontmatter-схеми (`last_reviewed`, `source_of_truth: ai-draft`); валідатор перевіряє `domain`; README/AGENT_INSTRUCTIONS оновлено, skill оголошено каноном | [api.mjs](../scripts/outline/api.mjs), `scripts/outline/*`, `skills/company-wiki/*` |

## EPIC-GOV — Governance та затвердження

| ID | P | Статус | Owner | Опис | Файли / acceptance |
|----|---|--------|-------|------|--------------------|
| B-01 | P0 | blocked | founders | Пройти 69 draft-документів; готові → `status: approved`. Потрібне рішення власника, які саме готові | `grep -rl "status: draft" docs/` (69 файлів) |
| B-02 | P1 | blocked | founders | Заповнити порожній `mission-and-principles.md` (не вигадувати — текст від власника) | [docs/company/mission-and-principles.md](../docs/company/mission-and-principles.md) |
| B-03 | P1 | blocked | founders | Призначити фінального approver на кожен тип документа (хто підписує policy/sop/reg) | [docs/company/roles-and-responsibilities.md](../docs/company/roles-and-responsibilities.md) |
| B-04 | P1 | todo | wiki-eng | Затвердити wiki-governance доки після рев'ю власника (`policy-wiki-agent-team-operating-principles`, `sop-case-to-wiki-workflow`) | [docs/company/wiki/](../docs/company/wiki/) |

## EPIC-CONTENT — Наповнення та content-debt

| ID | P | Статус | Owner | Опис | Файли / acceptance |
|----|---|--------|-------|------|--------------------|
| B-20 | P0 | blocked | Макс | Недостачі/лишки: поріг «значної» розбіжності (грн), хто затверджує коригування, формат акту, матеріальна відповідальність | [sop-shortage-overage-handling.md](../docs/product/shortage-overage/sop-shortage-overage-handling.md) (рядки 72, 94, 128) |
| B-21 | P0 | blocked | Макс | Приймання товару: хто відповідає, який документ 1C/BAF, строк перевірки, фіксація розбіжностей | [sop-goods-receiving.md](../docs/product/receiving/sop-goods-receiving.md), [receiving/index.md](../docs/product/receiving/index.md) |
| B-22 | P0 | blocked | Макс | Контроль залишків: канонічна система (1C/BAF), хто має право міняти, частота звірки, строки закриття переміщень | [reg-stock-balance-control.md](../docs/product/stock-balance/reg-stock-balance-control.md) |
| B-23 | P1 | blocked | founders | Sales-комунікації: owner і фінальна верифікація дашборду; вікно таймінгу; сценарії «друга покупка» і «реактивація» | [reg-bonus-expiration](../docs/sales/customer-communication/reg-bonus-expiration-customer-communication.md), [reg-segmented](../docs/sales/customer-communication/reg-segmented-customer-communication.md) |
| B-24 | P1 | blocked | stores-operations | Магазинні факти: коди сигналізації, локації вогнегасників, перелік обладнання, контакти сервісних служб | [sop-opening-closing.md](../docs/stores/opening-closing/sop-opening-closing.md), [sop-technical-incident.md](../docs/stores/technical-issues/sop-technical-incident.md), [checklist-safety-opening-closing.md](../docs/stores/safety-security/checklist-safety-opening-closing.md) |
| B-25 | P1 | blocked | hr-team | Onboarding: перелік документів для підпису (трудовий, NDA), лінк на касовий SOP | [sop-onboarding-first-week.md](../docs/hr/onboarding/sop-onboarding-first-week.md) |
| B-26 | P2 | todo | wikiwriter | Наповнити 13 порожніх секцій документами (зараз лише index із NOTE «в стадії наповнення») | `cash/cash-incidents`, `hr/{hiring,motivation,standards,training}`, `product/{assortment,writeoff}`, `sales/{consultation,orders,reservations,special-cases,upsell}`, `stores/merchandising` |

## EPIC-OPS — Інфраструктура

| ID | P | Статус | Owner | Опис | Файли / acceptance |
|----|---|--------|-------|------|--------------------|
| B-30 | P1 | blocked | founders | Обрати єдиний prod-шлях: GitHub Pages **або** Caddy+systemd (зараз обидва ребілдять паралельно). Факт 2026-07-07: systemd-timer з `PROD_DEPLOY_AUTOMATION.md` НЕ встановлено; активний cron-пул `scripts/update-wiki.sh` щохвилини (dev-режим) | [.github/workflows/deploy.yml](../.github/workflows/deploy.yml), `scripts/deploy/` |
| B-31 | P1 | todo | wiki-eng | Винести секрети з `.env` (GEMINI/OUTLINE/TELEGRAM) у systemd-credentials або vault; усі ключі — в `.env.example` | `ops/outline/outline.env.example`, `.env.example` |
| B-32 | P2 | todo | wiki-eng | Review-цикли: scheduled-нагадування про застарілі доки за `review_cycle_days` / `last_reviewed` | frontmatter усіх доків |
| B-33 | P2 | todo | wiki-eng | Дашборд метрик wiki: % approved vs draft, доки без owner, TODO-debt, топ-запити без відповіді | new |
| B-34 | P0 | todo | wiki-eng | Telegram-бот: додати whitelist `user_id` (зараз будь-хто може /create та /pr → пуш гілок у GitHub); після /pr повертатись на main (зараз лишається на feature-гілці); фікс втрати історії після 20 реплік (`history = history[-20:]` губить прив'язку); перед /pr ганяти повний `npm run check`, не лише frontmatter | [bot.py](../scripts/ai-agent/bot.py) |
| B-35 | P1 | todo | wiki-eng | AI-search: mixed content на HTTPS-проді (`AISearch.vue` → `http://host:3001`) + endpoint відкритий назовні без auth/rate-limit (відкритий проксі до Gemini-ключа). Проксувати через Caddy шлях `/api/ai-search`, закрити порт 3001 зовні | [ai-api.mjs](../scripts/ai-api.mjs), [AISearch.vue](../docs/.vitepress/theme/components/AISearch.vue) |
| B-36 | P1 | todo | wiki-eng | MinIO в проді, схоже, на дефолтних кредах (`minioadmin`), бакет анонімно читається (`mc anonymous set download`); плюс невиконана ротація `OUTLINE_API_TOKEN` / `TELEGRAM_BOT_TOKEN` з [TASK-outline-post-migration-audit](outline/TASK-outline-post-migration-audit.md). Змінити креди, переглянути анонімний доступ, ротувати токени | `ops/outline/outline.env`, `scripts/ai-agent/.env` |
| B-37 | P2 | todo | wiki-eng | deploy.yml ганяє лише frontmatter-валідацію: прямий push у main деплоїться з битими лінками/TODO-перевитратою. Додати `npm run check` у deploy-джоб | [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) |

---

## Журнал

- 2026-06-08 — backlog створено на основі аудиту; open questions з HANDOFF перенесено сюди (B-20…B-25).
- 2026-06-08 — **B-10 done**: знято 15 index-stub маркерів, згенеровано 2 таблиці, виправлено баг парсера `title: >-`.
- 2026-06-08 — **B-11 done**: додано `check-links` + `check-todo-budget` у CI та `npm run check`; виправлено 1 биту `related_documents`. Усі перевірки зелені, `npm run build` ✅.
- 2026-07-07 — техаудит: **B-18 done** (єдиний Outline-клієнт `api.mjs`, фікс дедуплікації sync, зачистка легасі та дублів); TODO-budget 89 → 91 (2 легітимні TODO в новому `reg-private-card-payments-forbidden`); заведено B-34…B-37 (безпека бота, AI-search, MinIO/токени, deploy-гейти); у B-30 зафіксовано факт: prod-timer не встановлено, активний cron dev-pull.
