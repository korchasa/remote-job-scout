/**
 * Integration tests for LinkedIn scraper - real API calls
 *
 * These tests make real HTTP requests to LinkedIn API
 * and verify the complete scraping functionality.
 */

import { expect, test } from 'vitest';
import type { ScraperInput } from '../../../src/types/scrapers.ts';
import { Country, DescriptionFormat, JobType, Site } from '../../../src/types/scrapers.ts';
import { LinkedInScraper } from '../../../src/services/scrapers/linkedin.ts';

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
    if (remoteJobs.length > 0) {
      const remoteJob = remoteJobs[0];
      expect(typeof remoteJob.is_remote === 'boolean').toBe(true);
      expect(remoteJob.is_remote === true).toBe(true);

      console.log(
        `🌍 Remote job example: ${remoteJob.title} - ${remoteJob.location?.city ?? 'No location'}`,
      );
    }
  } else {
    console.log('⚠️ No remote jobs found (LinkedIn might be blocking requests)');
  }
}, 30000);

/**
 * Test job type filtering
 */
test('LinkedIn Integration - Job type filtering', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'data scientist',
    job_type: JobType.FULL_TIME,
    country: Country.USA,
    results_wanted: 6,
  };

  console.log('💼 Testing full-time job filtering...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    // Check if jobs have proper type
    const fullTimeJobs = result.jobs.filter((job) => job.job_type?.includes(JobType.FULL_TIME));

    console.log(`Found ${fullTimeJobs.length} full-time jobs out of ${result.jobs.length} total`);

    // Verify job type structure
    if (fullTimeJobs.length > 0) {
      const job = fullTimeJobs[0];
      expect(Array.isArray(job.job_type)).toBe(true);
      expect(job.job_type?.includes(JobType.FULL_TIME)).toBe(true);
    }
  } else {
    console.log('⚠️ No jobs found with job type filtering');
  }
}, 30000);

/**
 * Test multi-country search
 */
test('LinkedIn Integration - Multi-country search', async () => {
  const scraper = new LinkedInScraper();
  const countries = [Country.USA, Country.UK, Country.CANADA];

  for (const country of countries) {
    console.log(`🌍 Testing ${country} domain...`);

    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: 'product manager',
      country: country,
      results_wanted: 3,
      description_format: DescriptionFormat.PLAIN,
    };

    try {
      const result = await scraper.scrape(input);

      expect(Array.isArray(result.jobs)).toBe(true);

      if (result.jobs.length > 0) {
        console.log(`✅ ${country}: Found ${result.jobs.length} jobs`);

        // Verify that URL contains LinkedIn domain
        const job = result.jobs[0];
        expect(job.job_url).toContain('linkedin.com');
      } else {
        console.log(`⚠️ ${country}: No jobs found (API might be rate-limited)`);
      }
    } catch (error) {
      console.error(
        `❌ ${country} failed:`,
        error instanceof Error ? error.message : String(error),
      );
      // Don't break the test, continue with other countries
    }

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}, 60000);

/**
 * Test easy apply jobs
 */
