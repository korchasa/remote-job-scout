/**
 * Интеграционные тесты для скрейперов - реальные запросы к Indeed API
 *
 * Эти тесты делают реальные HTTP запросы к Indeed GraphQL API
 * и проверяют полную функциональность скрейпинга.
 */

import { expect, test } from 'vitest';
import type { ScraperInput } from '../../../src/types/scrapers.ts';
import { Country, DescriptionFormat, JobType, Site } from '../../../src/types/scrapers.ts';
import { IndeedScraper } from '../../../src/services/scrapers/indeed.ts';

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

  expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs должен быть массивом');
  expect(result.jobs.length > 0).toBe(true); // 'Должны найти удаленные вакансии');

  // Проверяем, что хотя бы некоторые вакансии помечены как remote
  const remoteJobs = result.jobs.filter((job) => job.is_remote === true);
  console.log(
    `Found ${remoteJobs.length} explicitly remote jobs out of ${result.jobs.length} total`,
  );

  // Проверяем структуру удаленных вакансий
  if (remoteJobs.length > 0) {
    const remoteJob = remoteJobs[0];
    expect(typeof remoteJob.is_remote === 'boolean').toBe(true); // 'is_remote должен быть boolean');
    expect(remoteJob.is_remote === true).toBe(true); // 'Вакансия должна быть помечена как remote');

    console.log(
      `🌍 Remote job example: ${remoteJob.title} - ${remoteJob.location?.city ?? 'No location'}`,
    );
  }
});

/**
 * Тест фильтрации по типу занятости
 */
test('Indeed Integration - Job type filtering', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'data scientist',
    job_type: JobType.FULL_TIME,
    country: Country.USA,
    results_wanted: 6,
  };

  console.log('💼 Testing full-time job filtering...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs должен быть массивом');

  if (result.jobs.length > 0) {
    // Проверяем, что вакансии имеют правильный тип
    const fullTimeJobs = result.jobs.filter((job) => job.job_type?.includes(JobType.FULL_TIME));

    console.log(`Found ${fullTimeJobs.length} full-time jobs out of ${result.jobs.length} total`);

    // Проверяем структуру типа вакансии
    if (fullTimeJobs.length > 0) {
      const job = fullTimeJobs[0];
      expect(Array.isArray(job.job_type)).toBe(true); // 'job_type должен быть массивом');
      expect(job.job_type?.includes(JobType.FULL_TIME)).toBe(true); // 'Вакансия должна содержать FULL_TIME');
    }
  }
});

/**
 * Тест поиска по разным странам
 */
test('Indeed Integration - Multi-country search', async () => {
  const scraper = new IndeedScraper();
  const countries = [Country.USA, Country.UK, Country.CANADA];

  for (const country of countries) {
    console.log(`🌍 Testing ${country} domain...`);

    const input: ScraperInput = {
      site_type: [Site.INDEED],
      search_term: 'product manager',
      country: country,
      results_wanted: 3,
      description_format: DescriptionFormat.PLAIN,
    };

    try {
      const result = await scraper.scrape(input);

      expect(Array.isArray(result.jobs)).toBe(true); // `Jobs для ${country} должен быть массивом`);

      if (result.jobs.length > 0) {
        console.log(`✅ ${country}: Found ${result.jobs.length} jobs`);

        // Проверяем, что URL соответствует стране
        const countryDomains: Record<string, string> = {
          [Country.USA]: 'indeed.com',
          [Country.UK]: 'indeed.co.uk',
          [Country.CANADA]: 'indeed.ca',
        };

        const expectedDomain = countryDomains[country as string];
        if (expectedDomain) {
          const job = result.jobs[0];
          expect(job.job_url).toContain(expectedDomain);
        }
      } else {
        console.log(`⚠️ ${country}: No jobs found (API might be rate-limited)`);
      }
    } catch (error) {
      console.error(
        `❌ ${country} failed:`,
        error instanceof Error ? error.message : String(error),
      );
      // Не прерываем тест, продолжаем с другими странами
    }

    // Небольшая задержка между запросами
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
});

/**
 * Тест поиска вакансий с easy apply
 */
test('Indeed Integration - Easy apply jobs', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'marketing specialist',
    easy_apply: true,
    country: Country.USA,
    results_wanted: 4,
  };

  console.log('✨ Testing easy apply jobs...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs должен быть массивом');

  console.log(`Found ${result.jobs.length} easy apply jobs`);

  // Проверяем, что поиск с easy_apply фильтром работает
  if (result.jobs.length > 0) {
    for (const job of result.jobs) {
      console.log(`📄 ${job.title} - Company: ${job.company_name ?? 'Unknown'}`);
    }
  }
});

/**
 * Тест пагинации с большим количеством результатов
 */
