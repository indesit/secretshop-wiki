import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import {
  readFrontmatterTitle,
  readFrontmatterCanonicalPath,
  inferCanonicalPathFromFile,
  defaultCollectionForCanonicalPath,
} from "./cleaners.mjs";
import {
  outlineRequest,
  listCollections,
  listDocuments,
  requireToken,
  OUTLINE_URL,
  API_TOKEN,
} from "./api.mjs";
import { rewriteOutlineLinksToCanonical } from "./links.mjs";

/**
 * pull.mjs — pull a document's CURRENT Outline content back into its git
 * markdown file, for the workflow where an owner polishes a doc directly in
 * Outline (screenshots, embeds — things git/markdown authoring can't do as
 * conveniently) while `outline_locked: true` keeps sync/reconcile from
 * overwriting it in the meantime.
 *
 * What it does:
 *   1. Finds the document in Outline (by canonical path -> title -> collection).
 *   2. Fetches its live text and strips the four generated blocks
 *      (header/toc/related/footer — see cleaners.mjs wrapMarker) added on
 *      publish, keeping only the author-edited body.
 *   3. Downloads any inline image attachments
 *      (`/api/attachments.redirect?id=…`) into
 *      docs/public/outline-imports/<slug>/ and rewrites the markdown to
 *      reference them locally — so git stays a self-contained canonical
 *      source, not dependent on Outline staying online.
 *   4. Rewrites the file: original frontmatter (untouched) + pulled body.
 *
 * Requires the document to have been published AFTER marker support was
 * added (see cleaners.mjs). A pre-existing Outline document without markers
 * cannot be safely split into "generated" vs "authored" — pull refuses
 * rather than guess and risk corrupting content; re-publish once first.
 *
 * `pullDocument()` is also used by pull-locked.mjs, the batch orchestrator
 * run on a schedule by .github/workflows/outline-pull.yml — that's the other
 * half of the round-trip (auto-opens a PR per changed doc instead of
 * requiring a manual CLI run for every edit).
 *
 * Usage:
 *   node scripts/outline/pull.mjs --file docs/<path>.md [--dry-run]
 *
 * Known limitation: this does not round-trip in the other direction. Once
 * pulled, image references are git-local paths (/outline-imports/...) that
 * only resolve on the VitePress site — if the doc is later re-published to
 * Outline, those images will not render there. Outline is a consumption
 * layer; VitePress + git remain canonical (see README "Публікація в Outline").
 *
 * Env: OUTLINE_URL (default http://localhost:3000), OUTLINE_API_TOKEN (required)
 */

const MARKER_NAMES = ["header", "toc", "related", "footer"];

function hasMarkers(text) {
  return MARKER_NAMES.some((n) => text.includes(`outline:${n}:start`));
}

function stripMarkedBlocks(text) {
  let out = text;
  for (const name of MARKER_NAMES) {
    const re = new RegExp(
      `<!--\\s*outline:${name}:start\\s*-->[\\s\\S]*?<!--\\s*outline:${name}:end\\s*-->`,
      "g"
    );
    out = out.replace(re, "");
  }
  return out.replace(/\n{4,}/g, "\n\n\n");
}

const EXT_BY_CONTENT_TYPE = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

async function downloadAttachment(id, destDir, index) {
  const url = `${OUTLINE_URL}/api/attachments.redirect?id=${id}`;

  // Manual redirect handling: attachments.redirect 302s to a presigned S3/
  // MinIO URL that carries its own auth in the query string (X-Amz-Signature).
  // When that redirect target is same-origin as OUTLINE_URL (true for the
  // public https://wiki.secretshop.ua deployment — only same-origin because
  // AWS_S3_UPLOAD_BUCKET_URL is configured to that domain, see
  // ops/outline/outline.env), fetch's `redirect: "follow"` forwards the
  // Authorization header to it by default, and MinIO then sees two
  // authentication methods at once and rejects with 400 "InvalidRequest:
  // request has multiple authentication types, please use one". Fetching the
  // redirect target WITHOUT our Bearer token avoids that; the presigned URL
  // is self-authenticating. (Not reproducible against OUTLINE_URL=localhost
  // in local testing — that redirect crosses origins, so fetch already drops
  // the header there. Same-origin in CI is what exposes it.)
  const first = await fetch(url, {
    headers: { Authorization: `Bearer ${API_TOKEN}` },
    redirect: "manual",
  });
  const location = first.headers.get("location");
  if (!(first.status >= 300 && first.status < 400) || !location) {
    throw new Error(`attachment ${id}: expected a redirect, got HTTP ${first.status}`);
  }
  const res = await fetch(location);
  if (!res.ok) throw new Error(`attachment ${id}: HTTP ${res.status}`);
  const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
  const ext = EXT_BY_CONTENT_TYPE[contentType] || "bin";
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(destDir, { recursive: true });
  const filename = `img-${index}.${ext}`;
  fs.writeFileSync(path.join(destDir, filename), buf);
  return filename;
}

const ATTACHMENT_RE =
  /!\[(?<alt>[^\]]*)\]\((?<url>[^)]*\/api\/attachments\.redirect\?id=(?<id>[a-zA-Z0-9_-]+)[^)]*)\)/g;

async function rewriteAttachments(text, slug, repoRoot, dryRun) {
  const matches = [...text.matchAll(ATTACHMENT_RE)];
  if (matches.length === 0) return { text, count: 0 };
  if (dryRun) return { text, count: matches.length };

  const destDir = path.join(repoRoot, "docs", "public", "outline-imports", slug);
  let out = text;
  let i = 0;
  for (const m of matches) {
    i += 1;
    const filename = await downloadAttachment(m.groups.id, destDir, i);
    const localPath = `/outline-imports/${slug}/${filename}`;
    out = out.replace(m[0], `![${m.groups.alt}](${localPath})`);
  }
  return { text: out, count: matches.length };
}

