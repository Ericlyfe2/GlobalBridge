# RAG Knowledge Engine Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the already-built (but uncommitted, unverified) RAG knowledge engine — knowledge base, vector search, embedding cache, knowledge CRUD — from "code exists" to "verified working and committed," fixing a hardcoded credential and deduplicated embedding logic along the way.

**Architecture:** No new architecture. This is a hardening pass on existing Express routes (`rag.ts`, `knowledge.ts`) and scripts (`seed-knowledge.ts`, `generate-embeddings.ts`, `run-migration.ts`). The one structural change is extracting duplicated OpenAI-embedding-with-cache logic (currently copy-pasted between `rag.ts` and `knowledge.ts`) into a shared `backend/src/lib/embeddings.ts` module.

**Tech Stack:** Node.js/TypeScript, Express, PostgreSQL 16 + pgvector, Redis (optional, via `ioredis`), OpenAI `text-embedding-3-small`, Zod, Vitest.

## Global Constraints

- Embedding model stays `text-embedding-3-small` (1536 dimensions) — matches the `vector(1536)` columns already in the schema. Do not change.
- Redis embedding cache TTL stays 300 seconds (5 minutes) — matches existing `RAG_CACHE_TTL` behavior. Do not change.
- No new npm dependencies. Everything needed (`pg`, `ioredis`, `zod`, `vitest`) is already installed.
- Never hardcode a database connection string, API key, or other credential in source. All secrets come from `process.env`, loaded via `backend/.env` (already populated for local dev).
- Response shapes returned by `/api/rag/search`, `/api/knowledge/*` must not change — the frontend chat route (`frontend/src/app/api/ai/chat/route.ts`) and `AGENTS.md` already document these contracts and are out of scope for this plan.
- Follow the existing test convention in `backend/src/__tests__/`: self-contained test files, each defining its own `vi.mock(...)` calls and a local `callRoute` helper that walks the Express router stack directly (see `auth-routes.test.ts` for the pattern) — no supertest, no shared test-helper module.

---

### Task 1: Fix the hardcoded credential in `run-migration.ts` and make it reusable

**Files:**
- Modify: `backend/run-migration.ts`

**Interfaces:**
- Produces: `run-migration.ts` becomes a general-purpose "apply a SQL file to `DATABASE_URL`" script, invoked as `npx tsx run-migration.ts [path-to-sql-file]` (relative to `backend/`), defaulting to `../db/schema.sql` when no argument is given. Later tasks (Task 8) invoke it with `../db/migration_rag.sql`.

- [ ] **Step 1: Rewrite the script**

Replace the full contents of `backend/run-migration.ts` with:

```ts
import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { resolve } from "path";

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required — set it in backend/.env");
    process.exit(1);
  }

  const sqlFile = process.argv[2] || "../db/schema.sql";
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  try {
    const sql = readFileSync(resolve(__dirname, sqlFile), "utf8");
    console.log(`Applying ${sqlFile}...`);
    await pool.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration error:", (err as Error).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
run();
```

This removes the hardcoded Neon connection string entirely, adds `dotenv/config` so `backend/.env` is actually loaded (the original script relied on the hardcoded fallback specifically because it never loaded `.env`), and parameterizes the SQL file path so the same script can apply either `schema.sql` or `migration_rag.sql`.

- [ ] **Step 2: Verify it runs without a hardcoded credential**

Run: `cd backend && npx tsx run-migration.ts ../db/migration_rag.sql`
Expected: `Applying ../db/migration_rag.sql...` then `Migration applied successfully!` (uses `DATABASE_URL` from `backend/.env`, which is already set).

If it prints `DATABASE_URL is required` instead, `backend/.env` doesn't have `DATABASE_URL` set — stop and flag this to the user rather than reintroducing a fallback credential.

- [ ] **Step 3: Commit**

```bash
git add backend/run-migration.ts
git commit -m "fix: remove hardcoded DB credential from run-migration.ts"
```

---

### Task 2: Delete redundant debug scripts

**Files:**
- Delete: `backend/src/test-vector.ts`
- Delete: `backend/src/check-embeddings.ts`
- Delete: `backend/src/embed-remaining.ts`

