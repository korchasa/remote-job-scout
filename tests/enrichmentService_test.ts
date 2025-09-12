/**
 * Enrichment Service Tests
 */

import { assertEquals, assert } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { EnrichmentService, EnrichmentResult } from "../src/services/enrichmentService.ts";
import { Vacancy, SearchRequest } from "../src/types/database.ts";

Deno.test("EnrichmentService - handles missing API key", async () => {
  const enrichmentService = new EnrichmentService();

  const vacancies: Vacancy[] = [
    {
      id: "1",
      title: "Software Engineer",
      description: "Great job opportunity",
      url: "https://example.com/job1",
      published_date: "2024-01-01",
      status: "filtered",
      created_at: new Date().toISOString(),
      source: "linkedin",
      country: "USA",
    },
  ];

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
      openaiWebSearch: {
        apiKey: "", // Empty API key
        searchSites: ["linkedin.com"],
        globalSearch: false,
      },
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  assert(!result.success, "Should fail without API key");
  assert(result.errors.length > 0, "Should have error message");
  assertEquals(result.enrichedCount, 0, "Should not enrich any vacancies");
});

Deno.test("EnrichmentService - processes vacancies without enrichment", async () => {
  const enrichmentService = new EnrichmentService();
  enrichmentService.setOpenAIKey("test-key"); // Set API key to avoid early return

  const vacancies: Vacancy[] = [
    {
      id: "1",
      title: "Software Engineer",
      description: "Great job opportunity",
      url: "https://example.com/job1",
      published_date: "2024-01-01",
      status: "filtered",
      created_at: new Date().toISOString(),
      source: "linkedin",
      country: "USA",
    },
  ];

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
      openaiWebSearch: {
        apiKey: "test-key",
        searchSites: ["linkedin.com"],
        globalSearch: false,
      },
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  // Mock the OpenAI call to simulate failure
  const originalCallOpenAI = (enrichmentService as any).callOpenAI;
  (enrichmentService as any).callOpenAI = async () => ({
    success: false,
    error: "Mock API failure",
  });

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  // Restore original method
  (enrichmentService as any).callOpenAI = originalCallOpenAI;

  // The service should still succeed overall, but record the failure
  assert(result.success, "Should succeed even with API failures");
  assertEquals(result.enrichedCount, 0, "Should not enrich any vacancies due to mock failure");
  assertEquals(result.failedCount, 1, "Should count failed enrichments");
  assertEquals(result.enrichedVacancies.length, 1, "Should return original vacancy");
});

Deno.test("EnrichmentService - parses vacancy data correctly", async () => {
  const enrichmentService = new EnrichmentService();

  const vacancy: Vacancy = {
    id: "1",
    title: "Software Engineer",
    description: "Great job",
    url: "https://example.com/job1",
    published_date: "2024-01-01",
    status: "filtered",
    created_at: new Date().toISOString(),
    source: "linkedin",
    country: "USA",
    data: JSON.stringify({
      company: "Test Company",
      location: "New York, USA",
    }),
  };

  const parsedData = (enrichmentService as any).parseVacancyData(vacancy);

  assertEquals(parsedData.company, "Test Company");
  assertEquals(parsedData.location, "New York, USA");
});

Deno.test("EnrichmentService - handles malformed vacancy data", async () => {
  const enrichmentService = new EnrichmentService();

  const vacancy: Vacancy = {
    id: "1",
    title: "Software Engineer",
    description: "Great job",
    url: "https://example.com/job1",
    published_date: "2024-01-01",
    status: "filtered",
    created_at: new Date().toISOString(),
    source: "linkedin",
    country: "USA",
    data: "invalid json",
  };

  const parsedData = (enrichmentService as any).parseVacancyData(vacancy);

  assertEquals(typeof parsedData, "object", "Should return object for malformed data");
  assert(Object.keys(parsedData).length === 0, "Should return empty object for malformed data");
});

Deno.test("EnrichmentService - builds correct enrichment prompt", async () => {
  const enrichmentService = new EnrichmentService();

  const vacancy: Vacancy = {
    id: "1",
    title: "Senior Software Engineer",
    description: "We are looking for an experienced developer",
    url: "https://example.com/job1",
    published_date: "2024-01-01",
    status: "filtered",
    created_at: new Date().toISOString(),
    source: "linkedin",
    country: "USA",
    data: JSON.stringify({ company: "Test Corp" }),
  };

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
      enrichmentInstructions: ["Extract company information"],
      processingRules: [],
    },
  };

  const prompt = (enrichmentService as any).buildEnrichmentPrompt(vacancy, settings);

  assert(prompt.includes("Senior Software Engineer"), "Should include job title");
  assert(prompt.includes("Test Corp"), "Should include company name");
  assert(prompt.includes("JSON format"), "Should specify JSON output format");
});

Deno.test("EnrichmentService - handles empty vacancies array", async () => {
  const enrichmentService = new EnrichmentService();
  enrichmentService.setOpenAIKey("test-key");

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
      openaiWebSearch: {
        apiKey: "test-key",
        searchSites: ["linkedin.com"],
        globalSearch: false,
      },
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result = await enrichmentService.enrichVacancies([], settings);

  assert(result.success, "Should handle empty array");
  assertEquals(result.totalProcessed, 0);
  assertEquals(result.enrichedCount, 0);
  assertEquals(result.failedCount, 0);
});
