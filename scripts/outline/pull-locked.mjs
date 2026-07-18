import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { readFrontmatterOutlineLocked, isTopLevelIndexPath } from "./cleaners.mjs";

/**
 * pull-locked.mjs — list every `outline_locked: true` document (repo-relative
 * path, one per line, stdout). Pure filesystem scan — no Outline API calls,
 * no token required.
 *
 * Used by .github/workflows/outline-pull.yml to discover what to pull: the
 * workflow loops over this list and, for EACH file, does a clean
 * `git checkout main` -> new branch -> `node scripts/outline/pull.mjs --file
 * <that file>` -> diff -> commit-or-skip -> PR, one document fully processed
 * before starting the next. That per-document isolation (rather than pulling
 * every locked doc into one working tree and sorting it out afterwards) is
 * deliberate: it keeps each branch/commit/PR scoped to exactly one file, with
 * no risk of one doc's uncommitted pull interfering with another's git
 * operations mid-loop.
 *
 * Usage:
 *   node scripts/outline/pull-locked.mjs
 */

const DOCS_DIR = path.join(process.cwd(), "docs");

function findLockedFiles(dir, rel = "docs", out = []) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry === ".vitepress" || entry === "public") continue;
    const full = path.join(dir, entry);
    const relPath = `${rel}/${entry}`;
    if (fs.statSync(full).isDirectory()) {
      findLockedFiles(full, relPath, out);
    } else if (entry.endsWith(".md") && !isTopLevelIndexPath(relPath)) {
      const raw = fs.readFileSync(full, "utf8");
      if (readFrontmatterOutlineLocked(raw)) out.push(relPath);
    }
  }
  return out;
}

for (const f of findLockedFiles(DOCS_DIR)) {
  console.log(f);
}
