import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import publishOne from "./_publishOne.mjs";
import { defaultCollectionForCanonicalPath } from "./cleaners.mjs";

/**
 * reconcile.mjs — publish ALL company-wiki documents to Outline in one pass
 * (full repopulation), as opposed to sync.mjs which only handles git-changed
 * files. Section index.md files are skipped (handled in _publishOne.mjs).
 *
 * Usage:
 *   node scripts/outline/reconcile.mjs [--only docs/<path>/] [--dry-run]
 *
 * Env: OUTLINE_URL (default http://localhost:3000), OUTLINE_API_TOKEN (required)
 */

const OUTLINE_URL = process.env.OUTLINE_URL || "http://localhost:3000";
const API_TOKEN = process.env.OUTLINE_API_TOKEN;
const DOCS_DIR = path.join(process.cwd(), "docs");

function parseArgs(argv) {
  const args = { only: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only") args.only = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "-h" || a === "--help") {
      console.log(
        "Usage:\n  node scripts/outline/reconcile.mjs [--only docs/<path>/] [--dry-run]\n\n" +
          "Publishes every docs/**/*.md (except section index.md) to Outline.\n"
      );
      process.exit(0);
    }
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function outlineRequest(endpoint, payload = {}, attempt = 0) {
  const res = await fetch(`${OUTLINE_URL}/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 429 && attempt < 6) {
    const wait = Number(res.headers.get("Retry-After")) || Math.min(2 ** attempt, 30);
    console.log(`  rate-limited on ${endpoint}; waiting ${wait}s…`);
    await sleep(wait * 1000);
    return outlineRequest(endpoint, payload, attempt + 1);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Outline API error ${res.status} for ${endpoint}: ${JSON.stringify(data)}`);
  }
  return data;
}

// Collections rarely change during a run — fetch once and reuse to avoid
// hammering the API (was a major source of 429s).
let _collectionsCache = null;
async function listCollections() {
  if (_collectionsCache) return _collectionsCache;
  const out = [];
  let offset = 0;
  while (true) {
    const res = await outlineRequest("collections.list", { limit: 100, offset });
    const chunk = res?.data || [];
    out.push(...chunk);
    if (chunk.length < 100) break;
    offset += chunk.length;
  }
  _collectionsCache = out;
  return out;
}

async function ensureCollectionByName(name) {
  const cols = await listCollections();
  const existing = cols.find((c) => c.name === name);
  if (existing) return existing.id;
  const created = await outlineRequest("collections.create", { name });
  _collectionsCache.push(created.data);
  return created.data.id;
}

async function findDocumentIdByCanonicalPath(canonicalPath, title, colName) {
  if (!title || !colName) return "";
  const cols = await listCollections();
  const col = cols.find((c) => c.name === colName);
  if (!col) return "";
  let offset = 0;
  while (true) {
    const res = await outlineRequest("documents.list", { collectionId: col.id, limit: 100, offset });
    const docs = res?.data || [];
    const hit = docs.find((d) => d.title === title);
    if (hit) return hit.id;
    if (docs.length < 100) break;
    offset += docs.length;
  }
  return "";
}

function collectMarkdown(dir, rel = "docs", out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === ".vitepress" || entry === "public") continue;
    const full = path.join(dir, entry);
    const relPath = `${rel}/${entry}`;
    if (fs.statSync(full).isDirectory()) {
      collectMarkdown(full, relPath, out);
    } else if (entry.endsWith(".md") && entry !== "index.md") {
      out.push(relPath);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!API_TOKEN) {
    console.error('ERROR: Set OUTLINE_API_TOKEN (export OUTLINE_API_TOKEN="ol_api_...").');
    process.exit(1);
  }

  let files = collectMarkdown(DOCS_DIR);
  if (args.only) {
    const norm = args.only.replace(/\\/g, "/");
    files = files.filter((p) => p.startsWith(norm));
  }
  files.sort();

  console.log(`Will publish ${files.length} document(s) to Outline${args.dryRun ? " (dry-run)" : ""}:`);
  for (const f of files) {
    await publishOne({
      filePath: path.join(process.cwd(), f),
      collection: "",
      dryRun: args.dryRun,
      outlineRequest,
      ensureCollectionByName,
      findDocumentIdByCanonicalPath,
      defaultCollectionForCanonicalPath,
    });
    if (!args.dryRun) await sleep(300); // stay under Outline's write rate limit
  }
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
