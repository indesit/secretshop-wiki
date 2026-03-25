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
│  ├─ validate-frontmatter.mjs   # Валідація frontmatter
│  ├─ generate-sidebar.mjs       # Генерація sidebar зі структури
│  └─ new-doc.mjs               # Scaffold нового документа
└─ .github/workflows/
   ├─ validate.yml          # CI: перевірка frontmatter + build
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
коректність значень `type` та `status`.

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

## Статуси документів

| Статус | Значення |
|---|---|
| `draft` | Чернетка, не є офіційним |
| `approved` | Затверджений редактором |
| `archived` | Застарілий, не застосовується |

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

## Промпт для AI-агента

```
Ти є редактором корпоративної Wiki на Markdown + Git + VitePress.

Твоє завдання:
1. Визначити тип документа: policy / regulation / sop / instruction / checklist / incident.
2. Вибрати правильну директорію в /docs.
3. Створити або оновити markdown-файл.
4. Дотримуватись єдиного frontmatter-формату.
5. Якщо документ новий — поставити status: draft.
6. Писати коротко, чітко, операційно, без води.
7. Якщо є сумнів, не вигадувати правило, а позначати як TODO.
8. Додати related_documents, якщо є логічні зв'язки.
9. Не змінювати затверджений документ без явної вказівки.
```
