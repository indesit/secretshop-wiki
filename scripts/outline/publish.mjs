import process from "node:process";

import publishOne from "./_publishOne.mjs";

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

async function findDocumentIdByCanonicalPath(canonicalPath, title, colName) {
  // Search by title + collection — unique pair, reliable
  if (!title || !colName) return "";
  const cols = await listCollections();
  const col = cols.find((c) => c.name === colName);
  if (!col) return "";


  // Paginate through all docs in the collection
  let offset = 0;
  while (true) {
    const res = await outlineRequest("documents.list", {
      collectionId: col.id,
      limit: 100,
      offset,
    });
    const docs = res?.data || [];
    const hit = docs.find((d) => d.title === title);
    if (hit) return hit.id;
    if (docs.length < 100) break;
    offset += docs.length;
  }
  return "";
}

async function publishOneCli({ file, collection, dryRun }) {
  const repoRoot = process.cwd();
  const absFile = file.startsWith("/") ? file : `${repoRoot}/${file}`;

  await publishOne({
    filePath: absFile,
    collection,
    dryRun,
    outlineRequest,
    ensureCollectionByName,
    findDocumentIdByCanonicalPath,
    defaultCollectionForCanonicalPath,
  });
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

publishOneCli(args).catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});

