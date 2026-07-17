import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  enhanceForOutline,
  readFrontmatterTitle,
  readFrontmatterCanonicalPath,
  inferCanonicalPathFromFile,
} from "./cleaners.mjs";
import { rewriteInternalLinks } from "./links.mjs";

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

  // Section index.md files are not published as documents: their title equals
  // the collection name, which creates a duplicate same-named child in Outline.
  // (Section intros can later be mapped to the collection description instead.)
  if (path.basename(absFile) === "index.md") {
    console.log(`Skipped (section index, not published to Outline): ${filePath}`);
    return;
  }

  const raw = fs.readFileSync(absFile, "utf8");
  const fallbackTitle = path.parse(absFile).name;
  const title = readFrontmatterTitle(raw, fallbackTitle);

  const canonicalPathFromFm = readFrontmatterCanonicalPath(raw);
  const canonicalPath = canonicalPathFromFm || inferCanonicalPathFromFile(absFile, repoRoot);
  const colName = collection || defaultCollectionForCanonicalPath(canonicalPath);

  const cleaned = enhanceForOutline(raw, canonicalPath);
  // Rewrite canonical cross-links to their live Outline /doc/ URLs (read-only
  // resolution against the API); unresolvable links are left as-is.
  const text = (await rewriteInternalLinks(`${cleaned}`.trim(), repoRoot)) + "\n";

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
  console.log(`Created: ${title}`);
  console.log(`Canonical: ${canonicalPath}`);
  console.log(`Outline doc id: ${created.data.id}`);
}

