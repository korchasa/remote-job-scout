/**
 * Tests for LoggingService (FR-13: Operational Logging and Auditing)
 *
 * Tests structured logging capabilities including:
 * - Sensitive data masking
 * - User action logging
 * - Stage transition logging
 * - Scraper operation logging
 * - Log format validation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import winston from 'winston';
import { LoggingService, maskSensitiveData, LogLevel, LogEntrySchema } from './loggingService';

// Mock winston to capture log output
vi.mock('winston', () => {
  const mockLogger = {
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  return {
    default: {
      createLogger: vi.fn(() => mockLogger),
      format: {
        combine: vi.fn(),
        timestamp: vi.fn(),
        errors: vi.fn(),
        json: vi.fn(),
        colorize: vi.fn(),
        simple: vi.fn(),
        printf: vi.fn(),
      },
      transports: {
        Console: vi.fn(),
        File: vi.fn(),
      },
    },
    createLogger: vi.fn(() => mockLogger),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      errors: vi.fn(),
      json: vi.fn(),
      colorize: vi.fn(),
      simple: vi.fn(),
      printf: vi.fn(),
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn(),
    },
  };
});

describe('LoggingService - FR-13 Operational Logging', () => {
  let mockLogger: any;
  let service: LoggingService;

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Get the mock logger instance
    mockLogger = (winston as any).createLogger();

    // Create a new service instance for each test
    service = new LoggingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sensitive Data Masking', () => {
    it('should mask API keys in strings', () => {
      const input = 'Using api_key: sk-1234567890abcdef';
      const result = maskSensitiveData(input);
      expect(result).toBe('Using api_key: ***MASKED***');
      expect(result).not.toContain('sk-1234567890abcdef');
    });

    it('should mask various sensitive patterns', () => {
      const testCases = [
        { input: 'token: abc123', expected: 'token: ***MASKED***' },
        { input: 'password: mypass', expected: 'password: ***MASKED***' },
        { input: 'secret: confidential', expected: 'secret: ***MASKED***' },
        { input: 'Bearer: abc123', expected: 'bearer: ***MASKED***' },
        { input: 'authorization: token123', expected: 'authorization: ***MASKED***' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(maskSensitiveData(input)).toBe(expected);
      });
    });

    it('should mask sensitive data in objects', () => {
      const input = {
        user: 'john',
        api_key: 'sk-1234567890abcdef',
        token: 'abc123',
        normal_field: 'normal_value',
      };

      const result = maskSensitiveData(input) as any;

      expect(result.user).toBe('john');
      expect(result.api_key).toBe('***MASKED***');
      expect(result.token).toBe('***MASKED***');
      expect(result.normal_field).toBe('normal_value');
    });

    it('should mask sensitive data in nested objects', () => {
      const input = {
        config: {
          apiKey: 'sk-1234567890abcdef',
          settings: {
            token: 'abc123',
          },
        },
        normal: 'value',
      };

      const result = maskSensitiveData(input) as any;

      expect(result.config.apiKey).toBe('***MASKED***');
      expect(result.config.settings.token).toBe('***MASKED***');
      expect(result.normal).toBe('value');
    });

    it('should handle arrays with sensitive data', () => {
      const input = ['normal', 'api_key: secret123', 'token: abc'];
      const result = maskSensitiveData(input) as any;

      expect(result[0]).toBe('normal');
      expect(result[1]).toBe('api_key: ***MASKED***');
      expect(result[2]).toBe('token: ***MASKED***');
    });

    it('should not mask non-sensitive data', () => {
      const input = 'This is a normal message without sensitive data';
      expect(maskSensitiveData(input)).toBe(input);
    });
  });

  describe('User Action Logging', () => {
    it('should log search start with session ID', () => {
      const sessionId = 'session-123';
      const metadata = { positions: ['developer'], sources: ['indeed'] };

      service.logSearchStart(sessionId, metadata);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        'User initiated search process',
        expect.objectContaining({
          sessionId,
          stage: undefined,
          action: 'user.search.start',
          ...metadata,
        }),
      );
    });

    it('should log search pause with stage information', () => {
      const sessionId = 'session-123';
      const stage = 'collection';

      service.logSearchPause(sessionId, stage);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        `User paused search at ${stage} stage`,
        expect.objectContaining({
          sessionId,
          stage,
          action: 'user.search.pause',
        }),
      );
    });

    it('should log search resume with stage information', () => {
      const sessionId = 'session-123';
      const stage = 'filtering';

      service.logSearchResume(sessionId, stage);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        `User resumed search at ${stage} stage`,
        expect.objectContaining({
          sessionId,
          stage,
          action: 'user.search.resume',
        }),
      );
    });

    it('should log job actions with job ID', () => {
      const sessionId = 'session-123';
      const jobId = 'job-456';
      const action = 'hide';

      service.logJobAction(sessionId, action, jobId, { reason: 'not interested' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        `Job ${action} performed on job ${jobId}`,
        expect.objectContaining({
          sessionId,
          action: `user.job.${action}`,
          jobId,
          reason: 'not interested',
        }),
      );
    });
  });

  describe('Stage Transition Logging', () => {
    it('should log stage start transition', () => {
      const sessionId = 'session-123';
      const stage = 'collection';

      service.logStageStart(sessionId, stage, { jobCount: 10 });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        `Stage ${stage} transitioned from pending to running`,
        expect.objectContaining({
          sessionId,
          stage,
          action: 'stage.transition',
          jobCount: 10,
        }),
      );
    });

    it('should log stage completion', () => {
      const sessionId = 'session-123';
      const stage = 'filtering';

      service.logStageComplete(sessionId, stage, { filteredCount: 8, totalCount: 10 });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        `Stage ${stage} transitioned from running to completed`,
        expect.objectContaining({
          sessionId,
          stage,
          action: 'stage.transition',
          filteredCount: 8,
          totalCount: 10,
        }),
      );
    });

    it('should log stage errors with retry information', () => {
      const sessionId = 'session-123';
      const stage = 'enrichment';
      const error = new Error('API rate limit exceeded');
      const retryCount = 2;

      service.logStageError(sessionId, stage, error, retryCount, { rateLimit: true });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.ERROR,
        `Stage ${stage} encountered error`,
        expect.objectContaining({
          sessionId,
          stage,
          action: 'stage.error',
          error: error.message,
          retryCount,
          rateLimit: true,
        }),
      );
    });

    it('should log stage retry attempts', () => {
      const sessionId = 'session-123';
      const stage = 'collection';
      const retryCount = 1;
      const error = 'Network timeout';

      service.logStageRetry(sessionId, stage, retryCount, error, { delay: 1000 });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.WARN,
        `Stage ${stage} retry attempt ${retryCount}`,
        expect.objectContaining({
          sessionId,
          stage,
          action: 'stage.retry',
          retryCount,
          error,
          delay: 1000,
        }),
      );
    });
  });

  describe('Scraper Operation Logging', () => {
    it('should log scraper requests with masked URLs', () => {
      const sessionId = 'session-123';
      const scraper = 'indeed';
      const url = 'https://api.indeed.com/search?api_key=sk-1234567890abcdef';

      service.logScraperRequest(sessionId, scraper, url, { method: 'GET' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.DEBUG,
        `Scraper ${scraper} requesting https://api.indeed.com/search?api_key: ***MASKED***`,
        expect.objectContaining({
          sessionId,
          stage: 'collection',
          action: 'scraper.request',
          method: 'GET',
        }),
      );
    });

    it('should log scraper success with job counts', () => {
      const sessionId = 'session-123';
      const scraper = 'linkedin';
      const jobsCollected = 25;

      service.logScraperSuccess(sessionId, scraper, jobsCollected, { duration: 1500 });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        `Scraper ${scraper} collected ${jobsCollected} jobs`,
        expect.objectContaining({
          sessionId,
          stage: 'collection',
          action: 'scraper.success',
          duration: 1500,
        }),
      );
    });

    it('should log scraper failures with retry information', () => {
      const sessionId = 'session-123';
      const scraper = 'glassdoor';
      const error = new Error('403 Forbidden');
      const retryCount = 1;

      service.logScraperFailure(sessionId, scraper, error, retryCount, { statusCode: 403 });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.ERROR,
        `Scraper ${scraper} failed`,
        expect.objectContaining({
          sessionId,
          stage: 'collection',
          action: 'scraper.failure',
          error: error.message,
          retryCount,
          statusCode: 403,
        }),
      );
    });
  });

  describe('Enrichment Logging', () => {
    it('should log enrichment start with job count', () => {
      const sessionId = 'session-123';
      const jobCount = 15;

      service.logEnrichmentStart(sessionId, jobCount, { model: 'gpt-4' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        `Starting enrichment for ${jobCount} jobs`,
        expect.objectContaining({
          sessionId,
          stage: 'enrichment',
          action: 'enrichment.start',
          model: 'gpt-4',
        }),
      );
    });

    it('should log enrichment progress', () => {
      const sessionId = 'session-123';
      const processed = 8;
      const total = 15;

      service.logEnrichmentProgress(sessionId, processed, total);

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.DEBUG,
        `Enrichment progress: ${processed}/${total}`,
        expect.objectContaining({
          sessionId,
          stage: 'enrichment',
          action: 'enrichment.progress',
        }),
      );
    });

    it('should log enrichment completion with statistics', () => {
      const sessionId = 'session-123';
      const successCount = 12;
      const failureCount = 3;

      service.logEnrichmentComplete(sessionId, successCount, failureCount, { totalTokens: 1500 });

      // Find the enrichment.complete call
      const calls = mockLogger.log.mock.calls;
      const completeCall = calls.find(
        (call) =>
          call[1] === `Enrichment completed: ${successCount} success, ${failureCount} failures`,
      );

      expect(completeCall).toBeDefined();
      expect(completeCall![2]).toMatchObject({
        sessionId,
        stage: 'enrichment',
        action: 'enrichment.complete',
        successCount,
        failureCount,
        totalTokens: 1500,
      });
    });

    it('should log token usage with cost', () => {
      const sessionId = 'session-123';
      const tokens = 500;
      const cost = 0.0125;

      service.logEnrichmentTokenUsage(sessionId, tokens, cost, { model: 'gpt-4' });

      // Find the token usage call
      const calls = mockLogger.log.mock.calls;
      const tokenCall = calls.find(
        (call) => call[1] === `Token usage: ${tokens} tokens, $${cost.toFixed(4)}`,
      );

      expect(tokenCall).toBeDefined();
      expect(tokenCall![2]).toMatchObject({
        sessionId,
        stage: 'enrichment',
        action: 'enrichment.tokens',
        tokens,
        cost,
        model: 'gpt-4',
      });
    });
  });

  describe('General Logging Methods', () => {
    it('should log info messages', () => {
      const message = 'General information message';

      service.logInfo(message, { sessionId: 'session-123', stage: 'collection' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.INFO,
        message,
        expect.objectContaining({
          sessionId: 'session-123',
          stage: 'collection',
          action: 'general.info',
        }),
      );
    });

    it('should log error messages with error details', () => {
      const message = 'An error occurred';
      const error = new Error('Test error');

      service.logError(message, error, { sessionId: 'session-123' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.ERROR,
        message,
        expect.objectContaining({
          sessionId: 'session-123',
          action: 'general.error',
          error: error.message,
        }),
      );
    });

    it('should log warning messages', () => {
      const message = 'Warning message';

      service.logWarn(message, { sessionId: 'session-123' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.WARN,
        message,
        expect.objectContaining({
          sessionId: 'session-123',
          action: 'general.warn',
        }),
      );
    });

    it('should log debug messages', () => {
      const message = 'Debug information';

      service.logDebug(message, { sessionId: 'session-123' });

      expect(mockLogger.log).toHaveBeenCalledWith(
        LogLevel.DEBUG,
        message,
        expect.objectContaining({
          sessionId: 'session-123',
          action: 'general.debug',
        }),
      );
    });
  });

  describe('Log Entry Schema Validation', () => {
    it('should create valid log entries for all methods', () => {
      // Test that all logging methods create entries that pass schema validation
      const sessionId = 'test-session-123';

      // These should not throw any validation errors
      expect(() => service.logSearchStart(sessionId)).not.toThrow();
      expect(() => service.logStageStart(sessionId, 'collection')).not.toThrow();
      expect(() =>
        service.logScraperRequest(sessionId, 'indeed', 'https://api.example.com'),
      ).not.toThrow();
      expect(() => service.logEnrichmentStart(sessionId, 10)).not.toThrow();
      expect(() => service.logInfo('Test message')).not.toThrow();
    });

    it('should validate LogEntry schema structure', () => {
      const validEntry = {
        timestamp: new Date().toISOString(),
        level: LogLevel.INFO,
        sessionId: 'session-123',
        stage: 'collection',
        action: 'test.action',
        message: 'Test message',
        metadata: { test: 'data' },
        retryCount: 1,
        error: 'Test error',
      };

      expect(() => LogEntrySchema.parse(validEntry)).not.toThrow();

      // Invalid entry should throw
      const invalidEntry = {
        ...validEntry,
        level: 'invalid_level', // Invalid enum value
      };

      expect(() => LogEntrySchema.parse(invalidEntry)).toThrow();
    });
  });
});
