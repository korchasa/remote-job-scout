/**
 * Unit tests for JobCollectionService
 */

import { expect, test } from 'vitest';
import { JobCollectionService } from './jobCollectionService.ts';
import type { SearchRequest } from '../types/database.ts';

test('JobCollectionService - initialization', () => {
  const service = new JobCollectionService();
  expect(service).toBeDefined();
});

test('JobCollectionService - set OpenAI WebSearch', () => {
  const service = new JobCollectionService();
  service.setOpenAIWebSearch('test-api-key', true);

  // Test that the method doesn't throw
  expect(service).toBeDefined();
});

test('JobCollectionService - progress tracking', () => {
  const service = new JobCollectionService();

  // Test getting progress for non-existent session
  const progress = service.getProgress('non-existent');
  expect(progress).toBe(null);
});

test('JobCollectionService - stop collection', () => {
  const service = new JobCollectionService();

  // Test stopping non-existent collection
  const result = service.stopCollection('non-existent');
  expect(result).toBe(false);
});

test('JobCollectionService - mock collection request', async () => {
  // Mock fetch to avoid real API calls
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            jobSearch: {
              pageInfo: { nextCursor: null },
              results: [],
            },
          },
        }),
        { status: 200 },
      ),
    );

  try {
    const service = new JobCollectionService();

    const mockRequest: SearchRequest = {
      session_id: 'test-session',
      settings: {
        searchPositions: ['Software Developer'],
        filters: {
          blacklistedCompanies: [],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: [],
          languages: [],
        },
        sources: {
          jobSites: ['indeed'], // Only test with Indeed for simplicity
        },
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
        },
      },
    };

    const result = await service.collectJobs(mockRequest);
    expect(result).toBeDefined();
    expect(result.sessionId).toBe('test-session');
    expect(result.totalCollected).toBe(0); // No jobs in mock response
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  }
});

test('JobCollectionService - get progress after collection', () => {
  const service = new JobCollectionService();

  // Should return null for non-existent session
  const progress = service.getProgress('test-session');
  expect(progress).toBe(null);
});
