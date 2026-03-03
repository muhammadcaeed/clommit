// FILE: src/lib/git.ts
import { execFileSync } from "node:child_process";
import type { DiffResult } from "../types/index.js";
import { estimateTokens } from "./cost.js";

function exec(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  }).trim();
}

export function isGitRepo(): boolean {
  try {
    exec("rev-parse", "--is-inside-work-tree");
    return true;
  } catch {
    return false;
  }
}

export function hasStagedChanges(): boolean {
  try {
    const result = exec("diff", "--cached", "--name-only");
    return result.length > 0;
  } catch {
    return false;
  }
}

export function getStagedDiff(): DiffResult {
  const stat = exec("diff", "--cached", "--stat");
  const fullDiff = exec("diff", "--cached");
  const names = exec("diff", "--cached", "--name-only");
  const fileCount = names.split("\n").filter(Boolean).length;
  const originalTokens = estimateTokens(fullDiff);

  // Small diffs (< 2000 tokens): send full diff
  if (originalTokens <= 2000) {
    return {
      diff: fullDiff,
      stat,
      fileCount,
      truncated: false,
      originalTokens,
    };
  }

  // Medium diffs (2000-8000 tokens): truncated hunks + stat
  if (originalTokens <= 8000) {
    const lines = fullDiff.split("\n");
    const target = 2000 * 4;
    let out = "";
    let count = 0;
    for (const line of lines) {
      if (count + line.length > target) break;
      out += line + "\n";
      count += line.length + 1;
    }
    return {
      diff:
        stat +
        "\n\n" +
        out +
        "\n[truncated, " +
        originalTokens +
        " tokens]",
      stat,
      fileCount,
      truncated: true,
      originalTokens,
    };
  }

  // Large diffs (> 8000 tokens): stat + filenames + first 100 lines
  const head = fullDiff.split("\n").slice(0, 100).join("\n");
  return {
    diff:
      stat +
      "\n\nChanged files:\n" +
      names +
      "\n\n" +
      head +
      "\n[heavily truncated, " +
      originalTokens +
      " tokens]",
    stat,
    fileCount,
    truncated: true,
    originalTokens,
  };
}

/**
 * Commits with proper multi-paragraph support.
 * If the message contains a blank line (subject + body),
 * git will treat them as separate paragraphs — showing
 * the subject in git log --oneline and the body in full log.
 */
export function commitWithMessage(message: string): void {
  // Split into subject and body on the first blank line
  const parts = message.split(/\n\n(.+)/s);
  const subject = parts[0].trim();
  const body = parts[1]?.trim();

  const args = body
    ? ["commit", "-m", subject, "-m", body]
    : ["commit", "-m", subject];

  execFileSync("git", args, { stdio: "inherit" });
}