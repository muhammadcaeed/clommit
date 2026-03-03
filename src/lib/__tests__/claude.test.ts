import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateCommitMessage } from "../claude.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateCommitMessage", () => {
  it("returns message and usage on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: "feat: add login" }],
        usage: { input_tokens: 100, output_tokens: 20 },
      }),
    });

    const result = await generateCommitMessage("test prompt", "sk-test", "haiku");
    expect(result.message).toBe("feat: add login");
    expect(result.usage.input_tokens).toBe(100);
    expect(result.usage.output_tokens).toBe(20);
  });

  it("throws on API error with error message from body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({
        error: { message: "Invalid API key" },
      }),
    });

    await expect(
      generateCommitMessage("test prompt", "bad-key", "haiku")
    ).rejects.toThrow("Claude API error (401): Invalid API key");
  });

  it("throws with statusText when error body is unparseable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => {
        throw new Error("not json");
      },
    });

    await expect(
      generateCommitMessage("test prompt", "sk-test", "haiku")
    ).rejects.toThrow("Claude API error (500): Internal Server Error");
  });

  it("throws on network failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("fetch failed"));

    await expect(
      generateCommitMessage("test prompt", "sk-test", "haiku")
    ).rejects.toThrow("fetch failed");
  });

  it("defaults to empty message when content is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [],
        usage: { input_tokens: 50, output_tokens: 0 },
      }),
    });

    const result = await generateCommitMessage("test prompt", "sk-test", "haiku");
    expect(result.message).toBe("");
  });

  it("defaults usage to 0 when missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: "fix: typo" }],
      }),
    });

    const result = await generateCommitMessage("test prompt", "sk-test", "haiku");
    expect(result.usage.input_tokens).toBe(0);
    expect(result.usage.output_tokens).toBe(0);
  });
});
