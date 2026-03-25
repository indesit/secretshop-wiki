#!/usr/bin/env node
/**
 * new-doc.mjs
 * Interactive CLI to scaffold a new wiki document from a template.
 *
 * Usage: node scripts/new-doc.mjs
 *    or: node scripts/new-doc.mjs --type sop --domain stores --subdomain technical-issues --slug sop-power-outage --title "Порядок дій при відключенні електроенергії"
 */

import { createInterface } from 'readline'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')
const DOCS_DIR = join(ROOT, 'docs')
const TEMPLATES_DIR = join(DOCS_DIR, 'templates')

const TODAY = new Date().toISOString().split('T')[0]

const ALLOWED_TYPES = ['policy', 'regulation', 'sop', 'instruction', 'checklist', 'template', 'incident']
const ALLOWED_DOMAINS = ['company', 'stores', 'product', 'returns-and-warranty', 'sales', 'cash', 'hr']

const TEMPLATE_MAP = {
  sop: 'sop-template.md',
  policy: 'policy-template.md',
  regulation: 'regulation-template.md',
  instruction: 'sop-template.md',
  checklist: 'checklist-template.md',
  incident: 'incident-template.md',
  template: 'decision-log-template.md',
}

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      result[args[i].slice(2)] = args[i + 1]
      i++
    }
  }
  return result
}

// Ask a question in the terminal
function ask(rl, question, defaultValue = '') {
  return new Promise((resolve) => {
    const prompt = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `
    rl.question(prompt, (answer) => {
      resolve(answer.trim() || defaultValue)
    })
  })
}

async function main() {
  const cliArgs = parseArgs()

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  console.log('\n📝 Company Wiki — New Document Scaffold\n')

  const type = cliArgs.type || await ask(rl, `Document type (${ALLOWED_TYPES.join(' | ')})`, 'sop')
  if (!ALLOWED_TYPES.includes(type)) {
    console.error(`❌ Invalid type: "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}`)
    process.exit(1)
  }

  const domain = cliArgs.domain || await ask(rl, `Domain (${ALLOWED_DOMAINS.join(' | ')})`, 'stores')
  if (!ALLOWED_DOMAINS.includes(domain)) {
    console.error(`❌ Invalid domain: "${domain}". Allowed: ${ALLOWED_DOMAINS.join(', ')}`)
    process.exit(1)
  }

  const subdomain = cliArgs.subdomain || await ask(rl, 'Subdomain (subfolder, e.g. technical-issues)', '')
  const slug = cliArgs.slug || await ask(rl, 'File slug (kebab-case, no .md, e.g. sop-power-outage)', '')

  if (!slug) {
    console.error('❌ Slug is required.')
    process.exit(1)
  }

  const title = cliArgs.title || await ask(rl, 'Document title (Ukrainian)', `Назва документа`)
  const owner = cliArgs.owner || await ask(rl, 'Owner', 'Anton')
  const scope = cliArgs.scope || await ask(rl, 'Scope', 'all-stores')

  rl.close()

  // Build output path
  const relDir = subdomain ? `${domain}/${subdomain}` : domain
  const outputDir = join(DOCS_DIR, relDir)
  const outputFile = join(outputDir, `${slug}.md`)

  if (existsSync(outputFile)) {
    console.error(`❌ File already exists: ${outputFile}`)
    process.exit(1)
  }

  // Load template
  const templateFile = join(TEMPLATES_DIR, TEMPLATE_MAP[type])
  const template = readFileSync(templateFile, 'utf-8')

  // Replace frontmatter placeholders
  const content = template
    .replace(/^title: .*$/m, `title: ${title}`)
    .replace(/^type: .*$/m, `type: ${type}`)
    .replace(/^status: .*$/m, `status: draft`)
    .replace(/^owner: .*$/m, `owner: ${owner}`)
    .replace(/^last_reviewed: .*$/m, `last_reviewed: ${TODAY}`)
    .replace(/^effective_from: .*$/m, `effective_from: ${TODAY}`)
    .replace(/^domain: .*$/m, `domain: ${domain}`)
    .replace(/^subdomain: .*$/m, `subdomain: ${subdomain || type}`)
    .replace(/^scope: .*$/m, `scope: ${scope}`)
    .replace(/^ai_generated: .*$/m, `ai_generated: false`)
    .replace(/^source_of_truth: .*$/m, `source_of_truth: manual`)
    // Replace heading
    .replace(/^# .*$/m, `# ${title}`)

  // Write file
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(outputFile, content, 'utf-8')

  const displayPath = `docs/${relDir}/${slug}.md`

  console.log(`\n✅ Document created!`)
  console.log(`   Path:   ${displayPath}`)
  console.log(`   Type:   ${type}`)
  console.log(`   Status: draft`)
  console.log(`   Owner:  ${owner}`)
  console.log(`\n📋 Next steps:`)
  console.log(`   1. Fill in the document content`)
  console.log(`   2. git add ${displayPath}`)
  console.log(`   3. git commit -m "docs(${domain}): add ${slug}"`)
  console.log(`   4. Create PR and request review from ${owner}`)
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})
