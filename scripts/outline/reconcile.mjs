import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import publishOne from "./_publishOne.mjs";
import { defaultCollectionForCanonicalPath, isTopLevelIndexPath } from "./cleaners.mjs";
import {
  outlineRequest,
  ensureCollectionByName,
  findDocumentIdByCanonicalPath,
  requireToken,
  sleep,
} from "./api.mjs";

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

function collectMarkdown(dir, rel = "docs", out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === ".vitepress" || entry === "public") continue;
    const full = path.join(dir, entry);
    const relPath = `${rel}/${entry}`;
    if (fs.statSync(full).isDirectory()) {
      collectMarkdown(full, relPath, out);
    } else if (entry.endsWith(".md") && !isTopLevelIndexPath(relPath)) {
      // Subsection index.md files are published (unique titles like "Чеки");
      // only top-level indexes are skipped — see cleaners.isTopLevelIndexPath.
      out.push(relPath);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  requireToken();

  let files = collectMarkdown(DOCS_DIR);
  if (args.only) {
    const norm = args.only.replace(/\\/g, "/");
    files = files.filter((p) => p.startsWith(norm));
  }
  // Publish index.md files first: regular docs link to sections, so their
  // Outline documents must exist before those links are resolved (links.mjs
  // cache is invalidated on every create — see invalidateLinkCache).
  files.sort((a, b) => {
    const ai = a.endsWith("/index.md") ? 0 : 1;
    const bi = b.endsWith("/index.md") ? 0 : 1;
    return ai - bi || a.localeCompare(b);
  });

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
