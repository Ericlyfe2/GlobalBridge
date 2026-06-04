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
import { moderationRouter } from "./routes/moderation";
import { contentRouter } from "./routes/content";
import { jobsRouter } from "./routes/jobs";
import { uploadsRouter } from "./routes/uploads";
import { UPLOAD_PATH } from "./lib/storage";
import { errorHandler } from "./middleware/error";
import { csrfProtection } from "./middleware/csrf";
import { requireAuth } from "./middleware/auth";
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

// Rate limiter before body parsers to avoid parsing large bodies on rejected requests
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(csrfProtection);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/health", (_req, res) => res.json({ status: "ok", service: "globalbridge-api" }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/opportunities", opportunitiesRouter);
app.use("/api/housing", housingRouter);
app.use("/api/forums", forumsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/ai", aiRouter);
app.use("/api/moderation", moderationRouter);
app.use("/api/content", contentRouter);
app.use("/api/jobs", jobsRouter);
// Only serve non-sensitive uploads via static (avatars, housing photos).
// Verification documents are served through an auth-gated proxy on the uploads router.
app.use("/api/uploads/files", requireAuth, express.static(UPLOAD_PATH));
app.use("/api/uploads", uploadsRouter);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`🌍 GlobalBridge API running on http://localhost:${PORT}`);
});

initWebsocket(server);
