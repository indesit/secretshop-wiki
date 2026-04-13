---
name: company-wiki
description: Repo-first corporate wiki governance for Secret Shop. Use when creating, updating, linting, routing, deduplicating, or preparing sync for internal wiki documents in the Secret Shop knowledge base. Best for policy/regulation/SOP/instruction/checklist/incident/decision-log work where the agent must preserve canonical repo structure, choose the correct domain and type, enforce frontmatter rules, prevent duplicates, and treat Outline only as a consumption layer.
---

# Company Wiki

Use this skill to operate the Secret Shop corporate wiki as a governed documentation system.

## Core doctrine

Hard rules:
- Repo is the canonical source of truth.
- Outline is a consumption and publishing layer.
- If repo and Outline differ, repo wins.
- Never create canonical content only in Outline.
- Never invent business rules, owners, approvals, or metadata.
- Prefer updating an existing canonical document over creating a near-duplicate.
- Use `TODO` when required information is missing.
- Write internal canonical docs in Ukrainian, dry and operational.

## Modes

### 1. Author
Use for creating a new canonical document.

Do this:
1. Check for overlapping existing docs first.
2. Choose the correct document type.
3. Choose the correct domain, subdomain, and path.
4. Create a draft with full required metadata.
5. Link related documents.

Read before writing:
- `references/taxonomy.md`
- `references/routing-rules.md`
- `references/frontmatter-schema.md`
- `references/repo-operations.md`

Use templates from:
- `assets/templates/`

See examples if needed:
- `references/examples/`

### 2. Update
Use for editing an existing canonical document.

Do this:
1. Locate the canonical file first.
2. Identify stale sections precisely.
3. Apply the smallest edit set that solves the issue.
4. Check related docs for the same stale claim.
5. Preserve stable structure and intent.

Read before editing:
- `references/operating-rules.md`
- `references/frontmatter-schema.md`
- `references/repo-operations.md`

### 3. Lint
Use for auditing wiki quality.

Do this:
1. Scan structure.
2. Scan content.
3. Scan metadata.
4. Group findings by severity.
5. Propose concrete fixes.
6. Do not auto-resolve semantic conflicts in approved docs without confirmation.

Read:
- `references/lint-rules.md`
- `references/operating-rules.md`
- `references/routing-rules.md`

### 4. Structure
Use when deciding where a document belongs, whether a folder is justified, or whether two docs should merge.

Read:
- `references/taxonomy.md`
- `references/routing-rules.md`
- `references/operating-rules.md`

### 5. Sync
Use when preparing repo changes for Outline publishing or sync.

Do this:
1. Confirm canonical repo change exists.
2. Validate metadata and path.
3. Flag divergence between repo and Outline.
4. Never publish Outline-only canonical changes.

Read:
- `references/repo-operations.md`
- `references/operating-rules.md`

## Document type selection

Choose the type before writing:
- `policy` — principles, boundaries, mandatory high-level rules
- `regulation` — recurring business or managerial process rules
- `sop` — repeatable sequential procedure with expected result
- `instruction` — one narrow task or tool operation
- `checklist` — verification and completion tracking
- `incident` — exception, failure, and recovery handling
- `decision-log` — decision, context, rationale, alternatives, affected docs

If content mixes types:
- split if needed;
- otherwise choose the dominant purpose and link related docs.

## Confirmation policy

Auto-apply without extra confirmation only for:
- typo fixes
- formatting cleanup
- obvious broken internal links
- safe metadata normalization
- adding missing related links when target is clear

Stop and ask before applying when:
- document meaning changes
- type changes
- canonical file changes
- merge, delete, or dedup is needed
- approved docs conflict
- a structural refactor affects multiple files

## Output discipline

For create:
- overlap check
- selected type
- selected path
- frontmatter
- draft body

For update:
- canonical doc path
- target sections
- proposed minimal change
- impacted related docs

For lint:
- findings by severity
- exact paths
- issue explanation
- suggested remediation

For sync:
- repo readiness
- target sync scope
- divergence warnings
- publish recommendation

## Non-goals

Do not:
- treat Outline as canonical
- create random folders without structural need
- create a new doc when an existing doc should be updated
- silently resolve contradictions in approved docs
- write internal docs in fluffy or marketing language
