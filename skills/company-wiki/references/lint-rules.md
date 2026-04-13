# Lint rules

## Severity model

### critical
Use when the issue affects canonical truth, creates serious contradiction, or can mislead execution.
Examples:
- two approved docs contradict each other
- repo and Outline diverge on active process logic
- active doc points to deprecated replacement incorrectly

### major
Use when the issue damages structure or operational usefulness.
Examples:
- duplicate or near-duplicate docs
- wrong domain placement
- missing owner or status
- broken link from active doc

### minor
Use when the issue is real but not immediately dangerous.
Examples:
- weak summary
- missing related docs
- inconsistent heading structure
- missing last_reviewed_at

### hygiene
Use for formatting and low-risk cleanup.
Examples:
- typo
- inconsistent list style
- redundant spacing

## Duplicate detection

### Duplicate page
Same or nearly same title, purpose, and process coverage.
Preferred fix:
- keep canonical doc
- merge useful content
- deprecate or archive duplicate

### Near-duplicate content
Substantial overlap in process logic, even if naming differs.
Preferred fix:
- compare scope
- decide canonical doc
- merge or split cleanly

## Contradiction detection

Flag when two canonical docs:
- prescribe different steps for the same process
- assign different owners for the same responsibility
- define incompatible rules, timing, or control points

Do not auto-resolve semantic contradiction in approved docs.
Raise for review.

## Structural checks

Must detect:
- orphan docs
- broken internal links
- wrong domain placement
- unnecessary folder creation
- empty overview docs
- path naming rule violations

## Metadata checks

Must detect:
- missing required frontmatter
- invalid type
- invalid status
- missing source_of_truth
- missing owner
- missing summary
- path and canonical_path mismatch

## Content checks

Must detect:
- policy mixed with SOP-level detail
- incident doc duplicating evergreen process doc
- checklist used where SOP is needed
- SOP without preconditions
- SOP without expected result
- instruction without failure handling
- regulation without control points
- active doc with critical TODO markers

## Drift checks

Must detect:
- outdated system names
- outdated role names
- references to replaced processes
- site and wiki inconsistency where known
- Outline and repo divergence markers

## Auto-fix policy

Safe auto-fix allowed for:
- broken internal link with obvious target
- formatting normalization
- metadata normalization when values are known
- typo fixes

Do not auto-fix without approval for:
- semantic merge
- conflict resolution
- type change
- domain move with structural impact
- canonical doc replacement
