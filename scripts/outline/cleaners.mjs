import path from "node:path";

/** Canonical domain → Outline collection name mapping (Ukrainian). */
export const COLLECTION_MAP = {
  cash: "Каса",
  company: "Компанія",
  glossary: "Глосарій",
  hr: "HR",
  product: "Товар",
  "returns-and-warranty": "Повернення та гарантія",
  sales: "Продажі",
  stores: "Магазини",
  templates: "Шаблони",
};

export function defaultCollectionForCanonicalPath(canonicalPath) {
  const domain = canonicalPath.replace(/^docs\//, "").split("/")[0];
  return COLLECTION_MAP[domain] || "Secret Shop Wiki";
}

/**
 * Top-level index files (docs/index.md, docs/<domain>/index.md) are NOT
 * published to Outline: their title equals the collection name ("Каса",
 * "Продажі"…), which would create a same-named duplicate child. Subsection
 * indexes (docs/<domain>/<sub>/index.md, e.g. "Чеки") have unique titles and
 * ARE published, so section cross-links resolve inside Outline.
 * Accepts a repo-relative or docs-relative path.
 */
export function isTopLevelIndexPath(relPath) {
  const p = relPath.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/^docs\//, "");
  if (!p.endsWith("index.md")) return false;
  return p.split("/").length <= 2; // "index.md" or "<domain>/index.md"
}

/** Strip YAML frontmatter block */
export function stripFrontmatter(content) {
  return content.replace(/^---\n[\s\S]*?\n---\n/, "");
}

/** Extract basic metadata table from frontmatter (governance visibility in Outline). */
export function extractMetadataTable(rawContent) {
  const fmMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return "";
  const fm = fmMatch[1];
  const rows = [];

  const fields = {
    status: "Статус",
    owner: "Власник",
    review_cycle_days: "Цикл перегляду (днів)",
    effective_from: "Діє з",
    last_reviewed: "Останній перегляд",
    approval_required: "Потребує погодження",
  };

  for (const [key, label] of Object.entries(fields)) {
    const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    if (!m) continue;
    const v = m[1].trim();
    if (!v || v === "[]") continue;
    rows.push(`| ${label} | ${v} |`);
  }

  if (rows.length === 0) return "";
  return (
    "| Параметр | Значення |\n|----------|----------|\n" +
    rows.join("\n") +
    "\n\n"
  );
}

export function convertRoleCards(content) {
  return content.replace(
    /<RoleCard\s+title="([^"]+)"\s+subtitle="([^"]+)"\s*>\s*([\s\S]*?)<\/RoleCard>/g,
    (_, title, subtitle, body) => `### 🏷 ${title} — ${subtitle}\n\n${body.trim()}\n`
  );
}

export function convertEscalationBoxes(content) {
  const levelEmoji = { info: "ℹ️", warning: "⚠️", critical: "🚨" };
  return content.replace(
    /<EscalationBox\s+title="([^"]+)"\s+level="([^"]+)"\s*>\s*([\s\S]*?)<\/EscalationBox>/g,
    (_, title, level, body) => {
      const emoji = levelEmoji[level] || "⚠️";
      return `> ${emoji} **${title}**\n>\n> ${body
        .trim()
        .split("\n")
        .join("\n> ")}\n`;
    }
  );
}

export function convertDecisionRules(content) {
  return content.replace(
    /<DecisionRule\s+title="([^"]+)"\s+verdict="([^"]+)"\s+tone="([^"]+)"\s*>\s*([\s\S]*?)<\/DecisionRule>/g,
    (_, title, verdict, _tone, body) =>
      `> **${title}** → *${verdict}*\n>\n> ${body
        .trim()
        .split("\n")
        .join("\n> ")}\n`
  );
}

export function removeDocumentMeta(content) {
  return content.replace(/<DocumentMeta[\s\S]*?\/>/g, "");
}

export function removeRelatedDocuments(content) {
  return content.replace(/<RelatedDocuments\s*\/>/g, "");
}

export function removeIconComponents(content) {
  return content.replace(/<Icon[A-Za-z]+\s[^>]*\/>/g, "");
}

export function convertGithubAlerts(content) {
  return content.replace(
    /> \[!(NOTE|WARNING|IMPORTANT|TIP|CAUTION)\]\n/gi,
    (_, type) => `> **${type}:**\n`
  );
}

export function removeRemainingSelfClosingTags(content) {
  // Only match PascalCase self-closing tags (Vue convention), not standard HTML
  return content.replace(/<[A-Z][a-zA-Z]+\s*[^>]*\/>/g, "");
}

/**
 * Remove leading H1 from body if it duplicates the frontmatter title.
 * Outline renders `title` as its own H1 — a matching body H1 creates a double header.
 */
