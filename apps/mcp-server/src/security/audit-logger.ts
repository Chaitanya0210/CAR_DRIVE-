import crypto from 'node:crypto';
import { UserRole } from '../auth/tokens.js';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  role: UserRole;
  toolName: string;
  status: 'SUCCESS' | 'CONFIRMATION_REQUIRED' | 'REJECTED' | 'FAILED';
  latencyMs: number;
  confirmationTokenHash?: string;
  idempotencyKey?: string;
  sanitizedArgs: Record<string, unknown>;
  errorMessage?: string;
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `audit_${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.logs.push(fullEntry);
    return fullEntry;
  }

  public getLogs(filter?: {
    userId?: string;
    toolName?: string;
    role?: UserRole;
    status?: string;
  }): AuditLogEntry[] {
    return this.logs.filter((entry) => {
      if (filter?.userId && entry.userId !== filter.userId) return false;
      if (filter?.toolName && entry.toolName !== filter.toolName) return false;
      if (filter?.role && entry.role !== filter.role) return false;
      if (filter?.status && entry.status !== filter.status) return false;
      return true;
    });
  }

  public clear(): void {
    this.logs = [];
  }
}

export const auditLogger = new AuditLogger();
