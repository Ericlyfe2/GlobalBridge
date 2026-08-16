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
import { initWebsocket } from "./ws";

const app = express();
const PORT = Number(process.env.PORT || 4000);

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
        connectSrc: ["'self'", process.env.AI_SERVICE_URL || "http://localhost:8000"],
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
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:3000", credentials: true }));

// Rate limiter before body parsers to avoid parsing large bodies on rejected requests.
// Keyed by IP (express-rate-limit default) with no per-user carve-out, so this budget
// is shared by everyone behind the same public IP — common for this audience, who are
// often on campus/dorm NAT where dozens of students share one address. 1200/15min keeps
// it a meaningful abuse backstop without collectively locking out a shared connection.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(csrfProtection);

// 12mb accommodates the 8MB upload limit in routes/uploads.ts once base64-encoded
// (base64 inflates size by ~4/3, so 8MB -> ~10.7MB) plus JSON field overhead.
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "globalbridge-api" }));

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

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🌍 GlobalBridge API running on http://localhost:${PORT}`);
});

initWebsocket(server);
