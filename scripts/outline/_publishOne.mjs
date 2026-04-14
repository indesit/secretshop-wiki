import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  enhanceForOutline,
  readFrontmatterTitle,
  readFrontmatterCanonicalPath,
  inferCanonicalPathFromFile,
} from "./cleaners.mjs";

/**
 * Shared publish logic used by publish.mjs and sync.mjs.
 *
 * Required deps:
 * - outlineRequest(endpoint, payload)
 * - ensureCollectionByName(name) -> collectionId
 * - findDocumentIdByCanonicalPath(canonicalPath) -> docId|""
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

  const raw = fs.readFileSync(absFile, "utf8");
  const fallbackTitle = path.parse(absFile).name;
  const title = readFrontmatterTitle(raw, fallbackTitle);

  const canonicalPathFromFm = readFrontmatterCanonicalPath(raw);
  const canonicalPath = canonicalPathFromFm || inferCanonicalPathFromFile(absFile, repoRoot);
  const colName = collection || defaultCollectionForCanonicalPath(canonicalPath);

  const cleaned = enhanceForOutline(raw, canonicalPath);
  const text = `${cleaned}`.trim() + "\n";

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

