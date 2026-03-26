---
title: Касова дисципліна
type: regulation
status: approved
owner: Anton
review_cycle_days: 365
last_reviewed: 2026-03-26
effective_from: 2026-03-26
domain: cash
subdomain: cash-discipline
scope: all-stores
tags:
  - cash
  - discipline
summary: Огляд підрозділу "Касова дисципліна".
related_documents:
  - /cash/cash-discipline/policy-cash-discipline
  - /cash/cash-discipline/reg-forbidden-actions-at-cashdesk
  - /cash/cash-discipline/sop-price-tags-at-cashdesk
  - /cash/cash-discipline/reg-goods-movement-only-through-1c
  - /cash/cash-discipline/reg-receipt-item-must-match-actual-goods
  - /cash/cash-discipline/sop-stock-shortage-error-during-sale
source_of_truth: manual
ai_generated: false
approval_required: false
---

# Касова дисципліна

<DocumentMeta
  type="regulation"
  status="approved"
  owner="Anton"
  review-cycle-days="365"
  effective-from="2026-03-26"
  last-reviewed="2026-03-26"
/>

> [!NOTE]
> У цьому розділі зібрані базові правила касової дисципліни, заборонені дії на касі, порядок роботи з цінниками, контроль руху товару через 1С, вимоги до відповідності товару в чеку та аварійні сценарії під час продажу.

## Навігація по розділу

- <IconLucideShield style="vertical-align: text-bottom; margin-right: 6px;" /> **Базові принципи:** політика касової дисципліни
- <IconLucideBan style="vertical-align: text-bottom; margin-right: 6px;" /> **Заборони:** дії, які спотворюють облік або створюють простір для маніпуляцій
- <IconLucideTags style="vertical-align: text-bottom; margin-right: 6px;" /> **Прикасова зона:** окремий SOP по роботі з цінниками
- <IconLucideBoxes style="vertical-align: text-bottom; margin-right: 6px;" /> **Рух товару:** вибуття товару лише через 1С
- <IconLucideReceiptText style="vertical-align: text-bottom; margin-right: 6px;" /> **Точність чека:** у чеку тільки фактичний товар
- <IconLucideTriangleAlert style="vertical-align: text-bottom; margin-right: 6px;" /> **Аварійний сценарій:** дії при помилці нестачі в 1С

## Блок-схема касової дисципліни

```mermaid
%%{init: {
  "theme": "base",
  "themeVariables": {
    "fontFamily": "Inter, Arial, sans-serif",
    "primaryColor": "#dbeafe",
    "primaryBorderColor": "#2563eb",
    "primaryTextColor": "#1e3a8a",
    "secondaryColor": "#fef3c7",
    "tertiaryColor": "#dcfce7",
    "lineColor": "#64748b"
  }
}}%%
flowchart TD
    A[Операція на касі] --> B{Що відбувається?}
    B -->|Продаж| C[Провести фактичний товар у чеку]
    B -->|Робота з цінником| D[Тримати цінник тільки під час операції]
    B -->|Рух товару| E[Спочатку оформити документ у 1С]
    B -->|Помилка нестачі| F[Запустити аварійний SOP]
    C --> G{Товар у чеку відповідає фактичному?}
    G -->|Так| H[Завершити операцію]
    G -->|Ні| I[Підміна заборонена]
    D --> J[Прибрати цінник одразу після дії]
    E --> K{Документ у 1С проведено?}
    K -->|Так| H
    K -->|Ні| L[Передача товару заборонена]
    F --> M[Товар «товар» + коментар зі штрихкодом + повідомлення адміну]
    M --> H

    classDef action fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,stroke-width:2px;
    classDef decision fill:#fef3c7,stroke:#d97706,color:#92400e,stroke-width:2px;
    classDef success fill:#dcfce7,stroke:#16a34a,color:#166534,stroke-width:2px;
    classDef danger fill:#fee2e2,stroke:#dc2626,color:#991b1b,stroke-width:2px;

    class A,C,D,E,F,J,M action;
    class B,G,K decision;
    class H success;
    class I,L danger;
```

## Документи розділу

### Політики

- [Політика касової дисципліни](/cash/cash-discipline/policy-cash-discipline)

### SOP

- [SOP: Робота з цінниками в прикасовій зоні](/cash/cash-discipline/sop-price-tags-at-cashdesk)
- [SOP: Дії при помилці нестачі товару в 1С](/cash/cash-discipline/sop-stock-shortage-error-during-sale)

### Регламенти

- [Регламент заборонених дій на касі](/cash/cash-discipline/reg-forbidden-actions-at-cashdesk)
- [Регламент руху товару тільки через 1С](/cash/cash-discipline/reg-goods-movement-only-through-1c)
- [Регламент відповідності товару в чеку фактичному товару](/cash/cash-discipline/reg-receipt-item-must-match-actual-goods)
