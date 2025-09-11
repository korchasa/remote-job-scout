export interface Vacancy {
  id: number;
  title: string;
  description: string;
  url: string;
  published_date?: string;
  company_id?: number;
  status: VacancyStatus;
  skip_reason?: string;
  processed_at?: string;
  created_at: string;
  collected_at?: string;
  filtered_at?: string;
  enriched_at?: string;
  source: string;
  country?: string;
}

export type VacancyStatus =
  | "collected" // Собран
  | "filtered" // Прошел фильтрацию
  | "skipped" // Пропущен
  | "enriched" // Обогащен LLM
  | "completed"; // Завершен

export interface Company {
  id: number;
  name: string;
  category?: string;
  main_product?: string;
  domain?: string;
  offices?: string;
  russia_connections?: boolean;
  ukraine_connections?: boolean;
  short_info?: string;
  created_at: string;
}

export interface LanguageRequirement {
  id: number;
  vacancy_id: number;
  language: string;
  level: string;
  quote?: string;
  created_at: string;
}

export interface Source {
  id: number;
  company_id?: number;
  url: string;
  title: string;
  content_type: string;
  created_at: string;
}

export interface Log {
  id: number;
  level: LogLevel;
  message: string;
  context?: string;
  vacancy_id?: number;
  created_at: string;
}

export type LogLevel = "info" | "warning" | "error" | "debug";

export interface PerformanceMetric {
  id: number;
  session_id: string;
  total_vacancies: number;
  processed_vacancies: number;
  current_progress_percent: number;
  eta_seconds?: number;
  current_cost_usd: number;
  estimated_total_cost_usd?: number;
  tokens_used: number;
  processing_speed_per_minute: number;
  current_stage: ProcessingStage;
  created_at: string;
  updated_at: string;
}

export type ProcessingStage =
  | "collecting" // Сбор вакансий
  | "filtering" // Фильтрация
  | "enriching" // LLM обогащение
  | "completed"; // Завершено

export interface SearchRequest {
  settings: {
    searchPositions: string[];
    filters: {
      blacklistedCompanies: string[];
      blacklistedWordsTitle: string[];
      blacklistedWordsDescription: string[];
      countries: { name: string; type: "blacklist" | "whitelist" }[];
      languages: { language: string; level: string }[];
      workTime?: { start: string; end: string; timezone: string };
    };
    sources: {
      jobSites: string[];
      openaiWebSearch?: {
        apiKey: string;
        searchSites: string[];
        globalSearch: boolean;
      };
    };
    llm: {
      enrichmentInstructions: string[];
      processingRules: { name: string; prompt: string }[];
    };
  };
  session_id: string;
}

export interface SearchResponse {
  success: boolean;
  session_id: string;
  message: string;
  total_found?: number;
}
