#!/usr/bin/env node
/**
 * generate-indexes.mjs
 * Updates section index.md pages from actual documents in subdirectories.
 * Safe scope: only folders that already contain index.md beneath curated sections.
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')
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
  const yaml = match[1]
  const result = {}
  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && !key.startsWith('-') && !key.startsWith('#')) result[key] = value
  }
  return result
}

function readFM(path) {
  return parseFrontmatter(readFileSync(path, 'utf-8'))
}

function linkFromPath(rootRel, fileName) {
  const joined = '/' + join(rootRel, fileName).replace(/\\/g, '/').replace(/\.md$/, '')
  return joined
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

  const parts = ['## Документи розділу', '']
  let wrote = false
  for (const type of TYPE_ORDER) {
    const items = grouped.get(type) || []
    if (!items.length) continue
    wrote = true
    parts.push(`### ${TYPE_LABELS[type] || type}`)
    parts.push('')
    items.sort((a, b) => a.title.localeCompare(b.title, 'uk'))
    for (const item of items) {
      parts.push(`- [${item.title}](${item.link})`)
    }
    parts.push('')
  }

  if (!wrote) {
    parts.push('> [!NOTE]')
    parts.push('> У цьому розділі документи ще не додані.')
    parts.push('')
  }

  return parts.join('\n').trim() + '\n'
}

for (const rootRel of ROOTS) {
  const indexPath = join(DOCS_DIR, rootRel, 'index.md')
  if (!existsSync(indexPath)) continue
  const content = readFileSync(indexPath, 'utf-8')
  const docsBlock = buildDocsBlock(rootRel)

  let next = content
  if (/## Документи розділу[\s\S]*$/m.test(content)) {
    next = content.replace(/## Документи розділу[\s\S]*$/m, docsBlock)
  } else {
    next = content.trimEnd() + '\n\n' + docsBlock
  }

  writeFileSync(indexPath, next)
  console.log(`✅ Index updated → ${indexPath}`)
}
