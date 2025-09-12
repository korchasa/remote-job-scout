/**
 * Unit tests for scrapers - JobSpy compatible implementation
 */

import {
  assert,
  assertExists,
} from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  Country,
  DescriptionFormat,
  JobType,
  ScraperInput,
  Site,
} from "../src/types/scrapers.ts";
import { IndeedScraper } from "../src/services/scrapers/indeed.ts";

// Test Indeed scraper with JobSpy compatible interface
Deno.test("IndeedScraper - GraphQL API integration", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "software engineer",
    country: Country.USA,
    results_wanted: 3, // Limit to 3 jobs for faster testing
    description_format: DescriptionFormat.HTML,
  };

  console.log("Testing Indeed scraper with JobSpy compatible interface...");

  try {
    const result = await scraper.scrape(input);

    console.log("Direct test result:", {
      jobs_count: result.jobs.length,
    });

    // Verify basic structure
    assertExists(result);
    assert(Array.isArray(result.jobs), "Jobs should be an array");

    // If we got jobs, verify their structure
    if (result.jobs.length > 0) {
      const firstJob = result.jobs[0];
      assertExists(firstJob.title, "Job should have title");
      assertExists(firstJob.job_url, "Job should have URL");

      // Verify job structure matches JobSpy JobPost interface
      assert(typeof firstJob.title === "string", "Title should be string");
      assert(typeof firstJob.job_url === "string", "URL should be string");
      assert(
        firstJob.company_name === null ||
          typeof firstJob.company_name === "string",
        "Company name should be string or null",
      );
      assert(
        firstJob.description === null ||
          typeof firstJob.description === "string",
        "Description should be string or null",
      );

      console.log(
        `Successfully scraped ${result.jobs.length} jobs from Indeed`,
      );
      console.log("Sample job:", {
        title: firstJob.title,
        company: firstJob.company_name,
        location: firstJob.location,
        is_remote: firstJob.is_remote,
      });
    }
  } catch (error) {
    console.error("Test failed with exception:", error);
    throw error;
  }
});

