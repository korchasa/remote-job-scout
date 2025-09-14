export interface UserSettings {
  // Поисковые позиции
  searchPositions: string[];

  // Фильтры
  filters: {
    blacklistedCompanies: string[];
    blacklistedWordsTitle: string[];
    blacklistedWordsDescription: string[];
    countries: string[]; // Whitelist of allowed countries
    languages: LanguageRequirement[];
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

export interface LanguageRequirement {
  language: string;
  level: string;
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
  searchPositions: ['Software Engineer', 'Frontend Developer'],
  filters: {
    blacklistedCompanies: [],
    blacklistedWordsTitle: ['senior', 'lead'],
    blacklistedWordsDescription: ['agile', 'scrum'],
    countries: [], // Empty means allow all countries
    languages: [{ language: 'English', level: 'Intermediate' }],
  },
  sources: {
    jobSites: ['linkedin', 'indeed'],
    openaiWebSearch: {
      apiKey: '',
      searchSites: ['linkedin.com', 'indeed.com'],
      globalSearch: false,
    },
  },
  llm: {
    enrichmentInstructions: [
      'Extract company information and requirements',
      'Analyze job responsibilities and skills needed',
    ],
    processingRules: [],
  },
};
