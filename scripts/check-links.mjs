#!/usr/bin/env node
/**
 * check-links.mjs
 * Verifies that every `related_documents` entry across the wiki resolves to an
 * existing document. Supports the two frontmatter shapes in use:
 *
 *   related_documents:            related_documents: [/a/b, /c/d]
 *     - /domain/subdomain/slug    related_documents: []
 *
 * Values are canonical paths relative to docs/ (leading slash, no .md), and may
 * point either at a document file (…/slug.md) or a section (…/dir → index.md).
 * Relative values (./… or ../…) are resolved against the document's folder.
 *
 * Exits 1 (with a list of unresolved links) so it can gate CI.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname, dirname, posix } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')
const SKIP_DIRS = new Set(['.vitepress', 'public', 'node_modules'])

function collectMarkdownFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) collectMarkdownFiles(full, files)
    } else if (extname(entry) === '.md') {
      files.push(full)
    }
  }
  return files
}

const files = collectMarkdownFiles(DOCS_DIR)

// Set of every resolvable canonical key, e.g. "/cash/receipts/reg-receipt-types"
// and (for index.md) the bare section key "/cash/receipts".
const known = new Set()
for (const file of files) {
  const rel = '/' + relative(DOCS_DIR, file).replace(/\\/g, '/').replace(/\.md$/, '')
  known.add(rel)
  if (rel.endsWith('/index')) known.add(rel.replace(/\/index$/, ''))
}

function extractRelatedDocuments(content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const lines = fmMatch[1].split('\n')
  const out = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^related_documents:\s*(.*)$/)
    if (!m) continue
    const inline = m[1].trim()
    if (inline.startsWith('[')) {
      // inline array: [] or [/a, /b]
      const inner = inline.replace(/^\[|\]$/g, '').trim()
      if (inner) out.push(...inner.split(',').map((s) => s.trim()).filter(Boolean))
    } else {
      // block list: subsequent "  - value" lines
      for (let j = i + 1; j < lines.length; j++) {
        const item = lines[j].match(/^\s+-\s+(.*\S)\s*$/)
        if (!item) break
        out.push(item[1].trim())
      }
    }
    break
  }
  return out.map((v) => v.replace(/^['"]|['"]$/g, ''))
}

function normalize(value, docRel) {
  let v = value.replace(/\.md$/, '')
  if (v.startsWith('./') || v.startsWith('../')) {
    const baseDir = posix.dirname('/' + docRel.replace(/\\/g, '/'))
    v = posix.normalize(posix.join(baseDir, v))
  }
  if (!v.startsWith('/')) v = '/' + v
  return v.replace(/\/$/, '')
}

let broken = 0
const report = []
for (const file of files) {
  const relPath = relative(DOCS_DIR, file)
  const related = extractRelatedDocuments(readFileSync(file, 'utf-8'))
  const bad = related.filter((v) => !known.has(normalize(v, relPath)))
  if (bad.length) {
    broken += bad.length
    report.push(`❌ [${relPath}]\n   ${bad.map((b) => `unresolved related_documents: ${b}`).join('\n   ')}`)
  }
}

if (broken === 0) {
  console.log(`✅ Link check passed. Verified related_documents across ${files.length} files.`)
  process.exit(0)
} else {
  console.error(`\n🚨 Link check FAILED with ${broken} unresolved link(s):\n`)
  for (const r of report) console.error(r)
  console.error(`\nTotal files checked: ${files.length}`)
  process.exit(1)
}
