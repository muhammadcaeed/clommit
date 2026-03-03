// FILE: src/commands/commit.ts
import { createInterface } from "node:readline";
import chalk from "chalk";
import { loadConfig, recordUsage } from "../config/store.js";
import {
  isGitRepo,
  hasStagedChanges,
  getStagedDiff,
  commitWithMessage,
} from "../lib/git.js";
import {
  estimateCost,
  calculateActualCost,
  formatCost,
  formatTokens,
} from "../lib/cost.js";
import { buildPrompt } from "../lib/prompt.js";
import { generateCommitMessage } from "../lib/claude.js";
import type { ModelName, CommitFormat } from "../types/index.js";

interface CommitOptions {
  dryRun?: boolean;
  cost?: boolean;
  model?: string;
  maxCost?: string;
  format?: string;
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

/**
 * Formats commit message for terminal display.
 * Subject line in bold green, body in dim white — 
 * so the user sees exactly what git log will show.
 */
function displayMessage(message: string): void {
  const parts = message.split(/\n\n(.+)/s);
  const subject = parts[0].trim();
  const body = parts[1]?.trim();

  console.log("\n  " + chalk.green.bold(subject));
  if (body) {
    console.log("");
    for (const line of body.split("\n")) {
      console.log("  " + chalk.white(line));
    }
  }
}

export async function commitCommand(options: CommitOptions): Promise<void> {
  const config = loadConfig();

  // Validate
  if (!config.apiKey) {
    console.log(
      chalk.red("\n  No API key configured. Run: clommit config\n")
    );
    process.exit(1);
  }

  if (!isGitRepo()) {
    console.log(chalk.red("\n  Not a git repository.\n"));
    process.exit(1);
  }

  if (!hasStagedChanges()) {
    console.log(
      chalk.yellow(
        "\n  No staged changes. Stage files with git add first.\n"
      )
    );
    process.exit(1);
  }

  const model = (options.model || config.defaultModel) as ModelName;
  const format = (options.format || config.format) as CommitFormat;
  const maxCost = options.maxCost
    ? parseFloat(options.maxCost)
    : config.maxCost;

  // Get diff
  const diffResult = getStagedDiff();

  if (diffResult.truncated) {
    console.log(
      chalk.yellow(
        "\n  Diff truncated (" +
          formatTokens(diffResult.originalTokens) +
          " tokens, " +
          diffResult.fileCount +
          " files)"
      )
    );
  }

  // Build prompt and estimate cost
  const fullPrompt = buildPrompt(diffResult.diff, format);
  const estimate = estimateCost(fullPrompt, model);

  // Cost-only mode
  if (options.cost) {
    console.log("\n  Model:           " + chalk.cyan(model));
    console.log(
      "  Files changed:   " + chalk.dim(diffResult.fileCount.toString())
    );
    console.log(
      "  Est. tokens:     " +
        chalk.dim(
          "~" +
            formatTokens(estimate.inputTokens) +
            " in / ~" +
            formatTokens(estimate.outputTokens) +
            " out"
        )
    );
    console.log(
      "  Est. cost:       " +
        chalk.yellow(formatCost(estimate.estimatedCost)) +
        "\n"
    );
    return;
  }

  // Budget guard
  if (
    maxCost !== null &&
    maxCost !== undefined &&
    estimate.estimatedCost > maxCost
  ) {
    console.log(
      chalk.red(
        "\n  Estimated cost " +
          formatCost(estimate.estimatedCost) +
          " exceeds budget " +
          formatCost(maxCost)
      )
    );
    console.log(
      chalk.dim("  Use a smaller model or increase --max-cost\n")
    );
    process.exit(1);
  }

  // Show estimate and confirm
  if (config.showCostBefore) {
    console.log(
      "\n  " +
        chalk.dim(
          "~" +
            formatTokens(estimate.inputTokens) +
            " tokens | ~" +
            formatCost(estimate.estimatedCost) +
            " | " +
            model
        )
    );
    const answer = await prompt("  Proceed? " + chalk.dim("(Y/n)") + " ");
    if (answer === "n" || answer === "no") {
      console.log(chalk.dim("  Cancelled.\n"));
      return;
    }
  }

  // Call Claude with spinner
  const spinner = [
    "\u280B",
    "\u2819",
    "\u2839",
    "\u2838",
    "\u283C",
    "\u2834",
    "\u2826",
    "\u2827",
    "\u2807",
    "\u280F",
  ];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(
      "\r  " + spinner[i++ % spinner.length] + " Generating..."
    );
  }, 80);

  let response;
  try {
    response = await generateCommitMessage(fullPrompt, config.apiKey, model);
  } catch (err: unknown) {
    clearInterval(interval);
    process.stdout.write("\r");
    const message = err instanceof Error ? err.message : String(err);
    console.log(chalk.red("\n  Error: " + message + "\n"));
    process.exit(1);
  }

  clearInterval(interval);
  process.stdout.write("\r                    \r");

  // Show result with actual cost
  const actual = calculateActualCost(
    response.usage.input_tokens,
    response.usage.output_tokens,
    model
  );

  displayMessage(response.message);
  console.log(
    "\n  " +
      chalk.dim(
        formatCost(actual.actualCost) +
          " (" +
          actual.inputTokens +
          " in / " +
          actual.outputTokens +
          " out | " +
          model +
          ")"
      )
  );

  // Record stats
  recordUsage(
    model,
    actual.inputTokens,
    actual.outputTokens,
    actual.actualCost
  );

  // Dry run exits here
  if (options.dryRun) {
    console.log(chalk.dim("\n  --dry-run: not committed\n"));
    return;
  }

  // Confirm commit
  const action = await prompt(
    "\n  Commit? " + chalk.dim("(Y/n/e to edit)") + " "
  );

  if (action === "n" || action === "no") {
    console.log(chalk.dim("  Discarded.\n"));
    return;
  }

  let finalMessage = response.message;

  if (action === "e" || action === "edit") {
    console.log(
      chalk.dim("  (Edit the subject line. Body will be preserved.)")
    );
    const edited = await new Promise<string>((resolve) => {
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question("  New subject: ", (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
    if (edited) {
      // Replace only the subject, keep the body
      const parts = finalMessage.split(/\n\n(.+)/s);
      const body = parts[1]?.trim();
      finalMessage = body ? edited + "\n\n" + body : edited;
    }
  }

  try {
    commitWithMessage(finalMessage);
    console.log(chalk.green("\n  Committed!\n"));
  } catch {
    console.log(chalk.red("\n  Commit failed.\n"));
    process.exit(1);
  }
}