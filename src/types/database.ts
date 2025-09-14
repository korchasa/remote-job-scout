export interface Vacancy {
  id: string;
  title: string;
  description: string;
  url: string;
  published_date?: string;
  company_id?: string;
  status: VacancyStatus;
  skip_reason?: string;
  processed_at?: string;
  created_at: string;
  collected_at?: string;
  filtered_at?: string;
  enriched_at?: string;
  source: string;
  country?: string;
  session_id?: string; // Session ID for grouping vacancies
  data?: string; // Additional information in YAML format
}

export type VacancyStatus =
  | 'collected' // Собран
  | 'filtered' // Прошел фильтрацию
  | 'skipped' // Пропущен
  | 'enriched' // Обогащен LLM
  | 'completed'; // Завершен

export interface Company {
  id: string;
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
  id: string;
  vacancy_id: string;
  language: string;
  level: string;
  quote?: string;
  created_at: string;
}

export interface Source {
  id: string;
  company_id?: string;
  url: string;
  title: string;
  content_type: string;
  created_at: string;
}

export interface Log {
  id: string;
  level: LogLevel;
  message: string;
  context?: string;
  vacancy_id?: string;
  created_at: string;
}

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface PerformanceMetric {
  id: string;
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
  | 'collecting' // Сбор вакансий
  | 'filtering' // Фильтрация
  | 'enriching' // LLM обогащение
  | 'completed'; // Завершено

export interface MultiStageProgress {
  sessionId: string;
  currentStage: ProcessingStage;
  status: 'running' | 'completed' | 'stopped' | 'error' | 'paused';
  overallProgress: number; // 0-100%
  stageProgress: number; // 0-100% для текущей стадии
  stages: {
    collecting: StageProgress;
    filtering: StageProgress;
    enriching: StageProgress;
  };
  startTime: string;
  estimatedCompletionTime?: string;
  isComplete: boolean;
  canStop: boolean;
  errors: string[];
  filteringStats?: FilteringStats;
}

export interface FilteringStats {
  totalFiltered: number;
  totalSkipped: number;
  skipReasons: { [reason: string]: number };
}

export interface StageProgress {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped' | 'skipped' | 'paused';
  progress: number; // 0-100%
  itemsProcessed: number;
  itemsTotal: number;
  startTime?: string;
  endTime?: string;
  pauseTime?: string;
  errors: string[];
  details?: string;
}

export interface SearchRequest {
  settings: {
    searchPositions: string[];
    filters: {
      blacklistedCompanies: string[];
      blacklistedWordsTitle: string[];
      blacklistedWordsDescription: string[];
      countries: Array<{ name: string; type: 'blacklist' | 'whitelist' }>;
      languages: Array<{ language: string; level: string }>;
      workTime?: { start: string; end: string; timezone: string };
    };
    sources: {
      jobSites: string[];
      openaiWebSearch?: {
        apiKey: string;
        searchSites: string[];
        globalSearch: boolean;
        maxResults?: number;
      };
    };
    llm: {
      enrichmentInstructions: string[];
      processingRules: Array<{ name: string; prompt: string }>;
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
