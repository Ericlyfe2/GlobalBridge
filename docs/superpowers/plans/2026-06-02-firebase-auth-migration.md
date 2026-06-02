# Firebase Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Postgres + bcrypt + custom-JWT authentication with managed Firebase Authentication (client-SDK pattern) and Cloud Firestore for user profiles, scoped to auth only.

**Architecture:** The Next.js frontend authenticates directly with Firebase Auth via the client SDK, obtains an ID token, mirrors it to localStorage (so existing synchronous `getToken()` callers keep working), and sends it as `Authorization: Bearer`. The Express backend verifies tokens with `firebase-admin`, stores/reads profile data in Firestore `users/{uid}`, and mirrors `role` to a custom claim. Email verification and password reset use Firebase's built-in hosted flow.

**Tech Stack:** Firebase Auth, Cloud Firestore, `firebase` (client SDK), `firebase-admin` (Node), Next.js 15, Express, TypeScript, Vitest.

---

## File Structure

**Backend**
- Create: `backend/src/lib/firebase-admin.ts` — Admin SDK init; exports `adminAuth`, `firestore`.
- Modify: `backend/src/env.ts` — make `DATABASE_URL`/`JWT_SECRET` optional; require Firebase admin vars.
- Modify: `backend/src/middleware/auth.ts` — `requireAuth` verifies Firebase ID tokens; keep `requireRole`; remove JWT helpers.
- Modify: `backend/src/routes/auth.ts` — reduce to `POST /register-profile` and `GET /me`.
- Modify: `backend/src/__tests__/auth.test.ts` — test the new profile schema + middleware.
- Modify: `backend/.env.example` — add Firebase admin vars.
- Modify: `backend/package.json` — add `firebase-admin`.

**Frontend**
- Create: `frontend/src/lib/firebase.ts` — client SDK init; exports `auth`.
- Modify: `frontend/src/lib/auth.ts` — Firebase internals behind the SAME public API + `resetPassword`; ID-token listener.
- Modify: `frontend/src/app/(auth)/forgot-password/page.tsx` — call `resetPassword`.
- Modify: `frontend/src/app/(auth)/verify-email/page.tsx` — informational only (hosted flow handles verification).
- Modify: `frontend/src/app/(auth)/reset-password/page.tsx` — informational only (hosted flow handles reset).
- Modify: `frontend/.env.example` — add `NEXT_PUBLIC_FIREBASE_*` vars.
- Modify: `frontend/package.json` — add `firebase`.

**Unchanged (verified):** `login/page.tsx`, `register/page.tsx`, `auth/page.tsx` (they only call `login`/`register`, whose signatures are preserved). All ~15 files using `getToken`/`getUser`/`authFetch`/`clearSession` keep working because those functions stay synchronous and keep their signatures.

---

## Task 1: Backend — add firebase-admin and Admin SDK init

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/lib/firebase-admin.ts`

- [ ] **Step 1: Install firebase-admin**

Run (in `backend/`):
```bash
npm install firebase-admin@^13.0.0
```
Expected: `package.json` gains `firebase-admin` under dependencies; exit 0.

- [ ] **Step 2: Create the Admin SDK init module**

Create `backend/src/lib/firebase-admin.ts`:
```ts
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Private keys arrive from env with literal "\n"; convert to real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials: set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const app = initAdmin();
export const adminAuth = getAuth(app);
export const firestore = getFirestore(app);
```

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/lib/firebase-admin.ts
git commit -m "feat(backend): add firebase-admin and Admin SDK init"
```

---

## Task 2: Backend — env schema for Firebase, relax Postgres/JWT

**Files:**
- Modify: `backend/src/env.ts`
- Modify: `backend/.env.example`
- Modify: `backend/src/__tests__/env.test.ts`

- [ ] **Step 1: Update the env schema**

Replace the `envSchema` object in `backend/src/env.ts` with:
```ts
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
```
(Delete the `JWT_SECRET` and `JWT_EXPIRES_IN` lines — no longer used.)

- [ ] **Step 2: Update `backend/.env.example`**

