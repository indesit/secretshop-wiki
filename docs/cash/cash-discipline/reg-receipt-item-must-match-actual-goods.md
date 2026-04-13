---
title: Регламент відповідності товару в чеку фактичному товару
type: regulation
status: draft
owner: founders
review_cycle_days: 365
last_reviewed: 2026-03-26T00:00:00.000Z
effective_from: 2026-03-26T00:00:00.000Z
domain: cash
subdomain: cash-discipline
scope: all-stores
tags:
  - cash
  - receipts
  - sku-control
  - regulation
summary: 'У чек може потрапляти лише той товар, який фактично відпускається клієнту.'
related_documents:
  - /cash/cash-discipline/policy-cash-discipline
  - /cash/cash-discipline/reg-forbidden-actions-at-cashdesk
  - /cash/cash-discipline/sop-stock-shortage-error-during-sale
source_of_truth: ai-draft
ai_generated: true
approval_required: true
canonical_path: docs/cash/cash-discipline/reg-receipt-item-must-match-actual-goods.md
---

# Регламент відповідності товару в чеку фактичному товару

<DocumentMeta
  type="regulation"
  status="draft"
  owner="Anton"
  review-cycle-days="365"
  effective-from="2026-03-26"
  last-reviewed="2026-03-26"
/>

> [!WARNING]
> Цей документ має статус `draft`. Не є офіційним до підтвердження редактором.

## Основне правило

Заборонено сканувати або додавати в товарний чек довільний товар, який не відповідає тому товару, що фактично відпускається клієнту.

## Що це означає на практиці

Не можна:
- пробити схожий товар замість фактичного;
- замінити одну номенклатуру іншою для зручності;
- підбирати інший товар лише тому, що він є в залишках;
- штучно вирівнювати продаж через іншу позицію.

## Чому це важливо

Підміна товару в чеку призводить до:
- викривлення аналітики продажів;
- недостовірних залишків;
- помилок у повторних продажах;
- проблем при поверненні, обміні або гарантійному зверненні;
- втрати довіри до облікової системи.

<DecisionRule title="Принцип точності" verdict="Що віддали клієнту — те й проведено в системі" tone="info">
Чек має відображати фактичну реальність. Працівник каси не має права виправляти систему довільною заміною товару.
</DecisionRule>

## Що робити при системній помилці

Якщо є проблема із залишком або помилка в системі, діємо лише за затвердженим алгоритмом аварійного сценарію.

## Пов'язані документи

<RelatedDocuments />
