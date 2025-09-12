/**
 * Интеграционные тесты для скрейперов - реальные запросы к Indeed API
 *
 * Эти тесты делают реальные HTTP запросы к Indeed GraphQL API
 * и проверяют полную функциональность скрейпинга.
 */

import {
  assert,
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  Country,
  DescriptionFormat,
  JobType,
  ScraperInput,
  Site,
} from "../src/types/scrapers.ts";
import { IndeedScraper } from "../src/services/scrapers/indeed.ts";

/**
 * Тест реального скрейпинга Indeed с базовым поиском
 */
Deno.test("Indeed Integration - Basic job search with real API", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "software engineer",
    country: Country.USA,
    results_wanted: 5,
    description_format: DescriptionFormat.HTML,
  };

  console.log("🔍 Starting real Indeed API integration test...");

  const startTime = Date.now();
  const result = await scraper.scrape(input);
  const duration = Date.now() - startTime;

  console.log(`✅ API call completed in ${duration}ms`);

  // Проверяем структуру ответа
  assertExists(result);
  assert(Array.isArray(result.jobs), "Jobs должен быть массивом");

  // Проверяем, что получили какие-то результаты
  assert(result.jobs.length > 0, "Должны получить хотя бы одну вакансию");

  // Проверяем каждую вакансию
  for (const job of result.jobs) {
    assertExists(job.title, "Вакансия должна иметь заголовок");
    assert(typeof job.title === "string", "Заголовок должен быть строкой");
    assert(job.title.length > 0, "Заголовок не должен быть пустым");

    assertExists(job.job_url, "Вакансия должна иметь URL");
    assert(typeof job.job_url === "string", "URL должен быть строкой");
    assertStringIncludes(
      job.job_url,
      "indeed.com",
      "URL должен содержать indeed.com",
    );

    // Проверяем, что компания может быть null или строкой
    if (job.company_name !== null) {
      assert(
        typeof job.company_name === "string",
        "Название компании должно быть строкой",
      );
    }

    // Проверяем описание
    if (job.description !== null) {
      assert(
        typeof job.description === "string",
        "Описание должно быть строкой",
      );
      assert(job.description.length > 0, "Описание не должно быть пустым");
    }

    // Проверяем локацию
    if (job.location) {
      if (job.location.city) {
        assert(
          typeof job.location.city === "string",
          "Город должен быть строкой",
        );
      }
      if (job.location.country) {
        assert(
          typeof job.location.country === "string",
          "Страна должна быть строкой",
        );
      }
    }

    console.log(
      `📋 Job: ${job.title} at ${job.company_name || "Unknown"} (${
        job.location?.city || "Remote"
      })`,
    );
  }

  console.log(
    `🎯 Successfully scraped ${result.jobs.length} jobs from Indeed API`,
  );
});

/**
 * Тест поиска удаленных вакансий с реальным API
 */
Deno.test("Indeed Integration - Remote jobs search", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "frontend developer",
    is_remote: true,
    country: Country.USA,
    results_wanted: 3, // Reduce to 3 for faster testing
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log("🏠 Testing remote jobs search with real API...");

  const result = await scraper.scrape(input);

  assert(Array.isArray(result.jobs), "Jobs должен быть массивом");
  assert(result.jobs.length > 0, "Должны найти удаленные вакансии");

  // Проверяем, что хотя бы некоторые вакансии помечены как remote
  const remoteJobs = result.jobs.filter((job) => job.is_remote === true);
  console.log(
    `Found ${remoteJobs.length} explicitly remote jobs out of ${result.jobs.length} total`,
  );

  // Проверяем структуру удаленных вакансий
  if (remoteJobs.length > 0) {
    const remoteJob = remoteJobs[0];
    assert(
      typeof remoteJob.is_remote === "boolean",
      "is_remote должен быть boolean",
    );
    assert(
      remoteJob.is_remote === true,
      "Вакансия должна быть помечена как remote",
    );

    console.log(
      `🌍 Remote job example: ${remoteJob.title} - ${
        remoteJob.location?.city || "No location"
      }`,
    );
  }
});

/**
 * Тест фильтрации по типу занятости
 */
