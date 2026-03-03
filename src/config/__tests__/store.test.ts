import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  existsSync: vi.fn(),
}));

vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/mock/home"),
}));

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { loadConfig, saveConfig, loadStats, recordUsage } from "../store.js";

const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockExistsSync = vi.mocked(existsSync);

describe("loadConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns defaults when no config file exists", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const config = loadConfig();
    expect(config.apiKey).toBe("");
    expect(config.defaultModel).toBe("haiku");
    expect(config.format).toBe("conventional");
    expect(config.maxCost).toBeNull();
    expect(config.showCostBefore).toBe(true);
  });

  it("merges saved config with defaults", () => {
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ apiKey: "sk-test" }) as any
    );

    const config = loadConfig();
    expect(config.apiKey).toBe("sk-test");
    expect(config.defaultModel).toBe("haiku"); // default preserved
  });
});

describe("saveConfig", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates config directory if it does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    saveConfig({ apiKey: "sk-new" });
    expect(mkdirSync).toHaveBeenCalled();
  });

  it("merges with existing config", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({ apiKey: "sk-old", format: "simple" }) as any
    );

    saveConfig({ apiKey: "sk-new" });

    const written = JSON.parse(
      (mockWriteFileSync.mock.calls[0][1] as string).trim()
    );
    expect(written.apiKey).toBe("sk-new");
    expect(written.format).toBe("simple"); // preserved from existing
  });
});

describe("loadStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns defaults when no stats file exists", () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const stats = loadStats();
    expect(stats.totalCommits).toBe(0);
    expect(stats.totalCost).toBe(0);
    expect(stats.byModel).toEqual({});
  });
});

describe("recordUsage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("increments stats and writes to file", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      JSON.stringify({
        totalCommits: 5,
        totalCost: 0.01,
        totalInputTokens: 5000,
        totalOutputTokens: 500,
        byModel: {},
        firstUsed: "2025-01-01",
        lastUsed: "2025-01-01",
      }) as any
    );

    recordUsage("haiku", 1000, 100, 0.0004);

    const written = JSON.parse(
      (mockWriteFileSync.mock.calls[0][1] as string).trim()
    );
    expect(written.totalCommits).toBe(6);
    expect(written.totalCost).toBeCloseTo(0.0104);
    expect(written.totalInputTokens).toBe(6000);
    expect(written.totalOutputTokens).toBe(600);
    expect(written.byModel.haiku.commits).toBe(1);
    expect(written.byModel.haiku.cost).toBeCloseTo(0.0004);
  });
});
