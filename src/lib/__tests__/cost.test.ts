import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  estimateCost,
  calculateActualCost,
  formatCost,
  formatTokens,
  getModelId,
} from "../cost.js";

describe("getModelId", () => {
  it("returns correct model ID for haiku", () => {
    expect(getModelId("haiku")).toBe("claude-haiku-4-5-latest");
  });

  it("returns correct model ID for sonnet", () => {
    expect(getModelId("sonnet")).toBe("claude-sonnet-4-6");
  });

  it("returns correct model ID for opus", () => {
    expect(getModelId("opus")).toBe("claude-opus-4-6");
  });
});

describe("estimateTokens", () => {
  it("returns chars / 4 rounded up", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcde")).toBe(2);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });

  it("handles long strings", () => {
    expect(estimateTokens("a".repeat(4000))).toBe(1000);
  });
});

describe("estimateCost", () => {
  it("calculates cost for haiku", () => {
    const result = estimateCost("a".repeat(4000), "haiku");
    expect(result.inputTokens).toBe(1000);
    expect(result.outputTokens).toBe(100);
    // (1000 * 0.25 + 100 * 1.25) / 1_000_000 = 375 / 1_000_000
    expect(result.estimatedCost).toBeCloseTo(0.000375);
    expect(result.model).toBe("haiku");
  });

  it("calculates cost for sonnet", () => {
    const result = estimateCost("a".repeat(4000), "sonnet");
    // (1000 * 3.0 + 100 * 15.0) / 1_000_000 = 4500 / 1_000_000
    expect(result.estimatedCost).toBeCloseTo(0.0045);
  });

  it("calculates cost for opus", () => {
    const result = estimateCost("a".repeat(4000), "opus");
    // (1000 * 15.0 + 100 * 75.0) / 1_000_000 = 22500 / 1_000_000
    expect(result.estimatedCost).toBeCloseTo(0.0225);
  });
});

describe("calculateActualCost", () => {
  it("uses actual token counts", () => {
    const result = calculateActualCost(500, 50, "haiku");
    // (500 * 0.25 + 50 * 1.25) / 1_000_000 = 187.5 / 1_000_000
    expect(result.actualCost).toBeCloseTo(0.0001875);
    expect(result.inputTokens).toBe(500);
    expect(result.outputTokens).toBe(50);
    expect(result.model).toBe("haiku");
  });
});

describe("formatCost", () => {
  it("uses 6 decimal places for costs under $0.01", () => {
    expect(formatCost(0.000375)).toBe("$0.000375");
  });

  it("uses 4 decimal places for costs >= $0.01", () => {
    expect(formatCost(0.0225)).toBe("$0.0225");
  });
});

describe("formatTokens", () => {
  it("formats thousands with k suffix", () => {
    expect(formatTokens(1500)).toBe("1.5k");
    expect(formatTokens(1000)).toBe("1.0k");
  });

  it("returns raw number for < 1000", () => {
    expect(formatTokens(500)).toBe("500");
  });
});
