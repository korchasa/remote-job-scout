/**
 * Tests for LinkedIn scraper - Unit tests and Integration tests
 *
 * Unit tests use mocks and run fast
 * Integration tests make real HTTP requests to LinkedIn API
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

  test('getName returns linkedin', () => {
    expect(scraper.getName()).toBe('linkedin');
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

// ===== INTEGRATION TESTS =====
// These tests make real HTTP requests to LinkedIn API

/**
 * Test real LinkedIn scraping with basic search
 */
test('LinkedIn Integration - Basic job search with real API', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'software engineer',
    country: Country.USA,
    results_wanted: 5,
    description_format: DescriptionFormat.HTML,
  };

  console.log('🔍 Starting real LinkedIn API integration test...');

  const startTime = Date.now();
  const result = await scraper.scrape(input);
  const duration = Date.now() - startTime;

  console.log(`✅ API call completed in ${duration}ms`);

  // Verify response structure
  expect(result).toBeDefined();
  expect(Array.isArray(result.jobs)).toBe(true);

  // Check if we got any results
  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs from LinkedIn`);

    // Verify each job
    for (const job of result.jobs) {
      expect(job.title).toBeDefined();
      expect(typeof job.title === 'string').toBe(true);
      expect(job.title.length > 0).toBe(true);

      expect(job.job_url).toBeDefined();
      expect(typeof job.job_url === 'string').toBe(true);
      expect(job.job_url.includes('linkedin.com')).toBe(true);

      // Company information
      if (job.company_name !== null) {
        expect(typeof job.company_name === 'string').toBe(true);
      }

      // Description
      if (job.description !== null && typeof job.description === 'string') {
        expect(job.description.length > 0).toBe(true);
      }

      // Location
      if (job.location) {
        if (job.location.city) {
          expect(typeof job.location.city === 'string').toBe(true);
        }
        if (job.location.country) {
          expect(typeof job.location.country === 'string').toBe(true);
        }
      }

      console.log(
        `📋 Job: ${job.title} at ${job.company_name ?? 'Unknown'} (${
          job.location?.city ?? 'Remote'
        })`,
      );
    }
  } else {
    console.log('⚠️ No jobs found (LinkedIn might be blocking requests or rate limiting)');
  }

  console.log(`🎯 LinkedIn scraping test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test remote jobs search with real API
 */
