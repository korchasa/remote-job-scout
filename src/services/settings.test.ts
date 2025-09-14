import { expect, test } from 'vitest';
import type { UserSettings } from '../types/settings.ts';
import { DEFAULT_USER_SETTINGS } from '../types/settings.ts';

// Import after mocking
import { SettingsService } from './settingsService.ts';

// Mock localStorage globally for all tests
const mockLocalStorage = {
  data: new Map<string, string>(),
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  },
  removeItem(key: string): void {
    this.data.delete(key);
  },
  clear(): void {
    this.data.clear();
  },
};

// Replace global localStorage with mock
const originalLocalStorage = globalThis.localStorage;
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

test('DEFAULT_USER_SETTINGS should have correct structure', () => {
  // Check basic structure
  expect(typeof DEFAULT_USER_SETTINGS.searchPositions, 'object');
  expect(Array.isArray(DEFAULT_USER_SETTINGS.searchPositions), true);

  // Check filters structure
  expect(typeof DEFAULT_USER_SETTINGS.filters, 'object');
  expect(Array.isArray(DEFAULT_USER_SETTINGS.filters.blacklistedCompanies), true);
  expect(Array.isArray(DEFAULT_USER_SETTINGS.filters.blacklistedWordsTitle), true);

  // Check sources structure
  expect(typeof DEFAULT_USER_SETTINGS.sources, 'object');
  expect(Array.isArray(DEFAULT_USER_SETTINGS.sources.jobSites), true);

  // Check LLM structure
  expect(typeof DEFAULT_USER_SETTINGS.llm, 'object');
  expect(Array.isArray(DEFAULT_USER_SETTINGS.llm.enrichmentInstructions), true);
});

test('DEFAULT_USER_SETTINGS should have sensible defaults', () => {
  // Should have some default positions
  expect(DEFAULT_USER_SETTINGS.searchPositions.length > 0, true);

  // Should have some default sources
  expect(DEFAULT_USER_SETTINGS.sources.jobSites.length > 0, true);

  // Should have some LLM instructions
  expect(DEFAULT_USER_SETTINGS.llm.enrichmentInstructions.length > 0, true);
});

test('UserSettings interface compliance', () => {
  const settings: UserSettings = {
    searchPositions: ['Developer'],
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

  expect(settings.searchPositions[0], 'Developer');
  expect(settings.sources.jobSites[0], 'linkedin');
});

// Тесты для сервиса настроек
test('SettingsService - loadSettings should return default settings when localStorage is empty', () => {
  // Clear localStorage
  localStorage.removeItem('remoteJobScout_settings');

  const settings = SettingsService.loadSettings();
  expect(settings.searchPositions, DEFAULT_USER_SETTINGS.searchPositions);
  expect(settings.sources.jobSites, DEFAULT_USER_SETTINGS.sources.jobSites);
});

test('SettingsService - saveSettings should store settings in localStorage', () => {
  // Clear localStorage
  localStorage.removeItem('remoteJobScout_settings');

  const testSettings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    searchPositions: ['Test Position'],
  };

  SettingsService.saveSettings(testSettings);

  const stored = localStorage.getItem('remoteJobScout_settings');
  expect(stored !== null, true);
  const parsed = JSON.parse(stored!);
  expect(parsed.searchPositions[0], 'Test Position');
});

test('SettingsService - should handle invalid JSON in localStorage', () => {
  // Set corrupted data
  localStorage.setItem('remoteJobScout_settings', 'invalid json');

  const settings = SettingsService.loadSettings();
  // Should return default settings when JSON is invalid
  expect(settings.searchPositions, DEFAULT_USER_SETTINGS.searchPositions);
  expect(settings.sources.jobSites, DEFAULT_USER_SETTINGS.sources.jobSites);
  expect(settings.filters.blacklistedCompanies, DEFAULT_USER_SETTINGS.filters.blacklistedCompanies);
});

test('SettingsService - updateSettings should merge and save partial updates', () => {
  // Clear localStorage
  localStorage.removeItem('remoteJobScout_settings');

  const updatedSettings = SettingsService.updateSettings({
    searchPositions: ['New Position'],
  });

  expect(updatedSettings.searchPositions[0], 'New Position');
  // Should preserve other default values
  expect(updatedSettings.sources.jobSites, DEFAULT_USER_SETTINGS.sources.jobSites);

  const stored = localStorage.getItem('remoteJobScout_settings');
  expect(stored !== null, true);
  const parsed = JSON.parse(stored!);
  expect(parsed.searchPositions[0], 'New Position');
});

test('SettingsService - validateSettings should filter invalid data', () => {
  // Clear localStorage
  localStorage.removeItem('remoteJobScout_settings');

  const invalidSettings: Partial<UserSettings> = {
    searchPositions: ['Valid', '', 'Another'],
    filters: {
      blacklistedCompanies: ['Valid', '', 'another'],
      blacklistedWordsTitle: ['word1', '', 'word2'],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ['linkedin', '', '   ', 'indeed'],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  SettingsService.saveSettings(invalidSettings as UserSettings);

  const stored = localStorage.getItem('remoteJobScout_settings');
  expect(stored !== null, true);
  const parsed = JSON.parse(stored!);

  expect(parsed.searchPositions, ['Valid', 'Another']);
  expect(parsed.filters.blacklistedCompanies, ['Valid', 'another']);
  expect(parsed.filters.blacklistedWordsTitle, ['word1', 'word2']);
  expect(parsed.sources.jobSites, ['linkedin', 'indeed']);
});

test('SettingsService - should handle country filters validation', () => {
  // Clear localStorage
  localStorage.removeItem('remoteJobScout_settings');

  const settingsWithCountries: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    filters: {
      ...DEFAULT_USER_SETTINGS.filters,
      countries: ['United States', 'Canada', 'Germany'],
    },
  };

  SettingsService.saveSettings(settingsWithCountries);
  const loaded = SettingsService.loadSettings();

  expect(loaded.filters.countries.length, 3);
  expect(loaded.filters.countries[0], 'United States');
  expect(loaded.filters.countries[1], 'Canada');
  expect(loaded.filters.countries[2], 'Germany');
});

test('SettingsService - should handle language requirements validation', () => {
  // Clear localStorage
  localStorage.removeItem('remoteJobScout_settings');

  const settingsWithLanguages: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    filters: {
      ...DEFAULT_USER_SETTINGS.filters,
      languages: [
        { language: 'English', level: 'Advanced' },
        { language: '', level: 'Intermediate' },
        { language: 'Spanish', level: 'Beginner' },
      ],
    },
  };

  SettingsService.saveSettings(settingsWithLanguages);
  const loaded = SettingsService.loadSettings();

  expect(loaded.filters.languages.length, 2);
  expect(loaded.filters.languages[0].language, 'English');
  expect(loaded.filters.languages[1].language, 'Spanish');
});

// Work time filter removed - no longer needed

// Восстановить оригинальный localStorage после всех тестов
test('cleanup - restore original localStorage', () => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: originalLocalStorage,
    writable: true,
  });
});
