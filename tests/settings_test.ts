import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import { DEFAULT_USER_SETTINGS, UserSettings } from "../src/types/settings.ts";

// Mock localStorage globally for all tests
const mockLocalStorage = {
  data: new Map<string, string>(),
  getItem(key: string): string | null {
    return this.data.get(key) || null;
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
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Import after mocking
import { SettingsService } from "../src/services/settingsService.ts";

Deno.test("DEFAULT_USER_SETTINGS should have correct structure", () => {
  // Check basic structure
  assertEquals(typeof DEFAULT_USER_SETTINGS.searchPositions, "object");
  assertEquals(Array.isArray(DEFAULT_USER_SETTINGS.searchPositions), true);

  // Check filters structure
  assertEquals(typeof DEFAULT_USER_SETTINGS.filters, "object");
  assertEquals(
    Array.isArray(DEFAULT_USER_SETTINGS.filters.blacklistedCompanies),
    true,
  );
  assertEquals(
    Array.isArray(DEFAULT_USER_SETTINGS.filters.blacklistedWordsTitle),
    true,
  );

  // Check sources structure
  assertEquals(typeof DEFAULT_USER_SETTINGS.sources, "object");
  assertEquals(Array.isArray(DEFAULT_USER_SETTINGS.sources.jobSites), true);

  // Check LLM structure
  assertEquals(typeof DEFAULT_USER_SETTINGS.llm, "object");
  assertEquals(
    Array.isArray(DEFAULT_USER_SETTINGS.llm.enrichmentInstructions),
    true,
  );
});

Deno.test("DEFAULT_USER_SETTINGS should have sensible defaults", () => {
  // Should have some default positions
  assertEquals(DEFAULT_USER_SETTINGS.searchPositions.length > 0, true);

  // Should have some default sources
  assertEquals(DEFAULT_USER_SETTINGS.sources.jobSites.length > 0, true);

  // Should have some LLM instructions
  assertEquals(
    DEFAULT_USER_SETTINGS.llm.enrichmentInstructions.length > 0,
    true,
  );
});

Deno.test("UserSettings interface compliance", () => {
  const settings: UserSettings = {
    searchPositions: ["Developer"],
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

  assertEquals(settings.searchPositions[0], "Developer");
  assertEquals(settings.sources.jobSites[0], "linkedin");
});

// Тесты для сервиса настроек
Deno.test("SettingsService - loadSettings should return default settings when localStorage is empty", () => {
  // Clear localStorage
  localStorage.removeItem("remoteJobScout_settings");

  const settings = SettingsService.loadSettings();
  assertEquals(settings.searchPositions, DEFAULT_USER_SETTINGS.searchPositions);
  assertEquals(
    settings.sources.jobSites,
    DEFAULT_USER_SETTINGS.sources.jobSites,
  );
});

Deno.test("SettingsService - saveSettings should store settings in localStorage", () => {
  // Clear localStorage
  localStorage.removeItem("remoteJobScout_settings");

  const testSettings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    searchPositions: ["Test Position"],
  };

  SettingsService.saveSettings(testSettings);

  const stored = localStorage.getItem("remoteJobScout_settings");
  assertEquals(stored !== null, true);
  const parsed = JSON.parse(stored!);
  assertEquals(parsed.searchPositions[0], "Test Position");
});

Deno.test("SettingsService - should handle invalid JSON in localStorage", () => {
  // Set corrupted data
  localStorage.setItem("remoteJobScout_settings", "invalid json");

  const settings = SettingsService.loadSettings();
  // Should return default settings when JSON is invalid
  assertEquals(settings.searchPositions, DEFAULT_USER_SETTINGS.searchPositions);
  assertEquals(
    settings.sources.jobSites,
    DEFAULT_USER_SETTINGS.sources.jobSites,
  );
  assertEquals(
    settings.filters.blacklistedCompanies,
    DEFAULT_USER_SETTINGS.filters.blacklistedCompanies,
  );
});

Deno.test("SettingsService - updateSettings should merge and save partial updates", () => {
  // Clear localStorage
  localStorage.removeItem("remoteJobScout_settings");

  const updatedSettings = SettingsService.updateSettings({
    searchPositions: ["New Position"],
  });

  assertEquals(updatedSettings.searchPositions[0], "New Position");
  // Should preserve other default values
  assertEquals(
    updatedSettings.sources.jobSites,
    DEFAULT_USER_SETTINGS.sources.jobSites,
  );

  const stored = localStorage.getItem("remoteJobScout_settings");
  assertEquals(stored !== null, true);
  const parsed = JSON.parse(stored!);
  assertEquals(parsed.searchPositions[0], "New Position");
});

Deno.test("SettingsService - validateSettings should filter invalid data", () => {
  // Clear localStorage
  localStorage.removeItem("remoteJobScout_settings");

  const invalidSettings: Partial<UserSettings> = {
    searchPositions: ["Valid", "", "Another"],
    filters: {
      blacklistedCompanies: ["Valid", "", "another"],
      blacklistedWordsTitle: ["word1", "", "word2"],
      blacklistedWordsDescription: [],
      countries: [],
      languages: [],
    },
    sources: {
      jobSites: ["linkedin", "", "   ", "indeed"],
    },
    llm: {
      enrichmentInstructions: [],
      processingRules: [],
    },
  };

  SettingsService.saveSettings(invalidSettings as UserSettings);

  const stored = localStorage.getItem("remoteJobScout_settings");
  assertEquals(stored !== null, true);
  const parsed = JSON.parse(stored!);

  assertEquals(parsed.searchPositions, ["Valid", "Another"]);
  assertEquals(parsed.filters.blacklistedCompanies, ["Valid", "another"]);
  assertEquals(parsed.filters.blacklistedWordsTitle, ["word1", "word2"]);
  assertEquals(parsed.sources.jobSites, ["linkedin", "indeed"]);
});

Deno.test("SettingsService - should handle country filters validation", () => {
  // Clear localStorage
  localStorage.removeItem("remoteJobScout_settings");

  const settingsWithCountries: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    filters: {
      ...DEFAULT_USER_SETTINGS.filters,
      countries: [
        { name: "United States", type: "whitelist" },
        { name: "", type: "blacklist" },
        { name: "Canada", type: "whitelist" },
      ],
    },
  };

  SettingsService.saveSettings(settingsWithCountries);
  const loaded = SettingsService.loadSettings();

  assertEquals(loaded.filters.countries.length, 2);
  assertEquals(loaded.filters.countries[0].name, "United States");
  assertEquals(loaded.filters.countries[1].name, "Canada");
});

Deno.test("SettingsService - should handle language requirements validation", () => {
  // Clear localStorage
  localStorage.removeItem("remoteJobScout_settings");

  const settingsWithLanguages: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    filters: {
      ...DEFAULT_USER_SETTINGS.filters,
      languages: [
        { language: "English", level: "Advanced" },
        { language: "", level: "Intermediate" },
        { language: "Spanish", level: "Beginner" },
      ],
    },
  };

  SettingsService.saveSettings(settingsWithLanguages);
  const loaded = SettingsService.loadSettings();

  assertEquals(loaded.filters.languages.length, 2);
  assertEquals(loaded.filters.languages[0].language, "English");
  assertEquals(loaded.filters.languages[1].language, "Spanish");
});

Deno.test("SettingsService - should handle work time filter", () => {
  // Clear localStorage
  localStorage.removeItem("remoteJobScout_settings");

  const settingsWithWorkTime: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    filters: {
      ...DEFAULT_USER_SETTINGS.filters,
      workTime: {
        start: "08:00",
        end: "17:00",
        timezone: "America/New_York",
      },
    },
  };

  SettingsService.saveSettings(settingsWithWorkTime);
  const loaded = SettingsService.loadSettings();

  assertEquals(loaded.filters.workTime?.start, "08:00");
  assertEquals(loaded.filters.workTime?.end, "17:00");
  assertEquals(loaded.filters.workTime?.timezone, "America/New_York");
});

// Восстановить оригинальный localStorage после всех тестов
Deno.test("cleanup - restore original localStorage", () => {
  Object.defineProperty(globalThis, "localStorage", {
    value: originalLocalStorage,
    writable: true,
  });
});