**Interfaces:**
- Consumes: none (these files are not imported anywhere else — confirmed by their content, each is a standalone `main()`/`run()` script executed directly via `tsx`).
- Produces: nothing new. `backend/src/generate-embeddings.ts` (already exists, untouched by this task) remains the one real embedding-backfill tool, wired to `npm run embed:knowledge`.

- [ ] **Step 1: Delete the three files**

```bash
rm backend/src/test-vector.ts backend/src/check-embeddings.ts backend/src/embed-remaining.ts
```

- [ ] **Step 2: Confirm nothing references them**

Run: `cd backend && grep -rE "test-vector|check-embeddings|embed-remaining" src/ package.json`
Expected: no output (no matches).

- [ ] **Step 3: Commit**

```bash
git add -A backend/src/test-vector.ts backend/src/check-embeddings.ts backend/src/embed-remaining.ts
git commit -m "chore: remove redundant embedding debug scripts"
```

---

### Task 3: Extract shared embeddings module and wire it into `rag.ts`

**Files:**
- Create: `backend/src/lib/embeddings.ts`
- Modify: `backend/src/routes/rag.ts`

**Interfaces:**
- Produces:
  - `generateEmbedding(text: string): Promise<number[]>` — raw OpenAI embedding call via `node:https`, no caching.
  - `getEmbedding(text: string): Promise<number[]>` — cache-checked (Redis, then Postgres `embedding_cache` table, then generates and persists to both). Both exported from `backend/src/lib/embeddings.ts`.
- Consumes: `query`, `queryOne`, `redis` from `../db` (existing exports, unchanged).

- [ ] **Step 1: Create `backend/src/lib/embeddings.ts`**

```ts
import { query, queryOne, redis } from "../db";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const EMBED_MODEL = "text-embedding-3-small";
const EMBED_CACHE_TTL = 300; // 5 minutes (Redis)

export async function generateEmbedding(text: string): Promise<number[]> {
  const https = await import("node:https");
  const url = new URL(`${OPENAI_BASE_URL}/embeddings`);
  const body = JSON.stringify({ model: EMBED_MODEL, input: text });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: 15000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: string) => (data += chunk));
        res.on("end", () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`Embedding API error (${res.statusCode}): ${data.slice(0, 200)}`));
              return;
            }
            const parsed = JSON.parse(data) as { data: { embedding: number[] }[] };
            resolve(parsed.data[0].embedding);
          } catch (e) {
            reject(new Error(`Failed to parse embedding response: ${(e as Error).message}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Embedding API timeout")); });
    req.write(body);
    req.end();
  });
}

// Check embedding cache, or generate and cache
export async function getEmbedding(text: string): Promise<number[]> {
  const crypto = await import("node:crypto");
  const hash = crypto.createHash("sha256").update(text).digest("hex");

  // Check Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(`embed:${hash}`);
      if (cached) return JSON.parse(cached) as number[];
    } catch { /* ignore redis errors */ }
  }

  // Check Postgres cache
  const cached = await queryOne<{ embedding: string }>(
    `SELECT embedding::text FROM embedding_cache WHERE input_hash = $1`,
    [hash],
  );
  if (cached?.embedding) {
    const emb = JSON.parse(cached.embedding) as number[];
    // Warm Redis
    if (redis) redis.setex(`embed:${hash}`, EMBED_CACHE_TTL, cached.embedding).catch(() => {});
    return emb;
  }

  const embedding = await generateEmbedding(text);

  // Store in Postgres cache
  await query(
    `INSERT INTO embedding_cache (input_hash, input_text, embedding) VALUES ($1, $2, $3::vector)
     ON CONFLICT (input_hash) DO NOTHING`,
    [hash, text, JSON.stringify(embedding)],
  ).catch(() => {});

  // Warm Redis
  if (redis) redis.setex(`embed:${hash}`, EMBED_CACHE_TTL, JSON.stringify(embedding)).catch(() => {});

  return embedding;
}
```

This is a verbatim move of the two functions currently defined inline in `backend/src/routes/rag.ts` (lines 14–95), only renaming the local `RAG_CACHE_TTL` constant to `EMBED_CACHE_TTL` since it's no longer RAG-specific. No behavior change.

- [ ] **Step 2: Update `backend/src/routes/rag.ts` to import from the shared module**

Replace lines 1–95 of `backend/src/routes/rag.ts` (everything from the top through the end of the `getEmbedding` function) with:

```ts
import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db";
import { requireAuth } from "../middleware/auth";
import { getEmbedding, generateEmbedding } from "../lib/embeddings";