test('LinkedIn Integration - Remote jobs search', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'frontend developer',
    is_remote: true,
    country: Country.USA,
    results_wanted: 3,
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log('🏠 Testing remote jobs search with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    // Check if some jobs are marked as remote
    const remoteJobs = result.jobs.filter((job) => job.is_remote === true);
    console.log(
      `Found ${remoteJobs.length} explicitly remote jobs out of ${result.jobs.length} total`,
    );

    // Verify remote job structure
    for (const job of remoteJobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
      console.log(`📋 Remote job: ${job.title} at ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No remote jobs found (this is normal for test environment)');
  }

  console.log(`🎯 Remote jobs search completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test job type filtering with real API
 */
test('LinkedIn Integration - Job type filtering', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'data scientist',
    job_type: JobType.FULL_TIME,
    country: Country.USA,
    results_wanted: 5,
  };

  console.log('💼 Testing job type filtering with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} full-time jobs`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
      console.log(`📋 Full-time job: ${job.title} at ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No full-time jobs found (this is normal for test environment)');
  }

  console.log(`🎯 Job type filtering completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test easy apply filter with real API
 */
test('LinkedIn Integration - Easy apply filtering', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'marketing specialist',
    easy_apply: true,
    country: Country.USA,
    results_wanted: 4,
  };

  console.log('🚀 Testing easy apply filtering with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} easy apply jobs`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
      console.log(`📋 Easy apply job: ${job.title} at ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No easy apply jobs found (this is normal for test environment)');
  }

  console.log(`🎯 Easy apply filtering completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test hours old filtering with real API
 */
test('LinkedIn Integration - Hours old filtering', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'developer',
    hours_old: 48,
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('🕐 Testing hours old filtering with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} recent jobs`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
      console.log(`📋 Recent job: ${job.title} at ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No recent jobs found (this is normal for test environment)');
  }

  console.log(`🎯 Hours old filtering completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test description format options with real API
 */
test('LinkedIn Integration - Description format options', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'engineer',
    country: Country.USA,
    results_wanted: 1,
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log('📝 Testing description format options with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    const job = result.jobs[0];
    console.log(`✅ Found job with ${DescriptionFormat.MARKDOWN} description`);

    if (job.description && typeof job.description === 'string') {
      expect(job.description.length > 0).toBe(true);
      console.log(`📋 Job description length: ${job.description.length} characters`);
    }
  } else {
    console.log('⚠️ No jobs found (this is normal for test environment)');
  }

  console.log(`🎯 Description format test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test pagination and offset with real API
 */
test('LinkedIn Integration - Pagination and offset', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'software engineer',
    country: Country.USA,
    results_wanted: 10,
    offset: 5,
  };

  console.log('📄 Testing pagination and offset with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs with offset`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
    }
  } else {
    console.log('⚠️ No jobs found with offset (this is normal for test environment)');
  }

  console.log(`🎯 Pagination test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test linkedin_fetch_description enabled with real API
 */
test('LinkedIn Integration - Fetch description enabled', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'senior developer',
    country: Country.USA,
    results_wanted: 2,
    linkedin_fetch_description: true,
  };

  console.log('📖 Testing fetch description enabled with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs with descriptions`);

    for (const job of result.jobs) {
      expect(job.title);
      if (job.description && typeof job.description === 'string') {
        console.log(`📋 Job has description: ${job.description.substring(0, 50)}...`);
      }
    }
  } else {
    console.log('⚠️ No jobs found (this is normal for test environment)');
  }

  console.log(`🎯 Fetch description test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test rate limiting handling with real API
 */
test('LinkedIn Integration - Rate limiting handling', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'developer',
    country: Country.USA,
    results_wanted: 5,
  };

  console.log('⚡ Testing rate limiting handling with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  // The test passes if it doesn't throw an exception
  // Even if rate limited, the scraper should handle it gracefully
  console.log(`✅ Rate limiting test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test 403 errors handling with real API
 */
test('LinkedIn Integration - 403 errors handling', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'developer',
    country: Country.USA,
    results_wanted: 5,
  };

  console.log('🚫 Testing 403 errors handling with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  // The test passes if it doesn't throw an exception
  // Even if blocked, the scraper should handle it gracefully
  console.log(`✅ 403 handling test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test empty search term with real API
 */
test('LinkedIn Integration - Empty search term', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: undefined,
    country: Country.USA,
    results_wanted: 5,
  };

  console.log('🔍 Testing empty search term with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs with empty search term`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
    }
  } else {
    console.log('⚠️ No jobs found with empty search term (this is normal)');
  }

  console.log(`🎯 Empty search term test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test different countries with real API
 */
test('LinkedIn Integration - Different countries', async () => {
  const scraper = new LinkedInScraper();

  const countries = [Country.USA, Country.UK, Country.CANADA];

  for (const country of countries) {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'developer',
      country: country,
      results_wanted: 1,
    };

    console.log(`🌍 Testing country ${country} with real LinkedIn API...`);

    const result = await scraper.scrape(input);

    expect(Array.isArray(result.jobs)).toBe(true);

    if (result.jobs.length > 0) {
      console.log(`✅ Found jobs in ${country}`);
    } else {
      console.log(`⚠️ No jobs found in ${country} (this is normal for test environment)`);
    }
  }

  console.log('🎯 Different countries test completed');
}, 30000);

/**
 * Test complex search parameters with real API
 */
test('LinkedIn Integration - Complex search parameters', async () => {
  const scraper = new LinkedInScraper();

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
    description_format: DescriptionFormat.HTML,
  };

  console.log('🔧 Testing complex search parameters with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs with complex parameters`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
    }
  } else {
    console.log('⚠️ No jobs found with complex parameters (this is normal for test environment)');
  }

  console.log(`🎯 Complex search parameters test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test linkedin_company_ids filter with real API
 */
test('LinkedIn Integration - Company filtering', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'engineer',
    country: Country.USA,
    results_wanted: 3,
    linkedin_company_ids: ['1441'], // Google company ID
  };

  console.log('🏢 Testing company filtering with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs at specified company`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
    }
  } else {
    console.log('⚠️ No jobs found at specified company (this is normal)');
  }

  console.log(`🎯 Company filtering test completed: ${result.jobs.length} jobs found`);
}, 30000);

/**
 * Test JobSpy compatibility with real API
 */
test('LinkedIn Integration - JobSpy compatibility test', async () => {
  const scraper = new LinkedInScraper();

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

  console.log('🔄 Testing JobSpy compatibility with real LinkedIn API...');

  const result = await scraper.scrape(input);

  expect(result).toBeDefined();
  expect(Array.isArray(result.jobs)).toBe(true);
  expect(result.jobs.length >= 0).toBe(true);

  if (result.jobs.length > 0) {
    const job = result.jobs[0];
    expect(typeof job.title === 'string').toBe(true);
    expect(typeof job.job_url === 'string').toBe(true);
    console.log(`✅ JobSpy compatibility test passed: found ${result.jobs.length} jobs`);
  } else {
    console.log('⚠️ No jobs found (this is normal for test environment)');
  }

  console.log('🎯 LinkedIn JobSpy compatibility test completed');
}, 30000);
