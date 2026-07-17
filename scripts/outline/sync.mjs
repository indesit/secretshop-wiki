import { execSync } from "node:child_process";
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

// Simple git-based sync: publish only markdown files changed since a ref.
// Usage:
//   node scripts/outline/sync.mjs --since origin/main
//   node scripts/outline/sync.mjs --since HEAD~1
//   node scripts/outline/sync.mjs --since origin/main --only docs/company/
//   node scripts/outline/sync.mjs --since origin/main --dry-run

function usage() {
  console.log(`\nSync changed docs to Outline (git diff)\n\n`);
  console.log(
    `Usage:\n  node scripts/outline/sync.mjs --since <git-ref> [--only docs/<path>/] [--dry-run]\n\n` +
      `Env:\n  OUTLINE_URL (default: http://localhost:3000)\n  OUTLINE_API_TOKEN (required)\n`
  );
}

function parseArgs(argv) {
  const args = { since: "", only: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--since") args.since = argv[++i];
    else if (a === "--only") args.only = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "-h" || a === "--help") {
      usage();
      process.exit(0);
    }
  }
  return args;
}

function resolveRepoRoot() {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
}

function changedFilesSince(ref) {
  const cmd = `git diff --name-only ${ref}..HEAD`;
  return execSync(cmd, { encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isDocsMarkdown(p) {
  // Skip only TOP-LEVEL index.md (title duplicates the collection name).
  // Subsection indexes are published — see cleaners.isTopLevelIndexPath.
  if (isTopLevelIndexPath(p)) return false;
  return p.startsWith("docs/") && p.endsWith(".md");
}

function filterOnlyPrefix(p, onlyPrefix) {
  if (!onlyPrefix) return true;
  const norm = onlyPrefix.replace(/\\/g, "/");
  return p.startsWith(norm);
}

const args = parseArgs(process.argv);
if (!args.since) {
  usage();
  process.exit(1);
}
requireToken();

const repoRoot = resolveRepoRoot();
const files = changedFilesSince(args.since)
  .filter(isDocsMarkdown)
  .filter((p) => filterOnlyPrefix(p, args.only));

if (files.length === 0) {
  console.log("No changed docs/*.md files to publish.");
  process.exit(0);
}

console.log(`Will publish ${files.length} file(s) to Outline:`);
for (const f of files) console.log(`- ${f}`);

for (const f of files) {
  // eslint-disable-next-line no-await-in-loop
  await publishOne({
    filePath: path.join(repoRoot, f),
    collection: "",
    dryRun: args.dryRun,
    outlineRequest,
    ensureCollectionByName,
    findDocumentIdByCanonicalPath,
    defaultCollectionForCanonicalPath,
  });
  if (!args.dryRun) await sleep(300); // stay under Outline's write rate limit
}
