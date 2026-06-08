#!/usr/bin/env node
/**
 * check-todo-budget.mjs
 * Guards against growth of content-level TODO debt. Counts "TODO" occurrences in
 * docs/ excluding docs/templates/ (where TODO placeholders are part of the
 * template design). Fails if the count exceeds BUDGET — the budget is a ratchet:
 * it should only ever be lowered as debt is paid down, never raised.
 *
 * Baseline captured 2026-06-08 after clearing the index stub markers (B-10).
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')
const SKIP_DIRS = new Set(['.vitepress', 'public', 'node_modules', 'templates'])

const BUDGET = 89

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
let total = 0
const perFile = []
for (const file of files) {
  const count = (readFileSync(file, 'utf-8').match(/TODO/g) || []).length
  if (count) {
    total += count
    perFile.push({ rel: relative(DOCS_DIR, file), count })
  }
}

console.log(`TODO debt (excluding templates/): ${total} / budget ${BUDGET}`)

if (total <= BUDGET) {
  if (total < BUDGET) {
    console.log(`💡 Debt is below budget. Lower BUDGET in scripts/check-todo-budget.mjs to ${total} to ratchet.`)
  }
  console.log('✅ TODO budget check passed.')
  process.exit(0)
}

console.error(`\n🚨 TODO budget exceeded (+${total - BUDGET}). New content-level TODOs must be resolved, not committed.\n`)
perFile.sort((a, b) => b.count - a.count)
for (const f of perFile.slice(0, 15)) console.error(`   ${f.count.toString().padStart(3)}  ${f.rel}`)
process.exit(1)
