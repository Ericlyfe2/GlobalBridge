import "dotenv/config";
import "./env";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { opportunitiesRouter } from "./routes/opportunities";
import { housingRouter } from "./routes/housing";
import { forumsRouter } from "./routes/forums";
import { messagesRouter } from "./routes/messages";
import { aiRouter } from "./routes/ai";
import { knowledgeRouter } from "./routes/knowledge";
import { ragRouter } from "./routes/rag";
import { moderationRouter } from "./routes/moderation";
import { contentRouter } from "./routes/content";
import { jobsRouter } from "./routes/jobs";
import { uploadsRouter } from "./routes/uploads";
import { adminRouter } from "./routes/admin";
import { safeSpaceRouter } from "./routes/safeSpace";
import { libraryRouter } from "./routes/library";
import { peerReviewRouter } from "./routes/peerReview";
import { errorHandler } from "./middleware/error";
import { csrfProtection } from "./middleware/csrf";
import { installUuidParamValidation, apiNotFound } from "./middleware/validate";
import { initWebsocket } from "./ws";
import { redis } from "./db";
import { RedisRateLimitStore, trustProxyHops } from "./lib/rate-limit-store";
import { collectHealth } from "./lib/health";

const app = express();
const PORT = Number(process.env.PORT || 4000);

// Without this, req.ip is the load balancer's address behind Railway/Vercel, so
// express-rate-limit put every user into one shared bucket: ten different
// clients drew down the same counter. A hop count (not `true`) is the only
// setting that is both correct and unspoofable — X-Forwarded-For is
// client-writable, so trusting the whole chain lets anyone mint a fresh bucket.
const TRUST_PROXY = trustProxyHops();
app.set("trust proxy", TRUST_PROXY);

// Global unhandled rejection handler
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        // Was ["'self'", AI_SERVICE_URL || "http://localhost:8000"] — a leftover
        // from the removed Python AI service, which baked a localhost origin
        // into the production policy.
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  }),
);
app.use(compression());
app.use(morgan("dev"));
// CORS_ORIGIN is a comma-separated list, and middleware/csrf.ts already splits it
// that way. Passing the raw string to cors() emitted a single malformed header —
// "Access-Control-Allow-Origin: http://a.com,http://b.com" — which no browser
// accepts, so multi-origin CORS silently failed for every origin.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // No Origin header = same-origin or a server-to-server call (the Next BFF
      // layer). Those are not CORS requests and still have to pass Bearer auth.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(null, false);
    },
    credentials: true,
  }),
);

// Rate limiter before body parsers to avoid parsing large bodies on rejected requests.
// Keyed by IP (express-rate-limit default) with no per-user carve-out, so this budget
// is shared by everyone behind the same public IP — common for this audience, who are
// often on campus/dorm NAT where dozens of students share one address. 1200/15min keeps
// it a meaningful abuse backstop without collectively locking out a shared connection.
// Shared across instances when Redis is available. The default in-process
// store counted per instance, so N instances meant an effective N x max, and
// every deploy reset all counters.
const limiterStore = redis ? new RedisRateLimitStore(redis, "rl:global:") : undefined;
if (!redis) {
  console.warn("No REDIS_URL - rate limiting is per-instance only and resets on deploy.");
}

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1200,
    standardHeaders: true,
    legacyHeaders: false,
    ...(limiterStore ? { store: limiterStore } : {}),
  })
);

// Tighter budgets on the endpoints that are expensive or worth brute-forcing.
// These sit inside the global allowance, not instead of it.
const strict = (max: number, windowMs: number, prefix: string) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(redis ? { store: new RedisRateLimitStore(redis, prefix) } : {}),
  });

app.use("/api/auth", strict(30, 15 * 60 * 1000, "rl:auth:"));
app.use("/api/uploads", strict(60, 15 * 60 * 1000, "rl:upload:"));
app.use("/api/messages", strict(120, 15 * 60 * 1000, "rl:msg:"));
app.use("/api/rag", strict(60, 15 * 60 * 1000, "rl:rag:"));

app.use(csrfProtection);

// 12mb accommodates the 8MB upload limit in routes/uploads.ts once base64-encoded
// (base64 inflates size by ~4/3, so 8MB -> ~10.7MB) plus JSON field overhead.
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

// Liveness. "Is this process responsive." Deliberately dependency-free: this is
// what railway.toml restarts on, and restarting a container does not fix a
// database outage - it turns a degraded platform into a crash loop.
app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "globalbridge-api", uptime_s: Math.round(process.uptime()) }),
);

// Readiness. "Should this instance receive traffic." Probes its dependencies
// and answers 503 with a per-service breakdown when one is down.
//
// /health previously returned a hardcoded 200 while collectHealth() - the real
// prober - was imported only by the admin console. An instance whose database
// pool was dead reported healthy, so nothing ever pulled it from rotation.
// Point load balancers and uptime monitors here.
app.get("/health/ready", async (_req, res) => {
  try {
    const report = await collectHealth();
    res.status(report.overall === "healthy" ? 200 : 503).json(report);
  } catch (e) {
    res.status(503).json({
      overall: "degraded",
      services: [],
      error: e instanceof Error ? e.message : "health probe failed",
      checkedAt: new Date().toISOString(),
    });
  }
});

// A malformed :id used to reach SQL and surface as an opaque 500. router.param
// fires before any handler on the route that declared the parameter.
installUuidParamValidation([
  authRouter, usersRouter, opportunitiesRouter, housingRouter, forumsRouter,
  messagesRouter, aiRouter, knowledgeRouter, ragRouter, moderationRouter,
  contentRouter, jobsRouter, adminRouter, safeSpaceRouter, libraryRouter,
  peerReviewRouter, uploadsRouter,
]);

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/opportunities", opportunitiesRouter);
app.use("/api/housing", housingRouter);
app.use("/api/forums", forumsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/knowledge", knowledgeRouter);
app.use("/api/rag", ragRouter);
app.use("/api/moderation", moderationRouter);
app.use("/api/content", contentRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/safe-space", safeSpaceRouter);
app.use("/api/library", libraryRouter);
app.use("/api/peer-review", peerReviewRouter);
// File retrieval (GET /api/uploads/files/:key) lives inside uploadsRouter,
// where it can check the document's purpose/owner before serving — avatars
// and housing photos stay public, verification/document uploads are scoped
// to their owner or an admin.
app.use("/api/uploads", uploadsRouter);

app.use(apiNotFound);
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🌍 GlobalBridge API running on http://localhost:${PORT}`);
});

initWebsocket(server);
