---
title: Повернення та гарантія
type: regulation
status: approved
owner: Anton
review_cycle_days: 365
last_reviewed: 2026-03-26
effective_from: 2026-03-26
domain: returns-and-warranty
subdomain: overview
scope: all-stores
tags:
  - returns
  - warranty
  - overview
summary: Розділ про клієнтські звернення після продажу.
related_documents:
  - /returns-and-warranty/returns/
  - /returns-and-warranty/warranty/
  - /returns-and-warranty/expertise/
source_of_truth: manual
ai_generated: false
approval_required: false
---

# Повернення та гарантія

<DocumentMeta
  type="regulation"
  status="approved"
  owner="Anton"
  review-cycle-days="365"
  effective-from="2026-03-26"
  last-reviewed="2026-03-26"
/>

> [!NOTE]
> Цей розділ містить документи про повернення, обмін, гарантійні звернення, експертизу та роботу зі спірними випадками після продажу.

## Маршрут звернення клієнта

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
    A[Клієнт звертається після покупки] --> B{Що саме просить клієнт?}
    B -->|Повернення / обмін| C{Категорія товару}
    B -->|Дефект| D{Є гарантійний строк?}
    C -->|Стандартний товар| E[Порядок повернення / обміну]
    C -->|Білизна / піжами / купальники| F[Перевірити вузький виняток для обміну]
    D -->|Так| G[Гарантійний порядок]
    D -->|Ні або спірно| H[Експертиза / відмова]
    E --> I[Оформити рішення]
    F --> I
    G --> I
    H --> I

    classDef action fill:#dbeafe,stroke:#2563eb,color:#1e3a8a,stroke-width:2px;
    classDef decision fill:#fef3c7,stroke:#d97706,color:#92400e,stroke-width:2px;
    classDef success fill:#dcfce7,stroke:#16a34a,color:#166534,stroke-width:2px;
    class A,E,F,G,H,I action;
    class B,C,D decision;
```

## Підрозділи

| Розділ | Опис |
|---|---|
| [Повернення](./returns/) | Базовий порядок дій при зверненнях щодо повернення або обміну |
| [Обмін](./exchange/) | Підрозділ для окремих документів щодо обміну |
| [Гарантія](./warranty/) | Гарантійні умови та порядок гарантійного прийняття |
| [Експертиза](./expertise/) | Передача товару на експертизу у спірних випадках |
| [Претензії клієнтів](./customer-claims/) | Робота зі складними клієнтськими зверненнями |
