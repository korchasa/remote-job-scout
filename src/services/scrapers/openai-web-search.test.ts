/**
 * Тесты для OpenAI WebSearch скрейпера с Responses API
 *
 * Тестирует новую реализацию на базе OpenAI Responses API
 */

import { expect, test, describe, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIWebSearchScraper } from './openai-web-search.js';
import type { ScraperInput, JobResponse } from '../../types/scrapers.js';

// Моки для fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Response constructor
global.Response = vi.fn() as any;

describe('OpenAIWebSearchScraper - Responses API', () => {
  let scraper: OpenAIWebSearchScraper;
  const apiKey = 'test-api-key';

  beforeEach(() => {
    scraper = new OpenAIWebSearchScraper(apiKey);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    test('should create scraper with correct parameters', () => {
      const customScraper = new OpenAIWebSearchScraper('custom-key', 'gpt-4o', false, 100);

      expect(customScraper).toBeDefined();
    });

    test('should throw error when scraping without API key', async () => {
      const scraperWithoutKey = new OpenAIWebSearchScraper('');

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'test',
      };

      await expect(scraperWithoutKey.scrape(input)).rejects.toThrow('OpenAI API key is required');
    });
  });

  describe('performWebSearch - Responses API structure', () => {
    test('should make correct API request to Responses endpoint', async () => {
      const mockResponse = {
        id: 'resp_test',
        object: 'response',
        created: Date.now(),
        model: 'gpt-4o-mini',
        output: [
          {
            type: 'text',
            content: [
              {
                type: 'web_search_result',
                title: 'Test Job Title',
                url: 'https://example.com/job',
                description: 'Test job description',
                published_date: '2024-01-01',
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'software engineer',
        location: 'Remote',
        is_remote: true,
        results_wanted: 5,
      };

      const result = await (scraper as any).performWebSearch(input, apiKey, 'gpt-4o-mini', true, 5);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"model":"gpt-4o-mini"'),
        }),
      );

      expect(result).toEqual({
        results: [
          {
            title: 'Test Job Title',
            url: 'https://example.com/job',
            snippet: 'Test job description',
            published_date: '2024-01-01',
          },
        ],
        total_found: 1,
        search_query:
          'software engineer Remote remote jobs site:indeed.com OR site:linkedin.com OR site:glassdoor.com OR site:monster.com',
      });
    });

    test('should handle structured web search results correctly', async () => {
      const mockResponse = {
        id: 'resp_test',
        object: 'response',
        created: Date.now(),
        model: 'gpt-4o-mini',
        output: [
          {
            type: 'text',
            content: [
              {
                type: 'web_search_result',
                title: 'Senior Developer',
                url: 'https://example.com/job1',
                description: 'Great job opportunity',
                published_date: '2024-01-01',
              },
              {
                type: 'web_search_result',
                title: 'Junior Developer',
                url: 'https://example.com/job2',
                content: 'Entry level position',
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'developer',
      };

      const result = await (scraper as any).performWebSearch(
        input,
        apiKey,
        'gpt-4o-mini',
        true,
        10,
      );

      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toEqual({
        title: 'Senior Developer',
        url: 'https://example.com/job1',
        snippet: 'Great job opportunity',
        published_date: '2024-01-01',
      });
      expect(result.results[1]).toEqual({
        title: 'Junior Developer',
        url: 'https://example.com/job2',
        snippet: 'Entry level position',
        published_date: expect.any(String),
      });
    });

    test('should fallback to mock data when no structured results', async () => {
      const mockResponse = {
        id: 'resp_test',
        object: 'response',
        created: Date.now(),
        model: 'gpt-4o-mini',
        output: [
          {
            type: 'text',
            content: 'No web search results found',
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'developer',
      };

      const result = await (scraper as any).performWebSearch(input, apiKey, 'gpt-4o-mini', true, 5);

      expect(result.results).toHaveLength(2); // Mock data has 2 results
      expect(result.total_found).toBe(2);
    });

    test('should handle API rate limit error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'test',
      };

      await expect(
        (scraper as any).performWebSearch(input, apiKey, 'gpt-4o-mini', true, 5),
      ).rejects.toThrow('OpenAI API rate limit exceeded');
    });

    test('should handle invalid API key error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'test',
      };

      await expect(
        (scraper as any).performWebSearch(input, apiKey, 'gpt-4o-mini', true, 5),
      ).rejects.toThrow('Invalid OpenAI API key');
    });

    test('should handle network timeout', async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 100)),
      );

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'test',
      };

      await expect(
        (scraper as any).performWebSearch(input, apiKey, 'gpt-4o-mini', true, 5),
      ).rejects.toThrow();
    });
  });

  describe('scrape - full integration', () => {
    test('should return JobResponse with converted jobs', async () => {
      const mockResponse = {
        id: 'resp_test',
        object: 'response',
        created: Date.now(),
        model: 'gpt-4o-mini',
        output: [
          {
            type: 'text',
            content: [
              {
                type: 'web_search_result',
                title: 'Frontend Developer',
                url: 'https://example.com/job',
                description: 'React developer position',
                published_date: '2024-01-01',
              },
            ],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'frontend developer',
        location: 'Remote',
      };

      const result: JobResponse = await scraper.scrape(input);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0]).toMatchObject({
        title: 'Frontend Developer',
        company_name: 'Unknown Company',
        job_url: 'https://example.com/job',
        location: {
          city: 'Remote',
        },
        description: 'React developer position',
        date_posted: new Date('2024-01-01'),
        is_remote: false,
      });
      expect(typeof result.jobs[0].id).toBe('string');
      expect(result.jobs[0].id.length).toBeGreaterThan(0);
    });

    test('should handle empty results gracefully', async () => {
      // For this test, we'll mock the performWebSearch method directly
      // to return empty results instead of using mock data
      const originalPerformWebSearch = (scraper as any).performWebSearch;
      (scraper as any).performWebSearch = vi.fn().mockResolvedValue({
        results: [],
        total_found: 0,
        search_query:
          'nonexistent job jobs site:indeed.com OR site:linkedin.com OR site:glassdoor.com OR site:monster.com',
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'nonexistent job',
      };

      const result: JobResponse = await scraper.scrape(input);

      expect(result.jobs).toHaveLength(0);

      // Restore original method
      (scraper as any).performWebSearch = originalPerformWebSearch;
    });
  });

  describe('buildSearchQuery', () => {
    test('should build correct search query', () => {
      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'software engineer',
        location: 'San Francisco',
        is_remote: true,
      };

      const query = (scraper as any).buildSearchQuery(input);

      expect(query).toBe(
        'software engineer San Francisco remote jobs site:indeed.com OR site:linkedin.com OR site:glassdoor.com OR site:monster.com',
      );
    });

    test('should handle minimal input', () => {
      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'developer',
      };

      const query = (scraper as any).buildSearchQuery(input);

      expect(query).toBe(
        'developer jobs site:indeed.com OR site:linkedin.com OR site:glassdoor.com OR site:monster.com',
      );
    });
  });

  describe('Responses API request structure', () => {
    test('should include all required fields in request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            output: [{ content: [] }],
          }),
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'test job',
        location: 'New York',
        country: 'US' as any,
      };

      await (scraper as any).performWebSearch(input, apiKey, 'gpt-4o-mini', true, 3);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody).toEqual({
        model: 'gpt-4o-mini',
        instructions: expect.stringContaining('You are a job search assistant'),
        input: expect.stringContaining('Find 3 recent job postings'),
        tools: [
          {
            type: 'web_search',
            web_search: {
              search_context_size: 'medium',
              user_location: {
                type: 'approximate',
                country: 'US',
              },
            },
          },
        ],
        tool_choice: 'auto',
        max_output_tokens: 4000,
        temperature: 0.1,
        top_p: 0.9,
      });
    });

    test('should use default country when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            output: [{ content: [] }],
          }),
      });

      const input: ScraperInput = {
        site_type: ['openai'],
        search_term: 'test',
      };

      await (scraper as any).performWebSearch(input, apiKey, 'gpt-4o-mini', true, 5);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.tools[0].web_search.user_location.country).toBe('US');
    });
  });
});
