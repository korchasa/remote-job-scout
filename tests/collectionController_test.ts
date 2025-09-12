/**
 * Unit tests for CollectionController
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { CollectionController } from "../src/controllers/collectionController.ts";
import { SearchRequest } from "../src/types/database.ts";

Deno.test("CollectionController - initialization", () => {
  const controller = new CollectionController();
  assertExists(controller);
});

Deno.test("CollectionController - start collection", async () => {
  const controller = new CollectionController();

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
        jobSites: [], // Empty sources to avoid network calls
      },
      llm: {
        enrichmentInstructions: [],
        processingRules: [],
      },
    },
  };

  const response = await controller.startCollection(mockRequest);

  assertExists(response);
  assertEquals(response.session_id, "test-session");
  assertExists(response.message);
  assertEquals(response.success, true);
});

Deno.test("CollectionController - get collection progress", () => {
  const controller = new CollectionController();

  // Test with non-existent session
  const progress = controller.getCollectionProgress("non-existent");
  assertEquals(progress, null);
});

Deno.test("CollectionController - stop collection", () => {
  const controller = new CollectionController();

  const result = controller.stopCollection("non-existent");
  assertExists(result);
  assertEquals(result.success, false);
  assertExists(result.message);
});

Deno.test("CollectionController - get collection stats", () => {
  const controller = new CollectionController();

  const stats = controller.getCollectionStats("non-existent");
  assertExists(stats);
  assertEquals(stats.sessionId, "non-existent");
  assertEquals(stats.isActive, false);
});
