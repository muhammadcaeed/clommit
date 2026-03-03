export interface ClommitConfig {
  apiKey: string;
  defaultModel: ModelName;
  format: CommitFormat;
  maxCost: number | null;
  showCostBefore: boolean;
  autoCommit: boolean;
}

export type ModelName = "haiku" | "sonnet" | "opus";
export type CommitFormat = "conventional" | "simple";

export interface ModelPricing {
  input: number;
  output: number;
  modelId: string;
}

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  model: ModelName;
}

export interface ActualCost {
  inputTokens: number;
  outputTokens: number;
  actualCost: number;
  model: ModelName;
}

export interface ClaudeResponse {
  message: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface StatsData {
  totalCommits: number;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byModel: Partial<Record<ModelName, { commits: number; cost: number }>>;
  firstUsed: string;
  lastUsed: string;
}

export interface DiffResult {
  diff: string;
  stat: string;
  fileCount: number;
  truncated: boolean;
  originalTokens: number;
}
