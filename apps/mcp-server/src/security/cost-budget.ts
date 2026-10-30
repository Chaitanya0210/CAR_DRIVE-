export class CostBudgetExceededError extends Error {
  public readonly code = 402;
  constructor(message: string) {
    super(message);
    this.name = 'CostBudgetExceededError';
  }
}

export interface UserBudgetUsage {
  userId: string;
  maxBudgetUsd: number;
  spentUsd: number;
  totalTokensConsumed: number;
}

export class CostBudgetManager {
  private userBudgets = new Map<string, UserBudgetUsage>();
  private readonly defaultMaxBudgetUsd: number;

  constructor(defaultMaxBudgetUsd = 5.0) {
    this.defaultMaxBudgetUsd = defaultMaxBudgetUsd;
  }

  public getOrCreate(userId: string, configuredLimitUsd?: number): UserBudgetUsage {
    let usage = this.userBudgets.get(userId);
    if (!usage) {
      usage = {
        userId,
        maxBudgetUsd: configuredLimitUsd ?? this.defaultMaxBudgetUsd,
        spentUsd: 0,
        totalTokensConsumed: 0,
      };
      this.userBudgets.set(userId, usage);
    }
    return usage;
  }

  /**
   * Checks whether user has remaining budget.
   * Throws CostBudgetExceededError if limit reached.
   */
  public checkBudget(
    userId: string,
    estimatedOperationCostUsd = 0.01,
    configuredLimitUsd?: number,
  ): void {
    const usage = this.getOrCreate(userId, configuredLimitUsd);

    if (usage.spentUsd + estimatedOperationCostUsd > usage.maxBudgetUsd) {
      throw new CostBudgetExceededError(
        `Per-user cost budget exceeded: Spent $${usage.spentUsd.toFixed(2)} of $${usage.maxBudgetUsd.toFixed(2)} allowance.`,
      );
    }
  }

  /**
   * Deducts cost and records token consumption.
   */
  public recordConsumption(userId: string, costUsd: number, tokens = 0): void {
    const usage = this.getOrCreate(userId);
    usage.spentUsd += costUsd;
    usage.totalTokensConsumed += tokens;
  }

  public reset(userId?: string): void {
    if (userId) {
      this.userBudgets.delete(userId);
    } else {
      this.userBudgets.clear();
    }
  }
}

export const costBudgetManager = new CostBudgetManager(5.0);
