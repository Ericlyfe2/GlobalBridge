# Database environments

GlobalBridge uses PostgreSQL 16 (+ pgvector). **Never point local development at the production database.**

## Current targets (redacted)

| Environment | Host (redacted) | Database name | Purpose |
|-------------|-----------------|---------------|---------|
| **Local development (confirmed)** | `ep-summer-cherry-****.eu-west-2.aws.neon.tech` | `globalbridge_dev` | Neon dev branch — safe for seeds and admin tests |
| **Docker (optional)** | `localhost:5432` | `globalbridge` | Offline dev via `docker compose up -d` |
| **Production** | Neon (separate branch/project) | — | Deployed app only — do not use for local seeds or admin tests |

Verify your target before any bulk update:

```bash
cd backend
node -e "require('dotenv').config(); const u=new URL(process.env.DATABASE_URL); console.log(u.hostname, u.pathname.slice(1))"
```

**Safe:** database name contains `dev`, `local`, or host is `localhost`.  
**Unsafe:** production branch names, or any URL you cannot confidently identify as non-production.

## Recommended setup

```text
LOCAL DEVELOPMENT  →  globalbridge_dev (Neon branch) OR localhost Docker Postgres
DEPLOYED APP       →  production Neon branch (separate DATABASE_URL in hosting env)
```

## Initialize a fresh dev database

```bash
docker compose up -d   # optional local Postgres
cd backend
npx tsx run-migration.ts ../db/schema.sql
npx tsx run-migration.ts ../db/migration_rag.sql
npm run seed:admin
# optional representative data:
psql $DATABASE_URL -f ../db/seed.sql
npm run seed:opportunities
```

Seed opportunities and `db/seed.sql` insert **representative** listings with `is_verified = false`. Only an admin verification workflow should set `is_verified = true`.

## Unverify representative rows (dev only)

```bash
cd backend
npx tsx src/scripts/unverify-seed-opportunities.ts
```