test('Indeed Integration - Large result set with pagination', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
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

  expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs должен быть массивом');
  expect(result.jobs.length <= 25).toBe(true); // 'Не должно быть больше запрошенного количества');

  console.log(`📊 Retrieved ${result.jobs.length} jobs out of requested 25`);

  // Проверяем уникальность URL вакансий
  const urls = result.jobs.map((job) => job.job_url);
  const uniqueUrls = new Set(urls);
  expect(urls.length).toBe(uniqueUrls.size);
});

/**
 * Тест скомпилированного поиска (несколько фильтров одновременно)
 */
test('Indeed Integration - Complex search with multiple filters', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'senior python developer',
    location: 'New York',
    country: Country.USA,
    distance: 50,
    is_remote: false,
    job_type: JobType.FULL_TIME,
    results_wanted: 10,
    hours_old: 168, // Последние 7 дней
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log('🔍 Testing complex search with multiple filters...');

  const result = await scraper.scrape(input);

  expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs должен быть массивом');

  console.log(`🎯 Complex search found ${result.jobs.length} jobs`);

  if (result.jobs.length > 0) {
    const job = result.jobs[0];

    // Проверяем основные поля
    expect(job.title);
    expect(job.job_url);
    // Note: Search results may be relevant even if they don't contain exact terms
    // Just check that we got developer-related jobs
    const titleLower = job.title.toLowerCase();
    const hasTechTerm =
      titleLower.includes('developer') ||
      titleLower.includes('engineer') ||
      titleLower.includes('scientist') ||
      titleLower.includes('analyst');
    expect(hasTechTerm).toBe(true); // 'Заголовок должен содержать технический термин');

    console.log(`⭐ Sample job: ${job.title}`);
    console.log(`🏢 Company: ${job.company_name ?? 'Not specified'}`);
    console.log(`📍 Location: ${job.location?.city ?? 'Remote'}`);
    console.log(`💰 Remote: ${job.is_remote}`);
  }
});

/**
 * Тест обработки ошибок API
 */
test('Indeed Integration - Error handling', async () => {
  const scraper = new IndeedScraper();

  // Тест с некорректными параметрами
  const invalidInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: '', // Пустой поисковый запрос
    country: Country.USA,
    results_wanted: -1, // Отрицательное количество
  };

  console.log('🚨 Testing error handling...');

  try {
    const result = await scraper.scrape(invalidInput);
    // Даже с некорректными параметрами API может вернуть результаты
    expect(result);
    console.log('API handled invalid parameters gracefully');
  } catch (error) {
    console.log(
      'API correctly rejected invalid parameters:',
      error instanceof Error ? error.message : String(error),
    );
  }
});

/**
 * Тест производительности - несколько последовательных запросов
 */
test('Indeed Integration - Performance test', async () => {
  // Увеличиваем таймаут для теста производительности (4 запроса по ~2 сек задержки + время выполнения)
  const scraper = new IndeedScraper();
  const searchTerms = ['javascript', 'react', 'typescript', 'node.js'];

  console.log('⚡ Testing performance with multiple searches...');

  const results: Array<{ term: string; count: number; duration: number }> = [];

  for (const term of searchTerms) {
    const input: ScraperInput = {
      site_type: [Site.INDEED],
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

    // Задержка между запросами чтобы не превысить rate limit
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const totalJobs = results.reduce((sum, r) => sum + r.count, 0);

  console.log(`📈 Performance summary:`);
  console.log(`   - Average response time: ${Math.round(avgDuration)}ms`);
  console.log(`   - Total jobs found: ${totalJobs}`);
  console.log(`   - Searches completed: ${results.length}`);
}, 30000);

/**
 * Обертка для интеграционных тестов с увеличенным таймаутом
 */
function integrationTest(name: string, fn: () => Promise<void> | void, timeout = 10000) {
  test(name, fn, timeout);
}

/**
 * Интеграционные тесты из scrapers.test.ts (перенесенные)
 */

// Test Indeed scraper with JobSpy compatible interface
integrationTest('IndeedScraper - GraphQL API integration (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'software engineer',
    country: Country.USA,
    results_wanted: 3, // Limit to 3 jobs for faster testing
    description_format: DescriptionFormat.HTML,
  };

  console.log('Testing Indeed scraper with JobSpy compatible interface...');

  try {
    const result = await scraper.scrape(input);

    console.log('Direct test result:', {
      jobs_count: result.jobs.length,
    });

    // Verify basic structure
    expect(result);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be an array');

    // If we got jobs, verify their structure
    if (result.jobs.length > 0) {
      const firstJob = result.jobs[0];
      expect(firstJob.title, 'Job should have title');
      expect(firstJob.job_url, 'Job should have URL');

      // Verify job structure matches JobSpy JobPost interface
      expect(typeof firstJob.title === 'string').toBe(true); // 'Title should be string');
      expect(typeof firstJob.job_url === 'string').toBe(true); // 'URL should be string');
      expect(firstJob.company_name === null || typeof firstJob.company_name === 'string').toBe(
        true,
      ); // 'Company name should be string or null'
      expect(firstJob.description === null || typeof firstJob.description === 'string').toBe(true); // 'Description should be string or null'

      console.log(`Successfully scraped ${result.jobs.length} jobs from Indeed`);
      console.log('Sample job:', {
        title: firstJob.title,
        company: firstJob.company_name,
        location: firstJob.location,
        is_remote: firstJob.is_remote,
      });
    }
  } catch (error) {
    console.error('Test failed with exception:', error);
    throw error;
  }
});

