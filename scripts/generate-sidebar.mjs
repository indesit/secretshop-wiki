#!/usr/bin/env node
/**
 * generate-sidebar.mjs
 * Generates a VitePress sidebar config from the docs/ directory structure
 * and frontmatter titles. Output: .vitepress/generated-sidebar.json
 *
 * Usage: node scripts/generate-sidebar.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, extname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')
const OUTPUT_PATH = join(__dirname, '..', 'docs', '.vitepress', 'generated-sidebar.json')

const SKIP_DIRS = new Set(['.vitepress', 'public', 'node_modules'])
const TOP_LEVEL_SECTIONS = [
  'company', 'stores', 'product', 'returns-and-warranty',
  'sales', 'cash', 'hr', 'templates', 'glossary'
]

const TYPE_LABELS = {
  policy: 'Політика',
  regulation: 'Регламент',
  sop: 'SOP',
  instruction: 'Інструкція',
  checklist: 'Чекліст',
  incident: 'Інцидент',
  template: 'Шаблон',
}

const TYPE_ICONS = {
  policy: '🛡️',
  regulation: '📘',
  sop: '🧭',
  instruction: '📝',
  checklist: '✅',
  incident: '🚨',
  default: '📄',
  section: '📁',
  overview: '🏠',
}

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

function readFrontmatter(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return parseFrontmatter(content)
  } catch {
    return {}
  }
}

function getDocMeta(filePath) {
  const fm = readFrontmatter(filePath)
  return {
    title: fm.title || basename(filePath, '.md'),
    type: (fm.type || '').toLowerCase(),
  }
}

function prefixTitle(title, type, isSection = false) {
  if (isSection) return `${TYPE_ICONS.section} ${title}`
  const icon = TYPE_ICONS[type] || TYPE_ICONS.default
  return `${icon} ${title}`
}

function cleanupTitle(title, type) {
  const typeLabel = TYPE_LABELS[type]
  if (!typeLabel) return title

  const patterns = [
    new RegExp(`^${typeLabel}:\\s*`, 'i'),
    new RegExp(`^${type.toUpperCase()}:\\s*`, 'i'),
  ]

  let cleaned = title
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '')
  }
  return cleaned
}

function toVitePressLink(filePath) {
  const rel = relative(DOCS_DIR, filePath)
  return '/' + rel.replace(/\.md$/, '').replace(/\/index$/, '/')
}

function sortEntries(a, b) {
  return a.localeCompare(b, 'uk')
}

function buildSectionItems(sectionDir) {
  const items = []

  try {
    const entries = readdirSync(sectionDir).sort(sortEntries)

    for (const entry of entries) {
      const fullPath = join(sectionDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && !SKIP_DIRS.has(entry)) {
        const subItems = buildSectionItems(fullPath)
        const indexPath = join(fullPath, 'index.md')
        const subMeta = existsSync(indexPath)
          ? getDocMeta(indexPath)
          : { title: entry, type: '' }

        items.push({
          text: prefixTitle(cleanupTitle(subMeta.title, subMeta.type), subMeta.type, true),
          collapsed: false,
          items: subItems,
        })
      } else if (extname(entry) === '.md' && entry !== 'index.md') {
        const meta = getDocMeta(fullPath)
        items.push({
          text: prefixTitle(cleanupTitle(meta.title, meta.type), meta.type),
          link: toVitePressLink(fullPath),
        })
      }
    }
  } catch (e) {
    console.warn(`Warning: Could not read ${sectionDir}: ${e.message}`)
  }

  return items
}

const sidebar = {}

for (const section of TOP_LEVEL_SECTIONS) {
  const sectionDir = join(DOCS_DIR, section)
  const sectionKey = `/${section}/`
  const indexPath = join(sectionDir, 'index.md')
  const sectionMeta = getDocMeta(indexPath)
  const sectionTitle = sectionMeta.title || section

  const items = buildSectionItems(sectionDir)

  sidebar[sectionKey] = [
    {
      text: sectionTitle,
      items: [
        { text: `${TYPE_ICONS.overview} Огляд`, link: sectionKey },
        ...items,
      ],
    },
  ]
}

writeFileSync(OUTPUT_PATH, JSON.stringify(sidebar, null, 2), 'utf-8')
console.log(`✅ Sidebar config generated → ${OUTPUT_PATH}`)
console.log(`   Sections: ${Object.keys(sidebar).join(', ')}`)
