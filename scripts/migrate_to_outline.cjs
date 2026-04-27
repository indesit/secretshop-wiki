const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION — read from environment
// ============================================
const OUTLINE_URL = process.env.OUTLINE_URL || 'http://localhost:3000';
const API_TOKEN = process.env.OUTLINE_API_TOKEN;
const DOCS_DIR = path.join(__dirname, '../docs');

if (!API_TOKEN) {
    console.error('ERROR: Set OUTLINE_API_TOKEN environment variable before running.');
    console.error('  export OUTLINE_API_TOKEN="ol_api_..."');
    process.exit(1);
}

const COLLECTIONS = {
    'cash': 'Каса',
    'company': 'Компанія',
    'glossary': 'Глосарій',
    'hr': 'HR',
    'product': 'Товар',
    'returns-and-warranty': 'Повернення та гарантія',
    'sales': 'Продажі',
    'stores': 'Магазини',
    'templates': 'Шаблони'
};

// ============================================
// API helper with retry on rate limit
// ============================================
async function outlineRequest(endpoint, payload, retries = 10) {
    for (let i = 0; i < retries; i++) {
        await new Promise(r => setTimeout(r, 1000));

        const res = await fetch(`${OUTLINE_URL}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_TOKEN}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (res.ok) return data;

        if (res.status === 429) {
            console.warn('[!] Rate limit. Waiting 10s...');
            await new Promise(r => setTimeout(r, 10000));
            continue;
        }
        throw new Error(JSON.stringify(data));
    }
    throw new Error('Rate limit exceeded persistently');
}

// ============================================
// Content cleaners
// ============================================

/** Strip YAML frontmatter block */
function stripFrontmatter(content) {
    return content.replace(/^---\n[\s\S]*?\n---\n/, '');
}

/** Extract governance metadata table from frontmatter */
function extractMetadataTable(rawContent) {
    const fmMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return '';

    const fm = fmMatch[1];
    const rows = [];

    const fields = {
        'status': 'Статус',
        'owner': 'Власник',
        'review_cycle_days': 'Цикл перегляду (днів)',
        'effective_from': 'Діє з',
        'last_reviewed': 'Останній перегляд',
    };

    for (const [key, label] of Object.entries(fields)) {
        const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
        if (m && m[1].trim() && m[1].trim() !== '[]') {
            rows.push(`| ${label} | ${m[1].trim()} |`);
        }
    }

    if (rows.length === 0) return '';
    return '| Параметр | Значення |\n|----------|----------|\n' + rows.join('\n') + '\n\n';
}

/** Convert <RoleCard title="..." subtitle="...">content</RoleCard> → markdown heading + list */
function convertRoleCards(content) {
    return content.replace(
        /<RoleCard\s+title="([^"]+)"\s+subtitle="([^"]+)"\s*>\s*([\s\S]*?)<\/RoleCard>/g,
        (_, title, subtitle, body) => {
            return `### 🏷 ${title} — ${subtitle}\n\n${body.trim()}\n`;
        }
    );
}

/** Convert <EscalationBox title="..." level="...">content</EscalationBox> → blockquote */
function convertEscalationBoxes(content) {
    const levelEmoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' };
    return content.replace(
        /<EscalationBox\s+title="([^"]+)"\s+level="([^"]+)"\s*>\s*([\s\S]*?)<\/EscalationBox>/g,
        (_, title, level, body) => {
            const emoji = levelEmoji[level] || '⚠️';
            return `> ${emoji} **${title}**\n>\n> ${body.trim().split('\n').join('\n> ')}\n`;
        }
    );
}

/** Convert <DecisionRule title="..." verdict="..." tone="...">content</DecisionRule> → blockquote */
function convertDecisionRules(content) {
    return content.replace(
        /<DecisionRule\s+title="([^"]+)"\s+verdict="([^"]+)"\s+tone="([^"]+)"\s*>\s*([\s\S]*?)<\/DecisionRule>/g,
        (_, title, verdict, _tone, body) => {
            return `> **${title}** → *${verdict}*\n>\n> ${body.trim().split('\n').join('\n> ')}\n`;
        }
    );
}

