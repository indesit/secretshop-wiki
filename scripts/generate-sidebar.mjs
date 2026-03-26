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

const TYPE_ORDER = {
  checklist: 1,
  sop: 2,
  instruction: 3,
  regulation: 4,
  policy: 5,
  incident: 6,
  template: 7,
  '': 99,
}

const SECTION_ORDER = {
  'returns-and-warranty': ['returns', 'exchange', 'warranty', 'expertise', 'customer-claims'],
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
  for (const pattern of patterns) cleaned = cleaned.replace(pattern, '')
  return cleaned
}

function toVitePressLink(filePath) {
  const rel = relative(DOCS_DIR, filePath)
  return '/' + rel.replace(/\.md$/, '').replace(/\/index$/, '/')
}

function sortText(a, b) {
  return a.localeCompare(b, 'uk')
}

function buildSectionItems(sectionDir, rootSection = null) {
  const items = []

  try {
    let entries = readdirSync(sectionDir)

    const preferredOrder = SECTION_ORDER[rootSection || '']
    if (preferredOrder) {
      entries.sort((a, b) => {
        const ai = preferredOrder.indexOf(a)
        const bi = preferredOrder.indexOf(b)
        if (ai !== -1 || bi !== -1) {
          if (ai === -1) return 1
          if (bi === -1) return -1
          return ai - bi
        }
        return sortText(a, b)
      })
    } else {
      entries.sort(sortText)
    }

    for (const entry of entries) {
      const fullPath = join(sectionDir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory() && !SKIP_DIRS.has(entry)) {
        const subItems = buildSectionItems(fullPath, rootSection)
        const indexPath = join(fullPath, 'index.md')
        const subMeta = existsSync(indexPath)
          ? getDocMeta(indexPath)
          : { title: entry, type: '' }

        items.push({
          kind: 'section',
          key: entry,
          sortType: '',
          text: prefixTitle(cleanupTitle(subMeta.title, subMeta.type), subMeta.type, true),
          collapsed: false,
          items: subItems,
        })
      } else if (extname(entry) === '.md' && entry !== 'index.md') {
        const meta = getDocMeta(fullPath)
        items.push({
          kind: 'doc',
          key: entry,
          sortType: meta.type,
          text: prefixTitle(cleanupTitle(meta.title, meta.type), meta.type),
          link: toVitePressLink(fullPath),
        })
      }
    }
  } catch (e) {
    console.warn(`Warning: Could not read ${sectionDir}: ${e.message}`)
  }

  items.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'section' ? -1 : 1
    if (a.kind === 'section' && b.kind === 'section') return sortText(a.text, b.text)

    const ao = TYPE_ORDER[a.sortType] ?? 99
    const bo = TYPE_ORDER[b.sortType] ?? 99
    if (ao !== bo) return ao - bo
    return sortText(a.text, b.text)
  })

  return items.map(({ kind, key, sortType, ...rest }) => rest)
}

const sidebar = {}

for (const section of TOP_LEVEL_SECTIONS) {
  const sectionDir = join(DOCS_DIR, section)
  const sectionKey = `/${section}/`
  const indexPath = join(sectionDir, 'index.md')
  const sectionMeta = getDocMeta(indexPath)
  const sectionTitle = sectionMeta.title || section

  const items = buildSectionItems(sectionDir, section)

  sidebar[sectionKey] = [{
    text: sectionTitle,
    items: [
      { text: `${TYPE_ICONS.overview} Огляд`, link: sectionKey },
      ...items,
    ],
  }]
}

writeFileSync(OUTPUT_PATH, JSON.stringify(sidebar, null, 2), 'utf-8')
console.log(`✅ Sidebar config generated → ${OUTPUT_PATH}`)
console.log(`   Sections: ${Object.keys(sidebar).join(', ')}`)
