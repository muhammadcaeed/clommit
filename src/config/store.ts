import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ClommitConfig, StatsData } from "../types/index.js";

const CONFIG_DIR = join(homedir(), ".clommit");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const STATS_PATH = join(CONFIG_DIR, "stats.json");

function ensureDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

const DEFAULT_CONFIG: ClommitConfig = {
  apiKey: "",
  defaultModel: "haiku",
  format: "conventional",
  maxCost: null,
  showCostBefore: true,
  autoCommit: false,
};

export function loadConfig(): ClommitConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Partial<ClommitConfig>): void {
  ensureDir();
  const existing = loadConfig();
  const merged = { ...existing, ...config };
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2) + "\n");
}

const DEFAULT_STATS: StatsData = {
  totalCommits: 0,
  totalCost: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  byModel: {},
  firstUsed: "",
  lastUsed: "",
};

export function loadStats(): StatsData {
  try {
    const raw = readFileSync(STATS_PATH, "utf-8");
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function recordUsage(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number
): void {
  ensureDir();
  const stats = loadStats();
  const today = new Date().toISOString().split("T")[0];

  stats.totalCommits += 1;
  stats.totalCost += cost;
  stats.totalInputTokens += inputTokens;
  stats.totalOutputTokens += outputTokens;
  if (!stats.firstUsed) stats.firstUsed = today;
  stats.lastUsed = today;

  const modelKey = model as keyof typeof stats.byModel;
  if (!stats.byModel[modelKey]) {
    stats.byModel[modelKey] = { commits: 0, cost: 0 };
  }
  stats.byModel[modelKey]!.commits += 1;
  stats.byModel[modelKey]!.cost += cost;

  writeFileSync(STATS_PATH, JSON.stringify(stats, null, 2) + "\n");
}
