import { describe, it, expect } from "vitest";
import { buildPrompt } from "../prompt.js";

describe("buildPrompt", () => {
  const diff = "diff --git a/file.ts b/file.ts\n+added line";

  it("uses conventional prompt for 'conventional' format", () => {
    const result = buildPrompt(diff, "conventional");
    expect(result).toContain("type(scope):");
    expect(result).toContain(diff);
  });

  it("uses simple prompt for 'simple' format", () => {
    const result = buildPrompt(diff, "simple");
    expect(result).not.toContain("type(scope):");
    expect(result).toContain("concise imperative description");
    expect(result).toContain(diff);
  });

  it("appends the diff after a double newline", () => {
    const result = buildPrompt(diff, "conventional");
    expect(result).toContain("\n\n" + diff);
  });
});
