import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "../env";

// Throws at import time if credentials are missing; env.ts validates them first.
function initAdmin(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert({
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }) });
}

const app = initAdmin();
export const adminAuth = getAuth(app);
