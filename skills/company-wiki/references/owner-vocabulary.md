# Owner vocabulary

## Purpose

This file defines preferred `owner` values for canonical documents.

Use a stable, limited vocabulary.
Do not invent one-off owner labels when a standard owner already fits.
If the correct owner is unclear, use `TODO` and keep the document in `draft` or `review`.

## Preferred owner values

### Governance and company-wide
- `company`
- `hq`
- `operations`

### Functional owners
- `sales`
- `stores`
- `product`
- `returns-and-warranty`
- `cash`
- `hr`
- `marketing`
- `loyalty`
- `crm`
- `analytics`

### Special owners
- `finance`
- `it`
- `legal`
- `security`

## Usage rules

### Use functional owner when
- the process clearly belongs to one operating domain
- the document is maintained by a known business function

Examples:
- PRRO offline mode → `cash`
- transfer process between stores → `product`
- customer bonus expiration contact process → `loyalty`
- customer birthday contact script executed by stores but governed by seller workflow → `sales`

### Use `operations` when
- the process is cross-functional
- the rule governs multiple store functions together
- no narrower owner fits cleanly

### Use `company` when
- the document is a top-level governance rule
- the document defines company-wide standards or principles
- the document is not owned by one narrow function

### Use `hq` when
- the owner is central office control rather than one specific operating function
- the exact function is intentionally broad

## Avoid

Do not use:
- personal names unless your governance model explicitly requires them
- temporary project names
- store-specific labels as canonical owners
- mixed values like `sales/hr`
- vague labels like `team`, `manager`, `admin` without function

## If owner is ambiguous

Do this:
1. identify who owns the rule, not who executes it;
2. choose the narrowest stable functional owner;
3. if still unclear, use `TODO` and flag for review.