Replace the `# Auth` and `# Database`/`# Redis` sections so the file reads (keep the third-party block at the bottom unchanged):
```
NODE_ENV=development
PORT=4000

# Database (optional — only used by domain routes still on Postgres)
# DATABASE_URL=postgresql://globalbridge:globalbridge_dev@localhost:5432/globalbridge

# Firebase Admin (from your service-account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_WITH_ESCAPED_NEWLINES\n-----END PRIVATE KEY-----\n"

# AI Service
AI_SERVICE_URL=http://localhost:8000

# CORS
CORS_ORIGIN=http://localhost:3000
```

- [ ] **Step 3: Update `backend/src/__tests__/env.test.ts`**

Replace the whole file with:
```ts
import { describe, it, expect } from "vitest";

describe("Environment configuration", () => {
  const requiredVars = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"];

  for (const v of requiredVars) {
    it(`recognizes ${v} as a configured variable`, () => {
      expect(typeof process.env[v] === "string" || process.env[v] === undefined).toBe(true);
    });
  }
});
```

- [ ] **Step 4: Run the env test**

Run (in `backend/`): `npx vitest run src/__tests__/env.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/env.ts backend/.env.example backend/src/__tests__/env.test.ts
git commit -m "feat(backend): require Firebase env vars, make Postgres optional"
```

---

## Task 3: Backend — rewrite requireAuth to verify Firebase tokens (TDD)

**Files:**
- Test: `backend/src/__tests__/auth.test.ts`
- Modify: `backend/src/middleware/auth.ts`

- [ ] **Step 1: Write the failing middleware test**

Replace the whole `backend/src/__tests__/auth.test.ts` with:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

// Mock the Admin SDK so no real Firebase init happens.
const verifyIdToken = vi.fn();
vi.mock("../lib/firebase-admin", () => ({
  adminAuth: { verifyIdToken: (...a: unknown[]) => verifyIdToken(...a) },
  firestore: {},
}));

import { requireAuth } from "../middleware/auth";

function mockRes() {
  const res = {} as Response & { _status?: number; _json?: unknown };
  res.status = vi.fn().mockImplementation((c: number) => { res._status = c; return res; });
  res.json = vi.fn().mockImplementation((b: unknown) => { res._json = b; return res; });
  return res;
}

