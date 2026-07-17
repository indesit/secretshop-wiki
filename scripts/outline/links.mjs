import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { listCollections, listDocuments } from "./api.mjs";
import {
  defaultCollectionForCanonicalPath,
  readFrontmatterTitle,
  isTopLevelIndexPath,
} from "./cleaners.mjs";

/**
 * links.mjs — rewrite internal cross-links so they resolve inside Outline.
 *
 * Documents are authored with canonical VitePress paths, e.g.
 *   [Типи чеків](/cash/receipts/reg-receipt-types)      absolute doc link
 *   [Чеки](/cash/receipts/)                             section link
 *   [Типи чеків](./reg-receipt-types.md)                relative (index tables)
 *   [[cash/receipts/reg-receipt-types]]                 wiki (buildRelatedLinks)
 * but in Outline a document lives at /doc/<slug>-<urlId>. Published as-is
 * those links 404. This module maps each link target to its live Outline URL:
 *   - doc path            -> source file -> frontmatter title -> collection -> doc.url
 *   - section path /x/y/  -> its index.md document (published since variant A)
 *   - top-level /x/       -> the collection URL itself (index not published)
 * and rewrites the links before publish.
 *
 * Resolution is read-only against the Outline API and heavily cached. Links
 * that can't be resolved are left untouched, never broken further.
 */

// collectionId -> Map(title -> url); populated lazily, reused across docs.
const _docIndexByCollection = new Map();

/**
 * Drop the cached doc index (all collections). _publishOne calls this after
 * documents.create so that docs published later in the same run can link to
 * the newcomer (reconcile publishes index.md files first for this reason).
 */
export function invalidateLinkCache() {
  _docIndexByCollection.clear();
}

async function titleUrlMap(collectionName) {
  const cols = await listCollections();
  const col = cols.find((c) => c.name === collectionName);
  if (!col) return new Map();
  if (_docIndexByCollection.has(col.id)) return _docIndexByCollection.get(col.id);
  const docs = await listDocuments(col.id);
  const map = new Map();
  for (const d of docs) if (d.title && d.url) map.set(d.title, d.url);
  _docIndexByCollection.set(col.id, map);
  return map;
}

/** Outline URL of a collection ("Каса" -> /collection/…), or null. */
async function collectionUrl(collectionName) {
  const cols = await listCollections();
  const col = cols.find((c) => c.name === collectionName);
  return col?.url || null;
}

/** Strip leading/trailing slashes, a leading `docs/`, and a trailing `.md`. */
function normPath(p) {
  return p
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .replace(/^docs\//, "")
    .replace(/\.md$/, "");
}

/** Look up a source file's title in its collection's live doc index. */
async function urlByFile(file, clean) {
  const title = readFrontmatterTitle(fs.readFileSync(file, "utf8"), "");
  if (!title) return null;
  const map = await titleUrlMap(defaultCollectionForCanonicalPath(clean));
  return map.get(title) || null;
}

/**
 * Resolve a canonical path (doc, section, or top-level domain) to an Outline
 * URL, or null when it has no counterpart there.
 */
async function resolvePathToUrl(rawPath, repoRoot) {
  const clean = normPath(rawPath);
  if (!clean) return null;

  const docFile = path.join(repoRoot, "docs", `${clean}.md`);
  if (fs.existsSync(docFile)) {
    // Top-level index.md files are never published — send those to the collection.
    if (isTopLevelIndexPath(path.relative(repoRoot, docFile))) {
      return collectionUrl(defaultCollectionForCanonicalPath(clean));
    }
    return urlByFile(docFile, clean);
  }

  const indexFile = path.join(repoRoot, "docs", clean, "index.md");
  if (fs.existsSync(indexFile)) {
    if (isTopLevelIndexPath(path.relative(repoRoot, indexFile))) {
      return collectionUrl(defaultCollectionForCanonicalPath(clean));
    }
    return urlByFile(indexFile, clean); // published subsection index
  }

  return null;
}

/** Resolve a `./x.md` / `../y/z` link against the linking doc's directory. */
function absolutize(relTarget, canonicalPath) {
  if (!canonicalPath) return null;
  const srcDir = path.posix.dirname(normPath(canonicalPath));
  const joined = path.posix.normalize(path.posix.join(srcDir, relTarget));
  return joined.startsWith("..") ? null : `/${joined}`;
}

/**
 * Rewrite internal cross-links in an Outline markdown body:
 *  - absolute links  `](/canonical/path)` and `](/section/)`
 *  - relative links  `](./doc.md)` (resolved against `canonicalPath`)
 *  - wiki links      `[[canonical/path]]` -> `[Title](/doc/…)`
 * `#anchors` are preserved as-is. External URLs and already-`/doc/…` links
 * are left untouched.
 */
export async function rewriteInternalLinks(text, repoRoot = process.cwd(), canonicalPath = "") {
  const mdAbs = /\]\((\/[a-z0-9][\w\-/]*\/?)(#[^)\s]*)?\)/gi;
  const mdRel = /\]\((\.{1,2}\/[\w\-./]+?)(#[^)\s]*)?\)/gi;
  const wiki = /\[\[([a-z0-9][\w\-/]*?)\]\]/gi;

  // Collect every distinct target: map "as written" -> canonical "/x/y" form.
  const targets = new Map();
  let m;
  while ((m = mdAbs.exec(text)) !== null) targets.set(m[1], m[1]);
  while ((m = mdRel.exec(text)) !== null) {
    const abs = absolutize(m[1], canonicalPath);
    if (abs) targets.set(m[1], abs);
  }
  while ((m = wiki.exec(text)) !== null) targets.set(m[1], `/${normPath(m[1])}`);

  const resolved = new Map();
  for (const [asWritten, canonical] of targets) {
    if (canonical.startsWith("/doc/")) continue; // already an Outline URL
    const url = await resolvePathToUrl(canonical, repoRoot).catch(() => null);
    if (url) resolved.set(asWritten, url);
  }

  let out = text.replace(mdAbs, (whole, p, anchor = "") =>
    resolved.has(p) ? `](${resolved.get(p)}${anchor || ""})` : whole
  );
  out = out.replace(mdRel, (whole, p, anchor = "") =>
    resolved.has(p) ? `](${resolved.get(p)}${anchor || ""})` : whole
  );
  out = out.replace(wiki, (whole, slug) => {
    const url = resolved.get(slug);
    if (!url) return whole;
    let label = slug;
    for (const f of [
      path.join(repoRoot, "docs", `${normPath(slug)}.md`),
      path.join(repoRoot, "docs", normPath(slug), "index.md"),
    ]) {
      if (fs.existsSync(f)) {
        label = readFrontmatterTitle(fs.readFileSync(f, "utf8"), slug);
        break;
      }
    }
    return `[${label}](${url})`;
  });
  return out;
}