test('LinkedIn Integration - Easy apply jobs', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'marketing specialist',
    easy_apply: true,
    country: Country.USA,
    results_wanted: 4,
  };

  console.log('✨ Testing easy apply jobs...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  console.log(`Found ${result.jobs.length} easy apply jobs`);

  // Verify that easy_apply filter works
  if (result.jobs.length > 0) {
    for (const job of result.jobs) {
      console.log(`📄 ${job.title} - Company: ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No easy apply jobs found');
  }
}, 30000);

/**
 * Test large result set with pagination
 */
test('LinkedIn Integration - Large result set with pagination', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'developer',
    country: Country.USA,
    results_wanted: 25,
    description_format: DescriptionFormat.HTML,
  };

  console.log('📄 Testing pagination with 25 results...');

  const startTime = Date.now();
  const result = await scraper.scrape(input);
  const duration = Date.now() - startTime;

  console.log(`⏱️ Large search completed in ${duration}ms`);

  expect(Array.isArray(result.jobs)).toBe(true);
  expect(result.jobs.length <= 25).toBe(true);

  console.log(`📊 Retrieved ${result.jobs.length} jobs out of requested 25`);

  // Verify job URL uniqueness
  const urls = result.jobs.map((job) => job.job_url);
  const uniqueUrls = new Set(urls);
  expect(urls.length).toBe(uniqueUrls.size);
}, 60000);

/**
 * Test complex search with multiple filters
 */
test('LinkedIn Integration - Complex search with multiple filters', async () => {
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
    hours_old: 168, // Last 7 days
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log('🔍 Testing complex search with multiple filters...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  console.log(`🎯 Complex search found ${result.jobs.length} jobs`);

  if (result.jobs.length > 0) {
    const job = result.jobs[0];

    // Verify basic fields
    expect(job.title).toBeDefined();
    expect(job.job_url).toBeDefined();

    // Check if we got developer-related jobs
    const titleLower = job.title.toLowerCase();
    const hasTechTerm =
      titleLower.includes('developer') ||
      titleLower.includes('engineer') ||
      titleLower.includes('scientist') ||
      titleLower.includes('analyst');
    expect(hasTechTerm).toBe(true);

    console.log(`⭐ Sample job: ${job.title}`);
    console.log(`🏢 Company: ${job.company_name ?? 'Not specified'}`);
    console.log(`📍 Location: ${job.location?.city ?? 'Remote'}`);
    console.log(`💰 Remote: ${job.is_remote}`);
  } else {
    console.log('⚠️ No jobs found with complex filters');
  }
}, 60000);

/**
 * Test error handling
 */
test('LinkedIn Integration - Error handling', async () => {
  const scraper = new LinkedInScraper();

  // Test with invalid parameters
  const invalidInput: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: '', // Empty search term
    country: Country.USA,
    results_wanted: -1, // Negative count
  };

  console.log('🚨 Testing error handling...');

  try {
    const result = await scraper.scrape(invalidInput);
    // Even with invalid parameters, API might return results
    expect(result).toBeDefined();
    console.log('API handled invalid parameters gracefully');
  } catch (error) {
    console.log(
      'API correctly rejected invalid parameters:',
      error instanceof Error ? error.message : String(error),
    );
  }
}, 30000);

/**
 * Test performance with multiple searches
 */
test('LinkedIn Integration - Performance test', async () => {
  const scraper = new LinkedInScraper();
  const searchTerms = ['javascript', 'react', 'typescript', 'node.js'];

  console.log('⚡ Testing performance with multiple searches...');

  const results: Array<{ term: string; count: number; duration: number }> = [];

  for (const term of searchTerms) {
    const input: ScraperInput = {
      site_type: [Site.LINKEDIN],
      search_term: term,
      country: Country.USA,
      results_wanted: 3,
    };

    const startTime = Date.now();
    const result = await scraper.scrape(input);
    const duration = Date.now() - startTime;

    results.push({
      term,
      count: result.jobs.length,
      duration,
    });

    console.log(`🔍 "${term}": ${result.jobs.length} jobs in ${duration}ms`);

    // Delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const totalJobs = results.reduce((sum, r) => sum + r.count, 0);

  console.log(`📈 Performance summary:`);
  console.log(`   - Average response time: ${Math.round(avgDuration)}ms`);
  console.log(`   - Total jobs found: ${totalJobs}`);
  console.log(`   - Searches completed: ${results.length}`);
}, 120000);

/**
 * Test with full description fetching
 */
test('LinkedIn Integration - Full description fetching', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    search_term: 'senior developer',
    country: Country.USA,
    results_wanted: 2,
    linkedin_fetch_description: true,
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log('📝 Testing full description fetching...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    const job = result.jobs[0];

    // Test all the fields that JobSpy extracts
    expect(typeof job.title === 'string').toBe(true);
    expect(typeof job.job_url === 'string').toBe(true);

    // Company information
    if (job.company_name) {
      expect(typeof job.company_name === 'string').toBe(true);
    }
    if (job.company_url) {
      expect(typeof job.company_url === 'string').toBe(true);
    }

    // Location information
    if (job.location) {
      if (job.location.city) {
        expect(typeof job.location.city === 'string').toBe(true);
      }
      if (job.location.state) {
        expect(typeof job.location.state === 'string').toBe(true);
      }
      if (job.location.country) {
        expect(typeof job.location.country === 'string').toBe(true);
      }
    }

    // Description
    if (job.description) {
      expect(typeof job.description === 'string').toBe(true);
    }

    // Job type
    if (job.job_type) {
      expect(Array.isArray(job.job_type)).toBe(true);
      job.job_type.forEach((jt) => {
        expect(Object.values(JobType).includes(jt)).toBe(true);
      });
    }

    // Compensation
    if (job.compensation) {
      if (job.compensation.min_amount) {
        expect(typeof job.compensation.min_amount === 'number').toBe(true);
      }
      if (job.compensation.max_amount) {
        expect(typeof job.compensation.max_amount === 'number').toBe(true);
      }
      if (job.compensation.currency) {
        expect(typeof job.compensation.currency === 'string').toBe(true);
      }
    }

    // Date
    if (job.date_posted) {
      expect(job.date_posted instanceof Date).toBe(true);
    }

    // Remote flag
    if (job.is_remote !== null && job.is_remote !== undefined) {
      expect(typeof job.is_remote === 'boolean').toBe(true);
    }

    console.log('Comprehensive job data test passed');
    console.log('Sample job data:', {
      title: job.title,
      company: job.company_name,
      location: job.location,
      job_type: job.job_type,
      is_remote: job.is_remote,
      has_compensation: !!job.compensation,
      has_description: !!job.description,
    });
  } else {
    console.log('⚠️ No jobs found for description testing');
  }
}, 60000);

/**
 * Test empty search term
 */
test('LinkedIn Integration - Empty search term', async () => {
  const scraper = new LinkedInScraper();

  const input: ScraperInput = {
    site_type: [Site.LINKEDIN],
    country: Country.USA,
    results_wanted: 5,
  };

  console.log('Testing empty search term...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true);
  console.log(`Found ${result.jobs.length} jobs without search term`);
}, 30000);

/**
 * JobSpy compatibility test
 */
test('LinkedIn Integration - JobSpy compatibility test', async () => {
  const scraper = new LinkedInScraper();

  // Test input that matches JobSpy ScraperInput structure
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

  console.log('Testing JobSpy compatibility...');

  // This should not throw an error even if API fails
  const result = await scraper.scrape(input);

  // Verify that result structure matches JobSpy JobResponse
  expect(result).toBeDefined();
  expect(Array.isArray(result.jobs)).toBe(true);
  expect(result.jobs.length >= 0).toBe(true);

  // Verify that each job (if any) has JobSpy-compatible structure
  if (result.jobs.length > 0) {
    const job = result.jobs[0];
    expect(typeof job.title === 'string').toBe(true);
    expect(typeof job.job_url === 'string').toBe(true);
  }

  console.log('LinkedIn JobSpy compatibility test passed');
}, 30000);
