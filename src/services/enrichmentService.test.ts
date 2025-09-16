/**
 * Enrichment Service Tests
 */

import { expect, test } from 'vitest';
import type { EnrichmentResult } from './enrichmentService.ts';
import { EnrichmentService } from './enrichmentService.ts';
import type { SearchRequest, Vacancy } from '../types/database.ts';

// Test class to access protected methods
class TestEnrichmentService extends EnrichmentService {
  private mockCallOpenAI?: (
    prompt: string,
  ) => Promise<{ success: boolean; content?: string; error?: string }>;

  // Override the callOpenAI method to allow mocking
  protected override callOpenAI(
    prompt: string,
  ): Promise<{ success: boolean; content?: string; error?: string }> {
    if (this.mockCallOpenAI) {
      return this.mockCallOpenAI(prompt);
    }
    return super.callOpenAI(prompt);
  }

  // Method to set mock for callOpenAI
  public setMockCallOpenAI(
    mockFn: (prompt: string) => Promise<{ success: boolean; content?: string; error?: string }>,
  ): void {
    this.mockCallOpenAI = mockFn;
  }

  // Method to clear mock
  public clearMockCallOpenAI(): void {
    this.mockCallOpenAI = undefined;
  }

  public testParseVacancyData(vacancy: Vacancy): Record<string, unknown> {
    return this.parseVacancyData(vacancy);
  }

  public testBuildEnrichmentPrompt(vacancy: Vacancy, settings: SearchRequest['settings']): string {
    return this.buildEnrichmentPrompt(vacancy, settings);
  }
}

test('EnrichmentService - handles missing API key', async () => {
  const enrichmentService = new EnrichmentService();

  const vacancies: Vacancy[] = [
    {
      id: '1',
      title: 'Software Engineer',
      description: 'Great job opportunity',
      url: 'https://example.com/job1',
      published_date: '2024-01-01',
      status: 'filtered',
      created_at: new Date().toISOString(),
      source: 'linkedin',
      country: 'USA',
    },
  ];

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
      openaiWebSearch: {
        apiKey: '', // Empty API key
        searchSites: ['linkedin.com'],
        globalSearch: false,
      },
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  expect(!result.success).toBe(true); // 'Should fail without API key');
  expect(result.errors.length > 0).toBe(true); // 'Should have error message');
  expect(result.enrichedCount, 0, 'Should not enrich any vacancies');
});

test('EnrichmentService - processes vacancies without enrichment', async () => {
  const enrichmentService = new TestEnrichmentService();
  enrichmentService.setOpenAIKey('sk-valid-test-key-for-testing-purposes'); // Set valid API key format to avoid early return

  const vacancies: Vacancy[] = [
    {
      id: '1',
      title: 'Software Engineer',
      description: 'Great job opportunity',
      url: 'https://example.com/job1',
      published_date: '2024-01-01',
      status: 'filtered',
      created_at: new Date().toISOString(),
      source: 'linkedin',
      country: 'USA',
    },
  ];

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
      openaiWebSearch: {
        apiKey: 'sk-valid-test-key-for-testing-purposes',
        searchSites: ['linkedin.com'],
        globalSearch: false,
      },
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  // Mock the OpenAI call to simulate failure
  enrichmentService.setMockCallOpenAI(() =>
    Promise.resolve({
      success: false,
      error: 'Mock API failure',
    }),
  );

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  // Clear mock
  enrichmentService.clearMockCallOpenAI();

  // The service should still succeed overall, but record the failure
  expect(result.success).toBe(true); // 'Should succeed even with API failures');
  expect(result.enrichedCount).toBe(0); // 'Should not enrich any vacancies due to mock failure');
  expect(result.failedCount).toBe(1); // 'Should count failed enrichments');
  expect(result.enrichedVacancies.length).toBe(1); // 'Should return original vacancy');
});

test('EnrichmentService - parses vacancy data correctly', () => {
  const enrichmentService = new TestEnrichmentService();

  const vacancy: Vacancy = {
    id: '1',
    title: 'Software Engineer',
    description: 'Great job',
    url: 'https://example.com/job1',
    published_date: '2024-01-01',
    status: 'filtered',
    created_at: new Date().toISOString(),
    source: 'linkedin',
    country: 'USA',
    data: JSON.stringify({
      company: 'Test Company',
      location: 'New York, USA',
    }),
  };

  const parsedData = enrichmentService.testParseVacancyData(vacancy);

  expect(parsedData.company, 'Test Company');
  expect(parsedData.location, 'New York, USA');
});

test('EnrichmentService - handles malformed vacancy data', () => {
  const enrichmentService = new TestEnrichmentService();

  const vacancy: Vacancy = {
    id: '1',
    title: 'Software Engineer',
    description: 'Great job',
    url: 'https://example.com/job1',
    published_date: '2024-01-01',
    status: 'filtered',
    created_at: new Date().toISOString(),
    source: 'linkedin',
    country: 'USA',
    data: 'invalid json',
  };

  const parsedData = enrichmentService.testParseVacancyData(vacancy);

  expect(typeof parsedData, 'object', 'Should return object for malformed data');
  expect(Object.keys(parsedData).length === 0).toBe(true); // 'Should return empty object for malformed data');
});

