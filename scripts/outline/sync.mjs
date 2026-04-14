import { execSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

// Simple git-based sync: publish only markdown files changed since a ref.
// Usage:
//   node scripts/outline/sync.mjs --since origin/main
//   node scripts/outline/sync.mjs --since HEAD~1
//   node scripts/outline/sync.mjs --since origin/main --only docs/company/
//   node scripts/outline/sync.mjs --since origin/main --dry-run

const OUTLINE_URL = process.env.OUTLINE_URL || "http://localhost:3000";
const API_TOKEN = process.env.OUTLINE_API_TOKEN;

function usage() {
  console.log(`\nSync changed docs to Outline (git diff)\n\n`);
  console.log(
    `Usage:\n  node scripts/outline/sync.mjs --since <git-ref> [--only docs/<path>/] [--dry-run]\n\n` +
      `Env:\n  OUTLINE_URL (default: http://localhost:3000)\n  OUTLINE_API_TOKEN (required)\n`
  );
}

function parseArgs(argv) {
  const args = { since: "", only: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since") args.since = argv[++i];
    else if (a === "--only") args.only = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "-h" || a === "--help") {
      usage();
      process.exit(0);
    }
  }
  return args;
}

async function outlineRequest(endpoint, payload = {}) {
  const res = await fetch(`${OUTLINE_URL}/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Outline API error ${res.status} for ${endpoint}: ${JSON.stringify(data)}`
    );
  }
  return data;
}

async function listCollections() {
  const out = [];
  let offset = 0;
  while (true) {
    const res = await outlineRequest("collections.list", { limit: 100, offset });
    const chunk = res?.data || [];
    out.push(...chunk);
    if (chunk.length < 100) break;
    offset += chunk.length;
  }
  return out;
}

async function ensureCollectionByName(name) {
  const cols = await listCollections();
  const existing = cols.find((c) => c.name === name);
  if (existing) return existing.id;
  const created = await outlineRequest("collections.create", { name });
  return created.data.id;
}

function defaultCollectionForCanonicalPath(canonicalPath) {
  const m = canonicalPath.replace(/^docs\//, "").split("/")[0];
  const map = {
    cash: "Касса",
    company: "Компания",
    glossary: "Глоссарий",
    hr: "Отдел кадров",
    product: "Продукты",
    "returns-and-warranty": "Возвраты и гарантия",
    sales: "Продажи",
    stores: "Магазины",
    templates: "Шаблоны",
  };
  return map[m] || "Company Wiki";
}

async function findDocumentIdByCanonicalPath(canonicalPath) {
  const query = `canonical_path: ${canonicalPath}`;
  const res = await outlineRequest("documents.search", {
    query,
    includeArchived: true,
    limit: 25,
    offset: 0,
  });
  const docs = res?.data || [];
  const hit = docs.find((d) => d?.title);
  return hit?.id || "";
}

function resolveRepoRoot() {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
}

function changedFilesSince(ref) {
  const cmd = `git diff --name-only ${ref}..HEAD`;
  return execSync(cmd, { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isDocsMarkdown(p) {
  return p.startsWith("docs/") && p.endsWith(".md");
}

function filterOnlyPrefix(p, onlyPrefix) {
  if (!onlyPrefix) return true;
  const norm = onlyPrefix.replace(/\\/g, "/");
  return p.startsWith(norm);
}

async function publishFile(fileRelPath, { dryRun }) {
  const repoRoot = resolveRepoRoot();
  const filePath = path.join(repoRoot, fileRelPath);

  // Import publishOne lazily to avoid duplication of cleaning logic.
  const { default: publishOne } = await import("./_publishOne.mjs");
  await publishOne({
    filePath,
    collection: "",
    dryRun,
    outlineRequest,
    ensureCollectionByName,
    findDocumentIdByCanonicalPath,
    defaultCollectionForCanonicalPath,
  });
}

// The publish logic is split into _publishOne.mjs to keep this file small.

const args = parseArgs(process.argv);
if (!args.since) {
  usage();
  process.exit(1);
}
if (!API_TOKEN) {
  console.error("ERROR: Set OUTLINE_API_TOKEN environment variable.");
  console.error('  export OUTLINE_API_TOKEN="ol_api_..."');
  process.exit(1);
}

const files = changedFilesSince(args.since)
  .filter(isDocsMarkdown)
  .filter((p) => filterOnlyPrefix(p, args.only));

if (files.length === 0) {
  console.log("No changed docs/*.md files to publish.");
  process.exit(0);
}

console.log(`Will publish ${files.length} file(s) to Outline:`);
for (const f of files) console.log(`- ${f}`);

for (const f of files) {
  // eslint-disable-next-line no-await-in-loop
  await publishFile(f, { dryRun: args.dryRun });
}