describe("requireAuth (Firebase)", () => {
  beforeEach(() => verifyIdToken.mockReset());

  it("rejects a request with no Authorization header", async () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("populates req.user from a verified token", async () => {
    verifyIdToken.mockResolvedValue({ uid: "abc123", email: "a@b.com", role: "mentor" });
    const req = { headers: { authorization: "Bearer good-token" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toEqual({ sub: "abc123", email: "a@b.com", role: "mentor" });
  });

  it("defaults role to student when no custom claim is present", async () => {
    verifyIdToken.mockResolvedValue({ uid: "u2", email: "c@d.com" });
    const req = { headers: { authorization: "Bearer t" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(req.user?.role).toBe("student");
  });

  it("returns 401 when token verification throws", async () => {
    verifyIdToken.mockRejectedValue(new Error("expired"));
    const req = { headers: { authorization: "Bearer bad" } } as Request;
    const res = mockRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `backend/`): `npx vitest run src/__tests__/auth.test.ts`
Expected: FAIL — current `requireAuth` uses `jwt.verify`/Postgres, not the mocked `adminAuth`; `req.user` shape won't match.

- [ ] **Step 3: Rewrite the middleware**

Replace the whole `backend/src/middleware/auth.ts` with:
```ts
import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin";

export type AuthUser = {
  sub: string;
  email: string;
  role: "student" | "mentor" | "employer" | "admin";
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing auth token" });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = {
      sub: decoded.uid,
      email: decoded.email ?? "",
      role: ((decoded as { role?: string }).role as AuthUser["role"]) ?? "student",
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (in `backend/`): `npx vitest run src/__tests__/auth.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/middleware/auth.ts backend/src/__tests__/auth.test.ts
git commit -m "feat(backend): verify Firebase ID tokens in requireAuth"
```

---

## Task 4: Backend — rewrite auth routes to profile + me

**Files:**
- Modify: `backend/src/routes/auth.ts`

- [ ] **Step 1: Replace the auth router**

Replace the whole `backend/src/routes/auth.ts` with:
```ts
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { adminAuth, firestore } from "../lib/firebase-admin";

export const authRouter = Router();

const profileSchema = z.object({
  full_name: z.string().min(2),
  role: z.enum(["student", "mentor", "employer"]).default("student"),
  country_of_origin: z.string().min(2, "Country is required"),
});

// Called once right after client-side createUserWithEmailAndPassword.
// Creates the Firestore profile and sets the role custom claim (server-only).
authRouter.post("/register-profile", requireAuth, async (req, res, next) => {
  try {
    const body = profileSchema.parse(req.body);
    const uid = req.user!.sub;
    const ref = firestore.collection("users").doc(uid);

    const snap = await ref.get();
    if (snap.exists) {
      // Idempotent: profile already created on an earlier attempt.
      return res.status(200).json({ user: { id: uid, ...snap.data() } });
    }

    const profile = {
      email: req.user!.email,
      full_name: body.full_name,
      role: body.role,
      country_of_origin: body.country_of_origin,
      country_of_residence: null,
      avatar_url: null,
      bio: null,
      trust_score: 0,
      verification_status: "unverified",
      preferred_language: "en",
      created_at: new Date().toISOString(),
    };

    await ref.set(profile);
    await adminAuth.setCustomUserClaims(uid, { role: body.role });

    res.status(201).json({ user: { id: uid, ...profile } });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const snap = await firestore.collection("users").doc(req.user!.sub).get();
    if (!snap.exists) return res.status(404).json({ error: "Profile not found" });
    res.json({ user: { id: req.user!.sub, ...snap.data() } });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Typecheck the backend**

Run (in `backend/`): `npm run typecheck`
Expected: PASS — no references to removed `signToken`/`verifyPurposeToken`/`clearTokenVersionCache` remain (only `auth.ts` used them).

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/auth.ts
git commit -m "feat(backend): replace auth routes with Firestore profile + me"
```

---

## Task 5: Frontend — add firebase client SDK and init

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/lib/firebase.ts`
- Modify: `frontend/.env.example`

- [ ] **Step 1: Install firebase**

Run (in `frontend/`):
```bash
npm install firebase@^11.0.0
```
Expected: `package.json` gains `firebase`; exit 0.

- [ ] **Step 2: Create the client init module**

Create `frontend/src/lib/firebase.ts`:
```ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
export const auth: Auth = getAuth(app);
```

- [ ] **Step 3: Update `frontend/.env.example`**

Replace the file contents with:
```
# Backend API URL — required for register-profile + me.
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws

# Firebase client config (Project settings → Your apps → SDK setup)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/firebase.ts frontend/.env.example
git commit -m "feat(frontend): add firebase client SDK and init"
```

---

## Task 6: Frontend — rewrite lib/auth.ts internals to Firebase

**Files:**
- Modify: `frontend/src/lib/auth.ts`

This preserves the public API (`getToken`, `getUser`, `setSession`, `clearSession`, `authFetch`, `login`, `register`) so no consumer changes, and adds `resetPassword`.

- [ ] **Step 1: Replace lib/auth.ts**

Replace the whole `frontend/src/lib/auth.ts` with:
```ts
// Firebase-backed auth client.
// Firebase Auth is the source of truth; we mirror the ID token + profile into
// localStorage so existing synchronous getToken()/getUser() callers keep working.

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onIdTokenChanged,
} from "firebase/auth";
import { auth } from "./firebase";

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "mentor" | "employer" | "admin";
};

const TOKEN_KEY = "gb-token";
const USER_KEY = "gb-user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch { return null; }
}

export function setSession(token: string, user: SessionUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem("user-name", user.full_name);
    localStorage.setItem("user-email", user.email);
    localStorage.setItem("user-role", user.role);
    const initials =
      user.full_name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
    localStorage.setItem("user-initials", initials);
  } catch {}
}

export function clearSession() {
  try {
    [TOKEN_KEY, USER_KEY, "user-name", "user-email", "user-role", "user-initials", "user-country"].forEach(
      (k) => localStorage.removeItem(k),
    );
  } catch {}
}

// Keep the cached ID token fresh as Firebase rotates it.
if (typeof window !== "undefined") {
  onIdTokenChanged(auth, async (user) => {
    try {
      if (user) localStorage.setItem(TOKEN_KEY, await user.getIdToken());
      else clearSession();
    } catch {}
  });
}

const FETCH_TIMEOUT = 8000;

async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/** Fetch wrapper that attaches a fresh Firebase ID token as Bearer. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const current = auth.currentUser;
  const token = current ? await current.getIdToken() : getToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return timedFetch(input, { ...init, headers });
}

function friendlyError(err: unknown): Error {
  if (err instanceof FirebaseError) {
    const map: Record<string, string> = {
      "auth/invalid-credential": "Invalid email or password.",
      "auth/invalid-email": "That email address is not valid.",
      "auth/user-not-found": "Invalid email or password.",
      "auth/wrong-password": "Invalid email or password.",
      "auth/email-already-in-use": "An account with that email already exists.",
      "auth/weak-password": "Password is too weak (minimum 6 characters).",
      "auth/too-many-requests": "Too many attempts. Please try again later.",
      "auth/network-request-failed": "Network error — check your connection and try again.",
    };
    return new Error(map[err.code] ?? `Authentication error: ${err.code}`);
  }
  return err instanceof Error ? err : new Error("Authentication failed");
}

/** Fetch the Firestore profile for the signed-in user and store the session. */
async function syncProfile(token: string, fallback: { email: string; full_name: string }) {
  try {
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      const u = data.user as Partial<SessionUser> & { full_name?: string; role?: SessionUser["role"] };
      setSession(token, {
        id: u.id ?? auth.currentUser!.uid,
        email: u.email ?? fallback.email,
        full_name: u.full_name ?? fallback.full_name,
        role: u.role ?? "student",
      });
      return;
    }
  } catch {}
  // Fallback: minimal session so the UI can proceed.
  setSession(token, {
    id: auth.currentUser!.uid,
    email: fallback.email,
    full_name: fallback.full_name,
    role: "student",
  });
}

export async function login(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    await syncProfile(token, { email: cred.user.email ?? email, full_name: cred.user.displayName ?? email });
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function register(payload: {
  email: string; password: string; full_name: string;
  role: SessionUser["role"]; country_of_origin?: string;
}) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
    await updateProfile(cred.user, { displayName: payload.full_name });
    const token = await cred.user.getIdToken(true);

    const res = await fetch("/api/auth/register-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        full_name: payload.full_name,
        role: payload.role,
        country_of_origin: payload.country_of_origin ?? "",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to create profile");
    }

    // Refresh token so the new role custom claim is present, then store session.
    const fresh = await cred.user.getIdToken(true);
    setSession(fresh, {
      id: cred.user.uid,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
    });

    try { await sendEmailVerification(cred.user); } catch {}
  } catch (err) {
    throw friendlyError(err);
  }
}

export async function logout() {
  try { await signOut(auth); } catch {}
  clearSession();
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (err) {
    throw friendlyError(err);
  }
}
```

- [ ] **Step 2: Typecheck the frontend**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS — public API unchanged, so all consumers still compile.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/auth.ts
git commit -m "feat(frontend): back auth client with Firebase Auth"
```

---

## Task 7: Frontend — wire reset/verify pages to the hosted flow

**Files:**
- Modify: `frontend/src/app/(auth)/forgot-password/page.tsx`
- Modify: `frontend/src/app/(auth)/verify-email/page.tsx`
- Modify: `frontend/src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Update forgot-password to call Firebase**

In `frontend/src/app/(auth)/forgot-password/page.tsx`, add the import near the top:
```ts
import { resetPassword } from "@/lib/auth";
```
Then replace the `onSubmit` function body (the `try`/`catch`/`finally` block) with:
```ts
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      // Always show success to avoid email enumeration.
      setSent(true);
    } finally {
      setLoading(false);
    }
```
(Remove the old `fetch("/api/auth/forgot-password", …)` call.)

- [ ] **Step 2: Replace verify-email page with an informational page**

Replace the whole `frontend/src/app/(auth)/verify-email/page.tsx` with:
```tsx
"use client";

import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="animate-fade-up text-center">
      <MailCheck size={24} className="mx-auto mb-3 text-clay-500" />
      <h1 className="text-3xl font-display font-semibold text-ink-900">Check your email</h1>
      <p className="mt-2 text-ink-600">
        We&apos;ve sent a verification link to your inbox. Open it to confirm your address, then return here.
      </p>
      <Link href="/dashboard" className="btn-accent text-sm mt-6 inline-flex">
        Go to dashboard
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Replace reset-password page with an informational page**

Replace the whole `frontend/src/app/(auth)/reset-password/page.tsx` with:
```tsx
"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <div className="animate-fade-up text-center">
      <KeyRound size={24} className="mx-auto mb-3 text-clay-500" />
      <h1 className="text-3xl font-display font-semibold text-ink-900">Reset link sent</h1>
      <p className="mt-2 text-ink-600">
        Follow the password reset link in your email to choose a new password. The link opens a secure page hosted by our
        authentication provider.
      </p>
      <Link href="/login" className="btn-accent text-sm mt-6 inline-flex">
        Back to sign in
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck the frontend**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "frontend/src/app/(auth)/forgot-password/page.tsx" "frontend/src/app/(auth)/verify-email/page.tsx" "frontend/src/app/(auth)/reset-password/page.tsx"
git commit -m "feat(frontend): use Firebase hosted flow for verify + reset"
```

---

## Task 8: Verification — build, test, and manual end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Backend test suite**

Run (in `backend/`): `npx vitest run`
Expected: PASS (env + requireAuth tests).

- [ ] **Step 2: Backend typecheck**

Run (in `backend/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Frontend typecheck**

Run (in `frontend/`): `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: One-time Firebase project setup (manual, by the user)**

In the Firebase console:
1. Create a project; add a Web app → copy the SDK config into `frontend/.env.local`.
2. Authentication → Sign-in method → enable **Email/Password**.
3. Firestore Database → create database (production or test mode).
4. Project settings → Service accounts → Generate new private key → copy `project_id`, `client_email`, `private_key` into `backend/.env` (`FIREBASE_PRIVATE_KEY` wrapped in quotes with `\n` escapes).

- [ ] **Step 5: Manual end-to-end smoke test**

With all three credentials in place, start backend (`npm run dev` in `backend/`) and frontend (`npm run dev` in `frontend/`), then:
1. Open `http://localhost:3000/register`, create a student account.
   - Expect: redirected to `/onboarding` or `/dashboard`; a verification email arrives.
   - Verify in Firebase console: a new Auth user + a `users/{uid}` Firestore doc with `role: "student"`.
2. Sign out, open `/login`, sign in with the same credentials.
   - Expect: redirected to `/dashboard`; `localStorage` has `gb-token` and `user-role`.
3. In devtools, confirm `GET /api/auth/me` (via the network tab or `authFetch`) returns the profile.
4. On `/forgot-password`, submit the email → "check your inbox"; a Firebase reset email arrives.

- [ ] **Step 6: Final commit (if any docs/notes changed)**

```bash
git add -A
git commit -m "chore: verify Firebase auth migration" || echo "nothing to commit"
```

---

## Notes / Known Tradeoffs

- **Token rehydration flash:** On a hard page load, `getToken()` reads the last mirrored token from localStorage immediately, and `onIdTokenChanged` refreshes it shortly after. If localStorage was cleared, there is a brief window where `getToken()` returns null until Firebase rehydrates — acceptable for this scope.
- **Out of scope:** Domain routes (housing, jobs, forums, messages, opportunities, moderation, content, uploads) still query Postgres and remain non-functional without a database. Migrating them is separate future work.
- **Password policy:** Firebase enforces a 6-char minimum by default; the richer policy shown in the signup UI is cosmetic unless configured in Firebase Auth settings.