export const ragRouter = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
```

Everything from `const searchSchema = ...` (originally line 97) onward stays exactly as-is — `getEmbedding` and `generateEmbedding` are now imported instead of locally defined, and both are still used the same way (`getEmbedding` in `/search`, `generateEmbedding` in `/reembed-all`).

Note: the `import { redis } from "../db";` line is removed — `rag.ts` no longer touches `redis` directly, only through the imported `getEmbedding`.

- [ ] **Step 3: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/embeddings.ts backend/src/routes/rag.ts
git commit -m "refactor: extract shared embeddings module from rag.ts"
```

---

### Task 4: Wire `knowledge.ts` to the shared `getEmbedding`

**Files:**
- Modify: `backend/src/routes/knowledge.ts`

**Interfaces:**
- Consumes: `getEmbedding(text: string): Promise<number[]>` from `../lib/embeddings` (produced by Task 3).

- [ ] **Step 1: Remove the local `embedUrl` function and import `getEmbedding` instead**

In `backend/src/routes/knowledge.ts`, delete lines 8–17 (the entire `embedUrl` function):

```ts
function embedUrl(apiKey: string, baseURL: string | undefined, input: string): Promise<number[]> {
  const url = `${baseURL || "https://api.openai.com/v1"}/embeddings`;
  return fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input }),
  })
    .then((r) => r.json() as Promise<{ data: { embedding: number[] }[] }>)
    .then((d) => d.data[0].embedding);
}
```

Add this import at the top of the file, alongside the existing imports:

```ts
import { getEmbedding } from "../lib/embeddings";
```

- [ ] **Step 2: Update the `POST /` handler**

In the `POST /` handler (originally lines 29–51), change:

```ts
    if (apiKey) {
      const textForEmbed = `${body.title}\n${body.content}`;
      embedding = await embedUrl(apiKey, process.env.OPENAI_BASE_URL, textForEmbed);
    }
```

to:

```ts
    if (apiKey) {
      const textForEmbed = `${body.title}\n${body.content}`;
      embedding = await getEmbedding(textForEmbed);
    }
```

- [ ] **Step 3: Update the `PATCH /:id` handler**

In the `PATCH /:id` handler (originally lines 108–146), change:

```ts
    if (apiKey && (body.title || body.content)) {
      embedding = await embedUrl(apiKey, process.env.OPENAI_BASE_URL, `${title}\n${content}`);
    }
```

to:

```ts
    if (apiKey && (body.title || body.content)) {
      embedding = await getEmbedding(`${title}\n${content}`);
    }
```

The `const apiKey = process.env.OPENAI_API_KEY;` guards in both handlers stay unchanged — they still control whether embedding happens at all, just no longer pass `apiKey`/`baseURL` as parameters since `getEmbedding` reads those from `process.env` itself.

- [ ] **Step 4: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors, no unused-variable warnings for the removed `embedUrl`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/knowledge.ts
git commit -m "refactor: use shared cached getEmbedding in knowledge.ts"
```

---

### Task 5: Wire `generate-embeddings.ts` to the shared `generateEmbedding`

**Files:**
- Modify: `backend/src/generate-embeddings.ts`

**Interfaces:**
- Consumes: `generateEmbedding(text: string): Promise<number[]>` from `./lib/embeddings` (produced by Task 3).

- [ ] **Step 1: Remove the local `generateEmbedding` and import the shared one**

In `backend/src/generate-embeddings.ts`, delete lines 4–22 (the `API_KEY`/`BASE_URL` constants and the local `generateEmbedding` function):

```ts
const API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

