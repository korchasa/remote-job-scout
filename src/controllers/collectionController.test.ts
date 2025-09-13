/**
 * Unit tests for CollectionController
 */

import { expect, test } from 'vitest';
import { CollectionController } from './collectionController.ts';
import type { SearchRequest } from '../types/database.ts';

test('CollectionController - initialization', () => {
  const controller = new CollectionController();
  expect(controller).toBeDefined();
});

test('CollectionController - start collection', async () => {
  const controller = new CollectionController();

  const mockRequest: SearchRequest = {
    session_id: 'test-session',
    settings: {
      searchPositions: ['Software Developer'],
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

  expect(response).toBeDefined();
  expect(response.session_id).toBe('test-session');
  expect(response.message).toBeDefined();
  expect(response.success).toBe(true);
});

test('CollectionController - get collection progress', () => {
  const controller = new CollectionController();

  // Test with non-existent session
  const progress = controller.getCollectionProgress('non-existent');
  expect(progress).toBe(null);
});

test('CollectionController - stop collection', () => {
  const controller = new CollectionController();

  const result = controller.stopCollection('non-existent');
  expect(result).toBeDefined();
  expect(result.success).toBe(false);
  expect(result.message).toBeDefined();
});

test('CollectionController - get collection stats', () => {
  const controller = new CollectionController();

  const stats = controller.getCollectionStats('non-existent');
  expect(stats).toBeDefined();
  expect(stats.sessionId).toBe('non-existent');
  expect(stats.isActive).toBe(false);
});
