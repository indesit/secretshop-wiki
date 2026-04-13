# Frontmatter schema

## Required fields

```yaml
---
title: "TODO"
type: "TODO"
status: "draft"
owner: "TODO"
domain: "TODO"
subdomain: "TODO"
scope: "TODO"
summary: "TODO"
related_documents: []
approval_required: true
ai_generated: true
source_of_truth: "repo"
last_reviewed_at: "TODO"
canonical_path: "TODO"
---
```

## Field rules

### title
Human-readable title.
Do not use file slug as title.

### type
Allowed:
- policy
- regulation
- sop
- instruction
- checklist
- incident
- decision-log

### status
Allowed:
- draft
- review
- approved
- active
- deprecated
- archived

### owner
Responsible function, role, or team.
If unknown: TODO
Do not invent.

### domain
Top-level domain. Must match allowed taxonomy.

### subdomain
Operational subdomain within the domain.
If unresolved: TODO

### scope
Recommended values:
- company-wide
- store-level
- role-level
- system-level
- campaign-level

### summary
Short operational summary.
One or two sentences.

### related_documents
Array of canonical related slugs or file IDs.
If unknown, keep empty and add TODO in body when relevant.

### approval_required
Boolean.
Default true for canonical docs.

### ai_generated
Boolean.
Set true when initial content or structure is produced by AI.

### source_of_truth
Must be `repo` for canonical docs.

### last_reviewed_at
Date or TODO.

### canonical_path
Repo path to the canonical file.

## Missing data policy

If data is unknown:
- use TODO
- keep doc in draft or review
- do not invent owner, approval state, effective date, or related docs

## Validation checks

Invalid if:
- type is outside enum
- status is outside enum
- source_of_truth is not repo for canonical docs
- required field is missing
- domain does not match taxonomy
- canonical_path does not match actual path