function slugFor(absFile) {
  return path.parse(absFile).name === "index"
    ? path.basename(path.dirname(absFile))
    : path.parse(absFile).name;
}

/**
 * Pull one document. Returns:
 *   { title, slug, relFile, wrote, body, count, unresolved }
 * `wrote` is false in dry-run mode (nothing touched on disk).
 * Throws on: file not found, no frontmatter, doc not found in Outline, or
 * doc predates marker support (see module docstring).
 */
export async function pullDocument({ file, repoRoot = process.cwd(), dryRun = false }) {
  const absFile = path.isAbsolute(file) ? file : path.join(repoRoot, file);
  if (!fs.existsSync(absFile)) {
    throw new Error(`File not found: ${absFile}`);
  }

  const raw = fs.readFileSync(absFile, "utf8");
  const fmMatch = raw.match(/^(---\n[\s\S]*?\n---\n)/);
  if (!fmMatch) {
    throw new Error(`No frontmatter block in ${file} — refusing to overwrite a non-standard file.`);
  }
  const frontmatter = fmMatch[1];

  const fallbackTitle = path.parse(absFile).name;
  const title = readFrontmatterTitle(raw, fallbackTitle);
  const canonicalPath = readFrontmatterCanonicalPath(raw) || inferCanonicalPathFromFile(absFile, repoRoot);
  const colName = defaultCollectionForCanonicalPath(canonicalPath);

  const cols = await listCollections();
  const col = cols.find((c) => c.name === colName);
  if (!col) throw new Error(`Collection "${colName}" not found in Outline.`);
  const docs = await listDocuments(col.id);
  const hit = docs.find((d) => d.title === title);
  if (!hit) throw new Error(`Document "${title}" not found in Outline collection "${colName}".`);

  const info = await outlineRequest("documents.info", { id: hit.id });
  const liveText = info.data.text;

  if (!hasMarkers(liveText)) {
    throw new Error(
      `Document "${title}" has no generated-block markers — it predates pull support.\n` +
        `Fix: temporarily unset outline_locked, re-publish once (npm run outline:sync -- --since <ref>,\n` +
        `or npm run outline:reconcile) so it carries markers, set outline_locked: true again, and retry.`
    );
  }

  let body = stripMarkedBlocks(liveText).trim();
  const slug = slugFor(absFile);

  // Publish already rewrote authored links to Outline /doc/ and /collection/
  // URLs (links.mjs). Convert them back to canonical git-relative paths —
  // otherwise Outline-only URLs would land in the git-canonical file and
  // break navigation on the VitePress site.
  const { text: withCanonicalLinks, unresolved } = await rewriteOutlineLinksToCanonical(body, repoRoot);
  body = withCanonicalLinks;

  // enhanceForOutline drops a leading `# {title}` H1 that duplicates the
  // frontmatter title (Outline shows the title separately) — restore it so
  // the git file matches the repo-wide convention of starting with that H1.
  if (!new RegExp(`^#\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n`).test(body)) {
    body = `# ${title}\n\n${body}`;
  }

  const { text: rewritten, count } = await rewriteAttachments(body, slug, repoRoot, dryRun);
  body = rewritten;

  const relFile = path.relative(repoRoot, absFile);
  if (dryRun) {
    return { title, slug, relFile, wrote: false, body, count, unresolved };
  }

  fs.writeFileSync(absFile, `${frontmatter}\n${body}\n`);
  return { title, slug, relFile, wrote: true, body, count, unresolved };
}

function usage() {
  console.log(
    `\nPull a document's live Outline content back into its git markdown file\n\n` +
      `Usage:\n  node scripts/outline/pull.mjs --file docs/<path>.md [--dry-run]\n\n` +
      `Env:\n  OUTLINE_URL (default: http://localhost:3000)\n  OUTLINE_API_TOKEN (required)\n`
  );
}

function parseArgs(argv) {
  const args = { file: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "-h" || a === "--help") {
      usage();
      process.exit(0);
    }
  }
  if (!args.file) {
    usage();
    process.exit(1);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  requireToken();

  const result = await pullDocument({ file: args.file, dryRun: args.dryRun });
  const { title, slug, relFile, wrote, body, count, unresolved } = result;

  if (!wrote) {
    console.log(`DRY RUN — would write ${relFile}`);
    console.log(`Image attachments that would be downloaded: ${count}`);
    if (unresolved.length) {
      console.log(`\nWARNING: ${unresolved.length} internal link(s) could not be mapped back to git paths:`);
      for (const u of unresolved) console.log(`  - ${u}`);
    }
    console.log(`\n--- pulled body preview (first 600 chars) ---\n${body.slice(0, 600)}`);
    return;
  }

  console.log(`Pulled: ${title}`);
  console.log(`File: ${relFile}`);
  console.log(`Images downloaded: ${count}${count ? ` (docs/public/outline-imports/${slug}/)` : ""}`);
  if (unresolved.length) {
    console.log(`\nWARNING: ${unresolved.length} internal link(s) could NOT be mapped back to git paths`);
    console.log(`(left as Outline URLs — fix manually, they will not work on the VitePress site):`);
    for (const u of unresolved) console.log(`  - ${u}`);
  }
  console.log(`\nNext: review \`git diff\`, unset outline_locked when satisfied, then commit.`);
}

// Only run the CLI when invoked directly (not when imported by pull-locked.mjs).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(String(e?.stack || e));
    process.exit(1);
  });
}
