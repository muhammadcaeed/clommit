import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "node:child_process";
import { getStagedDiff, isGitRepo, hasStagedChanges, commitWithMessage } from "../git.js";

const mockExecFileSync = vi.mocked(execFileSync);

function setupMocks(
  diffContent: string,
  stat = "file.ts | 1 +",
  names = "file.ts"
) {
  mockExecFileSync.mockImplementation(
    (_cmd: string, args?: readonly string[]) => {
      const a = args as string[];
      if (a.includes("--stat")) return stat;
      if (a.includes("--name-only")) return names;
      return diffContent;
    }
  );
}

describe("isGitRepo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when inside a git repo", () => {
    mockExecFileSync.mockReturnValueOnce("true");
    expect(isGitRepo()).toBe(true);
  });

  it("returns false when not in a git repo", () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error("not a git repo");
    });
    expect(isGitRepo()).toBe(false);
  });
});

describe("hasStagedChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when there are staged files", () => {
    mockExecFileSync.mockReturnValueOnce("src/index.ts");
    expect(hasStagedChanges()).toBe(true);
  });

  it("returns false when no staged files", () => {
    mockExecFileSync.mockReturnValueOnce("");
    expect(hasStagedChanges()).toBe(false);
  });

  it("returns false when git command fails", () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error("git error");
    });
    expect(hasStagedChanges()).toBe(false);
  });
});

describe("commitWithMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commits with subject only when no body", () => {
    mockExecFileSync.mockReturnValueOnce("");
    commitWithMessage("feat: add login");
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git",
      ["commit", "-m", "feat: add login"],
      { stdio: "inherit" }
    );
  });

  it("commits with subject and body as separate -m flags", () => {
    mockExecFileSync.mockReturnValueOnce("");
    commitWithMessage("feat: add login\n\nAdded login form and validation");
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "git",
      ["commit", "-m", "feat: add login", "-m", "Added login form and validation"],
      { stdio: "inherit" }
    );
  });

  it("throws when git commit fails", () => {
    mockExecFileSync.mockImplementationOnce(() => {
      throw new Error("commit failed");
    });
    expect(() => commitWithMessage("feat: test")).toThrow("commit failed");
  });
});

describe("getStagedDiff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns full diff for small diffs (<= 2000 tokens)", () => {
    const smallDiff = "a".repeat(100); // 25 tokens
    setupMocks(smallDiff);

    const result = getStagedDiff();
    expect(result.diff).toBe(smallDiff);
    expect(result.truncated).toBe(false);
    expect(result.fileCount).toBe(1);
  });

  it("truncates medium diffs (2000-8000 tokens) with stat prefix", () => {
    const mediumDiff = "a".repeat(12000); // 3000 tokens
    setupMocks(mediumDiff);

    const result = getStagedDiff();
    expect(result.truncated).toBe(true);
    expect(result.diff).toContain("[truncated,");
    expect(result.diff).toContain("file.ts | 1 +");
  });

  it("heavily truncates large diffs (> 8000 tokens)", () => {
    // Build a diff with many lines to exceed 8000 tokens
    const lines = Array.from({ length: 500 }, (_, i) => "line" + i + " ".repeat(80));
    const largeDiff = lines.join("\n"); // well over 8000 tokens
    setupMocks(largeDiff, "many files changed", "file1.ts\nfile2.ts");

    const result = getStagedDiff();
    expect(result.truncated).toBe(true);
    expect(result.diff).toContain("[heavily truncated,");
    expect(result.diff).toContain("Changed files:");
    expect(result.fileCount).toBe(2);
  });
});
