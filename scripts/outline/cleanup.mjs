import process from "node:process";
import { COLLECTION_MAP } from "./cleaners.mjs";

/**
 * cleanup.mjs — find and (optionally) remove Outline cruft left by earlier
 * publish runs:
 *   1. Stale collections whose name is NOT in the current Ukrainian map
 *      (e.g. legacy Russian "Магазины"/"Продажи" created before the Apr-27 rename).
 *   2. Duplicate "section index" documents — a doc whose title equals a
 *      collection name (the old index.md-as-document bug).
 *
 * Safe by default: prints a report and changes nothing. Pass flags to act.
 *
 * Usage:
 *   node scripts/outline/cleanup.mjs                      # dry-run report
 *   node scripts/outline/cleanup.mjs --apply             # delete index-duplicate docs (to trash)
 *   node scripts/outline/cleanup.mjs --apply --delete-stale-collections
 *                                                        # also delete stale collections (DESTRUCTIVE)
 *
 * Env: OUTLINE_URL (default http://localhost:3000), OUTLINE_API_TOKEN (required)
 */

const OUTLINE_URL = process.env.OUTLINE_URL || "http://localhost:3000";
const API_TOKEN = process.env.OUTLINE_API_TOKEN;

const VALID_NAMES = new Set([...Object.values(COLLECTION_MAP), "Secret Shop Wiki"]);

function parseArgs(argv) {
  const args = { apply: false, deleteStaleCollections: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--delete-stale-collections") args.deleteStaleCollections = true;
    else if (a === "-h" || a === "--help") {
      console.log(
        "Usage:\n  node scripts/outline/cleanup.mjs [--apply] [--delete-stale-collections]\n\n" +
          "Default is a dry-run report. --apply trashes duplicate index documents.\n" +
          "--delete-stale-collections also deletes collections not in the current map (DESTRUCTIVE).\n"
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

async function listDocuments(collectionId) {
  const out = [];
  let offset = 0;
  while (true) {
    const res = await outlineRequest("documents.list", { collectionId, limit: 100, offset });
    const chunk = res?.data || [];
    out.push(...chunk);
    if (chunk.length < 100) break;
    offset += chunk.length;
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!API_TOKEN) {
    console.error('ERROR: Set OUTLINE_API_TOKEN (export OUTLINE_API_TOKEN="ol_api_...").');
    process.exit(1);
  }

  const collections = await listCollections();
  const stale = collections.filter((c) => !VALID_NAMES.has(c.name));
  const valid = collections.filter((c) => VALID_NAMES.has(c.name));

  // Duplicate index docs: any document whose title is itself a collection name.
  const indexDupes = [];
  for (const col of collections) {
    const docs = await listDocuments(col.id);
    for (const d of docs) {
      if (VALID_NAMES.has(d.title)) {
        indexDupes.push({ collection: col.name, collectionId: col.id, docId: d.id, title: d.title });
      }
    }
  }

  console.log(`\n=== Outline cleanup report (${args.apply ? "APPLY" : "DRY-RUN"}) ===`);
  console.log(`Collections total: ${collections.length} | valid: ${valid.length} | stale: ${stale.length}`);

  console.log(`\nStale collections (name not in current map):`);
  if (!stale.length) console.log("  (none)");
  for (const c of stale) {
    const count = (await listDocuments(c.id)).length;
    console.log(`  • "${c.name}" (id ${c.id}) — ${count} document(s)`);
  }

  console.log(`\nDuplicate index documents (title equals a collection name):`);
  if (!indexDupes.length) console.log("  (none)");
  for (const d of indexDupes) {
    console.log(`  • "${d.title}" (doc ${d.docId}) in collection "${d.collection}"`);
  }

  if (!args.apply) {
    console.log(`\nDry-run only. Re-run with --apply to trash duplicate index documents.`);
    if (stale.length) {
      console.log(
        `Stale collections are NOT auto-deleted. Migrate any unique docs first, then\n` +
          `re-run with --apply --delete-stale-collections to remove them.`
      );
    }
    return;
  }

  for (const d of indexDupes) {
    await outlineRequest("documents.delete", { id: d.docId });
    console.log(`Trashed duplicate index doc: "${d.title}" (${d.docId})`);
  }

  if (args.deleteStaleCollections) {
    for (const c of stale) {
      await outlineRequest("collections.delete", { id: c.id });
      console.log(`Deleted stale collection: "${c.name}" (${c.id})`);
    }
  } else if (stale.length) {
    console.log(
      `\nLeft ${stale.length} stale collection(s) untouched. Add --delete-stale-collections to remove them.`
    );
  }
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
