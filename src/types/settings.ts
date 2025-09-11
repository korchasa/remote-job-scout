export interface UserSettings {
  // Поисковые позиции
  searchPositions: string[];

  // Фильтры
  filters: {
    blacklistedCompanies: string[];
    blacklistedWordsTitle: string[];
    blacklistedWordsDescription: string[];
    countries: CountryFilter[];
    languages: LanguageRequirement[];
    workTime?: WorkTimeFilter;
  };

  // Источники поиска
  sources: {
    jobSites: string[];
    openaiWebSearch?: OpenAIWebSearchConfig;
  };

  // Настройки LLM
  llm: {
    enrichmentInstructions: string[];
    processingRules: LLMRule[];
  };
}

export interface CountryFilter {
  name: string;
  type: "blacklist" | "whitelist";
}

export interface LanguageRequirement {
  language: string;
  level: string;
}

export interface WorkTimeFilter {
  start: string;
  end: string;
  timezone: string;
}

export interface OpenAIWebSearchConfig {
  apiKey: string;
  searchSites: string[];
  globalSearch: boolean;
}

export interface LLMRule {
  name: string;
  prompt: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  searchPositions: ["Software Engineer", "Frontend Developer"],
  filters: {
    blacklistedCompanies: [],
    blacklistedWordsTitle: ["senior", "lead"],
    blacklistedWordsDescription: ["agile", "scrum"],
    countries: [],
    languages: [{ language: "English", level: "Intermediate" }],
  },
  sources: {
    jobSites: ["linkedin", "indeed"],
    openaiWebSearch: {
      apiKey: "",
      searchSites: ["linkedin.com", "indeed.com"],
      globalSearch: false,
    },
  },
  llm: {
    enrichmentInstructions: [
      "Extract company information and requirements",
      "Analyze job responsibilities and skills needed",
    ],
    processingRules: [],
  },
};
