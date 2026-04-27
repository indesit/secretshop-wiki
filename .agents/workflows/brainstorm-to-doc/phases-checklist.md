# Phases Checklist

6-фазний чекліст для агента-редактора. Кожна фаза має критерії переходу.
Якщо критерій не виконаний — повертайся у попередню фазу або питай користувача.

---

## Phase 1. Discovery

**Інструмент**: `case-note.template.md` у чаті.

**Критерії переходу до Phase 2**:
- [ ] Заголовок кейса сформовано.
- [ ] 8 розділів case-нотатки заповнено або мають явний `TODO`.
- [ ] Розділ «факти vs припущення» чесно розмежований.
- [ ] Користувач підтвердив повноту.

**Stop-conditions**: відповіді типу «ну зазвичай», «приблизно так», «не пам'ятаю» — переформульовуй
питання або фіксуй `TODO`. Не йди далі без явного маркування невідомого.

---

## Phase 2. Routing + Overlap check

**Інструменти**:
- `skills/company-wiki/references/routing-rules.md`
- `skills/company-wiki/references/taxonomy.md`
- `skills/company-wiki/references/boundary-cases.md`
- Bash: `grep -r "<keyword>" docs/`
- Опціонально: `python3 /root/.gemini/antigravity/skills/outline-wiki-manager/scripts/outline.py search "<тема>"`

**Вихід (показати в чаті)**:
```
Intent: <new | update | merge | lint>
Type: <policy | regulation | sop | instruction | checklist | incident | decision-log>
Domain: <company | sales | stores | product | returns-and-warranty | cash | hr | ...>
Subdomain: <existing | new>
Scope: <company-wide | store-level | role-level | system-level | campaign-level>
Canonical path: docs/<domain>/<subdomain>/<type-prefix>-<topic>.md
Owner: <з owner-vocabulary>
Overlap candidates: [список знайдених документів або «нема»]
Decision: [create new | update <path>]
```

**Критерії переходу до Phase 3**:
- [ ] Type входить в одночасно `frontmatter-schema.md` AND `new-doc.mjs ALLOWED_TYPES`.
- [ ] Domain входить в одночасно `routing-rules.md` AND `new-doc.mjs ALLOWED_DOMAINS`.
- [ ] Overlap-check виконано (grep + Outline search якщо доступний).
- [ ] Якщо overlap знайдено — рішення «update existing» зафіксовано.

**Stop-conditions**: якщо потрібний type/domain є в skill, але немає в CLI — зупинись,
повідом користувача про розузгодженість, не створюй документ силою.

---

## Phase 3. Skeleton

**Інструменти**:
- `skills/company-wiki/assets/templates/<type>.template.md`
- `scripts/new-doc.mjs` (якщо domain/type підтримані)

**Дії**:
1. Запустити `node scripts/new-doc.mjs --type ... --domain ... --subdomain ... --slug ... --title "..."`.
2. Відкрити створений файл, замінити placeholder-frontmatter на повний за схемою.
3. Тіло заповнити з case-нотатки. Невідоме → `TODO`.

**Frontmatter checklist** (з `frontmatter-schema.md`):
- [ ] `title` — людська назва, не slug.
- [ ] `type` — з enum.
- [ ] `status: draft`.
- [ ] `owner` — з vocabulary, не «Anton».
- [ ] `domain` + `subdomain` за taxonomy.
- [ ] `scope`.
- [ ] `summary` — 1-2 речення, операційно.
- [ ] `related_documents: []` (заповниться у Phase 4).
- [ ] `approval_required: true`.
- [ ] `ai_generated: true`.
- [ ] `source_of_truth: repo`.
- [ ] `last_reviewed: <today>` або `last_reviewed_at: <today>` (за поточною схемою валідатора).
- [ ] `canonical_path: docs/...`.

**Критерії переходу до Phase 4**:
- [ ] Файл створено за canonical_path.
- [ ] Frontmatter повний або має `TODO` для невідомого.
- [ ] Тіло має всі обов'язкові секції шаблону.

---

## Phase 4. Cross-link + glossary

**Дії**:
1. `grep -lr "<ключові слова>" docs/` — знайти кандидатів для `related_documents`.
2. Заповнити `related_documents` у frontmatter новоствореного файлу (формат `/domain/subdomain/slug`).
3. Знайти `index.md` цільового під-розділу — додати посилання на новий документ.
4. Якщо новий термін: відредагувати `docs/glossary/terms.md` (відповідна літера).

**Критерії переходу до Phase 5**:
- [ ] `related_documents` заповнено або обґрунтовано порожнє.
- [ ] `index.md` під-розділу містить посилання на новий документ (або документ потрапить через `generate-indexes.mjs` для curated розділів).
- [ ] Глосарій оновлено, якщо введено новий термін.

---

## Phase 5. Validation

**Команди (виконати в Bash)**:
```bash
cd /root/company-wiki
node scripts/validate-frontmatter.mjs
node scripts/generate-sidebar.mjs
node scripts/generate-indexes.mjs
```

Опціонально:
```bash
npm run build   # перевіряє, що VitePress не падає на новому файлі
```

**Критерії переходу до Phase 6**:
- [ ] `validate-frontmatter.mjs` повернув `0 errors`.
- [ ] Обидва generator-скрипти відпрацювали без warn.
- [ ] (Опц.) `npm run build` зелений.

**Stop-conditions**: будь-яка помилка → повертайся у Phase 3 або 4, виправляй точково.

---

## Phase 6. Commit + PR

**Дії**:
1. Створити гілку: `git checkout -b docs/<domain>/<slug>`.
2. Стейджити **тільки** релевантні файли (новий документ, оновлений index, оновлений glossary,
   regenerated sidebar/meta JSON).
3. Коміт-повідомлення:
   - якщо новий: `docs(<domain>): add <slug>`;
   - якщо update: `docs(<domain>): update <slug> — <короткий why>`.
4. `git push -u origin docs/<domain>/<slug>`.
5. `gh pr create` з описом за шаблоном нижче.

**Шаблон опису PR**:
```markdown
## Тригер
<1 речення з заголовка case-нотатки>

## Зміна
- Тип: <new | update>
- Type: <type>
- Шлях: `docs/<...>`

## Що змінено
- <bullet>

## Як перевірити
- `npm run validate`
- візуально: <розділ у Wiki>

## Open questions / TODO
- <якщо є невирішені TODO в документі — перелічити>
```

**Критерії завершення сесії**:
- [ ] PR створено, URL показано користувачу.
- [ ] Користувач підтвердив, що PR коректно відображає кейс.
- [ ] Сесія закрита фразою `OK → done. PR: <url>`.

**Не злилай у main сам.** Це робить редактор-людина після review.
