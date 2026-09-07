/**
 * Provider client for the /api/ai/* route handlers.
 *
 * Wraps the AI SDK's generateText() with the Google provider so each route
 * keeps calling one function with the same {model, messages, maxTokens}
 * shape every route already built around when this app used the OpenAI SDK
 * directly. Swapping providers again later means changing this file only.
 */

import { google } from "@ai-sdk/google";
import { generateText, type ModelMessage } from "ai";

export function isAiConfigured(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY);
}

export type ChatCompleteResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

/** Normalizes model aliases and legacy names to supported Gemini models. */
function normalizeModel(model: string): string {
  const m = (model || "").toLowerCase().trim();
  if (m === "gemini-3.5-flash" || m === "gemini-2.5-flash" || m === "gemini-flash") return "gemini-2.5-flash";
  if (m === "gemini-3.5-flash-lite" || m === "gemini-2.0-flash-lite") return "gemini-2.0-flash-lite";
  if (m === "gemini-2.5-pro" || m === "gemini-pro") return "gemini-2.5-pro";
  if (m === "gemini-1.5-flash" || m === "gemini-1.5-pro" || m === "gemini-2.0-flash") return m;
  // Legacy OpenAI/Claude names or unrecognised defaults fall back to the default fast model
  if (m.startsWith("gpt-") || m.startsWith("o4-") || m.startsWith("claude-")) return "gemini-2.5-flash";
  return model || "gemini-2.5-flash";
}

export async function chatComplete(params: {
  model: string;
  messages: ModelMessage[];
  maxTokens: number;
  temperature?: number;
}): Promise<ChatCompleteResult> {
  // generateText rejects a "system" role inside messages[] ("Use the
  // instructions option instead") — every call site here builds its
  // messages as [{role: "system", ...}, ...rest], so pull that out.
  const systemParts: string[] = [];
  const rest: ModelMessage[] = [];

  for (const m of params.messages) {
    if (m.role === "system") {
      const c = (m as { content?: unknown }).content;
      if (typeof c === "string") {
        systemParts.push(c);
      } else if (Array.isArray(c)) {
        for (const part of c) {
          if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") {
            systemParts.push((part as { text: string }).text);
          }
        }
      }
    } else {
      rest.push(m);
    }
  }

  const resolvedModel = normalizeModel(params.model);

  const { text, usage } = await generateText({
    model: google(resolvedModel),
    ...(systemParts.length > 0 ? { instructions: systemParts.join("\n\n") } : {}),
    messages: rest,
    maxOutputTokens: params.maxTokens,
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
  });
  return {
    text: text.trim(),
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}