export function deduplicateH1(content, fmTitle) {
  if (!fmTitle) return content;
  // Match an H1 at the very start of the body (after optional blank lines)
  return content.replace(/^(\s*)(# .+\n)/, (match, space, h1line) => {
    const h1text = h1line.replace(/^# /, "").trim();
    if (h1text === fmTitle) return space; // drop matching H1
    return match; // keep non-matching H1
  });
}

export function cleanForOutline(rawContent) {
  const fmTitle = readFrontmatterTitle(rawContent);
  let content = stripFrontmatter(rawContent);

  content = deduplicateH1(content, fmTitle);
  content = convertRoleCards(content);
  content = convertEscalationBoxes(content);
  content = convertDecisionRules(content);
  content = removeDocumentMeta(content);
  content = removeRelatedDocuments(content);
  content = removeIconComponents(content);
  content = convertGithubAlerts(content);
  content = removeRemainingSelfClosingTags(content);

  // Clean up excessive blank lines
  content = content.replace(/\n{4,}/g, "\n\n\n");

  return content;
}

export function readFrontmatterTitle(rawContent, fallbackTitle = "") {
  const titleMatch = rawContent.match(
    /^---\n[\s\S]*?title:\s*([^\n]+)[\s\S]*?\n---/m
  );
  if (!titleMatch) return fallbackTitle;
  return titleMatch[1].replace(/["']/g, "").trim();
}

export function readFrontmatterCanonicalPath(rawContent) {
  const m = rawContent.match(/^---\n[\s\S]*?canonical_path:\s*([^\n]+)[\s\S]*?\n---/m);
  if (!m) return "";
  return m[1].trim();
}

/**
 * `outline_locked: true` in frontmatter means an editor is actively polishing
 * this document directly in Outline (screenshots, embeds — things git/markdown
 * can't represent). Publish must never overwrite it until the flag is removed.
 */
export function readFrontmatterOutlineLocked(rawContent) {
  const m = rawContent.match(/^---\n[\s\S]*?outline_locked:\s*([^\n]+)[\s\S]*?\n---/m);
  if (!m) return false;
  return /^true$/i.test(m[1].trim());
}

export function canonicalMarker(canonicalPath) {
  const p = canonicalPath?.trim();
  if (!p) return "";
  return `\n\n📂 ${p}\n`;
}

export function inferCanonicalPathFromFile(filePath, repoRoot) {
  // best-effort: produce docs/... path relative to repo root
  const rel = path.relative(repoRoot, filePath).replace(/\\/g, "/");
  return rel;
}

// ============================================================
// Visual enhancements for Outline rendering
// ============================================================

/** Status badge */
function statusBadge(raw) {
  const m = raw.match(/^---\n[\s\S]*?status:\s*(.+)$/m);
  if (!m) return "";
  const s = m[1].trim();
  const map = {
    approved: "✅ Затверджено",
    draft: "🚫 Чернетка",
    archived: "🗃 Архівований",
  };
  return map[s] || `📋 ${s}`;
}

/** Type badge */
function typeBadge(raw) {
  const m = raw.match(/^---\n[\s\S]*?type:\s*(.+)$/m);
  if (!m) return "";
  const t = m[1].trim();
  const map = {
    policy: "📜 Policy",
    regulation: "⚙️ Регламент",
    sop: "📋 SOP",
    instruction: "🛠 Інструкція",
    checklist: "☑️ Чекліст",
    incident: "🚨 Інцидент",
    "decision-log": "📝 Рішення",
    template: "📄 Шаблон",
    brand: "🏷️ Бренд",
  };
  return map[t] || `📄 ${t}`;
}

/** Extract related_documents list from frontmatter */
function relatedLinks(raw) {
  const m = raw.match(/^---\n[\s\S]*?related_documents:\s*\[([\s\S]*?)\]\n/m);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/['"]/g, "").replace(/^docs\//, ""))
    .filter(Boolean);
}

/** Build a pretty related-links block */
function buildRelatedLinks(raw) {
  const links = relatedLinks(raw);
  if (links.length === 0) return "";
  const rows = links
    .map((l) => {
      const slug = l.replace(/^docs\//, "");
      const label = slug
        .split("/")
        .pop()
        .replace(/^reg-|^sop-|^policy-|^instruction-|^checklist-|^incident-|^decision-log-/, "")
        .replace(/-/g, " ");
      return `- [[${slug}]]`;
    })
    .join("\n");
  return `\n\n## Пов'язані документи\n${rows}\n`;
}

/** Build table-of-contents for docs with 3+ headings */
function buildTOC(content) {
  const headings = [];
  const re = /^(#{1,3})\s+(.+)$/gm;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[1].length <= 3) {
      headings.push(m[2].trim());
    }
  }
  if (headings.length < 3) return "";
  const items = headings
    .map((h) => `  - ${h}`)
    .join("\n");
  return `\n\n## Зміст\n${items}\n`;
}

/** Build a light footer table with canonical path and updated date */
function buildFooter(raw, canonicalPath) {
  const dateMatch = raw.match(/^---\n[\s\S]*?(?:updated|last_reviewed):\s*(.+)$/m);
  const date = dateMatch ? dateMatch[1].trim() : "";
  if (!canonicalPath && !date) return "";
  return (
    `\n\n---\n\n` +
    `| 🗂️ Джерело | ${canonicalPath || "—"} |\n` +
    `| 📅 Оновлено | ${date || "—"} |\n`
  );
}

/**
 * Add decorative header, TOC, related links, and footer.
 * Works only when frontmatter data is available — never invents.
 */
export function enhanceForOutline(rawContent, canonicalPath = "") {
  const status = statusBadge(rawContent);
  const type = typeBadge(rawContent);


  let header = "";
  if (status || type) {
    const badges = [status, type].filter(Boolean).join("   ");
    header = `\n${badges}\n\n`;
  }

  const fmTitle = readFrontmatterTitle(rawContent);
  let content = stripFrontmatter(rawContent);
  content = deduplicateH1(content, fmTitle);
  content = convertRoleCards(content);
  content = convertEscalationBoxes(content);
  content = convertDecisionRules(content);
  content = removeDocumentMeta(content);
  content = removeRelatedDocuments(content);
  content = removeIconComponents(content);
  content = convertGithubAlerts(content);
  content = removeRemainingSelfClosingTags(content);
  content = content.replace(/\n{4,}/g, "\n\n\n");

  const toc = buildTOC(content);
  const related = buildRelatedLinks(rawContent);
  const footer = buildFooter(rawContent, canonicalPath);

  return `${header}${toc}${content}${related}${footer}\n`;
}
