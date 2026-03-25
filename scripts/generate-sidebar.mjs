#!/usr/bin/env node
/**
 * generate-sidebar.mjs
 * Generates a VitePress sidebar config from the docs/ directory structure
 * and frontmatter titles. Output: .vitepress/generated-sidebar.json
 *
 * Usage: node scripts/generate-sidebar.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')
const OUTPUT_PATH = join(__dirname, '..', 'docs', '.vitepress', 'generated-sidebar.json')

const SKIP_DIRS = new Set(['.vitepress', 'public', 'node_modules', 'templates'])
const TOP_LEVEL_SECTIONS = [
  'company', 'stores', 'product', 'returns-and-warranty',
  'sales', 'cash', 'hr', 'templates', 'glossary'
]

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
    if (key && !key.startsWith('-') && !key.startsWith('#')) {
      result[key] = value
    }
  }
  return result
}

function getTitle(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const fm = parseFrontmatter(content)
    return fm.title || basename(filePath, '.md')
  } catch {
    return basename(filePath, '.md')
  }
}

function toVitePressLink(filePath) {
  const rel = relative(DOCS_DIR, filePath)
  return '/' + rel.replace(/\.md$/, '').replace(/\/index$/, '/')
}

function buildSectionItems(sectionDir) {
  const items = []

  try {
    const entries = readdirSync(sectionDir).sort()

    for (const entry of entries) {
      const fullPath = join(sectionDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && !SKIP_DIRS.has(entry)) {
        const subItems = buildSectionItems(fullPath)
        const indexPath = join(fullPath, 'index.md')
        const subTitle = getTitle(indexPath)

        items.push({
          text: subTitle,
          collapsed: true,
          items: subItems,
        })
      } else if (extname(entry) === '.md' && entry !== 'index.md') {
        items.push({
          text: getTitle(fullPath),
          link: toVitePressLink(fullPath),
        })
      }
    }
  } catch (e) {
    console.warn(`Warning: Could not read ${sectionDir}: ${e.message}`)
  }

  return items
}

// Build sidebar object
const sidebar = {}

for (const section of TOP_LEVEL_SECTIONS) {
  const sectionDir = join(DOCS_DIR, section)
  const sectionKey = `/${section}/`
  const indexPath = join(sectionDir, 'index.md')
  const sectionTitle = getTitle(indexPath)

  const items = buildSectionItems(sectionDir)

  // Add overview link first
  const allItems = [
    { text: 'Огляд', link: sectionKey },
    ...items,
  ]

  sidebar[sectionKey] = [
    {
      text: sectionTitle,
      items: allItems,
    },
  ]
}

writeFileSync(OUTPUT_PATH, JSON.stringify(sidebar, null, 2), 'utf-8')
console.log(`✅ Sidebar config generated → ${OUTPUT_PATH}`)
console.log(`   Sections: ${Object.keys(sidebar).join(', ')}`)