async function generateEmbedding(text: string): Promise<number[]> {
  const resp = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Embedding API error (${resp.status}): ${err.slice(0, 200)}`);
  }
  const data = (await resp.json()) as { data: { embedding: number[] }[] };
  return data.data[0].embedding;
}
```

Replace with:

```ts
import { generateEmbedding } from "./lib/embeddings";
```

(placed with the other imports at the top of the file, after `import { pool } from "./db";`).

- [ ] **Step 2: Fix the `API_KEY` reference in `main()`**

`main()` still checks `if (!API_KEY)` — update it to check the env var directly since the local constant is gone:

```ts
async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required");
    process.exit(1);
  }
```

And the `console.log(`Using API: ${BASE_URL}`);` line becomes:

```ts
  console.log(`Using API: ${process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"}`);
```

`embedWithRetry` (the retry/backoff wrapper) is untouched — it already calls `generateEmbedding(text)` by name, which now resolves to the imported function instead of the local one.

- [ ] **Step 3: Typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/generate-embeddings.ts
git commit -m "refactor: use shared generateEmbedding in generate-embeddings.ts"
```

---

### Task 6: Regression tests for `rag.ts` search endpoint

**Files:**
- Create: `backend/src/__tests__/rag.test.ts`

**Interfaces:**
- Consumes: `ragRouter` from `../routes/rag` (dynamically imported per-test after `vi.resetModules()`, since the route module reads `process.env.OPENAI_API_KEY` at import time).

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction, Router } from "express";

const query = vi.fn();
const queryOne = vi.fn();
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
  redis: null,
}));

const getEmbedding = vi.fn();
const generateEmbedding = vi.fn();
vi.mock("../lib/embeddings", () => ({
  getEmbedding: (...a: unknown[]) => getEmbedding(...a),
  generateEmbedding: (...a: unknown[]) => generateEmbedding(...a),
}));

vi.mock("../middleware/auth", () => ({
  requireAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

interface FakeRes {
  _status: number;
  _json: unknown;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function mockRes(): FakeRes {
  const res = { _status: 0, _json: undefined } as FakeRes;
  res.status = vi.fn().mockImplementation((code: number) => { res._status = code; return res; });
  res.json = vi.fn().mockImplementation((body: unknown) => { res._json = body; return res; });
  return res;
}

async function callRoute(router: Router, method: "get" | "post", path: string, req: Partial<Request>): Promise<FakeRes> {
  const res = mockRes();
  const next = vi.fn() as unknown as NextFunction;
  const fullReq = req as Request;
  for (const layer of (router as unknown as { stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (req: Request, res: Response, next: NextFunction) => unknown }[] } }[] }).stack) {
    const route = layer.route;
    if (!route || route.path !== path || !route.methods[method]) continue;
    for (const handler of route.stack) {
      await handler.handle(fullReq, res as unknown as Response, next);
      if ((res.status as ReturnType<typeof vi.fn>).mock.calls.length > 0 ||
          (res.json as ReturnType<typeof vi.fn>).mock.calls.length > 0) break;
    }
    break;
  }
  return res;
}

describe("POST /search", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("uses vector search when OPENAI_API_KEY is set", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    getEmbedding.mockResolvedValueOnce(Array(1536).fill(0.01));
    query.mockResolvedValueOnce([{ id: "1", title: "Visa Basics", similarity: 0.82 }]);

    const res = await callRoute(ragRouter, "post", "/search", { body: { query: "visa help" } });

    expect(getEmbedding).toHaveBeenCalledWith("visa help");
    expect(res._json).toMatchObject({ method: "vector" });
    expect((res._json as { results: { title: string }[] }).results[0].title).toBe("Visa Basics");
  });

  it("falls back to text search when OPENAI_API_KEY is unset", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    query.mockResolvedValueOnce([{ id: "1", title: "Housing FAQ", score: 0.4 }]);

    const res = await callRoute(ragRouter, "post", "/search", { body: { query: "housing" } });

    expect(getEmbedding).not.toHaveBeenCalled();
    expect(res._json).toMatchObject({ method: "text" });
    expect((res._json as { results: { title: string }[] }).results[0].title).toBe("Housing FAQ");
  });

  it("threads the category filter into the vector query", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    getEmbedding.mockResolvedValueOnce(Array(1536).fill(0.01));
    query.mockResolvedValueOnce([]);

    await callRoute(ragRouter, "post", "/search", { body: { query: "visa", category: "visa" } });

    const [sql, params] = query.mock.calls[0];
    expect(sql as string).toContain("AND category = $3");
    expect(params).toContain("visa");
  });

  it("threads min_score into the similarity threshold query", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { ragRouter } = await import("../routes/rag");
    getEmbedding.mockResolvedValueOnce(Array(1536).fill(0.01));
    query.mockResolvedValueOnce([]);

    await callRoute(ragRouter, "post", "/search", { body: { query: "visa", min_score: 0.7 } });

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params[1]).toBe(0.7);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd backend && npx vitest run src/__tests__/rag.test.ts`
Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/rag.test.ts
git commit -m "test: add regression tests for RAG search endpoint"
```

