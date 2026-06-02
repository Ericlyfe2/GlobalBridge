# Design: Migrate authentication to managed Firebase Authentication

**Date:** 2026-06-02
**Status:** Approved (pending spec review)
**Scope:** Authentication only

## Goal

Make login work by replacing the current Postgres + bcrypt + custom-JWT auth
with managed **Firebase Authentication** (client-SDK pattern) and **Cloud
Firestore** for user profile data. Domain features (housing, jobs, forums,
etc.) are explicitly out of scope and keep their existing Postgres code.

## Decisions (locked)

- **Firebase mode:** Managed Firebase Authentication (not "Firestore as a
  plain DB").
- **Auth pattern:** Client-side Firebase JS SDK. The browser authenticates
  directly with Firebase Auth, obtains an ID token, and sends it to the
  backend as `Authorization: Bearer <token>`. The backend verifies tokens
  with the Admin SDK.
- **Credentials:** A real Firebase project (user-created). No emulator.
- **Email verification + password reset:** Firebase's built-in **hosted
  action flow**. No custom verify/reset UI logic.
- **Scope:** Auth only. The 9 domain routes keep Postgres and remain
  non-functional until a DB is wired separately.

## Architecture / data flow

```
[Next.js frontend] --Firebase JS SDK--> [Firebase Auth]
        |                                      | (password hashing, email
        | Bearer <Firebase ID token>           |  verification + reset emails
        v                                      |  handled by Firebase)
[Express backend] --firebase-admin--> verifyIdToken()
        |
        +-- Admin SDK: create profile doc + set `role` custom claim
        v
[Cloud Firestore]  users/{uid} = { full_name, role, country_of_origin, ... }
```

- **Identity** (email, password, emailVerified, uid) → Firebase Auth.
- **App profile** (full_name, role, country_of_origin, country_of_residence,
  avatar_url, bio, trust_score, verification_status, preferred_language,
  created_at) → Firestore `users/{uid}` document.
- **Role** → also mirrored to a Firebase **custom claim** so the backend can
  authorize without a Firestore read. Custom claims are set server-side only,
  which is why registration still calls the backend.

## Components

### Frontend

- **Add dependency:** `firebase` (client SDK).
- **New:** `src/lib/firebase.ts` — initialize the client app from
  `NEXT_PUBLIC_FIREBASE_*` env vars; export `auth`.
- **Rewrite `src/lib/auth.ts`:**
  - `login(email, password)` → `signInWithEmailAndPassword`, then mirror
    `full_name/email/role/initials` to localStorage (so the existing
    `UserMenu` keeps working).
  - `register(payload)` → `createUserWithEmailAndPassword`, then
    `POST /api/auth/register-profile` (Bearer token) to create the Firestore
    profile + set the role custom claim, then `sendEmailVerification`.
  - `logout()` → `signOut`, clear localStorage mirror.
  - `authFetch` → attach `await user.getIdToken()` as the Bearer token
    (Firebase SDK is the token source of truth; refresh handled by the SDK).
  - `getToken`/`getUser` preserved for compatibility where practical.
- **`forgot-password` page** → `sendPasswordResetEmail`.
- **`verify-email` / `reset-password` pages** → become thin/removed; Firebase's
  hosted action handler performs the actual verification and reset.

### Backend

- **Add dependency:** `firebase-admin`.
- **New:** `src/lib/firebase-admin.ts` — initialize Admin SDK from
  service-account env vars; export `adminAuth` and `firestore`.
- **Rewrite `src/middleware/auth.ts` `requireAuth`:** verify the Firebase ID
  token via `adminAuth.verifyIdToken()`; populate `req.user` with
  `{ sub: uid, email, role }` (role from the custom claim, default
  `"student"`). Remove custom-JWT verification, `signToken`,
  `verifyPurposeToken`, and the token-version cache. This is the only ripple
  to the other routes — they keep calling `requireAuth` unchanged.
- **Slim `src/routes/auth.ts`:**
  - `POST /api/auth/register-profile` — verify token → write Firestore
    `users/{uid}` profile → `adminAuth.setCustomUserClaims(uid, { role })`.
  - `GET /api/auth/me` — verify token → return the Firestore profile.
  - **Remove:** `/login`, `/register`, `/logout`, `/send-verification`,
    `/verify-email`, `/forgot-password`, `/reset-password` (all replaced by
    Firebase client SDK + hosted flow), plus bcrypt and Postgres user queries.

## Config / credentials

User supplies from the Firebase console:

- **Frontend `.env.local`:** `NEXT_PUBLIC_FIREBASE_API_KEY`,
  `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`,
  `NEXT_PUBLIC_FIREBASE_APP_ID` (+ storage/messaging if needed).
- **Backend `.env`:** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
  `FIREBASE_PRIVATE_KEY` (the three fields from the service-account JSON;
  keeps secrets out of a committed file).
- Add all of the above to both `.env.example` files.
- `DATABASE_URL` becomes optional for the auth path (still referenced by
  out-of-scope domain routes).

## Error handling

- Frontend maps Firebase error codes (`auth/invalid-credential`,
  `auth/email-already-in-use`, `auth/weak-password`, etc.) to the existing
  user-facing error message shape.
- Backend `register-profile` is idempotent: if the profile doc already exists,
  return it rather than erroring (handles retry after a failed first attempt).
- Missing/invalid Bearer token → 401 from `requireAuth`.

## Testing

- Backend: unit-test `requireAuth` with a mocked `verifyIdToken` (valid token →
  populated `req.user`; invalid/missing → 401). Update existing `auth.test.ts`
  (currently exercises the JWT path) accordingly.
- Manual end-to-end (after credentials are in place): register a student →
  receive verification email → login → land on dashboard → `GET /api/auth/me`
  returns the Firestore profile.

## Out of scope / follow-ups

- Migrating domain routes (opportunities, housing, forums, messages, jobs,
  moderation, content, uploads) off Postgres.
- Firestore security rules beyond what auth requires.
- Production hosting config for the Firebase action handler domain.
