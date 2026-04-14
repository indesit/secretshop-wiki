import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  cleanForOutline,
  extractMetadataTable,
  inferCanonicalPathFromFile,
  canonicalMarker,
  readFrontmatterTitle,
  readFrontmatterCanonicalPath,
} from "./cleaners.mjs";

const OUTLINE_URL = process.env.OUTLINE_URL || "http://localhost:3000";
const API_TOKEN = process.env.OUTLINE_API_TOKEN;

function usage() {
  console.log(`\nPublish (create/update) a single company-wiki doc to Outline\n\n`);
  console.log(
    `Usage:\n  node scripts/outline/publish.mjs --file docs/<...>.md [--collection "Компанія"] [--dry-run]\n\n` +
      `Env:\n  OUTLINE_URL (default: http://localhost:3000)\n  OUTLINE_API_TOKEN (required)\n`
  );
}

function parseArgs(argv) {
  const args = { file: "", collection: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--collection") args.collection = argv[++i];
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

async function publishOne({ file, collection, dryRun }) {
  const repoRoot = process.cwd();
  const absFile = path.isAbsolute(file) ? file : path.join(repoRoot, file);
  if (!fs.existsSync(absFile)) {
    throw new Error(`File not found: ${absFile}`);
  }

  const raw = fs.readFileSync(absFile, "utf8");
  const fallbackTitle = path.parse(absFile).name;
  const title = readFrontmatterTitle(raw, fallbackTitle);

  const canonicalPathFromFm = readFrontmatterCanonicalPath(raw);
  const canonicalPath = canonicalPathFromFm || inferCanonicalPathFromFile(absFile, repoRoot);

  const colName = collection || defaultCollectionForCanonicalPath(canonicalPath);

  const metaTable = extractMetadataTable(raw);
  const cleaned = cleanForOutline(raw);
  const marker = canonicalMarker(canonicalPath);
  const text = `${metaTable}${cleaned}${marker}`.trim() + "\n";

  const existingId = await findDocumentIdByCanonicalPath(canonicalPath);
  const collectionId = await ensureCollectionByName(colName);

  if (dryRun) {
    console.log("DRY RUN");
    console.log(JSON.stringify({ title, canonicalPath, colName, existingId }, null, 2));
    return;
  }

  if (existingId) {
    await outlineRequest("documents.update", {
      id: existingId,
      title,
      text,
      publish: true,
    });
    console.log(`Updated: ${title}`);
    console.log(`Canonical: ${canonicalPath}`);
    console.log(`Outline doc id: ${existingId}`);
    return;
  }

  const created = await outlineRequest("documents.create", {
    collectionId,
    title,
    text,
    publish: true,
  });
  console.log(`Created: ${title}`);
  console.log(`Canonical: ${canonicalPath}`);
  console.log(`Outline doc id: ${created.data.id}`);
}

const args = parseArgs(process.argv);
if (!args.file) {
  usage();
  process.exit(1);
}

if (!API_TOKEN) {
  console.error("ERROR: Set OUTLINE_API_TOKEN environment variable.");
  console.error('  export OUTLINE_API_TOKEN="ol_api_..."');
  process.exit(1);
}

publishOne(args).catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});

