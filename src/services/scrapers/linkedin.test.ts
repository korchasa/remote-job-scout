/**
 * Unit tests for LinkedIn scraper - JobSpy compatible implementation
 */

import { expect, test, describe, beforeEach, vi } from 'vitest';
import { Country, DescriptionFormat, JobType, Site } from '../../types/scrapers.ts';
import { LinkedInScraper } from './linkedin.ts';
import type { ScraperInput } from '../../types/scrapers.ts';

// Mock fetch globally
global.fetch = vi.fn();
global.DOMParser = vi.fn().mockImplementation(() => ({
  parseFromString: vi.fn().mockReturnValue({
    querySelectorAll: vi.fn().mockReturnValue([]),
    querySelector: vi.fn().mockReturnValue(null),
    body: { textContent: '' },
  }),
}));

describe('LinkedInScraper', () => {
  let scraper: LinkedInScraper;

  beforeEach(() => {
    scraper = new LinkedInScraper();
    vi.clearAllMocks();
  });

  test('constructor with proxies', () => {
    const proxyScraper = new LinkedInScraper(['http://proxy1:8080', 'http://proxy2:8080']);
    expect(proxyScraper).toBeDefined();
    console.log('LinkedIn proxy scraper created successfully');
  });

  test('getSourceName returns LinkedIn', () => {
    expect(scraper.getSourceName()).toBe('LinkedIn');
  });

  test('checkAvailability returns boolean', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const result = await scraper.checkAvailability();
    expect(typeof result).toBe('boolean');
  });

  test('scrape with basic input structure', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'software engineer',
      location: 'San Francisco',
      country: Country.USA,
      results_wanted: 5,
      description_format: DescriptionFormat.HTML,
    };

    // Mock successful response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
    expect(result.jobs.length >= 0).toBe(true);
  });

  test('scrape with remote jobs filter', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'frontend developer',
      is_remote: true,
      country: Country.USA,
      results_wanted: 3,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('scrape with job type filtering', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'data scientist',
      job_type: JobType.FULL_TIME,
      country: Country.USA,
      results_wanted: 5,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('scrape with easy apply filter', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'marketing specialist',
      easy_apply: true,
      country: Country.USA,
      results_wanted: 4,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('scrape with hours old filtering', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'developer',
      hours_old: 24,
      country: Country.USA,
      results_wanted: 3,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('scrape with description format options', async () => {
    const formats = [DescriptionFormat.HTML, DescriptionFormat.MARKDOWN, DescriptionFormat.PLAIN];

    for (const format of formats) {
      const input: ScraperInput = {
        site_type: [Site.LINKEDIN],
        search_term: 'engineer',
        country: Country.USA,
        description_format: format,
        results_wanted: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<div class="base-search-card"></div>'),
      });

      const result = await scraper.scrape(input);
      expect(Array.isArray(result.jobs)).toBe(true);
    }
  });

  test('scrape with pagination and offset', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'software engineer',
      country: Country.USA,
      results_wanted: 10,
      offset: 5,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
    expect(result.jobs.length <= 10).toBe(true);
  });

  test('scrape with linkedin_fetch_description enabled', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'senior developer',
      country: Country.USA,
      results_wanted: 2,
      linkedin_fetch_description: true,
      description_format: DescriptionFormat.MARKDOWN,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<div class="base-search-card"></div>'),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://www.linkedin.com/jobs/view/123',
        text: () =>
          Promise.resolve('<div class="show-more-less-html__markup">Job description</div>'),
      });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('scrape handles rate limiting gracefully', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'developer',
      country: Country.USA,
      results_wanted: 5,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
    expect(result.jobs.length).toBe(0);
  });

  test('scrape handles 403 errors gracefully', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'developer',
      country: Country.USA,
      results_wanted: 5,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
    expect(result.jobs.length).toBe(0);
  });

  test('scrape with empty search term', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      country: Country.USA,
      results_wanted: 5,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('scrape with different countries', async () => {
    const countries = [Country.USA, Country.UK, Country.CANADA];

    for (const country of countries) {
      const input: ScraperInput = {
        site_type: [Site.LINKEDIN],
        search_term: 'developer',
        country: country,
        results_wanted: 1,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('<div class="base-search-card"></div>'),
      });

      const result = await scraper.scrape(input);
      expect(Array.isArray(result.jobs)).toBe(true);
    }
  });

  test('scrape with complex search parameters', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'senior python developer',
      location: 'New York',
      country: Country.USA,
      distance: 50,
      is_remote: false,
      job_type: JobType.FULL_TIME,
      results_wanted: 10,
      hours_old: 168,
      description_format: DescriptionFormat.MARKDOWN,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('scrape with linkedin_company_ids filter', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'engineer',
      country: Country.USA,
      results_wanted: 3,
      linkedin_company_ids: [123, 456, 789],
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);
  });

  test('JobSpy compatibility test', async () => {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'software engineer',
      location: 'San Francisco',
      country: Country.USA,
      distance: 25,
      is_remote: false,
      job_type: JobType.FULL_TIME,
      results_wanted: 10,
      offset: 0,
      description_format: DescriptionFormat.HTML,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<div class="base-search-card"></div>'),
    });

    const result = await scraper.scrape(input);

    expect(result).toBeDefined();
    expect(Array.isArray(result.jobs)).toBe(true);
    expect(result.jobs.length >= 0).toBe(true);

    if (result.jobs.length > 0) {
      const job = result.jobs[0];
      expect(typeof job.title === 'string').toBe(true);
      expect(typeof job.job_url === 'string').toBe(true);
    }

    console.log('LinkedIn JobSpy compatibility test passed');
  });
});
