import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { COLLECTION_MAP } from "./cleaners.mjs";
import {
  outlineRequest,
  listCollections,
  listDocuments,
  requireToken,
  sleep,
} from "./api.mjs";

const DOCS_DIR = path.join(process.cwd(), "docs");

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

const VALID_NAMES = new Set([...Object.values(COLLECTION_MAP), "Secret Shop Wiki"]);

// Titles of every index.md in the repo (recursively) — these were published as
// documents by the old pipeline and must be removed from Outline. Covers both
// collection-level ("Магазини") and subdomain ("Технічні несправності") indexes.
function repoIndexTitles(dir = DOCS_DIR, out = new Set()) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === ".vitepress" || entry === "public") continue;
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      repoIndexTitles(full, out);
    } else if (entry === "index.md") {
      const m = fs.readFileSync(full, "utf8").match(/^---\s*\n([\s\S]*?)\n---/);
      const titleLine = m && m[1].split("\n").find((l) => l.startsWith("title:"));
      if (titleLine) {
        const t = titleLine.slice(titleLine.indexOf(":") + 1).trim().replace(/^['"]|['"]$/g, "");
        if (t) out.add(t);
      }
    }
  }
  return out;
}

const INDEX_TITLES = repoIndexTitles();

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

async function main() {
  const args = parseArgs(process.argv);
  requireToken();

  const collections = await listCollections();
  const stale = collections.filter((c) => !VALID_NAMES.has(c.name));
  const valid = collections.filter((c) => VALID_NAMES.has(c.name));

  // Index docs: any document whose title matches a repo index.md title. These
  // were published from index.md files (relative links break in Outline) and
  // should not exist as documents.
  const indexDupes = [];
  for (const col of collections) {
    const docs = await listDocuments(col.id);
    for (const d of docs) {
      if (INDEX_TITLES.has(d.title)) {
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

  console.log(`\nIndex documents published from index.md (to be removed, ${INDEX_TITLES.size} index titles known):`);
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

  // Index docs inside stale collections will vanish with the collection — only
  // trash the ones living in collections we are keeping.
  const staleIds = new Set(stale.map((c) => c.id));
  const toTrash = args.deleteStaleCollections
    ? indexDupes.filter((d) => !staleIds.has(d.collectionId))
    : indexDupes;

  const failures = [];
  for (const d of toTrash) {
    try {
      await outlineRequest("documents.delete", { id: d.docId });
      console.log(`Trashed index doc: "${d.title}" (${d.docId})`);
    } catch (e) {
      failures.push(`doc "${d.title}" in "${d.collection}": ${String(e.message || e)}`);
      console.log(`  ✗ could not delete "${d.title}" in "${d.collection}" — skipped`);
    }
    await sleep(250);
  }

  if (args.deleteStaleCollections) {
    for (const c of stale) {
      try {
        await outlineRequest("collections.delete", { id: c.id });
        console.log(`Deleted stale collection: "${c.name}" (${c.id})`);
      } catch (e) {
        failures.push(`collection "${c.name}": ${String(e.message || e)}`);
        console.log(`  ✗ could not delete collection "${c.name}" — skipped`);
      }
      await sleep(250);
    }
  } else if (stale.length) {
    console.log(
      `\nLeft ${stale.length} stale collection(s) untouched. Add --delete-stale-collections to remove them.`
    );
  }

  if (failures.length) {
    console.log(`\n⚠ ${failures.length} item(s) could not be removed (likely permissions — delete manually in Outline UI as admin):`);
    for (const f of failures) console.log(`  • ${f}`);
  }
}

main().catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
