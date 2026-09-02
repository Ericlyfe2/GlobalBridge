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
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export type ChatCompleteResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

export async function chatComplete(params: {
  model: string;
  messages: ModelMessage[];
  maxTokens: number;
  temperature?: number;
}): Promise<ChatCompleteResult> {
  const { text, usage } = await generateText({
    model: google(params.model),
    messages: params.messages,
    maxOutputTokens: params.maxTokens,
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
  });
  return {
    text: text.trim(),
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}