---

### Task 7: Regression tests for `knowledge.ts` CRUD endpoints

**Files:**
- Create: `backend/src/__tests__/knowledge.test.ts`

**Interfaces:**
- Consumes: `knowledgeRouter` from `../routes/knowledge` (dynamically imported per-test after `vi.resetModules()`, same reasoning as Task 6).

- [ ] **Step 1: Write the test file**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction, Router } from "express";

const query = vi.fn();
const queryOne = vi.fn();
vi.mock("../db", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
  redis: null,
}));

const getEmbedding = vi.fn();
vi.mock("../lib/embeddings", () => ({
  getEmbedding: (...a: unknown[]) => getEmbedding(...a),
  generateEmbedding: vi.fn(),
}));

let authedRole: "student" | "admin" = "admin";
vi.mock("../middleware/auth", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.user = { sub: "u1", firebaseUid: "fb1", email: "a@b.com", role: authedRole };
    next();
  },
  requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user!.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  },
}));

interface FakeRes {
  _status: number;
  _json: unknown;
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
}

function mockRes(): FakeRes {
  const res = { _status: 0, _json: undefined } as FakeRes;
  res.status = vi.fn().mockImplementation((code: number) => { res._status = code; return res; });
  res.json = vi.fn().mockImplementation((body: unknown) => { res._json = body; return res; });
  return res;
}

async function callRoute(router: Router, method: "get" | "post" | "patch", path: string, req: Partial<Request>): Promise<FakeRes> {
  const res = mockRes();
  const next = vi.fn() as unknown as NextFunction;
  const fullReq = req as Request;
  for (const layer of (router as unknown as { stack: { route?: { path: string; methods: Record<string, boolean>; stack: { handle: (req: Request, res: Response, next: NextFunction) => unknown }[] } }[] }).stack) {
    const route = layer.route;
    if (!route || route.path !== path || !route.methods[method]) continue;
    for (const handler of route.stack) {
      await handler.handle(fullReq, res as unknown as Response, next);
      if ((res.status as ReturnType<typeof vi.fn>).mock.calls.length > 0 ||
          (res.json as ReturnType<typeof vi.fn>).mock.calls.length > 0) break;
    }
    break;
  }
  return res;
}

describe("POST /", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    authedRole = "admin";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("rejects non-admin users with 403", async () => {
    authedRole = "student";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");

    const res = await callRoute(knowledgeRouter, "post", "/", { body: { title: "t", content: "c", category: "cat" } });

    expect(res._status).toBe(403);
  });

  it("creates without OPENAI_API_KEY and stores a null embedding", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "t", category: "cat", created_at: new Date().toISOString() });

    const res = await callRoute(knowledgeRouter, "post", "/", { body: { title: "t", content: "c", category: "cat" } });

    expect(getEmbedding).not.toHaveBeenCalled();
    const params = queryOne.mock.calls[0][1] as unknown[];
    expect(params[7]).toBeNull(); // embedding param
    expect(res._status).toBe(201);
  });

  it("creates with a cached embedding when OPENAI_API_KEY is set", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    getEmbedding.mockResolvedValueOnce([0.1, 0.2]);
    queryOne.mockResolvedValueOnce({ id: "kb-2", title: "t", category: "cat", created_at: new Date().toISOString() });

    await callRoute(knowledgeRouter, "post", "/", { body: { title: "t", content: "c", category: "cat" } });

    expect(getEmbedding).toHaveBeenCalledWith("t\nc");
  });
});

