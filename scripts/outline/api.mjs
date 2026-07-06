import process from "node:process";

/**
 * api.mjs — single Outline API client shared by publish.mjs, sync.mjs,
 * reconcile.mjs and cleanup.mjs. Previously each script carried its own copy
 * of outlineRequest/listCollections/findDocumentIdByCanonicalPath, and the
 * copies drifted (sync.mjs kept a stale full-text dedup lookup and had no
 * 429 retry, which produced duplicate documents on `npm run outline:sync`).
 *
 * Env: OUTLINE_URL (default http://localhost:3000), OUTLINE_API_TOKEN (required).
 */

export const OUTLINE_URL = process.env.OUTLINE_URL || "http://localhost:3000";
export const API_TOKEN = process.env.OUTLINE_API_TOKEN;

export function requireToken() {
  if (!API_TOKEN) {
    console.error('ERROR: Set OUTLINE_API_TOKEN (export OUTLINE_API_TOKEN="ol_api_...").');
    process.exit(1);
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function outlineRequest(endpoint, payload = {}, attempt = 0) {
  const res = await fetch(`${OUTLINE_URL}/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (res.status === 429 && attempt < 6) {
    const wait = Number(res.headers.get("Retry-After")) || Math.min(2 ** attempt, 30);
    console.log(`  rate-limited on ${endpoint}; waiting ${wait}s…`);
    await sleep(wait * 1000);
    return outlineRequest(endpoint, payload, attempt + 1);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Outline API error ${res.status} for ${endpoint}: ${JSON.stringify(data)}`);
  }
  return data;
}

// Collections rarely change during a run — fetch once and reuse to avoid
// hammering the API (uncached listing was a major source of 429s).
let _collectionsCache = null;

export async function listCollections({ fresh = false } = {}) {
  if (_collectionsCache && !fresh) return _collectionsCache;
  const out = [];
  let offset = 0;
  while (true) {
    const res = await outlineRequest("collections.list", { limit: 100, offset });
    const chunk = res?.data || [];
    out.push(...chunk);
    if (chunk.length < 100) break;
    offset += chunk.length;
  }
  _collectionsCache = out;
  return out;
}

export async function ensureCollectionByName(name) {
  const cols = await listCollections();
  const existing = cols.find((c) => c.name === name);
  if (existing) return existing.id;
  const created = await outlineRequest("collections.create", { name });
  _collectionsCache.push(created.data);
  return created.data.id;
}

export async function listDocuments(collectionId) {
  const out = [];
  let offset = 0;
  while (true) {
    const res = await outlineRequest("documents.list", { collectionId, limit: 100, offset });
    const chunk = res?.data || [];
    out.push(...chunk);
    if (chunk.length < 100) break;
    offset += chunk.length;
  }
  return out;
}

/**
 * Dedup lookup used by _publishOne: title + collection is the unique pair we
 * rely on (canonicalPath is kept in the signature for a future path-based key,
 * see backlog B-17).
 */
export async function findDocumentIdByCanonicalPath(canonicalPath, title, colName) {
  if (!title || !colName) return "";
  const cols = await listCollections();
  const col = cols.find((c) => c.name === colName);
  if (!col) return "";
  const docs = await listDocuments(col.id);
  const hit = docs.find((d) => d.title === title);
  return hit?.id || "";
}