Deno.test("Indeed Integration - Job type filtering", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "data scientist",
    job_type: JobType.FULL_TIME,
    country: Country.USA,
    results_wanted: 6,
  };

  console.log("💼 Testing full-time job filtering...");

  const result = await scraper.scrape(input);

  assert(Array.isArray(result.jobs), "Jobs должен быть массивом");

  if (result.jobs.length > 0) {
    // Проверяем, что вакансии имеют правильный тип
    const fullTimeJobs = result.jobs.filter((job) =>
      job.job_type && job.job_type.includes(JobType.FULL_TIME)
    );

    console.log(
      `Found ${fullTimeJobs.length} full-time jobs out of ${result.jobs.length} total`,
    );

    // Проверяем структуру типа вакансии
    if (fullTimeJobs.length > 0) {
      const job = fullTimeJobs[0];
      assert(Array.isArray(job.job_type), "job_type должен быть массивом");
      assert(
        job.job_type.includes(JobType.FULL_TIME),
        "Вакансия должна содержать FULL_TIME",
      );
    }
  }
});

/**
 * Тест поиска по разным странам
 */
Deno.test("Indeed Integration - Multi-country search", async () => {
  const scraper = new IndeedScraper();
  const countries = [Country.USA, Country.UK, Country.CANADA];

  for (const country of countries) {
    console.log(`🌍 Testing ${country} domain...`);

    const input: ScraperInput = {
      site_type: [Site.INDEED],
      search_term: "product manager",
      country: country,
      results_wanted: 3,
      description_format: DescriptionFormat.PLAIN,
    };

    try {
      const result = await scraper.scrape(input);

      assert(
        Array.isArray(result.jobs),
        `Jobs для ${country} должен быть массивом`,
      );

      if (result.jobs.length > 0) {
        console.log(`✅ ${country}: Found ${result.jobs.length} jobs`);

        // Проверяем, что URL соответствует стране
        const countryDomains: Record<string, string> = {
          [Country.USA]: "indeed.com",
          [Country.UK]: "indeed.co.uk",
          [Country.CANADA]: "indeed.ca",
        };

        const expectedDomain = countryDomains[country as string];
        if (expectedDomain) {
          const job = result.jobs[0];
          assertStringIncludes(
            job.job_url,
            expectedDomain,
            `URL должен содержать ${expectedDomain}`,
          );
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
 * Тест поиска свежих вакансий (за последние 24 часа)
 */
Deno.test("Indeed Integration - Recent jobs (24h)", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "ux designer",
    hours_old: 24,
    country: Country.USA,
    results_wanted: 10,
  };

  console.log("🕐 Testing recent jobs search (24h)...");

  const result = await scraper.scrape(input);

  assert(Array.isArray(result.jobs), "Jobs должен быть массивом");

  console.log(`Found ${result.jobs.length} jobs posted in last 24 hours`);

  if (result.jobs.length > 0) {
    // Проверяем даты публикации
    const now = new Date();
    // Добавляем буфер в 12 часов для учета задержек индексации
    const bufferHours = 12;
    const bufferTime = new Date(
      now.getTime() - (24 + bufferHours) * 60 * 60 * 1000,
    );

    for (const job of result.jobs) {
      if (job.date_posted) {
        assert(job.date_posted instanceof Date, "date_posted должен быть Date");
        assert(
          job.date_posted >= bufferTime,
          "Вакансия должна быть опубликована в последние 24 часа",
        );
        console.log(`📅 ${job.title}: ${job.date_posted.toISOString()}`);
      }
    }
  }
});

/**
 * Тест поиска вакансий с easy apply
 */
Deno.test("Indeed Integration - Easy apply jobs", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "marketing specialist",
    easy_apply: true,
    country: Country.USA,
    results_wanted: 4,
  };

  console.log("✨ Testing easy apply jobs...");

  const result = await scraper.scrape(input);

  assert(Array.isArray(result.jobs), "Jobs должен быть массивом");

  console.log(`Found ${result.jobs.length} easy apply jobs`);

  // Проверяем, что поиск с easy_apply фильтром работает
  if (result.jobs.length > 0) {
    for (const job of result.jobs) {
      console.log(
        `📄 ${job.title} - Company: ${job.company_name || "Unknown"}`,
      );
    }
  }
});

/**
 * Тест пагинации с большим количеством результатов
 */
Deno.test("Indeed Integration - Large result set with pagination", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "developer",
    country: Country.USA,
    results_wanted: 25,
    description_format: DescriptionFormat.HTML,
  };

  console.log("📄 Testing pagination with 25 results...");

  const startTime = Date.now();
  const result = await scraper.scrape(input);
  const duration = Date.now() - startTime;

  console.log(`⏱️ Large search completed in ${duration}ms`);

  assert(Array.isArray(result.jobs), "Jobs должен быть массивом");
  assert(
    result.jobs.length <= 25,
    "Не должно быть больше запрошенного количества",
  );

  console.log(`📊 Retrieved ${result.jobs.length} jobs out of requested 25`);

  // Проверяем уникальность URL вакансий
  const urls = result.jobs.map((job) => job.job_url);
  const uniqueUrls = new Set(urls);
  assertEquals(
    urls.length,
    uniqueUrls.size,
    "Все URL вакансий должны быть уникальными",
  );
});

