import path from "node:path";

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

export function cleanForOutline(rawContent) {
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

export function canonicalMarker(canonicalPath) {
  const p = canonicalPath?.trim();
  if (!p) return "";
  return `\n\n<!-- canonical_path: ${p} -->\n`;
}

export function inferCanonicalPathFromFile(filePath, repoRoot) {
  // best-effort: produce docs/... path relative to repo root
  const rel = path.relative(repoRoot, filePath).replace(/\\/g, "/");
  return rel;
}