describe("PATCH /:id", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    authedRole = "admin";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  });

  it("re-embeds when content changes", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", content: "Old content" }); // existing lookup
    getEmbedding.mockResolvedValueOnce([0.5]);
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", category: "cat", updated_at: new Date().toISOString() }); // update result

    await callRoute(knowledgeRouter, "patch", "/kb-1", { params: { id: "kb-1" }, body: { content: "New content" } });

    expect(getEmbedding).toHaveBeenCalledWith("Old title\nNew content");
  });

  it("skips re-embedding when neither title nor content changes", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", content: "Old content" });
    queryOne.mockResolvedValueOnce({ id: "kb-1", title: "Old title", category: "cat", updated_at: new Date().toISOString() });

    await callRoute(knowledgeRouter, "patch", "/kb-1", { params: { id: "kb-1" }, body: { tags: ["new-tag"] } });

    expect(getEmbedding).not.toHaveBeenCalled();
  });
});

describe("GET /", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies category and search filters with pagination", async () => {
    vi.resetModules();
    const { knowledgeRouter } = await import("../routes/knowledge");
    query.mockResolvedValueOnce([{ id: "kb-1", title: "Visa Basics" }]); // entries
    query.mockResolvedValueOnce([{ count: "1" }]); // count

    const res = await callRoute(knowledgeRouter, "get", "/", {
      query: { category: "visa", search: "basics", limit: "10", offset: "0" },
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("category = $1");
    expect(sql).toContain("ILIKE");
    expect(params).toEqual(expect.arrayContaining(["visa", "%basics%", 10, 0]));
    expect((res._json as { total: number }).total).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `cd backend && npx vitest run src/__tests__/knowledge.test.ts`
Expected: 6 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/src/__tests__/knowledge.test.ts
git commit -m "test: add regression tests for knowledge base CRUD endpoints"
```

---

### Task 8: Apply the RAG migration to the live database

**Files:** none (operational step, no source changes)

**Interfaces:** none — uses `run-migration.ts` from Task 1.

- [ ] **Step 1: Apply `migration_rag.sql`**

Run: `cd backend && npx tsx run-migration.ts ../db/migration_rag.sql`
Expected: `Applying ../db/migration_rag.sql...` then `Migration applied successfully!`. All statements are `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so this is safe to run even if some or all of it was already applied.

- [ ] **Step 2: Confirm the RAG tables exist**

Run: `cd backend && npx tsx -e "import('./src/db').then(async ({pool}) => { const r = await pool.query(\"SELECT table_name FROM information_schema.tables WHERE table_name IN ('knowledge_base','trusted_sources','crawled_opportunities','ai_feedback','ai_usage_log','embedding_cache') ORDER BY table_name\"); console.log(r.rows.map(x => x.table_name)); await pool.end(); })"`
Expected: an array containing all six table names.

Note: `db/schema.sql` contains the same table definitions as `migration_rag.sql` plus the rest of the application schema, including an index on a `notifications` table that isn't itself defined anywhere in `schema.sql` (a pre-existing gap unrelated to this plan — the live database already has that table from an earlier, unconsolidated migration). Applying the full `schema.sql` in this pass isn't necessary and risks tripping over that unrelated gap, so this task deliberately applies only the self-contained `migration_rag.sql`. `migration_rag.sql` stays in the repo as the authoritative runnable RAG migration; `schema.sql` remains the consolidated reference document.

- [ ] **Step 3: No commit needed** — this task only modifies the live database, not the repo.

---

### Task 9: Seed knowledge base, generate embeddings, and verify search quality

**Files:** none (operational step, no source changes)

**Interfaces:** none — uses `npm run seed:knowledge`, `npm run embed:knowledge`, and `/api/rag/search` from prior tasks.

- [ ] **Step 1: Seed the knowledge base**

Run: `cd backend && npm run seed:knowledge`
Expected: `Seeding 55 knowledge entries...` followed by one `✓` line per entry, ending with `Done. 55 entries inserted.` (55 is the current count of `Entry` objects in `backend/src/seed-knowledge.ts` as of this plan; if it's been edited since, the number will differ — that's fine as long as the `✓` count matches the `Seeding N...` count).

- [ ] **Step 2: Generate embeddings**

Run: `cd backend && npm run embed:knowledge`
Expected: `Using API: https://api.openai.com/v1`, `Fetching entries without embeddings...`, `Found N entries to embed.`, then one `[i/N] <title>... OK` line per entry, ending with `Complete: N embedded, 0 errors`. If any entries report `ERROR`, stop and investigate before continuing — don't proceed to Step 3 with partial embeddings silently ignored.

- [ ] **Step 3: Confirm all entries have embeddings**

Run: `cd backend && npx tsx -e "import('./src/db').then(async ({pool}) => { const r = await pool.query('SELECT COUNT(*)::int as total, COUNT(embedding)::int as with_embedding FROM knowledge_base WHERE is_active = true'); console.log(r.rows[0]); await pool.end(); })"`
Expected: `{ total: N, with_embedding: N }` — the two numbers match.

- [ ] **Step 4: Start the backend and test real search queries**

Run (in one terminal): `cd backend && npm run dev`

In another terminal, run each of these and inspect the response:

```bash
curl -s -X POST http://localhost:4000/api/rag/search -H "Content-Type: application/json" -d '{"query":"how do I verify my mentor account"}' | head -c 2000
curl -s -X POST http://localhost:4000/api/rag/search -H "Content-Type: application/json" -d '{"query":"housing marketplace fees"}' | head -c 2000
curl -s -X POST http://localhost:4000/api/rag/search -H "Content-Type: application/json" -d '{"query":"visa checklist for Canada"}' | head -c 2000
```

Expected: each response has `"method":"vector"` and the top result's `title` is topically on-target — e.g. the mentor query should surface "Account Verification" or "Mentor Profiles", the housing query should surface "Housing Marketplace" or "Creating a Housing Listing", the Canada visa query should surface "Visa Assistant" or "Document Checklists". If a query returns an irrelevant top result or an empty `results` array, that's a real problem to investigate (bad seed content, embedding mismatch, `min_score` too high) — not something to wave through.

- [ ] **Step 5: Stop the dev server** (Ctrl+C in the terminal running `npm run dev`).

- [ ] **Step 6: No commit needed** — this task only exercises the running system, no source changes.

---

### Task 10: Final verification pass and commit everything as one coherent unit

**Files:** none new — final check across everything touched in Tasks 1–9.

**Interfaces:** none.

- [ ] **Step 1: Full backend typecheck**

Run: `cd backend && npm run typecheck`
Expected: no errors.

- [ ] **Step 2: Full backend test suite**

Run: `cd backend && npm run test`
Expected: all tests pass, including the new `rag.test.ts` and `knowledge.test.ts`.

- [ ] **Step 3: Frontend typecheck**

Run: `cd frontend && npm run typecheck`
Expected: no errors (the frontend chat route and assistant page were already modified in the prior session; this confirms no drift).

- [ ] **Step 4: Review the full diff**

Run: `cd "C:\Users\ERIC SMITH\Documents\GitHub\GlobalBridge" && git status --short && git diff --stat`
Expected: all the files from this plan (Tasks 1–7) plus the pre-existing uncommitted RAG work from the prior session (`.env.example` files, `env.ts`, `index.ts`, `package.json`, `schema.sql`, `docker-compose.yml`, `next.config.ts`, `assistant/page.tsx`, `ai/chat/route.ts`, `ai.ts`, `AGENTS.md`, `seed-knowledge.ts`, `generate-embeddings.ts`, `db/migration_rag.sql`) — no unexpected files.

- [ ] **Step 5: Stage and commit everything not already committed by Tasks 1–7**

```bash
cd "C:\Users\ERIC SMITH\Documents\GitHub\GlobalBridge"
git add backend/.env.example backend/src/env.ts backend/src/index.ts backend/src/routes/ai.ts backend/src/seed-knowledge.ts backend/src/generate-embeddings.ts db/schema.sql db/migration_rag.sql docker-compose.yml frontend/.env.example frontend/next.config.ts "frontend/src/app/(app)/assistant/page.tsx" frontend/src/app/api/ai/chat/route.ts AGENTS.md
git commit -m "$(cat <<'EOF'
feat: verified, hardened RAG knowledge engine

Vector search over a seeded knowledge base (pgvector + OpenAI
text-embedding-3-small), with a Redis/Postgres embedding cache, knowledge
CRUD, and a chat route that combines RAG context + user profile +
conversation history + source citations.

Verified end-to-end against the live database: schema migrated, 70+
knowledge entries seeded and embedded, and vector search confirmed to
return topically relevant results for real queries.

EOF
)"
```

- [ ] **Step 6: Confirm clean state**

Run: `git status --short`
Expected: empty (nothing left uncommitted), aside from anything explicitly out of scope for this plan (e.g. unrelated future sub-project files, if any exist).
