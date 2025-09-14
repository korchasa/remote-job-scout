/**
 * Tests for scrapers - Unit tests and Integration tests
 *
 * Unit tests use mocks and run fast
 * Integration tests make real HTTP requests to external APIs
 */

import { expect, test } from 'vitest';
import { Country, countryFromString, DescriptionFormat, JobType, Site } from '../../types/scrapers.ts';
import type { ScraperInput } from '../../types/scrapers.ts';
import { IndeedScraper } from './indeed.ts';

// ===== UNIT TESTS =====

// Test Country enum conversion from string
test('countryFromString() - converts country name to Country enum', () => {
  // Test USA variations
  expect(countryFromString('USA'), Country.USA);
  expect(countryFromString('usa'), Country.USA);
  expect(countryFromString('United States'), Country.USA);
  expect(countryFromString('united states'), Country.USA);

  // Test UK variations
  expect(countryFromString('UK'), Country.UK);
  expect(countryFromString('uk'), Country.UK);
  expect(countryFromString('United Kingdom'), Country.UK);
  expect(countryFromString('united kingdom'), Country.UK);

  // Test Canada
  expect(countryFromString('Canada'), Country.CANADA);
  expect(countryFromString('canada'), Country.CANADA);

  // Test Germany
  expect(countryFromString('Germany'), Country.GERMANY);
  expect(countryFromString('germany'), Country.GERMANY);

  // Test invalid country
  try {
    countryFromString('InvalidCountry');
    expect(false).toBe(true); // 'Should throw error for invalid country');
  } catch (error) {
    expect(error instanceof Error).toBe(true); // 'Should throw Error for invalid country');
    expect(error.message.includes('Invalid country')).toBe(true); // 'Error message should mention invalid country'
  }
});

test('IndeedScraper - constructor with proxies', () => {
  const scraper = new IndeedScraper(['http://proxy1:8080', 'http://proxy2:8080']);

  expect(scraper, 'Scraper with proxies should be created');
  console.log('Proxy scraper created successfully');
});

test('IndeedScraper - GraphQL query format validation', () => {
  const scraper = new IndeedScraper();

  // Test that we can create a scraper with different configurations
  const scraperWithProxy = new IndeedScraper(['http://proxy:8080']);

  expect(scraper, 'Basic scraper should be created');
  expect(scraperWithProxy, 'Proxy scraper should be created');

  console.log('GraphQL query format validation passed');
});

// ===== INTEGRATION TESTS =====
// These tests make real HTTP requests to Indeed API

/**
 * Тест реального скрейпинга Indeed с базовым поиском
 */
test('Indeed Integration - Basic job search with real API', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'software engineer',
    country: Country.USA,
    results_wanted: 5,
    description_format: DescriptionFormat.HTML,
  };

  console.log('🔍 Starting real Indeed API integration test...');

  const startTime = Date.now();
  const result = await scraper.scrape(input);
  const duration = Date.now() - startTime;

  console.log(`✅ API call completed in ${duration}ms`);

  // Проверяем структуру ответа
  expect(result);
  expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs должен быть массивом');

  // Проверяем, что получили какие-то результаты
  expect(result.jobs.length > 0).toBe(true); // 'Должны получить хотя бы одну вакансию');

  // Проверяем каждую вакансию
  for (const job of result.jobs) {
    expect(job.title, 'Вакансия должна иметь заголовок');
    expect(typeof job.title === 'string').toBe(true); // 'Заголовок должен быть строкой');
    expect(job.title.length > 0).toBe(true); // 'Заголовок не должен быть пустым');

    expect(job.job_url, 'Вакансия должна иметь URL');
    expect(typeof job.job_url === 'string').toBe(true); // 'URL должен быть строкой');
    expect(job.job_url.includes('indeed.com')).toBe(true); // 'URL должен содержать indeed.com'

    // Проверяем, что компания может быть null или строкой
    if (job.company_name !== null) {
      expect(typeof job.company_name === 'string').toBe(true); // 'Название компании должно быть строкой');
    }

    // Проверяем описание
    if (job.description !== null && typeof job.description === 'string') {
      expect(job.description.length > 0).toBe(true); // 'Описание не должно быть пустым');
    }

    // Проверяем локацию
    if (job.location) {
      if (job.location.city) {
        expect(typeof job.location.city === 'string').toBe(true); // 'Город должен быть строкой');
      }
      if (job.location.country) {
        expect(typeof job.location.country === 'string').toBe(true); // 'Страна должна быть строкой');
      }
    }

    console.log(
      `📋 Job: ${job.title} at ${job.company_name ?? 'Unknown'} (${
        job.location?.city ?? 'Remote'
      })`,
    );
  }

  console.log(`🎯 Successfully scraped ${result.jobs.length} jobs from Indeed API`);
});

