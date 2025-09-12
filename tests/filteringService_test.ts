/**
 * Filtering Service Tests
 */

import { assertEquals, assert } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { FilteringService, FilteringResult } from "../src/services/filteringService.ts";
import { Vacancy, SearchRequest } from "../src/types/database.ts";

Deno.test("FilteringService - filters vacancies correctly", async () => {
  const filteringService = new FilteringService();

  // Create test vacancies
  const vacancies: Vacancy[] = [
    {
      id: "1",
      title: "Senior Software Engineer",
      description: "We need a senior developer with 5+ years experience",
      url: "https://example.com/job1",
      published_date: "2024-01-01",
      status: "collected",
      created_at: new Date().toISOString(),
      source: "linkedin",
      country: "USA",
    },
    {
      id: "2",
      title: "Frontend Developer",
      description: "Looking for a junior frontend developer",
      url: "https://example.com/job2",
      published_date: "2024-01-01",
      status: "collected",
      created_at: new Date().toISOString(),
      source: "indeed",
      country: "Canada",
    },
    {
      id: "3",
      title: "Software Engineer",
      description: "Remote software engineer position with English fluency required",
      url: "https://example.com/job3",
      published_date: "2024-01-01",
      status: "collected",
      created_at: new Date().toISOString(),
      source: "glassdoor",
      country: "UK",
    },
  ];

  // Create test settings
  const settings: SearchRequest["settings"] = {
    searchPositions: ["Software Engineer", "Frontend Developer"],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: ["senior"],
      blacklistedWordsDescription: ["agile", "scrum"],
      countries: [{ name: "Canada", type: "blacklist" }],
      languages: [{ language: "English", level: "Intermediate" }],
    },
    sources: {
      jobSites: ["linkedin", "indeed"],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: FilteringResult = await filteringService.filterVacancies(vacancies, settings);

  // Assertions
  assert(result.success, "Filtering should succeed");
  assertEquals(result.totalProcessed, 3, "Should process all vacancies");
  assertEquals(result.filteredCount, 1, "Should filter out senior and Canadian jobs");
  assertEquals(result.skippedCount, 2, "Should skip 2 jobs");

  // Check that job with "senior" in title was skipped
  assert(result.reasons.title_blacklisted_words !== undefined, "Should have title blacklist reason");
  assertEquals(result.reasons.title_blacklisted_words, 1, "Should skip 1 job due to title blacklist");

  // Check that Canadian job was skipped
  assert(result.reasons.country_filter !== undefined, "Should have country filter reason");
  assertEquals(result.reasons.country_filter, 1, "Should skip 1 job due to country filter");
});

Deno.test("FilteringService - handles empty vacancies", async () => {
  const filteringService = new FilteringService();
  const settings: SearchRequest["settings"] = {
    searchPositions: ["Software Engineer"],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ["linkedin"],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result = await filteringService.filterVacancies([], settings);

  assert(result.success, "Should handle empty array");
  assertEquals(result.totalProcessed, 0);
  assertEquals(result.filteredCount, 0);
  assertEquals(result.skippedCount, 0);
});

Deno.test("FilteringService - company blacklist works", async () => {
  const filteringService = new FilteringService();

  const vacancy: Vacancy = {
    id: "1",
    title: "Software Engineer",
    description: "Great job opportunity",
    url: "https://example.com/job1",
    published_date: "2024-01-01",
    status: "collected",
    created_at: new Date().toISOString(),
    source: "linkedin",
    country: "USA",
    data: JSON.stringify({ company: "Blacklisted Corp" }),
  };

  const settings: SearchRequest["settings"] = {
    searchPositions: ["Software Engineer"],
    filters: {
      blacklistedCompanies: ["Blacklisted Corp", "Another Company"],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ["linkedin"],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result = await filteringService.filterVacancies([vacancy], settings);

  assertEquals(result.filteredCount, 0, "Should filter out blacklisted company");
  assertEquals(result.skippedCount, 1, "Should skip the blacklisted company");
  assert(result.reasons.company_blacklisted !== undefined, "Should have company blacklist reason");
});

Deno.test("FilteringService - handles malformed vacancy data", async () => {
  const filteringService = new FilteringService();

  const vacancy: Vacancy = {
    id: "1",
    title: "Software Engineer",
    description: "Great job",
    url: "https://example.com/job1",
    published_date: "2024-01-01",
    status: "collected",
    created_at: new Date().toISOString(),
    source: "linkedin",
    country: "USA",
    data: "invalid json", // Malformed JSON
  };

  const settings: SearchRequest["settings"] = {
    searchPositions: ["Software Engineer"],
    filters: {
      blacklistedCompanies: ["Test Company"],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ["linkedin"],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result = await filteringService.filterVacancies([vacancy], settings);

  // Should still work even with malformed data
  assert(result.success, "Should handle malformed JSON gracefully");
  assertEquals(result.filteredCount, 1, "Should include job when company data is malformed");
});
