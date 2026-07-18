# Company Wiki

Корпоративна база знань на Markdown + Git + VitePress.

## Швидкий старт

```bash
# Встановити залежності
npm install

# Запустити локально
npm run dev

# Збірка для продакшену
npm run build
```

## Структура проекту

```
company-wiki/
├─ docs/                    # Весь контент Wiki
│  ├─ index.md             # Головна сторінка
│  ├─ company/             # Компанія: місія, оргструктура, ролі
│  ├─ stores/              # Операційна робота магазину
│  ├─ product/             # Товар: приймання, переміщення, брак
│  ├─ returns-and-warranty/ # Повернення, обмін, гарантія
│  ├─ sales/               # Продажі та консультації
│  ├─ cash/                # Каса та грошова дисципліна
│  ├─ hr/                  # Персонал
│  ├─ templates/           # Шаблони документів
│  ├─ glossary/            # Глосарій термінів
│  └─ .vitepress/          # Конфігурація VitePress
├─ scripts/
│  ├─ validate-frontmatter.mjs   # Валідація frontmatter (type/status/domain)
│  ├─ check-links.mjs            # Перевірка related_documents
│  ├─ check-todo-budget.mjs      # Ratchet на content-TODO
│  ├─ generate-sidebar.mjs       # Генерація sidebar зі структури
│  ├─ generate-indexes.mjs       # Генерація index-таблиць секцій
│  ├─ new-doc.mjs                # Scaffold нового документа
│  ├─ outline/                   # Публікація в Outline (publish/sync/reconcile/cleanup)
│  ├─ ai-api.mjs                 # AI-пошук (endpoint для AISearch.vue)
│  └─ ai-agent/                  # Telegram-бот-редактор
├─ skills/company-wiki/     # Канонічні правила для AI-агентів (governance-skill)
├─ ops/                     # Backlog, деплой, Outline-інфраструктура
└─ .github/workflows/
   ├─ validate.yml          # CI: frontmatter + links + TODO budget + build
   └─ deploy.yml            # CD: деплой на GitHub Pages
```

## Workflow для AI-агента

1. Обговоріть кейс → сформуйте рішення.
2. Агент визначає тип документа і папку.
3. Агент створює `.md`-файл за шаблоном із `status: draft`.
4. Агент робить commit або PR.
5. Редактор переглядає diff і підтверджує.
6. Merge у `main` → автоматичний деплой.

## Створити новий документ

```bash
# Інтерактивно
npm run new-doc

# З аргументами (для AI-агентів)
node scripts/new-doc.mjs \
  --type sop \
  --domain stores \
  --subdomain technical-issues \
  --slug sop-power-outage \
  --title "Порядок дій при відключенні електроенергії"
```

## Валідація frontmatter

```bash
npm run validate
```

Перевіряє: наявність обов'язкових полів (`title`, `type`, `status`, `owner`, `domain`),
коректність значень `type`, `status` та `domain`.

Повний прогін якості: `npm run check` (frontmatter + links + TODO budget).

## Типи документів

| Тип | Призначення |
|---|---|
| `policy` | Що дозволено / заборонено |
| `regulation` | Розподіл відповідальності та правила |
| `sop` | Покрокова процедура |
| `instruction` | Як виконати конкретну дію |
| `checklist` | Перелік перевірки |
| `template` | Шаблон документа |
| `incident` | Алгоритм дій в інциденті |
| `decision-log` | Рішення: контекст, обґрунтування, альтернативи |
| `brand` | Бренд-артефакти (історія, Our Story) — рідко |

## Статуси документів

| Статус | Значення |
|---|---|
| `draft` | Чернетка, не є офіційним |
| `review` | На рев'ю редактором |
| `approved` | Затверджений редактором |
| `deprecated` | Замінений новим документом |
| `archived` | Застарілий, лише для історії |

## Naming convention

| Об'єкт | Правило |
|---|---|
| Папки | `lowercase-kebab-case` |
| Файли | `topic-slug.md` або `type-topic-slug.md` |

Приклади: `sop-technical-incident.md`, `reg-transfer-between-stores.md`

## Деплой на GitHub Pages

1. Налаштуйте GitHub Pages у Settings → Pages → Source: `GitHub Actions`.
2. Кожен merge у `main` автоматично запускає деплой.
3. URL: `https://your-org.github.io/company-wiki/`

## Правила для AI-агентів

Канонічне джерело правил — skill [`skills/company-wiki/`](skills/company-wiki/SKILL.md)
(таксономія, routing, frontmatter-схема, owner vocabulary, шаблони).
Короткий вступ для будь-якої моделі — [`AGENT_INSTRUCTIONS.md`](AGENT_INSTRUCTIONS.md).
Не дублюйте промпти в інших файлах — оновлюйте skill.

## Публікація в Outline

Репозиторій — канонічне джерело; Outline — шар споживання (читання, пошук, коментарі).
git → Outline синхронізується скриптами нижче. Зворотний напрям (Outline → git)
теж є, але лише для документів із `outline_locked: true` — див. розділ нижче.
Правки прямо в Outline без цього прапорця **втрачаються** при наступному sync/reconcile.

```bash
npm run outline:sync -- --since origin/main   # опублікувати змінені доки
npm run outline:reconcile                     # повна репопуляція
npm run outline:cleanup                       # звіт про сміття (дублікати, stale-колекції)
```

Потрібні `OUTLINE_API_TOKEN` (і опційно `OUTLINE_URL`) — див. `ops/outline/outline.env.example`.

### Доопрацювання статті напряму в Outline (скріншоти, embed)

Коли зручніше редагувати в Outline (вставити скріншот, embed-фрейм), ніж у markdown:

```bash
# 1. у frontmatter документа виставити outline_locked: true, закомітити
# 2. відредагувати статтю в Outline
# 3. далі — автоматично (GH Actions, раз на 15 хв) АБО вручну:
npm run outline:pull -- --file docs/<path>.md --dry-run   # перевірити, що потягне
npm run outline:pull -- --file docs/<path>.md             # застосувати
```

**Автоматичний pull:** `.github/workflows/outline-pull.yml` кожні 15 хв знаходить усі
`outline_locked`-документи, для кожного зі змінами в Outline відкриває/оновлює **PR**
(ніколи не пушить у `main` напряму — злиття завжди ручне рев'ю). Одноразове налаштування
(не можна зробити з коду, потрібен доступ адміна репо):
1. Secret `OUTLINE_API_TOKEN` у Settings → Secrets and variables → Actions.
2. (опційно) variable `OUTLINE_URL`, якщо відрізняється від `https://wiki.secretshop.ua`.
3. Settings → Actions → General → Workflow permissions → увімкнути
   *"Allow GitHub Actions to create and approve pull requests"* (типово вимкнено).

`pull` (в обох режимах) відрізає авто-згенеровані блоки (бейджі/зміст/пов'язані-документи/футер —
вони перегенеруються на публікації), качає нові зображення в
`docs/public/outline-imports/<slug>/` і конвертує Outline-URL назад у канонічні
git-шляхи. Деталі, обмеження і формат маркерів — `skills/company-wiki/references/frontmatter-schema.md#outline_locked`.