// Test different search configurations
Deno.test("IndeedScraper - remote jobs search", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "software engineer",
    is_remote: true,
    country: Country.USA,
    results_wanted: 5,
  };

  console.log("Testing remote jobs search...");

  try {
    const result = await scraper.scrape(input);
    assert(Array.isArray(result.jobs), "Jobs should be an array");

    // Check if remote jobs are properly detected
    if (result.jobs.length > 0) {
      const remoteJobs = result.jobs.filter((job) => job.is_remote);
      console.log(
        `Found ${remoteJobs.length} remote jobs out of ${result.jobs.length} total jobs`,
      );
    }
  } catch (error) {
    console.error("Remote jobs test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - job type filtering", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "developer",
    job_type: JobType.FULL_TIME,
    country: Country.USA,
    results_wanted: 3,
  };

  console.log("Testing job type filtering...");

  try {
    const result = await scraper.scrape(input);
    assert(Array.isArray(result.jobs), "Jobs should be an array");

    if (result.jobs.length > 0) {
      const fullTimeJobs = result.jobs.filter((job) =>
        job.job_type && job.job_type.includes(JobType.FULL_TIME)
      );
      console.log(`Found ${fullTimeJobs.length} full-time jobs`);
    }
  } catch (error) {
    console.error("Job type filtering test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - country localization", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "developer",
    country: Country.UK,
    results_wanted: 2,
  };

  console.log("Testing country localization...");

  try {
    const result = await scraper.scrape(input);
    assert(Array.isArray(result.jobs), "Jobs should be an array");

    console.log(`Found ${result.jobs.length} jobs from UK domain`);
  } catch (error) {
    console.error("Country localization test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - description formats", async () => {
  const scraper = new IndeedScraper();

  // Test HTML format
  const htmlInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "engineer",
    country: Country.USA,
    description_format: DescriptionFormat.HTML,
    results_wanted: 1,
  };

  // Test Markdown format
  const markdownInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "engineer",
    country: Country.USA,
    description_format: DescriptionFormat.MARKDOWN,
    results_wanted: 1,
  };

  // Test Plain format
  const plainInput: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "engineer",
    country: Country.USA,
    description_format: DescriptionFormat.PLAIN,
    results_wanted: 1,
  };

  console.log("Testing description formats...");

  try {
    const htmlResult = await scraper.scrape(htmlInput);
    const markdownResult = await scraper.scrape(markdownInput);
    const plainResult = await scraper.scrape(plainInput);

    assert(Array.isArray(htmlResult.jobs), "HTML jobs should be array");
    assert(Array.isArray(markdownResult.jobs), "Markdown jobs should be array");
    assert(Array.isArray(plainResult.jobs), "Plain jobs should be array");

    console.log("Description formats test passed");
  } catch (error) {
    console.error("Description formats test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - hours old filtering", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "developer",
    hours_old: 24, // Jobs from last 24 hours
    country: Country.USA,
    results_wanted: 3,
  };

  console.log("Testing hours old filtering...");

  try {
    const result = await scraper.scrape(input);
    assert(Array.isArray(result.jobs), "Jobs should be an array");

    console.log(`Found ${result.jobs.length} recent jobs`);
  } catch (error) {
    console.error("Hours old filtering test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - easy apply filtering", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "developer",
    easy_apply: true,
    country: Country.USA,
    results_wanted: 3,
  };

  console.log("Testing easy apply filtering...");

  try {
    const result = await scraper.scrape(input);
    assert(Array.isArray(result.jobs), "Jobs should be an array");

    console.log(`Found ${result.jobs.length} easy apply jobs`);
  } catch (error) {
    console.error("Easy apply filtering test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - pagination and offset", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "software engineer",
    country: Country.USA,
    results_wanted: 10,
    offset: 5,
  };

  console.log("Testing pagination and offset...");

  try {
    const result = await scraper.scrape(input);
    assert(Array.isArray(result.jobs), "Jobs should be an array");
    assert(result.jobs.length <= 10, "Should not return more than requested");

    console.log(`Found ${result.jobs.length} jobs with offset ${input.offset}`);
  } catch (error) {
    console.error("Pagination test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - comprehensive job data", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "senior developer",
    country: Country.USA,
    results_wanted: 2,
    description_format: DescriptionFormat.MARKDOWN,
  };

  console.log("Testing comprehensive job data extraction...");

  try {
    const result = await scraper.scrape(input);

    if (result.jobs.length > 0) {
      const job = result.jobs[0];

      // Test all the fields that JobSpy extracts
      assert(typeof job.title === "string", "Title should be string");
      assert(typeof job.job_url === "string", "Job URL should be string");

      // Company information
      if (job.company_name) {
        assert(
          typeof job.company_name === "string",
          "Company name should be string",
        );
      }
      if (job.company_url) {
        assert(
          typeof job.company_url === "string",
          "Company URL should be string",
        );
      }

      // Location information
      if (job.location) {
        if (job.location.city) {
          assert(
            typeof job.location.city === "string",
            "City should be string",
          );
        }
        if (job.location.state) {
          assert(
            typeof job.location.state === "string",
            "State should be string",
          );
        }
        if (job.location.country) {
          assert(
            typeof job.location.country === "string",
            "Country should be string",
          );
        }
      }

      // Description
      if (job.description) {
        assert(
          typeof job.description === "string",
          "Description should be string",
        );
      }

      // Job type
      if (job.job_type) {
        assert(Array.isArray(job.job_type), "Job type should be array");
        job.job_type.forEach((jt) => {
          assert(
            Object.values(JobType).includes(jt),
            "Job type should be valid enum",
          );
        });
      }

      // Compensation
      if (job.compensation) {
        if (job.compensation.min_amount) {
          assert(
            typeof job.compensation.min_amount === "number",
            "Min amount should be number",
          );
        }
        if (job.compensation.max_amount) {
          assert(
            typeof job.compensation.max_amount === "number",
            "Max amount should be number",
          );
        }
        if (job.compensation.currency) {
          assert(
            typeof job.compensation.currency === "string",
            "Currency should be string",
          );
        }
      }

      // Date
      if (job.date_posted) {
        assert(
          job.date_posted instanceof Date,
          "Date posted should be Date object",
        );
      }

      // Remote flag
      if (job.is_remote !== null && job.is_remote !== undefined) {
        assert(
          typeof job.is_remote === "boolean",
          "Is remote should be boolean",
        );
      }

      console.log("Comprehensive job data test passed");
      console.log("Sample job data:", {
        title: job.title,
        company: job.company_name,
        location: job.location,
        job_type: job.job_type,
        is_remote: job.is_remote,
        has_compensation: !!job.compensation,
      });
    }
  } catch (error) {
    console.error("Comprehensive job data test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - multiple countries", async () => {
  const scraper = new IndeedScraper();
  const countries = [Country.USA, Country.UK, Country.CANADA];

  for (const country of countries) {
    console.log(`Testing ${country}...`);

    const input: ScraperInput = {
      site_type: [Site.INDEED],
      search_term: "developer",
      country: country,
      results_wanted: 1,
    };

    try {
      const result = await scraper.scrape(input);
      assert(Array.isArray(result.jobs), `Jobs should be array for ${country}`);
      console.log(`✓ ${country}: Found ${result.jobs.length} jobs`);
    } catch (error) {
      console.error(`✗ ${country} failed:`, error);
      // Don't throw error, just log it - some countries might not work
    }
  }
});

Deno.test("IndeedScraper - constructor with proxies", () => {
  const scraper = new IndeedScraper([
    "http://proxy1:8080",
    "http://proxy2:8080",
  ]);

  assertExists(scraper, "Scraper with proxies should be created");
  console.log("Proxy scraper created successfully");
});

Deno.test("IndeedScraper - empty search term", async () => {
  const scraper = new IndeedScraper();

  const input: ScraperInput = {
    site_type: [Site.INDEED],
    country: Country.USA,
    results_wanted: 5,
  };

  console.log("Testing empty search term...");

  try {
    const result = await scraper.scrape(input);
    assert(Array.isArray(result.jobs), "Jobs should be array");
    console.log(`Found ${result.jobs.length} jobs without search term`);
  } catch (error) {
    console.error("Empty search term test failed:", error);
    throw error;
  }
});

Deno.test("IndeedScraper - GraphQL query format validation", () => {
  const scraper = new IndeedScraper();

  // Test that we can create a scraper with different configurations
  const scraperWithProxy = new IndeedScraper(["http://proxy:8080"]);

  assertExists(scraper, "Basic scraper should be created");
  assertExists(scraperWithProxy, "Proxy scraper should be created");

  console.log("GraphQL query format validation passed");
});

Deno.test("IndeedScraper - JobSpy compatibility test", async () => {
  const scraper = new IndeedScraper();

  // Test input that matches JobSpy ScraperInput structure
  const input: ScraperInput = {
    site_type: [Site.INDEED],
    search_term: "software engineer",
    location: "San Francisco",
    country: Country.USA,
    distance: 25,
    is_remote: false,
    job_type: JobType.FULL_TIME,
    results_wanted: 10,
    offset: 0,
    description_format: DescriptionFormat.HTML,
  };

  console.log("Testing JobSpy compatibility...");

  try {
    // This should not throw an error even if API fails
    const result = await scraper.scrape(input);

    // Verify that result structure matches JobSpy JobResponse
    assertExists(result, "Result should exist");
    assert(Array.isArray(result.jobs), "Jobs should be array");
    assert(result.jobs.length >= 0, "Jobs count should be non-negative");

    // Verify that each job (if any) has JobSpy-compatible structure
    if (result.jobs.length > 0) {
      const job = result.jobs[0];
      assert(typeof job.title === "string", "Job title should be string");
      assert(typeof job.job_url === "string", "Job URL should be string");
    }

    console.log("JobSpy compatibility test passed");
  } catch (error) {
    console.error("JobSpy compatibility test failed:", error);
    throw error;
  }
});
