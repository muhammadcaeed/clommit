import type { ModelName, ClaudeResponse } from "../types/index.js";
import { getModelId } from "./cost.js";

interface AnthropicApiResponse {
  content?: { text?: string }[];
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface AnthropicApiError {
  error?: { message?: string };
}

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

export async function generateCommitMessage(
  prompt: string,
  apiKey: string,
  model: ModelName
): Promise<ClaudeResponse> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": API_VERSION,
    },
    body: JSON.stringify({
      model: getModelId(model),
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error: AnthropicApiError = await response.json().catch(() => ({}));
    const msg = error?.error?.message || response.statusText;
    throw new Error("Claude API error (" + response.status + "): " + msg);
  }

  const data: AnthropicApiResponse = await response.json();
  const message = data.content?.[0]?.text?.trim() || "";

  return {
    message,
    usage: {
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0,
    },
  };
}
