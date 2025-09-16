/**
 * Structured logging service for operational logging and auditing (FR-13)
 *
 * This service provides structured logging capabilities for:
 * - User actions (search start, pause/resume, job actions)
 * - Stage transitions with retry counts and error descriptions
 * - Scraper operations (requests, retries, failures)
 * - Confidential data masking (API keys, sensitive information)
 *
 * Logs include timestamps, session IDs, stage names, and are available
 * in development via console and can be directed to files in Docker.
 */

import { z } from 'zod';
import type { Logger } from 'winston';
import winston from 'winston';

// Log level enum for structured logging
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Log entry schema for structured logging
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.nativeEnum(LogLevel),
  sessionId: z.string().optional(),
  stage: z.string().optional(),
  action: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()).optional(),
  retryCount: z.number().optional(),
  error: z.string().optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

// Sensitive field names to mask (exact matches)
const SENSITIVE_FIELD_NAMES = [
  'api_key',
  'apikey',
  'api-key',
  'auth_key',
  'authkey',
  'auth-key',
  'token',
  'access_token',
  'refresh_token',
  'bearer_token',
  'secret_key',
  'secretkey',
  'secret-key',
  'password',
  'auth',
  'bearer',
  'authorization',
];

/**
 * Masks sensitive data in log messages and metadata
 * Prevents API keys, tokens, and other secrets from being logged
 */
export function maskSensitiveData(data: unknown): unknown {
  if (typeof data === 'string') {
    let masked = data;

    // Simple approach: replace sensitive patterns in strings
    masked = masked.replace(/api[_-]?key\s*[:=]\s*([^\s,]+)/gi, 'api_key: ***MASKED***');
    masked = masked.replace(/auth[_-]?key\s*[:=]\s*([^\s,]+)/gi, 'auth_key: ***MASKED***');
    masked = masked.replace(/token\s*[:=]\s*([^\s,]+)/gi, 'token: ***MASKED***');
    masked = masked.replace(/secret[_-]?key\s*[:=]\s*([^\s,]+)/gi, 'secret_key: ***MASKED***');
    masked = masked.replace(/secret\s*[:=]\s*([^\s,]+)/gi, 'secret: ***MASKED***');
    masked = masked.replace(/password\s*[:=]\s*([^\s,]+)/gi, 'password: ***MASKED***');
    masked = masked.replace(/auth\s*[:=]\s*([^\s,]+)/gi, 'auth: ***MASKED***');
    masked = masked.replace(/bearer\s*[:=]\s*([^\s,]+)/gi, 'bearer: ***MASKED***');
    masked = masked.replace(/authorization\s*[:=]\s*([^\s,]+)/gi, 'authorization: ***MASKED***');

    return masked;
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  if (data && typeof data === 'object') {
    const maskedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      // Don't mask numeric fields
      if (typeof value === 'number') {
        maskedObj[key] = value;
      } else {
        // Mask keys that are known sensitive field names
        const isSensitiveKey = SENSITIVE_FIELD_NAMES.includes(key.toLowerCase());
        maskedObj[key] = isSensitiveKey ? '***MASKED***' : maskSensitiveData(value);
      }
    }
    return maskedObj;
  }

  return data;
}

/**
 * Structured logging service for operational auditing
 * Implements FR-13 requirements for comprehensive logging
 */
export class LoggingService {
  private logger: Logger;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';

