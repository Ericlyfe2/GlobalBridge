// Server-side helper for the /api/ai/* route handlers. Pulls the
// admin-configured model/prompt/temperature/feature-toggles from
// platform_settings (via the backend) so the admin AI Control Center
// actually controls behavior instead of just writing to a table nobody reads.
//
// Cached briefly in-memory per server instance — these settings change rarely
// and every chat message would otherwise cost an extra round trip.

export type AiConfig = {
  ai_model: string;
  ai_temperature: number;
  ai_system_prompt: string;
  ai_chat_enabled: boolean;
  ai_doc_check_enabled: boolean;
  ai_scam_detection_enabled: boolean;
  ai_translation_enabled: boolean;
};

const DEFAULTS: AiConfig = {
  ai_model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  ai_temperature: 0.3,
  ai_system_prompt: "",
  ai_chat_enabled: true,
  ai_doc_check_enabled: true,
  ai_scam_detection_enabled: true,
  ai_translation_enabled: true,
};

const CACHE_TTL_MS = 15_000;
let cached: { value: AiConfig; expires: number } | null = null;

export async function getAiConfig(): Promise<AiConfig> {
  if (cached && cached.expires > Date.now()) return cached.value;
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${base}/api/content/ai-config`, { cache: "no-store" });
    if (!res.ok) throw new Error(`ai-config fetch failed: ${res.status}`);
    const data = (await res.json()) as Partial<AiConfig>;
    const value: AiConfig = {
      ai_model: data.ai_model || DEFAULTS.ai_model,
      ai_temperature: typeof data.ai_temperature === "number" ? data.ai_temperature : DEFAULTS.ai_temperature,
      ai_system_prompt: typeof data.ai_system_prompt === "string" ? data.ai_system_prompt : DEFAULTS.ai_system_prompt,
      ai_chat_enabled: data.ai_chat_enabled ?? DEFAULTS.ai_chat_enabled,
      ai_doc_check_enabled: data.ai_doc_check_enabled ?? DEFAULTS.ai_doc_check_enabled,
      ai_scam_detection_enabled: data.ai_scam_detection_enabled ?? DEFAULTS.ai_scam_detection_enabled,
      ai_translation_enabled: data.ai_translation_enabled ?? DEFAULTS.ai_translation_enabled,
    };
    cached = { value, expires: Date.now() + CACHE_TTL_MS };
    return value;
  } catch {
    // Backend unreachable — fall back to env-var defaults rather than fail
    // every AI request over an admin-settings outage.
    return DEFAULTS;
  }
}