/** Remove <DocumentMeta ... /> — data preserved via metadata table */
function removeDocumentMeta(content) {
    return content.replace(/<DocumentMeta[\s\S]*?\/>/g, '');
}

/** Remove <RelatedDocuments /> — not functional in Outline */
function removeRelatedDocuments(content) {
    return content.replace(/<RelatedDocuments\s*\/>/g, '');
}

/** Remove <IconLucide* ... /> — replace with nothing (inline icons) */
function removeIconComponents(content) {
    return content.replace(/<Icon[A-Za-z]+\s[^>]*\/>/g, '');
}

/** Convert GitHub-style alerts [!NOTE] etc to blockquotes */
function convertGithubAlerts(content) {
    return content.replace(
        /> \[!(NOTE|WARNING|IMPORTANT|TIP|CAUTION)\]\n/gi,
        (_, type) => `> **${type}:**\n`
    );
}

/** Remove any remaining self-closing or unknown Vue tags */
function removeRemainingSelfClosingTags(content) {
    // Only match PascalCase self-closing tags (Vue convention), not standard HTML
    return content.replace(/<[A-Z][a-zA-Z]+\s*[^>]*\/>/g, '');
}

/** Apply all cleaners */
function cleanContent(rawContent) {
    let content = stripFrontmatter(rawContent);

    content = convertRoleCards(content);
    content = convertEscalationBoxes(content);
    content = convertDecisionRules(content);
    content = removeDocumentMeta(content);
    content = removeRelatedDocuments(content);
    content = removeIconComponents(content);
    content = convertGithubAlerts(content);
    content = removeRemainingSelfClosingTags(content);

    // Clean up excessive blank lines
    content = content.replace(/\n{4,}/g, '\n\n\n');

    return content;
}

// ============================================
// Path-to-Outline-URL mapping for cross-references
// ============================================

// Maps VitePress path (e.g. "/sales/customer-communication/reg-birthday-customer-communication")
// to the Outline document ID (UUID), populated during import.
const pathToDocId = {};

/** Compute the VitePress path for a given file on disk */
function vitepressPath(filePath) {
    const rel = path.relative(DOCS_DIR, filePath).replace(/\\/g, '/');
    // "sales/customer-communication/reg-birthday-customer-communication.md" → "/sales/customer-communication/reg-birthday-customer-communication"
    // "cash/index.md" → "/cash/"
    const withoutExt = rel.replace(/\.md$/, '');
    if (withoutExt.endsWith('/index') || withoutExt === 'index') {
        return '/' + withoutExt.replace(/\/?index$/, '') + '/';
    }
    return '/' + withoutExt;
}

// ============================================
// Document and collection creation
// ============================================

async function createCollection(name) {
    console.log(`Creating collection: ${name}`);
    const data = await outlineRequest('collections.create', { name });
    return data.data.id;
}

