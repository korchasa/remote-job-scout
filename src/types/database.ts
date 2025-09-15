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
  enrichmentStats?: EnrichmentStats;
}

export interface FilteringStats {
  totalFiltered: number;
  totalSkipped: number;
  skipReasons: { [reason: string]: number };
}

export interface EnrichmentStats {
  totalEnriched: number;
  totalFailed: number;
  tokensUsed: number;
  costUsd: number;
  sourcesCount: number;
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
      countries: string[]; // Whitelist of allowed countries
      languages: Array<{ language: string; level: string }>;
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

/**
 * Session Snapshot for persistence and restoration
 * Saves complete session state to filesystem for recovery
 */
export interface SessionSnapshot {
  // Metadata
  sessionId: string;
  version: string; // Schema version for compatibility
  createdAt: string;
  updatedAt: string;
  snapshotVersion: number; // Incremental version for the snapshot

  // Session state
  status: 'running' | 'completed' | 'stopped' | 'error' | 'paused';
  currentStage: ProcessingStage;

  // Original request settings
  settings: SearchRequest['settings'];

  // Progress data
  progress: MultiStageProgress;

  // Collected data
  vacancies: Vacancy[];
  collectionResult?: {
    success: boolean;
    totalCollected: number;
    errors: string[];
  };
  filteringResult?: {
    success: boolean;
    filteredCount: number;
    skippedCount: number;
    reasons: { [reason: string]: number };
    errors: string[];
  };
  enrichmentResult?: {
    success: boolean;
    enrichedCount: number;
    failedCount: number;
    tokensUsed: number;
    costUsd: number;
    sources: string[];
    errors: string[];
  };

  // Restoration flags
  canResume: boolean;
  lastCompletedStage?: ProcessingStage;
  restorationNotes?: string[];
}
