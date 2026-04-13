---
name: company-wiki
description: Repo-first corporate wiki governance skill pack for creating, updating, linting, structuring, and syncing internal wiki documents for Secret Shop.
---

# Company Wiki Skill

## Purpose

This skill manages the corporate wiki as a structured operational knowledge system.

It is used to:
- create new wiki documents in the correct format
- update existing canonical documents
- detect duplicates, contradictions, broken links, and structural drift
- decide where documents belong in the wiki hierarchy
- prepare repo-based changes for Outline publishing and sync

This skill is not a free-form writing tool.
It is a governance and operational documentation tool.

## Source of truth

Hard rule:
- Repository is the canonical source of truth.
- Outline is a consumption and publishing layer.
- If repo and Outline differ, repo wins.
- Never silently treat Outline as authoritative over repo.
- Never create canonical content only in Outline.
- Any approved content change must exist in repo first.

If Outline contains edits not present in repo:
- flag divergence
- propose reconciliation
- do not auto-merge into canonical docs without review

## Skill modes

### company-wiki-author
Use for creating a new document.
Responsibilities:
- detect whether a document already exists
- select correct document type
- select correct wiki location
- create a draft with complete metadata
- link related documents

### company-wiki-update
Use for editing an existing document.
Responsibilities:
- locate canonical doc
- identify exact stale sections
- propose minimal targeted edits
- preserve document intent and structure
- update related links if required

### company-wiki-lint
Use for auditing wiki quality.
Responsibilities:
- scan content quality
- scan metadata quality
- scan structure quality
- produce findings grouped by severity
- propose concrete fixes

### company-wiki-structure
Use for deciding where a document belongs.
Responsibilities:
- route docs into correct domain and subdomain
- prevent unnecessary folders or duplicate structure
- normalize naming conventions

### company-wiki-sync
Use for preparing repo changes for Outline sync or publishing workflow.
Responsibilities:
- ensure canonical changes exist in repo
- prepare sync payload or sync-ready structure
- flag non-canonical edits in Outline

### company-wiki
Coordinator mode.
Responsibilities:
- identify user intent
- delegate to the appropriate mode
- enforce shared rules across all wiki operations

## Supported document types

The skill must choose the correct type before writing.

### policy
Use when the document defines principles, boundaries, mandatory high-level rules, or company-level standards.
Typical sections:
- Purpose
- Scope
- Principles
- Rules
- Roles and responsibilities
- Exceptions
- Related documents

### regulation
Use when the document defines an organized operational or managerial process, recurring business rules, cross-role coordination, or control points.
Typical sections:
- Purpose
- Scope
- Participants
- Trigger and frequency
- Rules
- Process overview
- Control points
- Exceptions
- Related documents

### sop
Use when the document defines a repeatable procedure with explicit steps and expected result.
Typical sections:
- Purpose
- Preconditions
- Inputs
- Steps
- Validation and expected result
- Escalation
- Related documents

### instruction
Use when the document explains how to perform one specific task, use one tool, or act in one narrow scenario.
Typical sections:
- When to use
- Required access and tools
- Steps
- Common errors
- What to do if failed
- Related documents

### checklist
Use when the document is primarily a verification or completion list.
Typical sections:
- Purpose
- When used
- Checklist items
- Completion criteria
- Escalation contact

### incident
Use when the document covers a failure, risk event, exception scenario, or recovery sequence.
Typical sections:
- Incident type
- Symptoms and trigger
- Immediate actions
- Restrictions and what not to do
- Escalation
- Recovery
- Post-incident follow-up
- Related documents

### decision-log
Use when the document records a decision, context, alternatives, reasoning, and affected docs or processes.
Typical sections:
- Decision
- Context
- Alternatives considered
- Why chosen
- Effective date
- Affected documents

## Domain structure

Top-level domains:
- company
- sales
- stores
- product
- returns-and-warranty
- cash
- hr
- marketing
- loyalty
- crm
- operations
- analytics
- decisions
- glossary

### Routing rules
When placing a document, determine in this order:
1. primary business domain
2. document type
3. scope
4. subdomain
5. final path

### Folder creation rules
Create a new subdomain or folder only if:
- at least 3 documents are expected in that cluster
- the topic is stable and recurring
- the topic has distinct operational meaning
- the topic cannot be cleanly placed inside an existing subdomain

Do not create a new folder if:
- the content is just a variation of an existing doc
- the difference is only store-specific wording
- the content can be a section in an existing canonical doc
- the topic is temporary or one-off

## Naming rules

Use:
`<type-prefix>-<scope>-<topic>.md`

