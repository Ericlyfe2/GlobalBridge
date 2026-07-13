# Environment Variables Reference

## Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode (`development`, `production`, `test`) |
| `PORT` | No | `4000` | Backend server port |
| `DATABASE_URL` | No | — | Postgres connection string (Neon) |
| `REDIS_URL` | No | — | Redis connection string (graceful fallback if missing) |
| `FIREBASE_PROJECT_ID` | **Yes** | — | Firebase Admin project ID |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | — | Firebase Admin client email |
| `FIREBASE_PRIVATE_KEY` | **Yes** | — | Firebase Admin private key (with `\n` escaped) |
| `AI_SERVICE_URL` | No | `http://localhost:8000` | AI microservice URL |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `JWT_SECRET` | No | `change-me-in-production-…` | Legacy JWT signing secret (WS server only) |
| `UPLOAD_DIR` | No | `./uploads` | Local file upload directory |
| `GOOGLE_TRANSLATE_API_KEY` | No | — | Google Translate API key |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret key |
| `PAYSTACK_SECRET_KEY` | No | — | Paystack secret key |
| `SENDGRID_API_KEY` | No | — | SendGrid API key |
| `TWILIO_ACCOUNT_SID` | No | — | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | No | — | Twilio auth token |
| `CLOUDINARY_URL` | No | — | Cloudinary URL |
| `AWS_S3_BUCKET` | No | — | AWS S3 bucket name |

## AI Service (`ai/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Yes\*** | — | OpenAI API key for OpenAI |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | — | Path to GCP service-account JSON |
| `PORT` | No | `8001` | AI service port |

\* Required for AI features — the service will start without it but AI endpoints will fail.

## Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | **Yes** | — | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | No | `ws://localhost:4000/ws` | WebSocket server URL |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | **Yes\*** | — | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | **Yes\*** | — | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **Yes\*** | — | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | **Yes\*** | — | Firebase app ID |
| `NEXT_PUBLIC_SITE_URL` | No | `https://globalbridge.app` | Public site URL (SEO, sitemap) |
| `OPENAI_API_KEY` | **Yes†** | — | OpenAI API key (server-side routes) |
| `UPSTASH_REDIS_REST_URL` | No | — | Upstash Redis REST URL (translation cache) |
| `UPSTASH_REDIS_REST_TOKEN` | No | — | Upstash Redis REST token |

\* Required for Firebase auth.
† Required for AI features (chat, translation, essay scoring, doc check, country comparison).

## Notes

- **Backend** uses a validated Zod schema in `backend/src/env.ts`. The server will warn on missing required vars.
- **Frontend** accesses env vars via `process.env` (Next.js convention). Vars prefixed with `NEXT_PUBLIC_` are inlined at build time and visible to the browser.
- `JWT_EXPIRES_IN=7d` appears in `backend/.env` but is not referenced in source code (legacy).
- The backend degrades gracefully without `DATABASE_URL` and `REDIS_URL`.
- See per-directory `.env.example` files for placeholder templates.