async function createDocument(collectionId, parentDocumentId, filePath) {
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    // Extract title from frontmatter, fall back to filename
    let title = path.parse(filePath).name;
    const titleMatch = rawContent.match(/^---\n[\s\S]*?title:\s*([^\n]+)[\s\S]*?\n---/);
    if (titleMatch) {
        title = titleMatch[1].replace(/['"]/g, '').trim();
    }

    // Build governance metadata table
    const metaTable = extractMetadataTable(rawContent);

    // Clean content
    let content = cleanContent(rawContent);

    // Fix double H1: if content already starts with `# `, don't add another
    const startsWithH1 = /^\s*#\s/.test(content);
    let finalContent;
    if (startsWithH1) {
        finalContent = metaTable + content;
    } else {
        finalContent = `# ${title}\n\n` + metaTable + content;
    }

    console.log(`  -> Import: ${title}`);

    const data = await outlineRequest('documents.create', {
        collectionId,
        parentDocumentId,
        title,
        text: finalContent,
        publish: true
    });

    const docId = data.data.id;

    // Register mapping: VitePress path → Outline doc ID
    const vpPath = vitepressPath(filePath);
    pathToDocId[vpPath] = docId;

    return docId;
}

// Recursive directory walk
async function processDirectory(collectionId, parentDocumentId, dirPath) {
    const items = fs.readdirSync(dirPath);

    // Process index.md first — it becomes the parent for child docs
    let currentParentId = parentDocumentId;
    if (items.includes('index.md')) {
        const indexPath = path.join(dirPath, 'index.md');
        currentParentId = await createDocument(collectionId, parentDocumentId, indexPath);
    }

    for (const item of items) {
        if (item === 'index.md') continue;

        const itemPath = path.join(dirPath, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
            await processDirectory(collectionId, currentParentId, itemPath);
        } else if (item.endsWith('.md')) {
            await createDocument(collectionId, currentParentId, itemPath);
        }
    }
}

// ============================================
// Pass 2: Resolve cross-references
// ============================================

async function resolveLinks() {
    console.log('\n--- Pass 2: Resolving cross-references ---');

    // Build docId → Outline URL map by querying each doc
    const idToUrl = {};
    for (const [vpPath, docId] of Object.entries(pathToDocId)) {
        const data = await outlineRequest('documents.info', { id: docId });
        if (data && data.data) {
            idToUrl[docId] = data.data.url;
        }
    }

    // Now iterate all imported documents and fix links
    let fixed = 0;
    for (const [vpPath, docId] of Object.entries(pathToDocId)) {
        const data = await outlineRequest('documents.info', { id: docId });
        if (!data || !data.data) continue;

        let text = data.data.text;
        let changed = false;

        // Replace VitePress-style links: ](/path/to/doc) → ](/doc/outline-slug)
        const newText = text.replace(/\]\(\/([a-z][^)]*)\)/g, (match, vpLink) => {
            // Normalize: ensure leading slash, strip trailing slash for lookup
            let lookupPath = '/' + vpLink;

            // Try exact match first
            if (pathToDocId[lookupPath]) {
                const targetUrl = idToUrl[pathToDocId[lookupPath]];
                if (targetUrl) {
                    changed = true;
                    return `](${targetUrl})`;
                }
            }

            // Try with trailing slash (index pages)
            if (!lookupPath.endsWith('/')) {
                const withSlash = lookupPath + '/';
                if (pathToDocId[withSlash]) {
                    const targetUrl = idToUrl[pathToDocId[withSlash]];
                    if (targetUrl) {
                        changed = true;
                        return `](${targetUrl})`;
                    }
                }
            }

            // Try without trailing slash
            if (lookupPath.endsWith('/')) {
                const withoutSlash = lookupPath.slice(0, -1);
                if (pathToDocId[withoutSlash]) {
                    const targetUrl = idToUrl[pathToDocId[withoutSlash]];
                    if (targetUrl) {
                        changed = true;
                        return `](${targetUrl})`;
                    }
                }
            }

            // Skip image/asset links
            if (vpLink.match(/\.(jpg|png|svg|gif|webp|pdf)$/i)) {
                return match;
            }

            console.warn(`  [!] Unresolved link: ${lookupPath}`);
            return match;
        });

        if (changed) {
            await outlineRequest('documents.update', { id: docId, text: newText });
            fixed++;
        }
    }

    console.log(`Resolved links in ${fixed} documents.`);
}

// ============================================
// Main
// ============================================
async function main() {
    console.log('Starting clean migration...');
    console.log(`Source: ${DOCS_DIR}`);
    console.log(`Target: ${OUTLINE_URL}\n`);

    const items = fs.readdirSync(DOCS_DIR);

    for (const item of items) {
        const itemPath = path.join(DOCS_DIR, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory() && COLLECTIONS[item]) {
            try {
                const collectionId = await createCollection(COLLECTIONS[item]);
                await processDirectory(collectionId, undefined, itemPath);
            } catch (err) {
                console.error(`Error importing folder ${item}:`, err.message);
            }
        }
    }

    console.log(`\n--- Pass 1 complete. ${Object.keys(pathToDocId).length} documents imported. ---`);

    // Pass 2: resolve VitePress cross-references to Outline URLs
    await resolveLinks();

    console.log('\nMigration complete!');
}

main();
