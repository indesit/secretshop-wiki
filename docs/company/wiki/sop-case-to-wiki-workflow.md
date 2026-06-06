---
title: Процес перетворення кейсу у Wiki
type: sop
status: draft
owner: founders
review_cycle_days: 180
last_reviewed: 2026-06-06
effective_from: 2026-06-06
domain: company
subdomain: wiki
scope: all-company
tags:
  - wiki
  - knowledge-base
  - incidents
  - cases
summary: >-
  Описує короткий процес, за яким інцидент, кейс, обговорення або рішення
  перетворюється на оновлення корпоративної Wiki Secret Shop.
related_documents:
  - /company/escalation-matrix
  - /templates/case-intake-template
source_of_truth: ai-draft
ai_generated: true
approval_required: true
---

# Процес перетворення кейсу у Wiki

> [!WARNING]
> Документ має статус `draft` і потребує підтвердження.

## Мета

Перетворювати щоденні ситуації Secret Shop на короткі, перевірені й корисні Wiki-оновлення.

## Коли застосовується

Застосовується після будь-якого:

- інциденту;
- повторюваного питання;
- нестандартного кейсу;
- управлінського рішення;
- зміни правила або процесу.

## Принцип

`case → знайти related doc → update або new draft → review → validate/build → commit`

Новий документ створювати тільки тоді, коли існуючого документа недостатньо.

## Мінімальний intake

Для фіксації кейсу використовувати шаблон:

- [Короткий шаблон фіксації кейсу](/templates/case-intake-template)

## Покрокові дії

1. Зафіксувати кейс — коротко описати ситуацію за шаблоном.
2. Класифікувати кейс — `incident`, `question`, `decision`, `process gap` або `policy change`.
3. Знайти пов'язані документи — перевірити існуючі сторінки Wiki.
4. Вирішити дію:
   - якщо документ є — оновити його;
   - якщо документа немає — створити draft через `node scripts/new-doc.mjs`.
5. Не вигадувати факти — невідоме позначати як `TODO`.
6. Додати `related_documents` — щоб кейс був пов'язаний із процесом.
7. Запустити `npm run validate` і `npm run build`.
8. Закомітити окремим тематичним commit.

## Правила для агентів

- Repo є canonical source of truth.
- Outline може бути reading/publishing layer, але не джерелом істини.
- Draft має мати `status: draft` і `approval_required: true`.
- Писати українською, коротко, без води.
- Один кейс не повинен створювати дубль документа, якщо достатньо оновити existing doc.

## Результат

Після виконання процесу кейс має залишити слід у Wiki:

- оновлений existing doc; або
- новий draft-doc; або
- TODO з відкритим питанням до відповідального.
