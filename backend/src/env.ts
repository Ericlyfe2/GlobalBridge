import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  // Postgres is only used by out-of-scope domain routes now — optional for auth.
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),
  // Firebase Admin (required for auth)
  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_CLIENT_EMAIL: z.string().email("FIREBASE_CLIENT_EMAIL must be a valid email"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