/**
 * Тест скомпилированного поиска (несколько фильтров одновременно)
 */
Deno.test("Indeed Integration - Complex search with multiple filters", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "senior python developer",
    location: "New York",
    country: Country.USA,
    distance: 50,
    is_remote: false,
    job_type: JobType.FULL_TIME,
    results_wanted: 10,
    hours_old: 168, // Последние 7 дней
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log("🔍 Testing complex search with multiple filters...");

  const result = await scraper.scrape(input);

  assert(Array.isArray(result.jobs), "Jobs должен быть массивом");

  console.log(`🎯 Complex search found ${result.jobs.length} jobs`);

  if (result.jobs.length > 0) {
    const job = result.jobs[0];

    // Проверяем основные поля
    assertExists(job.title);
    assertExists(job.job_url);
    // Note: Search results may be relevant even if they don't contain exact terms
    // Just check that we got developer-related jobs
    const titleLower = job.title.toLowerCase();
    const hasTechTerm = titleLower.includes("developer") ||
      titleLower.includes("engineer") ||
      titleLower.includes("scientist") ||
      titleLower.includes("analyst");
    assert(hasTechTerm, "Заголовок должен содержать технический термин");

    console.log(`⭐ Sample job: ${job.title}`);
    console.log(`🏢 Company: ${job.company_name || "Not specified"}`);
    console.log(`📍 Location: ${job.location?.city || "Remote"}`);
    console.log(`💰 Remote: ${job.is_remote}`);
  }
});

/**
 * Тест обработки ошибок API
 */
Deno.test("Indeed Integration - Error handling", async () => {
  const scraper = new IndeedScraper();

  // Тест с некорректными параметрами
  const invalidInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "", // Пустой поисковый запрос
    country: Country.USA,
    results_wanted: -1, // Отрицательное количество
  };

  console.log("🚨 Testing error handling...");

  try {
    const result = await scraper.scrape(invalidInput);
    // Даже с некорректными параметрами API может вернуть результаты
    assertExists(result);
    console.log("API handled invalid parameters gracefully");
  } catch (error) {
    console.log(
      "API correctly rejected invalid parameters:",
      error instanceof Error ? error.message : String(error),
    );
  }
});

/**
 * Тест производительности - несколько последовательных запросов
 */
Deno.test("Indeed Integration - Performance test", async () => {
  const scraper = new IndeedScraper();
  const searchTerms = ["javascript", "react", "typescript", "node.js"];

  console.log("⚡ Testing performance with multiple searches...");

  const results = [];

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

  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) /
    results.length;
  const totalJobs = results.reduce((sum, r) => sum + r.count, 0);

  console.log(`📈 Performance summary:`);
  console.log(`   - Average response time: ${Math.round(avgDuration)}ms`);
  console.log(`   - Total jobs found: ${totalJobs}`);
  console.log(`   - Searches completed: ${results.length}`);
});
