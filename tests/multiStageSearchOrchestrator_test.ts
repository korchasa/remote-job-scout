/**
 * Multi-Stage Search Orchestrator Tests
 */

import { assertEquals, assert } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { MultiStageSearchOrchestrator } from "../src/services/multiStageSearchOrchestrator.ts";

Deno.test("MultiStageSearchOrchestrator - initializes correctly", () => {
  const orchestrator = new MultiStageSearchOrchestrator();

  assert(orchestrator instanceof MultiStageSearchOrchestrator, "Should create orchestrator instance");
});

Deno.test("MultiStageSearchOrchestrator - handles missing progress", () => {
  const orchestrator = new MultiStageSearchOrchestrator();

  const progress = orchestrator.getProgress("non-existent-session");

  assertEquals(progress, null, "Should return null for non-existent session");
});

Deno.test("MultiStageSearchOrchestrator - stop non-existent process", () => {
  const orchestrator = new MultiStageSearchOrchestrator();

  const result = orchestrator.stopProcess("non-existent-session");

  assert(!result, "Should return false for non-existent process");
});

Deno.test("MultiStageSearchOrchestrator - basic functionality", () => {
  const orchestrator = new MultiStageSearchOrchestrator();

  // Test basic initialization and properties
  assert(orchestrator !== null, "Orchestrator should be created");
  assert(typeof orchestrator.startMultiStageSearch === "function", "Should have startMultiStageSearch method");
  assert(typeof orchestrator.getProgress === "function", "Should have getProgress method");
  assert(typeof orchestrator.stopProcess === "function", "Should have stopProcess method");
});