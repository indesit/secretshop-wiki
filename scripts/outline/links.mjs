import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { listCollections, listDocuments } from "./api.mjs";
import { defaultCollectionForCanonicalPath, readFrontmatterTitle } from "./cleaners.mjs";

/**
 * links.mjs — rewrite internal cross-links so they resolve inside Outline.
 *
 * Documents are authored with canonical VitePress paths, e.g.
 *   [Типи чеків](/cash/receipts/reg-receipt-types)
 *   [[cash/receipts/reg-receipt-types]]        (from buildRelatedLinks)
 * but in Outline the same document lives at /doc/<slug>-<urlId>. Published
 * as-is those links 404. This module maps a canonical path to the target's
 * live Outline URL (source file -> frontmatter title -> collection -> doc.url)
 * and rewrites the links before publish.
 *
 * Resolution is read-only against the Outline API and heavily cached. Links
 * that can't be resolved (section index paths -> index.md is not published,
 * or a target not yet in Outline) are left untouched, never broken further.
 */

// collectionId -> Map(title -> url); populated lazily, reused across docs.
const _docIndexByCollection = new Map();

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

/** Strip leading/trailing slashes and a leading `docs/`. */
function normPath(p) {
  return p.replace(/^\/+/, "").replace(/\/+$/, "").replace(/^docs\//, "");
}

/**
 * Resolve a canonical path to an Outline document URL, or null when it is not
 * a publishable document (points at a section directory / not found in Outline).
 */
async function resolvePathToUrl(rawPath, repoRoot) {
  const clean = normPath(rawPath);
  if (!clean) return null;
  const file = path.join(repoRoot, "docs", `${clean}.md`);
  if (!fs.existsSync(file)) return null; // e.g. /sales/customer-communication/ (a section index)
  const title = readFrontmatterTitle(fs.readFileSync(file, "utf8"), "");
  if (!title) return null;
  const map = await titleUrlMap(defaultCollectionForCanonicalPath(clean));
  return map.get(title) || null;
}

/**
 * Rewrite internal cross-links in an Outline markdown body:
 *  - inline links  `](/canonical/path)`  -> `](/doc/…-urlId)`
 *  - wiki links    `[[canonical/path]]`   -> `[Title](/doc/…-urlId)`
 * External URLs, anchors and already-`/doc/…` links are left untouched.
 */
export async function rewriteInternalLinks(text, repoRoot = process.cwd()) {
  const mdLink = /\]\((\/[a-z0-9][\w\-/]*?)\)/gi;
  const wiki = /\[\[([a-z0-9][\w\-/]*?)\]\]/gi;

  const targets = new Set();
  let m;
  while ((m = mdLink.exec(text)) !== null) targets.add(m[1]);
  while ((m = wiki.exec(text)) !== null) targets.add(m[1]);

  const resolved = new Map();
  for (const t of targets) {
    const url = await resolvePathToUrl(t, repoRoot).catch(() => null);
    if (url) resolved.set(t, url);
  }

  let out = text.replace(mdLink, (whole, p) => (resolved.has(p) ? `](${resolved.get(p)})` : whole));
  out = out.replace(wiki, (whole, slug) => {
    const url = resolved.get(slug);
    if (!url) return whole;
    let label = slug;
    try {
      label = readFrontmatterTitle(fs.readFileSync(path.join(repoRoot, "docs", `${normPath(slug)}.md`), "utf8"), slug);
    } catch {
      /* keep slug as label */
    }
    return `[${label}](${url})`;
  });
  return out;
}
