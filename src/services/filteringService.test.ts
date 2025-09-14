/**
 * Filtering Service Tests
 */

import { expect, test } from 'vitest';
import type { FilteringResult } from './filteringService.ts';
import { FilteringService } from './filteringService.ts';
import type { SearchRequest, Vacancy } from '../types/database.ts';

test('FilteringService - filters vacancies correctly', () => {
  const filteringService = new FilteringService();

  // Create test vacancies
  const vacancies: Vacancy[] = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      description: 'We need a senior developer with 5+ years experience',
      url: 'https://example.com/job1',
      published_date: '2024-01-01',
      status: 'collected',
      created_at: new Date().toISOString(),
      source: 'linkedin',
      country: 'USA',
    },
    {
      id: '2',
      title: 'Frontend Developer',
      description: 'Looking for a junior frontend developer',
      url: 'https://example.com/job2',
      published_date: '2024-01-01',
      status: 'collected',
      created_at: new Date().toISOString(),
      source: 'indeed',
      country: 'Canada',
    },
    {
      id: '3',
      title: 'Software Engineer',
      description: 'Remote software engineer position with English fluency required',
      url: 'https://example.com/job3',
      published_date: '2024-01-01',
      status: 'collected',
      created_at: new Date().toISOString(),
      source: 'glassdoor',
      country: 'UK',
    },
  ];

  // Create test settings
  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer', 'Frontend Developer'],
    filters: {
      blacklistedCompanies: [],
      blacklistedWordsTitle: ['senior'],
      blacklistedWordsDescription: ['agile', 'scrum'],
      countries: ['United States', 'Canada', 'Germany', 'France', 'UK'], // Whitelist - only allow these countries
      languages: [{ language: 'English', level: 'Intermediate' }],
    },
    sources: {
      jobSites: ['linkedin', 'indeed'],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  const result: FilteringResult = filteringService.filterVacancies(vacancies, settings);

  // Assertions
  expect(result.success).toBe(true); // 'Filtering should succeed');
  expect(result.totalProcessed).toBe(3); // 'Should process all vacancies');
  expect(result.filteredCount).toBe(1); // 'Should filter out senior job and jobs without English requirement');
  expect(result.skippedCount).toBe(2); // 'Should skip 2 jobs');

  // Check that job with "senior" in title was skipped
  expect(result.reasons.title_blacklisted_words !== undefined).toBe(true); // 'Should have title blacklist reason'
  expect(result.reasons.title_blacklisted_words).toBe(1); // 'Should skip 1 job due to title blacklist'

  // Check that job without English requirement was skipped
  expect(result.reasons.language_requirements !== undefined).toBe(true); // 'Should have language requirements reason');
  expect(result.reasons.language_requirements).toBe(1); // 'Should skip 1 job due to language requirements');
});

test('FilteringService - handles empty vacancies', () => {
  const filteringService = new FilteringService();
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

  const result = filteringService.filterVacancies([], settings);

  expect(result.success).toBe(true); // 'Should handle empty array');
  expect(result.totalProcessed).toBe(0);
  expect(result.filteredCount).toBe(0);
  expect(result.skippedCount).toBe(0);
});

test('FilteringService - company blacklist works', () => {
  const filteringService = new FilteringService();

  const vacancy: Vacancy = {
    id: '1',
    title: 'Software Engineer',
    description: 'Great job opportunity',
    url: 'https://example.com/job1',
    published_date: '2024-01-01',
    status: 'collected',
    created_at: new Date().toISOString(),
    source: 'linkedin',
    country: 'USA',
    data: JSON.stringify({ company: 'Blacklisted Corp' }),
  };

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: ['Blacklisted Corp', 'Another Company'],
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

  const result = filteringService.filterVacancies([vacancy], settings);

  expect(result.filteredCount).toBe(0); // 'Should filter out blacklisted company');
  expect(result.skippedCount).toBe(1); // 'Should skip the blacklisted company');
  expect(result.reasons.company_blacklisted !== undefined).toBe(true); // 'Should have company blacklist reason');
});

test('FilteringService - handles malformed vacancy data', () => {
  const filteringService = new FilteringService();

  const vacancy: Vacancy = {
    id: '1',
    title: 'Software Engineer',
    description: 'Great job',
    url: 'https://example.com/job1',
    published_date: '2024-01-01',
    status: 'collected',
    created_at: new Date().toISOString(),
    source: 'linkedin',
    country: 'USA',
    data: 'invalid json', // Malformed JSON
  };

  const settings: SearchRequest['settings'] = {
    searchPositions: ['Software Engineer'],
    filters: {
      blacklistedCompanies: ['Test Company'],
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

  const result = filteringService.filterVacancies([vacancy], settings);

  // Should still work even with malformed data
  expect(result.success).toBe(true); // 'Should handle malformed JSON gracefully');
  expect(result.filteredCount).toBe(1); // 'Should include job when company data is malformed');
});
