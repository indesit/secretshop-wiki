# Repo operations

## Canonical repo layout

The canonical wiki content lives in:
- `docs/` — all knowledge base content
- `docs/templates/` — source templates used by the wiki repo itself

Skill package lives separately in:
- `skills/company-wiki/`

## Core repo-first rule

Always treat the repo as canonical.
If Outline differs from repo:
- flag divergence
- propose reconciliation
- do not silently import Outline-only content into canonical docs

## New document workflow

Create new canonical docs through the scaffold script, not by freehand file creation.

Use:
```bash
node scripts/new-doc.mjs \
  --type <type> \
  --domain <domain> \
  --subdomain <subdomain> \
  --slug <slug> \
  --title "<Title>"
```

Rules:
- new canonical docs default to `status: draft`
- new canonical docs default to `approval_required: true`
- if title contains punctuation like `:`, keep it quoted in frontmatter

## Validation and generated files

After structural or content changes, run the relevant repo checks.

### Minimum validation
```bash
npm run validate
```

### When structure or navigation changes
Run:
```bash
npm run generate-sidebar
npm run generate-indexes
npm run validate
```

### Full sync check
```bash
npm run sync-docs
```

## When to run what

Run `npm run validate` when:
- frontmatter changed
- a document was created
- a document was updated

Run `npm run generate-sidebar` and `npm run generate-indexes` when:
- a file was added
- a file was moved
- a file was renamed
- an `index.md` page changed structurally
- a section was added or removed

## Commit discipline

After meaningful edits:
- stage only relevant files
- commit with a focused message
- do not mix unrelated wiki changes in one commit

Good commit examples:
- `docs(sales): add birthday customer communication regulation`
- `docs(company): refine company-wiki skill structure`
- `docs(returns): align return policy wording`

## Safe defaults

- prefer minimal edits
- prefer update over duplicate creation
- keep generated files consistent with source changes
- do not rewrite approved docs broadly unless required
- if uncertain, stop and flag ambiguity instead of guessing
