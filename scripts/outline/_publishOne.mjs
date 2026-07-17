import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  enhanceForOutline,
  readFrontmatterTitle,
  readFrontmatterCanonicalPath,
  inferCanonicalPathFromFile,
  isTopLevelIndexPath,
  readFrontmatterOutlineLocked,
} from "./cleaners.mjs";
import { rewriteInternalLinks, invalidateLinkCache } from "./links.mjs";

/**
 * Shared publish logic used by publish.mjs and sync.mjs.
 *
 * Required deps (see api.mjs for the canonical implementations):
 * - outlineRequest(endpoint, payload)
 * - ensureCollectionByName(name) -> collectionId
 * - findDocumentIdByCanonicalPath(canonicalPath, title, colName) -> docId|""
 * - defaultCollectionForCanonicalPath(canonicalPath) -> name
 */
export default async function publishOne({
  filePath,
  collection,
  dryRun,
  outlineRequest,
  ensureCollectionByName,
  findDocumentIdByCanonicalPath,
  defaultCollectionForCanonicalPath,
}) {
  const repoRoot = process.cwd();
  const absFile = path.isAbsolute(filePath) ? filePath : path.join(repoRoot, filePath);
  if (!fs.existsSync(absFile)) {
    throw new Error(`File not found: ${absFile}`);
  }

  // Top-level index.md files (docs/index.md, docs/<domain>/index.md) are not
  // published: their title equals the collection name, which creates a
  // duplicate same-named child in Outline. Subsection indexes (unique titles
  // like "Чеки") ARE published so section cross-links resolve.
  const relFile = path.relative(repoRoot, absFile);
  if (isTopLevelIndexPath(relFile)) {
    console.log(`Skipped (top-level index, not published to Outline): ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(absFile, "utf8");

  // outline_locked: true — an editor is polishing this doc directly in
  // Outline (screenshots, embeds markdown can't represent). Never overwrite
  // it from git until the flag is removed. This is the single choke point
  // for create/update, so it protects sync.mjs, reconcile.mjs and publish.mjs
  // alike.
  if (readFrontmatterOutlineLocked(raw)) {
    console.log(`Skipped (outline_locked: true — edited directly in Outline): ${filePath}`);
    return;
  }

  const fallbackTitle = path.parse(absFile).name;
  const title = readFrontmatterTitle(raw, fallbackTitle);

  // Defensive: never publish an index page under the useless title "index" —
  // a subsection index without a frontmatter title is a content bug to fix.
  if (path.basename(absFile) === "index.md" && title === fallbackTitle) {
    console.log(`Skipped (subsection index without frontmatter title): ${filePath}`);
    return;
  }

  const canonicalPathFromFm = readFrontmatterCanonicalPath(raw);
  const canonicalPath = canonicalPathFromFm || inferCanonicalPathFromFile(absFile, repoRoot);
  const colName = collection || defaultCollectionForCanonicalPath(canonicalPath);

  const cleaned = enhanceForOutline(raw, canonicalPath);
  // Rewrite canonical cross-links to their live Outline /doc/ URLs (read-only
  // resolution against the API); unresolvable links are left as-is.
  const text =
    (await rewriteInternalLinks(`${cleaned}`.trim(), repoRoot, canonicalPath)) + "\n";

  const existingId = await findDocumentIdByCanonicalPath(canonicalPath, title, colName);
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
  invalidateLinkCache(); // docs published later this run can now link to this one
  console.log(`Created: ${title}`);
  console.log(`Canonical: ${canonicalPath}`);
  console.log(`Outline doc id: ${created.data.id}`);
}

