# Boundary cases

## Purpose

This file helps the agent route documents when a topic could plausibly fit more than one domain.

Core principle:
- choose the domain of the primary business owner;
- keep one canonical home;
- use `related_documents` for cross-domain visibility instead of creating parallel canonical docs.

## Common boundary cases

### 1. Bonus expiration communication
Primary domain:
- `loyalty`

Secondary links:
- `crm`
- `sales` if the process includes seller contact execution

Use `loyalty` when the process is driven by:
- bonus balance logic
- expiration rules
- card mechanics
- loyalty campaign operations

Use `crm` only when the document is primarily about:
- segmentation logic
- contact trigger design
- CRM workflow orchestration

### 2. Birthday communication and customer reactivation
Primary domain:
- `sales` when the document is about store contact execution and sales return

Secondary links:
- `crm`
- `loyalty` if the incentive is bonus-driven

Use `crm` only if the document is about:
- segment definitions
- trigger logic
- dashboard selection rules

### 3. Service standards
Primary domain:
- `company` if the rule is a company-wide standard
- `stores` if the document is about store-floor execution of that standard

Rule:
- principles live in `company`
- execution routines live in `stores`

### 4. Daily store operations
Primary domain:
- `stores`

Use `operations` only if the document governs cross-store operational coordination and not one store’s daily execution.

### 5. PRRO / cash discipline issues
Primary domain:
- `cash`

Secondary links:
- `stores` if store operations are affected
- `incident` doc type if it is a failure scenario

Rule:
- money, receipts, PRRO, payment logic → `cash`
- store-level reaction only as related execution context

### 6. Returns and client communication around returns
Primary domain:
- `returns-and-warranty`

Secondary links:
- `sales` only when there is a communication script relevant to the sales team

Rule:
- legal, procedural, warranty, exchange, defect logic lives in `returns-and-warranty`
- sales can reference but should not duplicate canonical return rules

### 7. Product defects discovered in store
Primary domain:
- `product`

Secondary links:
- `returns-and-warranty` if customer-facing claim handling is involved
- `stores` if operational handling in the store is relevant

### 8. Onboarding by role
Primary domain:
- `hr` for onboarding program, checkpoints, expectations

Secondary links:
- functional domain if the onboarding references local SOPs

Rule:
- onboarding framework lives in `hr`
- domain procedures stay in their functional home

### 9. KPI and dashboards
Primary domain:
- `analytics` for definitions, dashboard logic, metric interpretation

Secondary links:
- owning domain (`sales`, `stores`, `loyalty`, etc.) for operational use

### 10. Director-only management rules
Primary domain:
- `company` if it is governance and role authority
- `operations` if it is cross-functional operational management
- `hr` if it is people-management process

Rule:
- choose the owner of the rule, not the audience only

### 11. Campaign execution with bonus incentives
Primary domain:
- `marketing` if the core process is campaign preparation and launch
- `loyalty` if the core logic is bonus mechanics and loyalty rules
- `sales` if the document is store execution of a campaign already defined elsewhere

### 12. CRM segmentation definitions
Primary domain:
- `crm`

Rule:
- segmentation logic, contact triggers, lifecycle states, dashboards → `crm`
- concrete seller scripts or store execution → `sales`
- bonus rule engine → `loyalty`

## Tie-breaker logic

When still uncertain:
1. choose the domain that owns the rule;
2. keep one canonical file only;
3. use `related_documents` instead of duplication;
4. prefer stable structure over clever reclassification.
