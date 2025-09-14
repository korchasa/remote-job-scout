/**
 * Unit tests for JobCollectionService
 */

import { expect, test } from 'vitest';
import { JobCollectionService } from './jobCollectionService.ts';
import type { SearchRequest } from '../types/database.ts';
import type { Scraper, JobResponse } from '../types/scrapers.ts';

// Mock scraper for testing
class MockScraper implements Scraper {
  private name: string;
  private mockJobs: any[] = [];

  constructor(name: string, mockJobs: any[] = []) {
    this.name = name;
    this.mockJobs = mockJobs;
  }

  getName(): string {
    return this.name;
  }

  async scrape(_input?: any): Promise<JobResponse> {
    return {
      jobs: this.mockJobs,
    };
  }
}

test('JobCollectionService - initialization', () => {
  const service = new JobCollectionService();
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
          indeed: { enabled: true },
        },
        llm: {
          apiKey: '',
        },
      },
    };

    const mockScrapers = [new MockScraper('indeed')];
    const result = await service.collectJobs(mockScrapers, mockRequest);
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

// Tests for parallel processing and retry functionality
test('JobCollectionService - parallel source processing', async () => {
  const service = new JobCollectionService();

  // Mock request with multiple sources
  const mockRequest: SearchRequest = {
    session_id: 'parallel-test-session',
    settings: {
      searchPositions: ['Software Engineer'],
      filters: {
        blacklistedCompanies: [],
        blacklistedWordsTitle: [],
        blacklistedWordsDescription: [],
        countries: [],
        languages: [],
      },
      sources: {
        indeed: { enabled: true },
        linkedin: { enabled: true },
      },
      llm: {
        apiKey: '',
      },
    },
  };

  // Mock fetch for parallel processing test
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;

  globalThis.fetch = () => {
    fetchCallCount++;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            jobSearch: {
              pageInfo: { nextCursor: null },
              results: [
                {
                  trackingKey: `test-job-${fetchCallCount}`,
                  job: {
                    key: `test-job-${fetchCallCount}`,
                    title: `Test Job ${fetchCallCount}`,
                    datePublished: new Date().toISOString(),
                    description: { html: '<p>Test description</p>' },
                    location: {
                      countryName: 'US',
                      countryCode: 'US',
                      city: 'Remote',
                    },
                    employer: {
                      name: 'Test Company',
                    },
                    recruit: {
                      viewJobUrl: `https://example.com/job/${fetchCallCount}`,
                    },
                  },
                },
              ],
            },
          },
        }),
        { status: 200 },
      ),
    );
  };

  try {
    const mockScrapers = [
      new MockScraper('indeed', [
        {
          id: 'test-job-1',
          title: 'Test Job 1',
          company_name: 'Test Company',
          job_url: 'https://example.com/job1',
          location: { country: 'US', city: 'Remote' },
          description: 'Test job description',
          is_remote: true,
          date_posted: new Date(),
        },
      ]),
      new MockScraper('linkedin', [
        {
          id: 'test-job-2',
          title: 'Test Job 2',
          company_name: 'Test Company 2',
          job_url: 'https://example.com/job2',
          location: { country: 'US', city: 'Remote' },
          description: 'Test job description 2',
          is_remote: true,
          date_posted: new Date(),
        },
      ]),
    ];
    const result = await service.collectJobs(mockScrapers, mockRequest);

    expect(result).toBeDefined();
    expect(result.sessionId).toBe('parallel-test-session');
    expect(result.totalCollected).toBe(2); // Should collect jobs from both mock scrapers

    // Progress should be complete
    const progress = service.getProgress('parallel-test-session');
    expect(progress?.isComplete).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('JobCollectionService - retry with exponential backoff', async () => {
  const service = new JobCollectionService();

  // Test retry mechanism by using OpenAI WebSearch which can be mocked
  let openaiAttemptCount = 0;
  const originalFetch = globalThis.fetch;

  // Create isolated mock function that wraps the original fetch
  const mockFetch = (url: RequestInfo | URL, options?: RequestInit) => {
    const urlString = url.toString();

    if (urlString.includes('api.openai.com/v1/models')) {
      // Mock successful response for availability check
      return Promise.resolve(new Response('{}', { status: 200 }));
    }

    if (urlString.includes('api.openai.com/v1/chat/completions')) {
      // Count each API call to /v1/chat/completions as an attempt
      openaiAttemptCount++;

      if (openaiAttemptCount <= 2) {
        // Fail first 2 attempts (calls 1 and 2)
        return Promise.reject(new Error('OpenAI API error'));
      }
      // Succeed on 3rd attempt and later
      return Promise.resolve(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify([
                    {
                      title: 'Test Job',
                      company: 'Test Company',
                      location: 'Remote',
                      description: 'Test description',
                      url: 'https://example.com/job',
                    },
                  ]),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );
    }

    // For all other requests, use original fetch
    return originalFetch(url, options);
  };

  globalThis.fetch = mockFetch;

  try {
    const mockRequest: SearchRequest = {
      session_id: 'retry-test-session',
      settings: {
        searchPositions: ['Test Position'],
        filters: {
          blacklistedCompanies: [],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: [],
          languages: [],
        },
        sources: {
          indeed: { enabled: true },
          openai: { enabled: true },
        },
        llm: {
          apiKey: 'test-api-key',
        },
      },
    };

    // Create a mock OpenAI scraper that simulates retry behavior
    let openaiCallCount = 0;
    class MockOpenAIScraper extends MockScraper {
      constructor() {
        super('openai', []);
      }

      async scrape(_input?: any): Promise<JobResponse> {
        openaiCallCount++;
        if (openaiCallCount <= 2) {
          throw new Error('OpenAI API error - simulated failure');
        }
        return {
          jobs: [
            {
              id: 'openai-job-1',
              title: 'Test OpenAI Job',
              company_name: 'Test Company',
              job_url: 'https://example.com/openai-job',
              location: { country: 'US', city: 'Remote' },
              description: 'Test OpenAI job description',
              is_remote: true,
              date_posted: new Date(),
            },
          ],
        };
      }
    }

    const mockScrapers = [new MockScraper('indeed'), new MockOpenAIScraper()];
    const result = await service.collectJobs(mockScrapers, mockRequest);

    expect(result).toBeDefined();
    expect(openaiCallCount).toBe(3); // Should have 3 attempts (2 failures + 1 success)
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('JobCollectionService - YAML serialization', async () => {
  const service = new JobCollectionService();

  const mockRequest: SearchRequest = {
    session_id: 'yaml-test-session',
    settings: {
      searchPositions: ['Test Engineer'],
      filters: {
        blacklistedCompanies: [],
        blacklistedWordsTitle: [],
        blacklistedWordsDescription: [],
        countries: [],
        languages: [],
      },
      sources: {
        indeed: { enabled: true },
      },
      llm: {
        apiKey: '',
      },
    },
  };

  // Mock successful API response
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            jobSearch: {
              pageInfo: { nextCursor: null },
              results: [
                {
                  trackingKey: 'yaml-test-job',
                  job: {
                    key: 'yaml-test-job',
                    title: 'YAML Test Job',
                    datePublished: new Date().toISOString(),
                    description: { html: '<p>YAML test job description</p>' },
                    location: {
                      countryName: 'US',
                      countryCode: 'US',
                      city: 'Remote',
                    },
                    employer: {
                      name: 'YAML Test Company',
                    },
                    recruit: {
                      viewJobUrl: 'https://example.com/yaml-job',
                    },
                  },
                },
              ],
            },
          },
        }),
        { status: 200 },
      ),
    );

  try {
    const mockScrapers = [
      new MockScraper('indeed', [
        {
          id: 'yaml-test-job',
          title: 'YAML Test Job',
          company_name: 'YAML Test Company',
          job_url: 'https://example.com/yaml-job',
          location: { country: 'US', city: 'Remote' },
          description: 'YAML test job description',
          is_remote: true,
          date_posted: new Date(),
        },
      ]),
    ];
    const result = await service.collectJobs(mockScrapers, mockRequest);

    expect(result).toBeDefined();
    expect(result.vacancies).toBeDefined();
    expect(result.vacancies.length).toBeGreaterThan(0);

    // Check that vacancy has expected structure for YAML serialization
    const vacancy = result.vacancies[0];
    expect(vacancy).toHaveProperty('id');
    expect(vacancy).toHaveProperty('title');
    expect(vacancy).toHaveProperty('source');
    expect(vacancy).toHaveProperty('session_id', 'yaml-test-session');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
