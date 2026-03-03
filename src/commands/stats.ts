import chalk from "chalk";
import { loadStats } from "../config/store.js";
import { formatCost } from "../lib/cost.js";

export function statsCommand(): void {
  const stats = loadStats();

  if (stats.totalCommits === 0) {
    console.log(
      chalk.dim("\n  No commits generated yet. Run clommit to get started!\n")
    );
    return;
  }

  console.log(chalk.bold("\n  clommit usage stats\n"));
  console.log(
    "  Total commits:   " + chalk.cyan(stats.totalCommits.toString())
  );
  console.log("  Total cost:      " + chalk.yellow(formatCost(stats.totalCost)));
  console.log(
    "  Avg cost/commit: " +
      chalk.yellow(formatCost(stats.totalCost / stats.totalCommits))
  );
  console.log(
    "  Total tokens:    " +
      chalk.dim(
        stats.totalInputTokens.toLocaleString() +
          " in / " +
          stats.totalOutputTokens.toLocaleString() +
          " out"
      )
  );
  console.log("  Active since:    " + chalk.dim(stats.firstUsed));
  console.log("  Last used:       " + chalk.dim(stats.lastUsed));

  if (Object.keys(stats.byModel).length > 0) {
    console.log(chalk.bold("\n  By model:\n"));
    for (const [model, data] of Object.entries(stats.byModel)) {
      if (data) {
        console.log(
          "    " +
            model.padEnd(8) +
            " " +
            chalk.cyan(data.commits.toString().padStart(4)) +
            " commits  " +
            chalk.yellow(formatCost(data.cost))
        );
      }
    }
  }

  console.log("");
}
