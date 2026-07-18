# Frontmatter schema

## Required fields (enforced by `scripts/validate-frontmatter.mjs`)

```yaml
---
title: "TODO"
type: "TODO"
status: "draft"
owner: "TODO"
domain: "TODO"
---
```

Якщо хоча б одне з цих полів відсутнє — `npm run validate` падає.

## Recommended fields (не обов'язкові, але присутні в усіх canonical-документах)

```yaml
subdomain: "TODO"
scope: "all-stores"
summary: "TODO"
related_documents: []
approval_required: true
ai_generated: true
source_of_truth: "manual"   # або "ai-draft" | "repo"
last_reviewed: "YYYY-MM-DD"
effective_from: "YYYY-MM-DD"
review_cycle_days: 180
tags: []
canonical_path: "docs/<domain>/<subdomain>/<slug>.md"
outline_locked: false
```

## Field rules

### title
Human-readable title. Не використовуй файловий slug як title.

### type
Allowed (синхронізовано з `scripts/validate-frontmatter.mjs:18-22` і `scripts/new-doc.mjs:22-25`):
- `policy`
- `regulation`
- `sop`
- `instruction`
- `checklist`
- `incident`
- `decision-log`
- `template`
- `brand`

### status
Allowed (синхронізовано з валідатором):
- `draft` — чернетка, не є офіційним
- `review` — в процесі рев'ю редактором
- `approved` — активний канонічний стан
- `deprecated` — замінено новим документом, не використовувати
- `archived` — збережено лише для історії

Status rule:
- `approved` — активний канонічний стан;
- не використовувати окремий `active`;
- `deprecated` коли документ замінено;
- `archived` коли документ зберігається лише для історії.

### owner
Відповідальна функція або зона відповідальності. Використовуй лише vocabulary з `owner-vocabulary.md`.
Якщо невідомо — `TODO`. Не вигадуй.

### domain
Top-level domain. Має збігатися з `ALLOWED_DOMAINS` в `scripts/new-doc.mjs:23`:
`company | sales | stores | product | returns-and-warranty | cash | hr`.

> Домени `marketing | loyalty | crm | operations | analytics | decisions` поки не активовані —
> папок під них немає. Коли з'явиться перший канонічний doc у такому домені, додавай domain
> одночасно в трьох місцях: тут, у `routing-rules.md`, у `new-doc.mjs ALLOWED_DOMAINS`,
> і в `generate-sidebar.mjs TOP_LEVEL_SECTIONS`.

### subdomain
Operational subdomain в межах домену. Якщо невирішено — `TODO`.

### scope
Recommended values:
- `all-stores` (за замовчуванням)
- `company-wide`
- `store-level`
- `role-level`
- `system-level`
- `campaign-level`

### summary
Короткий operational summary. 1-2 речення. Без літератури і маркетингу.

### related_documents
Масив repo-relative шляхів від кореня `docs/`.
Preferred format:
- `/sales/consultation/`
- `/cash/cash-discipline/instruction-prro-offline-mode-in-baf`
- `/returns-and-warranty/returns/`

Порожній якщо невідомо; додай TODO в тілі коли релевантно.

### approval_required
Boolean. Default `true` для канонічних документів.

### ai_generated
Boolean. `true` коли початкова версія створена AI.

### source_of_truth
Поточно вживані значення:
- `manual` — створено вручну редактором;
- `ai-draft` — створено AI-агентом, очікує погодження;
- `repo` — підтверджено як канонічна версія в репо.

### last_reviewed
Дата останнього перегляду у форматі `YYYY-MM-DD` або `TODO`.

> **Notation**: у документації використовується `last_reviewed`, не `last_reviewed_at`.
> Це історично прийнятий формат, узгоджений з `buildFooter()` у `scripts/outline/cleaners.mjs` та існуючими файлами.

### canonical_path
Repo-relative шлях до канонічного markdown-файлу під `docs/`.
Приклад: `docs/stores/daily-operations/reg-store-daily-operations.md`.

Не required, але всі скрипти Outline-публікації покладаються на нього (інакше шлях
інферується з реального розташування файлу).

### outline_locked
Boolean, default `false`. Частина workflow «доопрацювати статтю в Outline і
повернути результат у git» (скріншоти, embed-фрейми — те, що markdown не
передає зручно):

1. Редактор ставить `outline_locked: true` у файлі, комітить.
2. Редагує статтю **напряму в Outline** (текст, скріни, embed).
3. Пул назад у git відбувається автоматично: `.github/workflows/outline-pull.yml`
   раз на 15 хв перевіряє всі `outline_locked`-документи і для кожного, де
   Outline-версія відрізняється від git, **відкриває/оновлює PR** (не пушить
   у `main` напряму). Або запустити вручну: `npm run outline:pull -- --file docs/<path>.md`.
   В обох випадках: відрізаються авто-згенеровані блоки (бейджі, зміст,
   «Пов'язані документи», футер — перегенеруються при наступній публікації),
   якаються нові зображення в `docs/public/outline-imports/<slug>/` з
   переписом посилань на локальні, Outline-URL (`/doc/…`, `/collection/…`)
   конвертуються назад у канонічні git-шляхи.
4. Редактор рев'ю PR (або `git diff` при ручному запуску), знімає
   `outline_locked`, мержить/комітить.

**AI-агент (і будь-який sync/reconcile-скрипт) НІКОЛИ не редагує і не
перезаписує файл з `outline_locked: true`.** `scripts/outline/_publishOne.mjs`
пропускає такі файли при публікації — інакше git-версія тихо затре Outline-версію
при наступному `sync`/`reconcile`. Якщо треба внести правку через git у locked-документ —
спершу запитай власника, чи прапорець ще актуальний.

`outline:pull` вимагає, щоб документ уже мав маркери авто-блоків (публікується,
починаючи з версії пайплайна з підтримкою `outline_locked`) — інакше скрипт
відмовляється з чіткою інструкцією, а не вгадує межу «згенероване vs авторське».
Якщо після pull лишились посилання, які не вдалось перемапити назад (документ-ціль
перейменували/видалили в Outline) — скрипт друкує список і лишає їх як є; це
потребує ручного виправлення, бо такі URL не працюють на VitePress-сайті.

## Missing data policy

Якщо дані невідомі:
- використовуй `TODO`;
- тримай документ у `draft` або `review`;
- не вигадуй owner, approval state, effective date, related docs.

## Validation checks

Invalid коли:
- `type` поза enum;
- `status` поза enum;
- відсутнє required-поле (`title`, `type`, `status`, `owner`, `domain`);
- `domain` не входить в `ALLOWED_DOMAINS`.
