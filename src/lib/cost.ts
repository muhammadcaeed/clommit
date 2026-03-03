import type {
  ModelName,
  ModelPricing,
  CostEstimate,
  ActualCost,
} from "../types/index.js";

const PRICING: Record<ModelName, ModelPricing> = {
  haiku: {
    input: 0.25,
    output: 1.25,
    modelId: "claude-haiku-4-5-latest",
  },
  sonnet: {
    input: 3.0,
    output: 15.0,
    modelId: "claude-sonnet-4-6",
  },
  opus: {
    input: 15.0,
    output: 75.0,
    modelId: "claude-opus-4-6",
  },
};

export function getModelId(model: ModelName): string {
  return PRICING[model].modelId;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  inputText: string,
  model: ModelName
): CostEstimate {
  const inputTokens = estimateTokens(inputText);
  const outputTokens = 100;
  const pricing = PRICING[model];
  const estimatedCost =
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return { inputTokens, outputTokens, estimatedCost, model };
}

export function calculateActualCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelName
): ActualCost {
  const pricing = PRICING[model];
  const actualCost =
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  return { inputTokens, outputTokens, actualCost, model };
}

export function formatCost(cost: number): string {
  if (cost < 0.01) return "$" + cost.toFixed(6);
  return "$" + cost.toFixed(4);
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) return (tokens / 1000).toFixed(1) + "k";
  return tokens.toString();
}
