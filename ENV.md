# Environment Variables Reference

See **[docs/DATABASE.md](docs/DATABASE.md)** for which Postgres host/database local development should use (never production).

## Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | No | `4000` | Backend server port |
| `DATABASE_URL` | No | — | Postgres connection string. **Use a dev branch or local Docker Postgres — not production.** |
| `REDIS_URL` | No | — | Redis connection string (graceful fallback if missing) |
| `FIREBASE_PROJECT_ID` | **Yes** | — | Firebase Admin project ID |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | — | Firebase Admin client email |
| `FIREBASE_PRIVATE_KEY` | **Yes** | — | Firebase Admin private key (with `\n` escaped) |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `JWT_SECRET` | No | `change-me-in-production-…` | Legacy JWT signing secret (WS server only) |
| `OPENAI_API_KEY` | No | — | OpenAI key for RAG embeddings (backend) |
| `CLOUDINARY_URL` | No | — | Cloudinary URL (optional) |
| `S3_BUCKET` | Prod | — | Durable uploads (required in production) |

### Not implemented (variables do nothing today)

| Variable | Status |
|----------|--------|
| `STRIPE_SECRET_KEY` | **NOT IMPLEMENTED** — no checkout or webhooks |
| `PAYSTACK_SECRET_KEY` | **NOT IMPLEMENTED** — no payment code |
| `SENDGRID_API_KEY` | **NOT IMPLEMENTED** — in-app notifications only |
| `TWILIO_*` | **NOT IMPLEMENTED** — no SMS |
| `GOOGLE_TRANSLATE_API_KEY` | **NOT IMPLEMENTED** — UI i18n uses static locale JSON |
| `AWS_S3_BUCKET` | **Wrong name** — use `S3_BUCKET` instead |

## Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | — | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | No | `ws://localhost:4000/ws` | WebSocket server URL |
| `NEXT_PUBLIC_FIREBASE_*` | **Yes** | — | Firebase Web client config |
| `NEXT_PUBLIC_SITE_URL` | No | `https://globalbridge.app` | Public site URL (SEO, sitemap) |
| `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` | **Yes†** | — | Gemini for `/api/ai/*` routes |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Default chat/doc-check model |
| `UPSTASH_REDIS_REST_*` | No | — | Optional cache (unused by i18n today) |

† Required for AI features (chat, essay scoring, doc check, country comparison, scam shield).

## Notes

- **Backend** uses a validated Zod schema in `backend/src/env.ts`.
- **Frontend** vars prefixed with `NEXT_PUBLIC_` are visible in the browser.
- The backend degrades gracefully without `DATABASE_URL` and `REDIS_URL`.
- See `backend/.env.example` for placeholder templates.

## Web Push (optional)

Push notifications are entirely optional. Without these keys the backend logs a
warning at boot and every push send becomes a no-op — the in-app notification
list and WebSocket delivery keep working unchanged.

Generate a keypair once, then use the same pair everywhere:

```bash
cd backend && npx web-push generate-vapid-keys
```

`backend/.env`
```
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:support@globalbridge.app
```

The public key is served to the browser via `GET /api/content/push/key` and is
safe to expose. **The private key must never leave the backend** — it is what
authorises sends on your behalf.

Apply the migration so `push_subscriptions` exists:

```bash
cd backend && npx tsx run-migration.ts ../db/migration_rag.sql
```
