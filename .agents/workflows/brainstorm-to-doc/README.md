# Brainstorm → Doc Workflow

Каркас для конверсаційного процесу «жива ситуація → структурований запис у Wiki».

Ціль: будь-який редактор разом з локальним агентом може за одну сесію перетворити робочий кейс
(інцидент / нараду / повторюване питання продавця) на канонічний markdown-документ, що відповідає
доктрині `skills/company-wiki/` і проходить `npm run validate`.

## Файли

| Файл | Призначення |
|---|---|
| [`system-prompt.md`](./system-prompt.md) | Системний промпт агента-редактора. Підвантажується на старті сесії. |
| [`case-note.template.md`](./case-note.template.md) | Шаблон case-нотатки для фази 1 (Discovery). |
| [`phases-checklist.md`](./phases-checklist.md) | Чекліст 6 фаз з критеріями переходу і командами. |
| [`scenarios.md`](./scenarios.md) | 6 типових сценаріїв-тригерів (incident / decision / onboarding...). |

## Як запустити сесію

1. Відкрити Claude Code в `/root/company-wiki`.
2. Підвантажити промпт: вказати агенту прочитати `.agents/workflows/brainstorm-to-doc/system-prompt.md`
   та `skills/company-wiki/SKILL.md`.
3. Користувач описує реальну ситуацію (одним повідомленням, без структури).
4. Агент веде по чек-лісту фаз: Discovery → Routing → Skeleton → Cross-link → Validation → PR.
5. У кінці сесії — посилання на створену гілку та PR; merge → автодеплой.

## Передумови

Перш ніж workflow стане надійним, у репо мають бути закриті P0 з плану аудиту:
- узгоджено схему frontmatter ↔ skill ↔ CLI (T1, T2);
- прибрано auto-push з Telegram-бота (T5);
- секрети винесено з tracked-файлів (T6, T7).

До того workflow придатний для draft-сесій, але PR може ламатися на CI.

## Залежність від скілів

- **`skills/company-wiki/`** — джерело правил (taxonomy, routing, frontmatter, owner-vocabulary).
  Без цього skill workflow не має канонічної логіки і може створити дублі.
- **`outline-wiki-manager`** (опціонально) — для overlap-check у Outline (фаза 2).
- **`wiki-architect`** (рідко) — лише для разових onboarding-генерацій, не для щоденної редактури.
