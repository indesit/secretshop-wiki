import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { listCollections, listDocuments } from "./api.mjs";
import {
  defaultCollectionForCanonicalPath,
  readFrontmatterTitle,
  isTopLevelIndexPath,
  COLLECTION_MAP,
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

// ============================================================
// Reverse direction: Outline URL -> canonical git path (used by pull.mjs)
// ============================================================

// repo-relative docs path ("docs/x/y.md") -> frontmatter title, built once by
// walking the whole tree. Titles are assumed unique across the repo (the
// existing publish pipeline already relies on this for dedup-by-title).
let _titleByCanonicalPath = null;
function repoTitleIndex(repoRoot) {
  if (_titleByCanonicalPath) return _titleByCanonicalPath;
  const map = new Map(); // title -> "docs/x/y.md"
  (function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === ".vitepress" || entry === "public") continue;
      const full = path.join(dir, entry);
      const relPath = `${rel}/${entry}`;
      if (fs.statSync(full).isDirectory()) {
        walk(full, relPath);
      } else if (entry.endsWith(".md") && !isTopLevelIndexPath(relPath)) {
        const title = readFrontmatterTitle(fs.readFileSync(full, "utf8"), "");
        if (title) map.set(title, relPath);
      }
    }
  })(path.join(repoRoot, "docs"), "docs");
  _titleByCanonicalPath = map;
  return map;
}

// Outline document url -> title, across ALL collections (a /doc/ link can
// point at a document outside the linking doc's own collection).
let _titleByUrl = null;
async function urlTitleIndex() {
  if (_titleByUrl) return _titleByUrl;
  const map = new Map();
  const cols = await listCollections();
  for (const c of cols) {
    const docs = await listDocuments(c.id);
    for (const d of docs) if (d.url && d.title) map.set(d.url, d.title);
  }
  _titleByUrl = map;
  return map;
}

// Collection url -> top-level domain (for /collection/... links, which are
// what a top-level index.md link resolves to on publish — see
// resolvePathToUrl above).
let _domainByCollectionUrl = null;
async function collectionUrlIndex() {
  if (_domainByCollectionUrl) return _domainByCollectionUrl;
  const map = new Map();
  const cols = await listCollections();
  for (const [domain, name] of Object.entries(COLLECTION_MAP)) {
    const col = cols.find((c) => c.name === name);
    if (col?.url) map.set(col.url, domain);
  }
  _domainByCollectionUrl = map;
  return map;
}

/** "docs/x/y/index.md" -> "/x/y/" ; "docs/x/y/z.md" -> "/x/y/z" */
function canonicalPathToAuthoredLink(relPath) {
  let p = relPath.replace(/^docs\//, "").replace(/\.md$/, "");
  if (p.endsWith("/index")) return `/${p.slice(0, -"index".length)}`;
  return `/${p}`;
}

/**
 * Reverse of rewriteInternalLinks: convert Outline's own `/doc/…` and
 * `/collection/…` URLs back to canonical git-relative paths, for pull.mjs.
 * Necessary because publish already rewrote authored links to Outline URLs
 * (see rewriteInternalLinks) — pulling that text back verbatim would leave
 * Outline-only URLs baked into the git-canonical file, breaking navigation
 * on the VitePress site (a different domain that knows nothing about
 * Outline's /doc/ routes).
 *
 * Returns { text, unresolved } — unresolved lists URLs that could not be
 * mapped back (e.g. the target was renamed/removed in Outline); those are
 * left as-is in the text and must be fixed manually, since leaving a
 * dangling Outline URL in git is worse than a visible warning.
 */
export async function rewriteOutlineLinksToCanonical(text, repoRoot = process.cwd()) {
  const titleIndex = repoTitleIndex(repoRoot);
  const urlToTitle = await urlTitleIndex();
  const urlToDomain = await collectionUrlIndex();
  const unresolved = [];

  const re = /\]\((\/(?:doc|collection)\/[^)#\s]+)(#[^)\s]*)?\)/g;
  const out = text.replace(re, (whole, url, anchor = "") => {
    if (url.startsWith("/doc/")) {
      const title = urlToTitle.get(url);
      const relPath = title && titleIndex.get(title);
      if (relPath) return `](${canonicalPathToAuthoredLink(relPath)}${anchor || ""})`;
    } else if (url.startsWith("/collection/")) {
      const domain = urlToDomain.get(url);
      if (domain) return `](/${domain}/${anchor || ""})`;
    }
    unresolved.push(url);
    return whole;
  });

  return { text: out, unresolved };
}
