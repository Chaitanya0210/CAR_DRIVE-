import crypto from 'node:crypto';

export class ConfirmationTokenError extends Error {
  constructor(
    message: string,
    public readonly code = 'CONFIRMATION_FAILED',
  ) {
    super(message);
    this.name = 'ConfirmationTokenError';
  }
}

export class ConfirmationTokenExpiredError extends ConfirmationTokenError {
  constructor(message = 'Confirmation token has expired. Please propose action again.') {
    super(message, 'TOKEN_EXPIRED');
    this.name = 'ConfirmationTokenExpiredError';
  }
}

export class ConfirmationTokenReplayError extends ConfirmationTokenError {
  constructor(message = 'Confirmation token has already been spent. Action cannot be replayed.') {
    super(message, 'TOKEN_REPLAYED');
    this.name = 'ConfirmationTokenReplayError';
  }
}

export class ConfirmationTokenTamperedError extends ConfirmationTokenError {
  constructor(
    message = 'Confirmation parameters do not match original proposal. Modification rejected.',
  ) {
    super(message, 'PARAMETERS_TAMPERED');
    this.name = 'ConfirmationTokenTamperedError';
  }
}

export interface StoredConfirmation {
  tokenId: string;
  toolName: string;
  userId: string;
  paramsHash: string;
  summary: string;
  actionPayload: Record<string, unknown>;
  createdAt: number;
  expiresAt: number;
  spent: boolean;
  spentAt?: number;
}

export interface ConfirmationProposalResult {
  status: 'CONFIRMATION_REQUIRED';
  confirmation_token: string;
  action_summary: string;
  expires_at_utc: string;
  payload: Record<string, unknown>;
  instructions: string;
}

export class ConfirmationTokenManager {
  private tokens = new Map<string, StoredConfirmation>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlSeconds = 300) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
  }

  /**
   * Deterministically computes SHA-256 hash of canonical parameter object
   * (excluding confirmation_token and idempotency_key).
   */
  public computeParamsHash(params: Record<string, unknown>): string {
    const cleanParams: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (k !== 'confirmation_token' && k !== 'idempotency_key') {
        cleanParams[k] = v;
      }
    }
    const sortedKeys = Object.keys(cleanParams).sort();
    const canonicalObj: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      canonicalObj[key] = cleanParams[key];
    }
    return crypto.createHash('sha256').update(JSON.stringify(canonicalObj)).digest('hex');
  }

  /**
   * Generates a new short-lived confirmation token for an unconfirmed write action.
   */
  public createProposal(
    toolName: string,
    userId: string,
    params: Record<string, unknown>,
    summary: string,
    actionPayload: Record<string, unknown> = {},
    ttlSeconds?: number,
  ): ConfirmationProposalResult {
    const tokenId = `gd_conf_${crypto.randomBytes(18).toString('hex')}`;
    const now = Date.now();
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
    const expiresAt = now + ttl;
    const paramsHash = this.computeParamsHash(params);

    const record: StoredConfirmation = {
      tokenId,
      toolName,
      userId,
      paramsHash,
      summary,
      actionPayload,
      createdAt: now,
      expiresAt,
      spent: false,
    };

    this.tokens.set(tokenId, record);

    return {
      status: 'CONFIRMATION_REQUIRED',
      confirmation_token: tokenId,
      action_summary: summary,
      expires_at_utc: new Date(expiresAt).toISOString(),
      payload: actionPayload,
      instructions:
        'Explicit user confirmation required. Review terms and re-call tool providing confirmation_token to execute.',
    };
  }

  /**
   * Validates and atomically consumes a confirmation token.
   * Throws explicit error if expired, already spent, or parameters tampered.
   */
  public consumeToken(
    tokenId: string,
    toolName: string,
    userId: string,
    currentParams: Record<string, unknown>,
  ): StoredConfirmation {
    const record = this.tokens.get(tokenId);

    if (!record) {
      throw new ConfirmationTokenError(`Invalid confirmation token: ${tokenId}`);
    }

    if (record.spent) {
      throw new ConfirmationTokenReplayError(
        `Confirmation token '${tokenId}' was already executed at ${new Date(record.spentAt || 0).toISOString()}.`,
      );
    }

    if (Date.now() > record.expiresAt) {
      throw new ConfirmationTokenExpiredError(
        `Confirmation token '${tokenId}' expired at ${new Date(record.expiresAt).toISOString()}.`,
      );
    }

    if (record.toolName !== toolName) {
      throw new ConfirmationTokenTamperedError(
        `Confirmation token was issued for tool '${record.toolName}', but used for '${toolName}'.`,
      );
    }

    if (record.userId !== userId) {
      throw new ConfirmationTokenError(
        `Confirmation token was issued for user '${record.userId}', but caller is '${userId}'.`,
      );
    }

    // Verify parameter integrity
    const currentHash = this.computeParamsHash(currentParams);
    if (currentHash !== record.paramsHash) {
      throw new ConfirmationTokenTamperedError(
        'Action arguments have been altered after proposal was signed. Transaction aborted.',
      );
    }

    // Mark spent atomically
    record.spent = true;
    record.spentAt = Date.now();

    return record;
  }

  public clear(): void {
    this.tokens.clear();
  }
}

export const confirmationManager = new ConfirmationTokenManager();
