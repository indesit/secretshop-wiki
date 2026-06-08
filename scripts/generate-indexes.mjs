#!/usr/bin/env node
/**
 * generate-indexes.mjs
 * Updates section index.md pages from actual documents in subdirectories.
 *
 * Scope (intentionally explicit — curated landing pages are never touched):
 *   1. ROOTS         — sections whose "## Документи розділу" table is owned by
 *                      this script and regenerated on every run.
 *   2. marker pages  — any folder whose index.md still carries the legacy
 *                      "<!-- TODO: add document list table -->" stub marker.
 *
 * Behaviour per in-scope section:
 *   - has documents → render/replace the "## Документи розділу" table;
 *   - no documents  → strip the leftover TODO marker (the section's own
 *                     "in progress" NOTE already informs the reader), do not
 *                     inject an empty block.
 * Idempotent: a second run produces no diff.
 *
 * Pages with hand-curated document blocks (e.g. company/, cash/cash-discipline/
 * with thematic sub-grouping) are deliberately NOT listed in ROOTS and contain
 * no marker, so they are left untouched.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')

const MARKER = '<!-- TODO: add document list table -->'
const MANAGED_HEADING = '## Документи розділу'

const ROOTS = [
  'product/transfers',
  'returns-and-warranty',
  'returns-and-warranty/returns',
  'returns-and-warranty/exchange',
  'returns-and-warranty/warranty',
  'returns-and-warranty/expertise',
  'returns-and-warranty/customer-claims',
]

const TYPE_LABELS = {
  checklist: 'Чеклісти',
  sop: 'SOP',
  instruction: 'Інструкції',
  regulation: 'Регламенти',
  policy: 'Політики',
  incident: 'Інциденти',
}

const TYPE_ORDER = ['checklist', 'sop', 'instruction', 'regulation', 'policy', 'incident']

function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return {}
  const lines = match[1].split('\n')
  const result = {}
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    if (!key || key.startsWith('-') || key.startsWith('#')) continue
    let value = line.slice(colonIdx + 1).trim()
    if (/^[|>][-+]?$/.test(value)) {
      // YAML block scalar (e.g. "title: >-") — gather the indented continuation.
      const baseIndent = line.search(/\S/)
      const collected = []
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j]
        if (l.trim() === '') { collected.push(''); continue }
        if (l.search(/\S/) <= baseIndent) break
        collected.push(l.trim())
        i = j
      }
      value = collected.join(' ').trim()
    } else {
      value = value.replace(/^['"]|['"]$/g, '')
    }
    result[key] = value
  }
  return result
}

function readFM(path) {
  return parseFrontmatter(readFileSync(path, 'utf-8'))
}

function linkFromPath(rootRel, fileName) {
  return '/' + join(rootRel, fileName).replace(/\\/g, '/').replace(/\.md$/, '')
}

function collectDocs(rootRel) {
  const dir = join(DOCS_DIR, rootRel)
  const docs = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (!statSync(full).isFile()) continue
    if (!entry.endsWith('.md') || entry === 'index.md') continue
    const fm = readFM(full)
    docs.push({
      type: (fm.type || '').toLowerCase(),
      title: fm.title || basename(entry, '.md'),
      link: linkFromPath(rootRel, entry),
    })
  }
  return docs
}

function buildDocsBlock(rootRel) {
  const docs = collectDocs(rootRel)
  const grouped = new Map()
  for (const doc of docs) {
    if (!grouped.has(doc.type)) grouped.set(doc.type, [])
    grouped.get(doc.type).push(doc)
  }

  const parts = [MANAGED_HEADING, '']
  for (const type of TYPE_ORDER) {
    const items = grouped.get(type) || []
    if (!items.length) continue
    parts.push(`### ${TYPE_LABELS[type] || type}`)
    parts.push('')
    items.sort((a, b) => a.title.localeCompare(b.title, 'uk'))
    for (const item of items) parts.push(`- [${item.title}](${item.link})`)
    parts.push('')
  }

  return parts.join('\n').trim() + '\n'
}

/** Every folder under docs/ whose index.md still carries the stub marker. */
function discoverMarkerRoots() {
  const roots = []
  const walk = (relDir) => {
    const abs = join(DOCS_DIR, relDir)
    for (const entry of readdirSync(abs)) {
      const full = join(abs, entry)
      if (!statSync(full).isDirectory()) continue
      const childRel = relDir ? `${relDir}/${entry}` : entry
      const indexPath = join(full, 'index.md')
      if (existsSync(indexPath) && readFileSync(indexPath, 'utf-8').includes(MARKER)) {
        roots.push(childRel)
      }
      walk(childRel)
    }
  }
  walk('')
  return roots
}

function endWithSingleNewline(text) {
  return text.replace(/\s*$/, '') + '\n'
}

const inScope = [...new Set([...ROOTS, ...discoverMarkerRoots()])].sort()

let updated = 0
for (const rootRel of inScope) {
  const indexPath = join(DOCS_DIR, rootRel, 'index.md')
  if (!existsSync(indexPath)) continue
  const content = readFileSync(indexPath, 'utf-8')
  const hasDocs = collectDocs(rootRel).length > 0

  let next
  if (hasDocs) {
    const docsBlock = buildDocsBlock(rootRel)
    if (new RegExp(`${MANAGED_HEADING}[\\s\\S]*$`, 'm').test(content)) {
      next = content.replace(new RegExp(`${MANAGED_HEADING}[\\s\\S]*$`, 'm'), docsBlock)
    } else if (content.includes(MARKER)) {
      next = content.replace(MARKER, docsBlock.trim())
    } else {
      next = content.trimEnd() + '\n\n' + docsBlock
    }
  } else {
    // Empty section: just drop the leftover dev marker.
    if (!content.includes(MARKER)) continue
    next = content.replace(MARKER, '')
  }

  next = endWithSingleNewline(next)
  if (next !== content) {
    writeFileSync(indexPath, next)
    updated++
    console.log(`✅ Index updated → ${relative(process.cwd(), indexPath)}`)
  }
}

console.log(updated ? `Done: ${updated} index page(s) updated.` : 'Done: indexes already up to date.')
