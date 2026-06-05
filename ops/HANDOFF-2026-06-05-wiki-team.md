# Handoff — Secret Shop Wiki Team

Дата: 2026-06-05 02:32 CEST
Repo: `/root/company-wiki`
Remote: `git@github.com:indesit/secretshop-wiki.git` / `https://github.com/indesit/secretshop-wiki`
Branch: `feat/outline-publish-workflow`

## Головний принцип наповнення Wiki

`incident / case / discussion / decision → wiki doc або update existing wiki doc`

Wiki має зростати не лише з уже наявного контексту, а передусім із живої операційної реальності Secret Shop:

- щоденні питання;
- проблеми магазинів;
- інциденти;
- управлінські рішення;
- повторювані кейси;
- інсайти;
- домовленості після обговорень.

Правило для агентів: спочатку шукати existing related doc; якщо документ уже є — оновити його. Новий doc створювати тільки коли це окремий процес / правило / SOP / checklist / incident, якого ще немає.

## Що зроблено в цьому циклі

Запущено Hermes Kanban board `secretshopwiki` і команду профілів:

- `wikicoord` — координація / декомпозиція;
- `wikiresearch` — інвентаризація й пошук прогалин;
- `wikiwriter` — українські draft-документи;
- `wikireview` — рев'ю якості;
- `wikiops` — validate/build/handoff.

Завершені задачі:

- `t_2b2d231c` — Bootstrap Secret Shop wiki enrichment program
- `t_24c70367` — Inventory Secret Shop wiki gaps and priority sections
- `t_17983055` — Enrich first priority wiki section batch
- `t_0cb809ad` — Review enriched wiki batch for canonical quality
- `t_444beb59` — Validate/build wiki batch and prepare ops handoff

Створено/оновлено перший coherent product batch:

- `docs/product/receiving/sop-goods-receiving.md`
- `docs/product/stock-balance/reg-stock-balance-control.md`
- `docs/product/shortage-overage/sop-shortage-overage-handling.md`
- `docs/product/receiving/index.md`
- `docs/product/stock-balance/index.md`
- `docs/product/shortage-overage/index.md`
- `docs/company/brand/contacts.md`
- `docs/.vitepress/generated-sidebar.json`
- `docs/.vitepress/generated-docs-meta.json`

`contacts.md` був приведений до валідного frontmatter і виправлено typo `contats`.

## Перевірки

Команди виконані перед handoff:

```bash
npm run validate
npm run build
```

Результат:

- `npm run validate` — passed, checked 109 files.
- `npm run build` — passed; є лише стандартне VitePress warning про chunk-size, не blocker.

## Незакриті питання для Макса по product batch

### Приймання товару

- Хто саме відповідає за приймання в магазині?
- Який документ у 1C/BAF використовується для приймання поставки та переміщення?
- Який строк перевірки й підтвердження приймання?
- Як фіксуються розбіжності: акт, фото, чат, системний документ?

### Контроль залишків

- Яка система є канонічною для залишків: 1C, BAF або інша?
- Хто має право змінювати системні залишки?
- Як часто робити локальну звірку?
- Які строки закриття відкритих переміщень/розбіжностей?

### Недостачі / лишки

- Який поріг «значної» розбіжності у грн?
- Хто затверджує коригування?
- Як фіксується матеріальна відповідальність?
- Який акт/документ використовується для недостачі, лишку та пересорту?

## Важливо про working tree

У repo є unrelated зміни, які НЕ треба змішувати з wiki product commit без окремого рішення:

- deleted legacy Cyrillic stores file;
- `ops/outline/docker-compose.yml`;
- `ops/outline/outline.env.example`;
- `GEMINI.md`;
- `company-wiki.code-workspace`;
- `docs/.vitepress/theme/components/AISearch.vue`;
- `scripts/ai-agent/`;
- `scripts/ai-api.mjs`;
- `scripts/clean_outline.cjs`;
- `scripts/update-wiki.sh`.

## Bot/gateway status

Telegram bots for individual agents are not configured yet. Only default gateway exists/runs. Multi-bot profile gateways should be configured later with unique BotFather tokens per profile.

Do not start multiple Telegram gateways with the same token.

## Наступний рекомендований крок

1. Налаштувати окремі Telegram bot tokens для `wikicoord`, `wikiresearch`, `wikiwriter`, `wikireview`, `wikiops`.
2. Закодувати workflow `incident/case → wiki doc/update` у repo:
   - оновити `AGENT_INSTRUCTIONS.md`;
   - додати template для case intake;
   - додати процесний документ про перетворення daily cases у wiki updates.
3. Наступний enrichment batch краще робити по cash incidents або stores power outage.

Kanban-картка для цього вже створена, але заблокована до рішення Макса:

- `t_86188128` — Codify incident/case to wiki-doc workflow