    // Configure Winston logger
    this.logger = winston.createLogger({
      level: this.isDevelopment ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        // Console transport for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const sessionInfo = meta.sessionId ? `[${meta.sessionId}]` : '';
              const stageInfo = meta.stage ? `[${meta.stage}]` : '';
              const retryInfo = meta.retryCount !== undefined ? `[retry:${meta.retryCount}]` : '';
              const errorInfo = meta.error ? `[${meta.error}]` : '';

              return `${timestamp} ${level} ${sessionInfo}${stageInfo}${retryInfo} ${message}${errorInfo}`;
            }),
          ),
        }),

        // File transport for production/Docker
        ...(this.isDevelopment
          ? []
          : [
              new winston.transports.File({
                filename: 'logs/operations.log',
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
              }),
              new winston.transports.File({
                filename: 'logs/errors.log',
                level: 'error',
                format: winston.format.combine(
                  winston.format.timestamp(),
                  winston.format.errors({ stack: true }),
                  winston.format.json(),
                ),
              }),
            ]),
      ],
    });
  }

  /**
   * Creates a structured log entry with sensitive data masking
   */
  private createLogEntry(
    level: LogLevel,
    action: string,
    message: string,
    options: {
      sessionId?: string;
      stage?: string;
      metadata?: Record<string, unknown>;
      retryCount?: number;
      error?: string | Error;
    } = {},
  ): void {
    const { sessionId, stage, metadata, retryCount, error } = options;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      sessionId,
      stage,
      action,
      message,
      metadata: metadata ? (maskSensitiveData(metadata) as Record<string, unknown>) : undefined,
      retryCount,
      error: error ? (typeof error === 'string' ? error : (error as Error).message) : undefined,
    };

    // Validate log entry structure
    LogEntrySchema.parse(logEntry);

    this.logger.log(level, message, {
      sessionId,
      stage,
      action,
      retryCount,
      error: logEntry.error,
      ...logEntry.metadata,
    });
  }

  // User action logging methods
  logUserAction(
    action: string,
    message: string,
    options: { sessionId?: string; stage?: string; metadata?: Record<string, unknown> } = {},
  ): void {
    this.createLogEntry(LogLevel.INFO, `user.${action}`, message, options);
  }

  logSearchStart(sessionId: string, metadata?: Record<string, unknown>): void {
    this.logUserAction('search.start', 'User initiated search process', {
      sessionId,
      metadata,
    });
  }

  logSearchPause(sessionId: string, stage: string): void {
    this.logUserAction('search.pause', `User paused search at ${stage} stage`, {
      sessionId,
      stage,
    });
  }

  logSearchResume(sessionId: string, stage: string): void {
    this.logUserAction('search.resume', `User resumed search at ${stage} stage`, {
      sessionId,
      stage,
    });
  }

  logJobAction(
    sessionId: string,
    action: string,
    jobId: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.logUserAction(`job.${action}`, `Job ${action} performed on job ${jobId}`, {
      sessionId,
      metadata: { jobId, ...metadata },
    });
  }

  // Stage transition logging methods
  logStageTransition(
    sessionId: string,
    stage: string,
    fromState: string,
    toState: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.INFO,
      'stage.transition',
      `Stage ${stage} transitioned from ${fromState} to ${toState}`,
      {
        sessionId,
        stage,
        metadata,
      },
    );
  }

  logStageStart(sessionId: string, stage: string, metadata?: Record<string, unknown>): void {
    this.logStageTransition(sessionId, stage, 'pending', 'running', metadata);
  }

  logStageComplete(sessionId: string, stage: string, metadata?: Record<string, unknown>): void {
    this.logStageTransition(sessionId, stage, 'running', 'completed', metadata);
  }

  logStageError(
    sessionId: string,
    stage: string,
    error: string | Error,
    retryCount?: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(LogLevel.ERROR, 'stage.error', `Stage ${stage} encountered error`, {
      sessionId,
      stage,
      error,
      retryCount,
      metadata,
    });
  }

  logStageRetry(
    sessionId: string,
    stage: string,
    retryCount: number,
    error: string | Error,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.WARN,
      'stage.retry',
      `Stage ${stage} retry attempt ${retryCount}`,
      {
        sessionId,
        stage,
        retryCount,
        error,
        metadata,
      },
    );
  }

  // Scraper operation logging methods
  logScraperRequest(
    sessionId: string,
    scraper: string,
    url: string,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.DEBUG,
      'scraper.request',
      `Scraper ${scraper} requesting ${maskSensitiveData(url)}`,
      {
        sessionId,
        stage: 'collection',
        metadata,
      },
    );
  }

  logScraperSuccess(
    sessionId: string,
    scraper: string,
    jobsCollected: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.INFO,
      'scraper.success',
      `Scraper ${scraper} collected ${jobsCollected} jobs`,
      {
        sessionId,
        stage: 'collection',
        metadata,
      },
    );
  }

  logScraperFailure(
    sessionId: string,
    scraper: string,
    error: string | Error,
    retryCount?: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(LogLevel.ERROR, 'scraper.failure', `Scraper ${scraper} failed`, {
      sessionId,
      stage: 'collection',
      error,
      retryCount,
      metadata,
    });
  }

  // Enrichment logging methods
  logEnrichmentStart(
    sessionId: string,
    jobCount: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.INFO,
      'enrichment.start',
      `Starting enrichment for ${jobCount} jobs`,
      {
        sessionId,
        stage: 'enrichment',
        metadata,
      },
    );
  }

  logEnrichmentProgress(
    sessionId: string,
    processed: number,
    total: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.DEBUG,
      'enrichment.progress',
      `Enrichment progress: ${processed}/${total}`,
      {
        sessionId,
        stage: 'enrichment',
        metadata,
      },
    );
  }

  logEnrichmentComplete(
    sessionId: string,
    successCount: number,
    failureCount: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.INFO,
      'enrichment.complete',
      `Enrichment completed: ${successCount} success, ${failureCount} failures`,
      {
        sessionId,
        stage: 'enrichment',
        metadata: { successCount, failureCount, ...metadata },
      },
    );
  }

  logEnrichmentTokenUsage(
    sessionId: string,
    tokens: number,
    cost: number,
    metadata?: Record<string, unknown>,
  ): void {
    this.createLogEntry(
      LogLevel.INFO,
      'enrichment.tokens',
      `Token usage: ${tokens} tokens, $${cost.toFixed(4)}`,
      {
        sessionId,
        stage: 'enrichment',
        metadata: { tokens, cost, ...metadata },
      },
    );
  }

  // General logging methods
  logInfo(
    message: string,
    options?: { sessionId?: string; stage?: string; metadata?: Record<string, unknown> },
  ): void {
    this.createLogEntry(LogLevel.INFO, 'general.info', message, options);
  }

  logError(
    message: string,
    error?: string | Error,
    options?: { sessionId?: string; stage?: string; metadata?: Record<string, unknown> },
  ): void {
    this.createLogEntry(LogLevel.ERROR, 'general.error', message, {
      ...options,
      error,
    });
  }

  logWarn(
    message: string,
    options?: { sessionId?: string; stage?: string; metadata?: Record<string, unknown> },
  ): void {
    this.createLogEntry(LogLevel.WARN, 'general.warn', message, options);
  }

  logDebug(
    message: string,
    options?: { sessionId?: string; stage?: string; metadata?: Record<string, unknown> },
  ): void {
    this.createLogEntry(LogLevel.DEBUG, 'general.debug', message, options);
  }
}

// Singleton instance
export const loggingService = new LoggingService();
