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

/** Centralized password policy — single source of truth for UI + validation. */
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
} as const;

export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`At least ${PASSWORD_POLICY.minLength} characters`);
  }
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Uppercase letter");
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Lowercase letter");
  }
  if (PASSWORD_POLICY.requireNumber && !/[0-9]/.test(password)) {
    errors.push("A number");
  }
  if (PASSWORD_POLICY.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    errors.push("Special character");
  }
  return errors;
}

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
    const initials =
      user.full_name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
    localStorage.setItem("user-initials", initials);
  } catch {}
}

export function clearSession() {
  try {
    [TOKEN_KEY, USER_KEY, "user-initials"].forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/** Subscribe to Firebase ID token rotation. Returns unsubscribe function. */
export function subscribeIdTokenChanges() {
  if (typeof window === "undefined") return () => {};
  return onIdTokenChanged(auth, async (user) => {
    try {
      if (user) {
        const token = await user.getIdToken();
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        clearSession();
      }
    } catch {}
  });
}

const FETCH_TIMEOUT = 8000;

async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

/**
 * Fetch wrapper that attaches a fresh Firebase ID token as Bearer.
 * `timeoutMs` defaults to 8s; pass a larger value for calls that may hit a
 * cold-starting backend (e.g. Render free tier wakes in ~50s).
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = FETCH_TIMEOUT) {
  const headers = new Headers(init.headers);
  const current = auth.currentUser;
  const token = current ? await current.getIdToken() : getToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return timedFetch(input, { ...init, headers }, timeoutMs);
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
async function syncProfile(uid: string, token: string, fallback: { email: string; full_name: string }) {
  let res: Response;
  try {
    res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error("Could not load your profile. Please try again.");
  }
  if (!res.ok) {
    throw new Error("Could not load your profile. Please try again.");
  }
  const data = await res.json();
  const u = data.user as Partial<SessionUser> & { full_name?: string; role?: SessionUser["role"] };
  setSession(token, {
    id: u.id ?? uid,
    email: u.email ?? fallback.email,
    full_name: u.full_name ?? fallback.full_name,
    role: u.role ?? "student",
  });
}

export async function login(email: string, password: string) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    await syncProfile(cred.user.uid, token, { email: cred.user.email ?? email, full_name: cred.user.displayName ?? email });
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
      await cred.user.delete().catch(() => {});
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
