#!/usr/bin/env node
/**
 * validate-frontmatter.mjs
 * Validates frontmatter fields in all Wiki markdown documents.
 * Exits with code 1 if any errors are found.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')

const SKIP_DIRS = new Set(['.vitepress', 'public', 'node_modules'])
const SKIP_FILES = new Set(['index.md']) // top-level section indexes use approved status directly

const ALLOWED_TYPES = new Set([
  'policy', 'regulation', 'sop', 'instruction', 'checklist', 'template', 'incident'
])
const ALLOWED_STATUSES = new Set(['draft', 'approved', 'archived'])
const REQUIRED_FIELDS = ['title', 'type', 'status', 'owner', 'domain']

// Parse YAML frontmatter manually (without external dependency at CI time)
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!match) return null

  const yaml = match[1]
  const result = {}

  for (const line of yaml.split('\n')) {
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const key = line.slice(0, colonIdx).trim()
    const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && !key.startsWith('-') && !key.startsWith('#')) {
      result[key] = value
    }
  }

  return result
}

// Recursively collect all .md files
function collectMarkdownFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) {
        collectMarkdownFiles(fullPath, files)
      }
    } else if (extname(entry) === '.md') {
      files.push(fullPath)
    }
  }
  return files
}

let errorCount = 0
const errors = []

const files = collectMarkdownFiles(DOCS_DIR)

for (const filePath of files) {
  const relPath = relative(DOCS_DIR, filePath)

  // Skip VitePress special files and home page
  if (relPath === 'index.md') continue

  const content = readFileSync(filePath, 'utf-8')
  const fm = parseFrontmatter(content)

  if (!fm) {
    errors.push(`❌ [${relPath}] Missing frontmatter`)
    errorCount++
    continue
  }

  const fileErrors = []

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!fm[field]) {
      fileErrors.push(`Missing required field: "${field}"`)
    }
  }

  // Validate type
  if (fm.type && !ALLOWED_TYPES.has(fm.type)) {
    fileErrors.push(`Invalid type: "${fm.type}". Allowed: ${[...ALLOWED_TYPES].join(', ')}`)
  }

  // Validate status
  if (fm.status && !ALLOWED_STATUSES.has(fm.status)) {
    fileErrors.push(`Invalid status: "${fm.status}". Allowed: ${[...ALLOWED_STATUSES].join(', ')}`)
  }

  if (fileErrors.length > 0) {
    errors.push(`❌ [${relPath}]\n   ${fileErrors.join('\n   ')}`)
    errorCount += fileErrors.length
  }
}

if (errorCount === 0) {
  console.log(`✅ Frontmatter validation passed. Checked ${files.length} files.`)
  process.exit(0)
} else {
  console.error(`\n🚨 Frontmatter validation FAILED with ${errorCount} error(s):\n`)
  for (const e of errors) {
    console.error(e)
  }
  console.error(`\nTotal files checked: ${files.length}`)
  process.exit(1)
}