Examples:
- policy-company-customer-service-standards.md
- reg-store-daily-operations.md
- sop-store-opening-shift.md
- instruction-prro-offline-mode.md
- checklist-store-closing.md
- incident-prro-connection-loss.md
- decision-log-outline-sync-model.md

Prefixes:
- policy-
- reg-
- sop-
- instruction-
- checklist-
- incident-
- decision-log-

Slug rules:
- lowercase only
- latin only
- words separated by hyphens
- no spaces
- no date in slug unless required for incident record or decision log

Title rules:
- titles must be human-readable and operational
- do not use file names as headings

## Required metadata
Every canonical document must include frontmatter.

Required fields:
- title
- type
- status
- owner
- domain
- subdomain
- scope
- summary
- related_documents
- approval_required
- ai_generated
- source_of_truth

Recommended fields:
- last_reviewed_at
- canonical_path
- tags
- supersedes
- superseded_by

Unknown metadata rule:
- use TODO
- do not invent
- keep document in draft or review state
- explicitly flag missing fields

## Status model
Allowed statuses:
- draft
- review
- approved
- active
- deprecated
- archived

## Quality rules
Hard rules:
- Never create a new document before checking whether a related or overlapping document already exists.
- Prefer updating an existing canonical document over creating a near-duplicate.
- Do not mix policy-level content with detailed SOP content.
- Do not let incident docs become permanent substitutes for policy, regulation, SOP, or instruction docs.
- Every new operational doc must identify scope and owner.
- Every meaningful doc should link to related docs where applicable.
- If two docs overlap, propose deduplication or merge.
- If a document conflicts with an approved canonical doc, raise a conflict instead of silently resolving it.
- Avoid placeholder pages with no operational value.
- Avoid structure sprawl and unnecessary taxonomy.

Before creating any new document, check:
- title overlap
- slug overlap
- summary overlap
- related docs overlap
- same-process coverage in adjacent domains

## Lint checks
The lint mode must detect at least the following:

### Structural issues
- orphan pages
- broken internal links
- missing related docs
- wrong domain placement
- wrong type selection
- unnecessary new folders
- weak or empty overview pages

### Content issues
- duplicate pages
- near-duplicate content
- contradictions between docs
- outdated process references
- site and wiki inconsistency
- mixed abstraction levels
- framework documents with too much procedural detail
- incident documents duplicating evergreen process content

### Metadata issues
- missing owner
- missing status
- missing summary
- missing approval_required
- missing source_of_truth
- invalid type
- invalid domain
- invalid path and title mismatch

### Governance issues
- repo and Outline divergence
- active docs with critical TODO markers
- deprecated docs still referenced as active
- no review date on important docs
- canonical doc not clearly identifiable

### Procedure quality issues
- SOP without preconditions
- SOP without expected result
- instruction without failure handling
- checklist without completion criteria
- regulation without control points
- incident without escalation path

## Style rules
Default language:
- Ukrainian

Default style:
- dry
- structured
- explicit
- operational
- unambiguous

Rules:
- no fluff
- no marketing tone
- no invented facts
- no vague abstractions when action statements are possible
- if data is missing, write TODO
- prefer short sections
- prefer numbered steps in procedures
- prefer concrete labels and responsibilities

## Change workflow

### Create workflow
1. determine intent
2. search for existing canonical or overlapping docs
3. choose document type
4. choose target domain, subdomain, and path
5. create draft with required metadata
6. add related docs
7. flag TODO where information is missing
8. produce proposed content
9. log the change

### Update workflow
1. locate canonical doc
2. identify stale or target sections
3. propose targeted changes
4. apply minimal edit set
5. verify related docs for the same stale claim
6. update metadata if needed
7. log the change

### Lint workflow
1. scan structure
2. scan content
3. scan metadata
4. group findings by severity
5. propose fixes
6. do not auto-fix semantic conflicts unless explicitly requested

### Sync workflow
1. confirm canonical repo change exists
2. validate metadata and path
3. prepare sync or publish action
4. flag any divergence with Outline
5. never publish Outline-only canonical changes

## Confirmation rules
The skill may auto-apply without extra confirmation only for:
- typo fixes
- formatting cleanup
- broken internal links
- metadata normalization
- adding missing related links
- safe path and name normalization when no meaning changes

The skill must stop and ask for confirmation if:
- document type changes
- canonical doc changes
- two docs need merge, delete, or deduplication
- approved doc meaning changes
- policy or regulation changes affect process logic
- a mass refactor is required

## Non-goals
This skill does not:
- invent business rules
- invent approvals
- treat Outline as canonical
- create random folders without structure need
- create a new document when an existing one should be updated
- write internal docs in marketing language
- silently resolve contradictions in approved docs
