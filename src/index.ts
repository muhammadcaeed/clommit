import { Command } from "commander";
import { commitCommand } from "./commands/commit.js";
import { configCommand } from "./commands/config.js";
import { statsCommand } from "./commands/stats.js";

const program = new Command();

program
  .name("clommit")
  .description(
    "AI commit messages powered by Claude. Cost-transparent, lightweight, zero bloat."
  )
  .version(__VERSION__);

program
  .command("config")
  .description("Configure API key, model, and preferences")
  .action(configCommand);

program
  .command("stats")
  .description("Show usage statistics and total spend")
  .action(statsCommand);

program
  .option("-d, --dry-run", "Generate message without committing")
  .option("-c, --cost", "Show cost estimate only")
  .option("-m, --model <model>", "Model to use (haiku, sonnet, opus)")
  .option("--max-cost <amount>", "Maximum cost per commit")
  .option("-f, --format <format>", "Commit format (conventional, simple)")
  .action(commitCommand);

program.parse();
