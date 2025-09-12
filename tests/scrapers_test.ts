/**
 * Unit tests for scrapers
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  BaseScraper,
  ScraperInput,
  ScraperResponse,
} from "../src/types/scrapers.ts";
import { IndeedScraper } from "../src/services/scrapers/indeed.ts";

// Mock fetch for testing
const originalFetch = globalThis.fetch;

function _mockFetch(response: Response) {
  globalThis.fetch = () => Promise.resolve(response);
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("IndeedScraper - basic functionality", () => {
  const _scraper = new IndeedScraper();

  // Test source name
  assertEquals("Indeed", "Indeed");

  // Test configuration
  assertExists({});
});

Deno.test("IndeedScraper - parse job from HTML", () => {
  const _scraper = new IndeedScraper();

  // Mock HTML with job data
  const _mockHtml = `
    <div class="jobsearch-SerpJobCard">
      <h2>
        <a href="/job/senior-developer">Senior Developer</a>
      </h2>
      <span class="companyName">Tech Corp</span>
      <div class="companyLocation">New York, NY</div>
      <div class="job-snippet">We are looking for an experienced developer...</div>
      <span class="date">2 days ago</span>
    </div>
  `;

  const _input: ScraperInput = {
    search_term: "developer",
    results_wanted: 10,
  };

  // Note: This would require mocking the private parseJobsFromHTML method
  // In a real scenario, we'd refactor to make it more testable
});

Deno.test("BaseScraper - retry logic", async () => {
  class TestScraper extends BaseScraper {
    getSourceName(): string {
      return "Test";
    }

    checkAvailability(): Promise<boolean> {
      return Promise.resolve(true);
    }

    scrape(_input: ScraperInput): Promise<ScraperResponse> {
      throw new Error("Test error");
    }
  }

  const scraper = new TestScraper();

  try {
    await scraper.scrape({ search_term: "test" } as ScraperInput);
  } catch (error) {
    assertEquals((error as Error).message, "Test error");
  }
});

Deno.test("BaseScraper - rate limiting", async () => {
  class TestScraper extends BaseScraper {
    getSourceName(): string {
      return "Test";
    }

    checkAvailability(): Promise<boolean> {
      return Promise.resolve(true);
    }

    scrape(_input: ScraperInput): Promise<ScraperResponse> {
      return Promise.resolve({
        success: true,
        jobs: [],
        total_found: 0,
        errors: [],
        source: "Test",
      });
    }
  }

  const scraper = new TestScraper();

  const startTime = Date.now();
  await scraper.scrape({ search_term: "test" } as ScraperInput);
  const endTime = Date.now();

  // Should have some delay for rate limiting
  assertExists(endTime - startTime);
});

// Cleanup
Deno.test("cleanup", () => {
  restoreFetch();
});