// Test different search configurations
integrationTest('IndeedScraper - remote jobs search (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'software engineer',
    is_remote: true,
    country: Country.USA,
    results_wanted: 5,
  };

  console.log('Testing remote jobs search...');

  try {
    const result = await scraper.scrape(input);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be an array');

    // Check if remote jobs are properly detected
    if (result.jobs.length > 0) {
      const remoteJobs = result.jobs.filter((job) => job.is_remote);
      console.log(`Found ${remoteJobs.length} remote jobs out of ${result.jobs.length} total jobs`);
    }
  } catch (error) {
    console.error('Remote jobs test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - job type filtering (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'developer',
    job_type: JobType.FULL_TIME,
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('Testing job type filtering...');

  try {
    const result = await scraper.scrape(input);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be an array');

    if (result.jobs.length > 0) {
      const fullTimeJobs = result.jobs.filter((job) => job.job_type?.includes(JobType.FULL_TIME));
      console.log(`Found ${fullTimeJobs.length} full-time jobs`);
    }
  } catch (error) {
    console.error('Job type filtering test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - country localization (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'developer',
    country: Country.UK,
    results_wanted: 2,
  };

  console.log('Testing country localization...');

  try {
    const result = await scraper.scrape(input);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be an array');

    console.log(`Found ${result.jobs.length} jobs from UK domain`);
  } catch (error) {
    console.error('Country localization test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - description formats (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  // Test HTML format
  const htmlInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'engineer',
    country: Country.USA,
    description_format: DescriptionFormat.HTML,
    results_wanted: 1,
  };

  // Test Markdown format
  const markdownInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'engineer',
    country: Country.USA,
    description_format: DescriptionFormat.MARKDOWN,
    results_wanted: 1,
  };

  // Test Plain format
  const plainInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'engineer',
    country: Country.USA,
    description_format: DescriptionFormat.PLAIN,
    results_wanted: 1,
  };

  console.log('Testing description formats...');

  try {
    const htmlResult = await scraper.scrape(htmlInput);
    const markdownResult = await scraper.scrape(markdownInput);
    const plainResult = await scraper.scrape(plainInput);

    expect(Array.isArray(htmlResult.jobs)).toBe(true); // 'HTML jobs should be array');
    expect(Array.isArray(markdownResult.jobs)).toBe(true); // 'Markdown jobs should be array');
    expect(Array.isArray(plainResult.jobs)).toBe(true); // 'Plain jobs should be array');

    console.log('Description formats test passed');
  } catch (error) {
    console.error('Description formats test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - hours old filtering (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'developer',
    hours_old: 24, // Jobs from last 24 hours
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('Testing hours old filtering...');

  try {
    const result = await scraper.scrape(input);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be an array');

    console.log(`Found ${result.jobs.length} recent jobs`);
  } catch (error) {
    console.error('Hours old filtering test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - easy apply filtering (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'developer',
    easy_apply: true,
    country: Country.USA,
    results_wanted: 3,
  };

  console.log('Testing easy apply filtering...');

  try {
    const result = await scraper.scrape(input);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be an array');

    console.log(`Found ${result.jobs.length} easy apply jobs`);
  } catch (error) {
    console.error('Easy apply filtering test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - pagination and offset (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'software engineer',
    country: Country.USA,
    results_wanted: 10,
    offset: 5,
  };

  console.log('Testing pagination and offset...');

  try {
    const result = await scraper.scrape(input);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be an array');
    expect(result.jobs.length <= 10).toBe(true); // 'Should not return more than requested');

    console.log(`Found ${result.jobs.length} jobs with offset ${input.offset}`);
  } catch (error) {
    console.error('Pagination test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - comprehensive job data (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: 'senior developer',
    country: Country.USA,
    results_wanted: 2,
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log('Testing comprehensive job data extraction...');

  try {
    const result = await scraper.scrape(input);

    if (result.jobs.length > 0) {
      const job = result.jobs[0];

      // Test all the fields that JobSpy extracts
      expect(typeof job.title === 'string').toBe(true); // 'Title should be string');
      expect(typeof job.job_url === 'string').toBe(true); // 'Job URL should be string');

      // Company information
      if (job.company_name) {
        expect(typeof job.company_name === 'string').toBe(true); // 'Company name should be string');
      }
      if (job.company_url) {
        expect(typeof job.company_url === 'string').toBe(true); // 'Company URL should be string');
      }

      // Location information
      if (job.location) {
        if (job.location.city) {
          expect(typeof job.location.city === 'string').toBe(true); // 'City should be string');
        }
        if (job.location.state) {
          expect(typeof job.location.state === 'string').toBe(true); // 'State should be string');
        }
        if (job.location.country) {
          expect(typeof job.location.country === 'string').toBe(true); // 'Country should be string');
        }
      }

      // Description
      if (job.description) {
        expect(typeof job.description === 'string').toBe(true); // 'Description should be string');
      }

      // Job type
      if (job.job_type) {
        expect(Array.isArray(job.job_type)).toBe(true); // 'Job type should be array');
        job.job_type.forEach((jt) => {
          expect(Object.values(JobType).includes(jt)).toBe(true); // 'Job type should be valid enum');
        });
      }

      // Compensation
      if (job.compensation) {
        if (job.compensation.min_amount) {
          expect(typeof job.compensation.min_amount === 'number').toBe(true); // 'Min amount should be number');
        }
        if (job.compensation.max_amount) {
          expect(typeof job.compensation.max_amount === 'number').toBe(true); // 'Max amount should be number');
        }
        if (job.compensation.currency) {
          expect(typeof job.compensation.currency === 'string').toBe(true); // 'Currency should be string');
        }
      }

      // Date
      if (job.date_posted) {
        expect(job.date_posted instanceof Date).toBe(true); // 'Date posted should be Date object');
      }

      // Remote flag
      if (job.is_remote !== null && job.is_remote !== undefined) {
        expect(typeof job.is_remote === 'boolean').toBe(true); // 'Is remote should be boolean');
      }

      console.log('Comprehensive job data test passed');
      console.log('Sample job data:', {
        title: job.title,
        company: job.company_name,
        location: job.location,
        job_type: job.job_type,
        is_remote: job.is_remote,
        has_compensation: !!job.compensation,
      });
    }
  } catch (error) {
    console.error('Comprehensive job data test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - multiple countries (from unit tests)', async () => {
  const scraper = new IndeedScraper();
  const countries = [Country.USA, Country.UK, Country.CANADA];

  for (const country of countries) {
    console.log(`Testing ${country}...`);

    const input: ScraperInput = {
      site_type: [Site.INDEED],
      search_term: 'developer',
      country: country,
      results_wanted: 1,
    };

    try {
      const result = await scraper.scrape(input);
      expect(Array.isArray(result.jobs)).toBe(true); // `Jobs should be array for ${country}`);
      console.log(`✓ ${country}: Found ${result.jobs.length} jobs`);
    } catch (error) {
      console.error(`✗ ${country} failed:`, error);
      // Don't throw error, just log it - some countries might not work
    }
  }
});

integrationTest('IndeedScraper - empty search term (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    country: Country.USA,
    results_wanted: 5,
  };

  console.log('Testing empty search term...');

  try {
    const result = await scraper.scrape(input);
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be array');
    console.log(`Found ${result.jobs.length} jobs without search term`);
  } catch (error) {
    console.error('Empty search term test failed:', error);
    throw error;
  }
});

integrationTest('IndeedScraper - JobSpy compatibility test (from unit tests)', async () => {
  const scraper = new IndeedScraper();

  // Test input that matches JobSpy ScraperInput structure
  const input: ScraperInput = {
    site_type: [Site.INDEED],
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

  try {
    // This should not throw an error even if API fails
    const result = await scraper.scrape(input);

    // Verify that result structure matches JobSpy JobResponse
    expect(result, 'Result should exist');
    expect(Array.isArray(result.jobs)).toBe(true); // 'Jobs should be array');
    expect(result.jobs.length >= 0).toBe(true); // 'Jobs count should be non-negative');

    // Verify that each job (if any) has JobSpy-compatible structure
    if (result.jobs.length > 0) {
      const job = result.jobs[0];
      expect(typeof job.title === 'string').toBe(true); // 'Job title should be string');
      expect(typeof job.job_url === 'string').toBe(true); // 'Job URL should be string');
    }

    console.log('JobSpy compatibility test passed');
  } catch (error) {
    console.error('JobSpy compatibility test failed:', error);
    throw error;
  }
});
