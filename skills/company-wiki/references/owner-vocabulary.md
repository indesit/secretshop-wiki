# Owner vocabulary

## Purpose

This file defines preferred `owner` values for canonical documents.

Use a stable, limited vocabulary.
Do not invent one-off owner labels when a standard owner already fits.
If the correct owner is unclear, use `TODO` and keep the document in `draft` or `review`.

## Preferred owner values

Use this canonical set for v1:
- `founders`
- `operations`
- `retail`
- `sales`
- `cash`
- `hr`
- `marketing`
- `loyalty`
- `crm`
- `analytics`
- `product`
- `finance`
- `support`
- `it`

## Usage rules

### Use functional owner when
- the process clearly belongs to one operating function
- the document is maintained by a known business function

Examples:
- PRRO offline mode → `cash`
- transfer process between stores → `product`
- customer bonus expiration contact process → `loyalty`
- daily store operations regulation → `retail`
- customer birthday contact script executed by stores but governed by seller workflow → `sales`
- return and exchange customer-handling process → `support`

### Use `operations` when
- the process is cross-functional
- the rule governs multiple store functions together
- no narrower owner fits cleanly

### Use `retail` when
- the process is primarily owned by store operations as a retail function
- the document governs store-floor execution, daily routines, or retail discipline
- the owner is broader than one store but narrower than cross-functional operations

### Use `founders` when
- the document is a top-level governance rule
- the rule is owned directly at founder level
- no narrower functional owner fits

## Avoid

Do not use:
- personal names
- temporary project names
- store-specific labels as canonical owners
- mixed values like `sales/hr`
- vague labels like `team`, `manager`, `admin` without function
- ad hoc synonyms for existing owner values

## If owner is ambiguous

Do this:
1. identify who owns the rule, not who executes it;
2. choose the narrowest stable functional owner;
3. if still unclear, use `TODO` and flag for review.