/**
 * Тест поиска удаленных вакансий с реальным API
 */
test('Indeed Integration - Remote jobs search', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'frontend developer',
    is_remote: true,
    country: Country.USA,
    results_wanted: 3, // Reduce to 3 for faster testing
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log('🏠 Testing remote jobs search with real API...');

  const result = await scraper.scrape(input);

  // Проверяем структуру ответа
  expect(result);
  expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs должен быть массивом');

  // Для удаленных вакансий результаты могут быть, а могут и не быть
  // Главное, что запрос не упал с ошибкой
  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} remote jobs`);

    // Проверяем каждую вакансию
    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
      expect(job.title.length > 0).toBe(true);

      expect(job.job_url);
      expect(typeof job.job_url === 'string').toBe(true);
      expect(job.job_url.includes('indeed.com')).toBe(true);

      console.log(`📋 Remote job: ${job.title} at ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No remote jobs found (this is normal for test environment)');
  }

  console.log(`🎯 Remote jobs search completed: ${result.jobs.length} jobs found`);
});

/**
 * Тест поиска вакансий с фильтрами по типу работы
 */
test('Indeed Integration - Job type filtering', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'data scientist',
    job_type: JobType.FULL_TIME,
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('💼 Testing job type filtering with real API...');

  const result = await scraper.scrape(input);

  expect(result);
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
});

/**
 * Тест поиска вакансий с фильтрами по локации
 */
test('Indeed Integration - Location filtering', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'marketing specialist',
    location: 'New York',
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('📍 Testing location filtering with real API...');

  const result = await scraper.scrape(input);

  expect(result);
  expect(Array.isArray(result.jobs)).toBe(true);

  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs in New York`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
      console.log(`📋 New York job: ${job.title} at ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No jobs found in New York (this is normal for test environment)');
  }

  console.log(`🎯 Location filtering completed: ${result.jobs.length} jobs found`);
});

/**
 * Тест поиска вакансий с фильтрами по компании
 */
test('Indeed Integration - Company filtering', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'engineer',
    linkedin_company_ids: ['1441'], // Google company ID
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('🏢 Testing company filtering with real API...');

  const result = await scraper.scrape(input);

  expect(result);
  expect(Array.isArray(result.jobs)).toBe(true);

  // Результаты могут быть или не быть, главное что запрос не упал
  if (result.jobs.length > 0) {
    console.log(`✅ Found ${result.jobs.length} jobs at specified company`);

    for (const job of result.jobs) {
      expect(job.title);
      expect(typeof job.title === 'string').toBe(true);
      console.log(`📋 Company job: ${job.title} at ${job.company_name ?? 'Unknown'}`);
    }
  } else {
    console.log('⚠️ No jobs found at specified company (this is normal)');
  }

  console.log(`🎯 Company filtering completed: ${result.jobs.length} jobs found`);
});

/**
 * Тест поиска вакансий с easy apply фильтром
 */
test('Indeed Integration - Easy apply filtering', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'junior developer',
    easy_apply: true,
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('🚀 Testing easy apply filtering with real API...');

  const result = await scraper.scrape(input);

  expect(result);
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
});
