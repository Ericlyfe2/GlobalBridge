// Simple JWT-based auth client.
// Stores token + user in localStorage. Adds Authorization header to fetches when present.

export type SessionUser = {
  id: string;
  email: string;
  full_name: string;
  role: "student" | "mentor" | "employer" | "admin";
};

const TOKEN_KEY = "gb-token";
const USER_KEY  = "gb-user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as SessionUser : null;
  } catch { return null; }
}

export function setSession(token: string, user: SessionUser) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    // mirror to legacy keys read by UserMenu / register flow
    localStorage.setItem("user-name", user.full_name);
    localStorage.setItem("user-email", user.email);
    localStorage.setItem("user-role", user.role);
    const initials = user.full_name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
    localStorage.setItem("user-initials", initials);
  } catch {}
}

export function clearSession() {
  try {
    [TOKEN_KEY, USER_KEY, "user-name", "user-email", "user-role", "user-initials", "user-country"].forEach((k) =>
      localStorage.removeItem(k),
    );
  } catch {}
}

const FETCH_TIMEOUT = 8000;

async function timedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function apiError(msg: string): never {
  throw new Error(
    `${msg}\n\nMake sure your backend is running and NEXT_PUBLIC_API_URL is set correctly in .env.local (dev) or Vercel environment variables (production).`,
  );
}

/** Fetch wrapper that auto-attaches Authorization: Bearer <token> when present. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return timedFetch(input, { ...init, headers });
}

export async function login(email: string, password: string) {
  let res: Response;
  try {
    res = await timedFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return apiError("Login failed — could not reach the API.");
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || "Login failed");
  }
  setSession(data.token, data.user);
}

export async function register(payload: {
  email: string; password: string; full_name: string;
  role: SessionUser["role"]; country_of_origin?: string;
}) {
  let res: Response;
  try {
    res = await timedFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return apiError("Registration failed — could not reach the API.");
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || "Registration failed");
  }
  setSession(data.token, data.user);
}
