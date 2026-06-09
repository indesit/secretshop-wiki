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
    throw new Error(`Outline API error ${res.status} for ${endpoint}: ${JSON.stringify(data)}`);
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
  }
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
