/**
 * Consistent success/failure envelope for /api/ai/* routes.
 */

export type AiErrorCode =
  | "not_configured"
  | "disabled"
  | "provider_error"
  | "invalid_input"
  | "rate_limited"
  | "budget_exceeded";

export type AiErrorBody = {
  success: false;
  error: { code: AiErrorCode; message: string };
  conversation_id?: string | null;
};

export type AiChatSuccess = {
  success: true;
  reply: string;
  sources: { title: string; url: string; provenance?: string; label?: string }[];
  lang?: string;
  conversation_id?: string | null;
  usage?: { input_tokens: number; output_tokens: number; response_time_ms?: number };
};

export function aiError(
  code: AiErrorCode,
  message: string,
  status: number,
  extra?: { conversation_id?: string | null },
): Response {
  const body: AiErrorBody = {
    success: false,
    error: { code, message },
    ...(extra?.conversation_id !== undefined ? { conversation_id: extra.conversation_id } : {}),
  };
  return Response.json(body, { status });
}
