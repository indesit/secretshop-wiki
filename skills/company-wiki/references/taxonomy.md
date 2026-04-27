# Taxonomy

## Document types

### policy
Use for principles, boundaries, mandatory high-level rules, and company standards.
Do not use for detailed step-by-step execution.

### regulation
Use for recurring operational or managerial process rules, role coordination, and control points.
Do not use for one narrow task.

### sop
Use for repeatable procedures with explicit sequential steps and expected result.
Do not use for high-level governance.

### instruction
Use for one specific task, one system operation, or one narrow scenario.
Do not use when the content is a broader recurring process.

### checklist
Use for verification and completion tracking.
Do not use as a substitute for SOP or regulation.

### incident
Use for failures, exception scenarios, and recovery actions.
Do not use as a permanent operating process document.

### decision-log
Use for decisions, context, alternatives, reasoning, effective date, and affected docs.
Do not use as a policy replacement.

### brand
Use for brand artifacts: brand history, official bio, "Our Story" narrative.
Use sparingly — only when content is genuinely a brand asset, not a regulation.

## Routing matrix

Active domains (підтримані в `scripts/new-doc.mjs ALLOWED_DOMAINS`):

### company
Company-wide principles, roles, governance, service standards.

### sales
Sales workflow, conversion, client communication, selling standards.

### stores
Store-level daily operations, shifts, checklists, local procedures.

### product
Assortment, product handling, category logic, stock interaction rules.

### returns-and-warranty
Returns, exchanges, claims, warranty communication and handling.

### cash
Cash discipline, POS, PRRO procedures, end-of-day cash operations.

### hr
Hiring, onboarding, role expectations, performance process.

### glossary
Definitions for canonical internal terms (доступний як top-level через sidebar generator).

## Future domains (not yet activated)

Наступні домени резервовано в плані, але **не активовані** — папок під них немає,
`scripts/new-doc.mjs` їх не приймає:
- `marketing` — campaign execution, promotions
- `loyalty` — bonus balances, bonus expiration, loyalty operations
- `crm` — contact segmentation, triggers, customer workflows
- `operations` — cross-functional operational governance
- `analytics` — metrics, dashboards, reporting logic
- `decisions` — decision logs and governance decisions

Активація: коли з'являється перший канонічний документ у такому домені, додавай domain
одночасно в трьох місцях:
- `skills/company-wiki/references/frontmatter-schema.md`
- `skills/company-wiki/references/routing-rules.md`
- `scripts/new-doc.mjs ALLOWED_DOMAINS` + `scripts/generate-sidebar.mjs TOP_LEVEL_SECTIONS`.

## Anti-patterns

Do not:
- create a new doc when an existing canonical one should be updated
- write a policy with detailed step-by-step content
- write an incident document as an evergreen process
- use checklist where SOP is needed
- create a new folder for one document
- duplicate the same process under different domains without a strong reason
