import { createInterface } from "node:readline";
import chalk from "chalk";
import { loadConfig, saveConfig } from "../config/store.js";
import type { ModelName, CommitFormat } from "../types/index.js";

function ask(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function configCommand(): Promise<void> {
  const existing = loadConfig();

  console.log(chalk.bold("\n  clommit configuration\n"));

  const apiKey = await ask(
    "  API Key " +
      (existing.apiKey ? chalk.dim("(press enter to keep existing)") : "") +
      ": "
  );

  const modelInput = await ask(
    "  Default model " +
      chalk.dim("[haiku/sonnet/opus]") +
      " " +
      chalk.dim("(current: " + existing.defaultModel + ")") +
      ": "
  );

  const formatInput = await ask(
    "  Commit format " +
      chalk.dim("[conventional/simple]") +
      " " +
      chalk.dim("(current: " + existing.format + ")") +
      ": "
  );

  const maxCostInput = await ask(
    "  Max cost per commit " +
      chalk.dim("(e.g. 0.01, or empty for none)") +
      " " +
      chalk.dim("(current: " + (existing.maxCost ?? "none") + ")") +
      ": "
  );

  // Validate model
  const validModels = ["haiku", "sonnet", "opus"];
  if (modelInput && !validModels.includes(modelInput)) {
    console.log(
      chalk.yellow(
        "\n  Invalid model '" +
          modelInput +
          "'. Expected: " +
          validModels.join(", ") +
          ". Keeping current: " +
          existing.defaultModel
      )
    );
  }

  // Validate format
  const validFormats = ["conventional", "simple"];
  if (formatInput && !validFormats.includes(formatInput)) {
    console.log(
      chalk.yellow(
        "\n  Invalid format '" +
          formatInput +
          "'. Expected: " +
          validFormats.join(", ") +
          ". Keeping current: " +
          existing.format
      )
    );
  }

  // Validate max cost
  let maxCost = existing.maxCost;
  if (maxCostInput) {
    const parsed = parseFloat(maxCostInput);
    if (isNaN(parsed) || parsed < 0) {
      console.log(
        chalk.yellow(
          "\n  Invalid max cost '" +
            maxCostInput +
            "'. Must be a positive number. Keeping current: " +
            (existing.maxCost ?? "none")
        )
      );
    } else {
      maxCost = parsed;
    }
  }

  saveConfig({
    apiKey: apiKey || existing.apiKey,
    defaultModel: (validModels.includes(modelInput)
      ? modelInput
      : existing.defaultModel) as ModelName,
    format: (validFormats.includes(formatInput)
      ? formatInput
      : existing.format) as CommitFormat,
    maxCost,
  });

  console.log(chalk.green("\n  Config saved to ~/.clommit/config.json\n"));
}
