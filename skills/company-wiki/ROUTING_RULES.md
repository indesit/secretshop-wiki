# Routing rules

## Purpose

These rules define how to choose the correct destination for a wiki document.

The agent must decide in this order:
1. document intent
2. document type
3. primary domain
4. subdomain
5. scope
6. final canonical path

## Step 1. Determine intent

Choose one:
- create new canonical doc
- update existing canonical doc
- lint and audit
- restructure or move
- sync or publish

Do not create a new document before checking whether an existing one already covers the same process.

## Step 2. Determine document type

Use:
- policy for principles and high-level mandatory rules
- regulation for recurring business process rules
- sop for step-by-step recurring execution
- instruction for one narrow task or system action
- checklist for verification and completion tracking
- incident for exception and recovery scenarios
- decision-log for decisions and rationale

## Step 3. Determine domain

### company
Use for company-wide governance, service standards, shared principles, and high-level role rules.

### sales
Use for selling process, client communication in sales context, conversion workflow, and interaction scripts.

### stores
Use for store-level daily operations, shifts, opening and closing, local process execution, and store responsibility boundaries.

### product
Use for assortment logic, product handling, category structure, stock interaction rules, and product-related governance.

### returns-and-warranty
Use for return, exchange, complaint, and warranty procedures.

### cash
Use for cash discipline, PRRO, fiscal operations, receipt issues, end-of-day cash control, and payment process rules.

### hr
Use for hiring, onboarding, performance expectations, evaluation process, and staff development procedures.

### marketing
Use for campaigns, promos, communication preparation, and marketing execution rules.

### loyalty
Use for bonus balances, bonus expiration process, loyalty cards, loyalty operational rules, and customer incentive rules tied to the loyalty system.

### crm
Use for segmentation, contact workflows, communication triggers, CRM task logic, and handling rules in the CRM layer.

### operations
Use for cross-functional operational governance that does not fit cleanly inside one store or one narrow function.

### analytics
Use for metric definitions, dashboards, reports, analytical interpretation rules, and data logic.

### decisions
Use for decision logs and decision history.

### glossary
Use for canonical terms and definitions.

## Step 4. Determine subdomain

Create a new subdomain only if:
- the topic is stable
- the topic is recurring
- at least 3 related docs are likely
- the topic cannot fit cleanly inside an existing subdomain

Do not create a new subdomain when:
- the content is a one-off
- the content differs only slightly from an existing doc
- the topic can be an additional section inside an existing canonical doc

## Step 5. Determine scope

Recommended values:
- company-wide
- store-level
- role-level
- system-level
- campaign-level

Scope helps distinguish broad governance from local execution.

## Step 6. Build path

Format:
`skills or wiki path / domain / subdomain / file`

File name format:
`<type-prefix>-<scope>-<topic>.md`

Examples:
- `wiki/stores/daily-operations/reg-store-daily-operations.md`
- `wiki/cash/prro/instruction-prro-offline-mode.md`
- `wiki/loyalty/bonus-expiration/reg-store-bonus-expiration-contact-process.md`
- `wiki/hr/onboarding/sop-role-onboarding-checkpoint.md`

## Conflict rules

If a doc could fit into two domains:
- choose the domain of the primary business owner
- use related_documents to cross-link the secondary domain

Examples:
- bonus expiration customer contact process: primary domain `loyalty`, related link to `crm`
- PRRO offline receipt issue: primary domain `cash`, related link to `stores`
- daily seller checklist: primary domain `stores`, related link to `sales` if needed

## Anti-sprawl rules

Do not:
- create parallel docs for the same process in multiple domains
- create separate docs only because wording differs by store
- create a new doc when one section update is enough
- move canonical docs without a structural reason

## Tie-breaker rule

When uncertain:
- choose the narrowest correct canonical doc
- keep the structure stable
- prefer updating the existing doc over creating a new one
