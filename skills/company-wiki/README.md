# Company Wiki Skill Pack

Repo-first skill pack for managing the Secret Shop corporate wiki.

## Purpose

This package helps an agent:
- create new wiki documents in the correct format
- update existing canonical documents
- lint the wiki for duplicates, contradictions, broken links, and structural drift
- decide correct document placement
- prepare repo-first sync workflows for Outline

## Key rule

- Repo is the source of truth.
- Outline is a consumption layer.
- If repo and Outline diverge, repo wins.

## Files

- `SKILL.md` - primary skill rules and operating model
- `CLAUDE.md` - working behavior and priorities for the agent
- `TAXONOMY.md` - document types, domain routing, and anti-patterns
- `FRONTMATTER_SCHEMA.md` - metadata schema and validation rules
- `LINT_RULES.md` - lint checks, severity model, and auto-fix policy
- `ROUTING_RULES.md` - placement logic for documents
- `TEMPLATES/` - templates for canonical document types
- `EXAMPLES/` - sample documents demonstrating expected output quality

## Recommended operating sequence

When handling a wiki request, the agent should:
1. determine whether this is create, update, lint, structure, or sync
2. search for overlapping existing docs
3. identify canonical doc if it already exists
4. choose correct type and path
5. create or update only what is needed
6. preserve repo-first governance

## Safe defaults

- language: Ukrainian
- style: dry, structured, operational
- missing values: TODO
- no invented metadata
- prefer update over duplicate creation

## Minimal MVP usage

Start with these four capabilities:
- company-wiki-lint
- company-wiki-structure
- company-wiki-update
- company-wiki-author

Add sync behavior only after repo-first governance is stable.
