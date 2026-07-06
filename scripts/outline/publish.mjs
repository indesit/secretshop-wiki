import path from "node:path";
import process from "node:process";

import publishOne from "./_publishOne.mjs";
import { defaultCollectionForCanonicalPath } from "./cleaners.mjs";
import {
  outlineRequest,
  ensureCollectionByName,
  findDocumentIdByCanonicalPath,
  requireToken,
} from "./api.mjs";

function usage() {
  console.log(`\nPublish (create/update) a single company-wiki doc to Outline\n\n`);
  console.log(
    `Usage:\n  node scripts/outline/publish.mjs --file docs/<...>.md [--collection "Компанія"] [--dry-run]\n\n` +
      `Env:\n  OUTLINE_URL (default: http://localhost:3000)\n  OUTLINE_API_TOKEN (required)\n`
  );
}

function parseArgs(argv) {
  const args = { file: "", collection: "", dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--collection") args.collection = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "-h" || a === "--help") {
      usage();
      process.exit(0);
    }
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.file) {
  usage();
  process.exit(1);
}
requireToken();

publishOne({
  filePath: path.isAbsolute(args.file) ? args.file : path.join(process.cwd(), args.file),
  collection: args.collection,
  dryRun: args.dryRun,
  outlineRequest,
  ensureCollectionByName,
  findDocumentIdByCanonicalPath,
  defaultCollectionForCanonicalPath,
}).catch((e) => {
  console.error(String(e?.stack || e));
  process.exit(1);
});
