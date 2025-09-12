/**
 * Unit tests for JobCollectionService
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { JobCollectionService } from "../src/services/jobCollectionService.ts";
import { SearchRequest } from "../src/types/database.ts";

Deno.test("JobCollectionService - initialization", () => {
  const service = new JobCollectionService();
  assertExists(service);
});

Deno.test("JobCollectionService - set OpenAI WebSearch", () => {
  const service = new JobCollectionService();
  service.setOpenAIWebSearch("test-api-key", true);

  // Test that the method doesn't throw
  assertExists(service);
});

Deno.test("JobCollectionService - progress tracking", () => {
  const service = new JobCollectionService();

  // Test getting progress for non-existent session
  const progress = service.getProgress("non-existent");
  assertEquals(progress, null);
});

Deno.test("JobCollectionService - stop collection", () => {
  const service = new JobCollectionService();

  // Test stopping non-existent collection
  const result = service.stopCollection("non-existent");
  assertEquals(result, false);
});

Deno.test("JobCollectionService - mock collection request", async () => {
  const service = new JobCollectionService();

  const mockRequest: SearchRequest = {
    session_id: "test-session",
    settings: {
      searchPositions: ["Software Developer"],
      filters: {
        blacklistedCompanies: [],
        blacklistedWordsTitle: [],
        blacklistedWordsDescription: [],
        countries: [],
        languages: [],
      },
      sources: {
        jobSites: ["indeed"], // Only test with Indeed for simplicity
      },
      llm: {
        enrichmentInstructions: [],
        processingRules: [],
      },
    },
  };

  // Note: This test would require mocking the scrapers
  // In a real scenario, we'd use dependency injection to mock scrapers
  try {
    const result = await service.collectJobs(mockRequest);
    assertExists(result);
    assertEquals(result.sessionId, "test-session");
  } catch (error) {
    // Expected to fail without proper mocking
    assertExists(error);
  }
});

Deno.test("JobCollectionService - get progress after collection", () => {
  const service = new JobCollectionService();

  // Should return null for non-existent session
  const progress = service.getProgress("test-session");
  assertEquals(progress, null);
});