test('EnrichmentService - builds correct enrichment prompt', () => {
  const enrichmentService = new TestEnrichmentService();

  const vacancy: Vacancy = {
    id: '1',
    title: 'Senior Software Engineer',
    description: 'We are looking for an experienced developer',
    url: 'https://example.com/job1',
    published_date: '2024-01-01',
    status: 'filtered',
    created_at: new Date().toISOString(),
    source: 'linkedin',
    country: 'USA',
    data: JSON.stringify({ company: 'Test Corp' }),
  };

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
    },
    llm: {
      enrichmentInstructions: ['Extract company information'],
      processingRules: [],
    },
  };

  const prompt = enrichmentService.testBuildEnrichmentPrompt(vacancy, settings);

  expect(prompt.includes('Senior Software Engineer')).toBe(true); // 'Should include job title');
  expect(prompt.includes('Test Corp')).toBe(true); // 'Should include company name');
  expect(prompt.includes('JSON format')).toBe(true); // 'Should specify JSON output format');
});

test('EnrichmentService - handles empty vacancies array', async () => {
  const enrichmentService = new TestEnrichmentService();
  enrichmentService.setOpenAIKey('sk-valid-test-key-for-testing-purposes');

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
      openaiWebSearch: {
        apiKey: 'sk-valid-test-key-for-testing-purposes',
        searchSites: ['linkedin.com'],
        globalSearch: false,
      },
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result = await enrichmentService.enrichVacancies([], settings);

  expect(result.success).toBe(true); // 'Should handle empty array');
  expect(result.totalProcessed).toBe(0);
  expect(result.enrichedCount).toBe(0);
  expect(result.failedCount).toBe(0);
});

test('EnrichmentService - validates API key format (invalid prefix)', async () => {
  const enrichmentService = new EnrichmentService();
  enrichmentService.setOpenAIKey('invalid-key-without-sk-prefix');

  const vacancies: Vacancy[] = [
    {
      id: '1',
      title: 'Software Engineer',
      description: 'Great job opportunity',
      url: 'https://example.com/job1',
      published_date: '2024-01-01',
      status: 'filtered',
      created_at: new Date().toISOString(),
      source: 'linkedin',
      country: 'USA',
    },
  ];

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  expect(result.success).toBe(false); // 'Should fail with invalid API key format');
  expect(result.errors.length).toBe(1); // 'Should have one error');
  expect(result.errors[0]).toContain('Invalid OpenAI API key format'); // 'Should mention invalid format');
  expect(result.enrichedCount).toBe(0); // 'Should not enrich any vacancies');
});

test('EnrichmentService - validates API key format (too short)', async () => {
  const enrichmentService = new EnrichmentService();
  enrichmentService.setOpenAIKey('sk-short');

  const vacancies: Vacancy[] = [
    {
      id: '1',
      title: 'Software Engineer',
      description: 'Great job opportunity',
      url: 'https://example.com/job1',
      published_date: '2024-01-01',
      status: 'filtered',
      created_at: new Date().toISOString(),
      source: 'linkedin',
      country: 'USA',
    },
  ];

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  expect(result.success).toBe(false); // 'Should fail with too short API key');
  expect(result.errors.length).toBe(1); // 'Should have one error');
  expect(result.errors[0]).toContain('Invalid OpenAI API key format'); // 'Should mention invalid format');
  expect(result.enrichedCount).toBe(0); // 'Should not enrich any vacancies');
});

test('EnrichmentService - handles API key with whitespace', async () => {
  const enrichmentService = new EnrichmentService();
  enrichmentService.setOpenAIKey('   '); // Only whitespace

  const vacancies: Vacancy[] = [
    {
      id: '1',
      title: 'Software Engineer',
      description: 'Great job opportunity',
      url: 'https://example.com/job1',
      published_date: '2024-01-01',
      status: 'filtered',
      created_at: new Date().toISOString(),
      source: 'linkedin',
      country: 'USA',
    },
  ];

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  expect(result.success).toBe(false); // 'Should fail with whitespace-only API key');
  expect(result.errors.length).toBe(1); // 'Should have one error');
  expect(result.errors[0]).toContain('OpenAI API key is required but not provided'); // 'Should mention missing key');
  expect(result.enrichedCount).toBe(0); // 'Should not enrich any vacancies');
});

test('EnrichmentService - handles null API key', async () => {
  const enrichmentService = new EnrichmentService();
  // Don't set API key at all

  const vacancies: Vacancy[] = [
    {
      id: '1',
      title: 'Software Engineer',
      description: 'Great job opportunity',
      url: 'https://example.com/job1',
      published_date: '2024-01-01',
      status: 'filtered',
      created_at: new Date().toISOString(),
      source: 'linkedin',
      country: 'USA',
    },
  ];

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: [],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin'],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: EnrichmentResult = await enrichmentService.enrichVacancies(vacancies, settings);

  expect(result.success).toBe(false); // 'Should fail with null API key');
  expect(result.errors.length).toBe(1); // 'Should have one error');
  expect(result.errors[0]).toContain('OpenAI API key is required but not provided'); // 'Should mention missing key');
  expect(result.enrichedCount).toBe(0); // 'Should not enrich any vacancies');
});
