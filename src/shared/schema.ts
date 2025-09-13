// Shared types and schemas for Remote Job Scout

// Job posting interface (based on our existing types)
export interface JobPost {
  id: string;
  title: string;
  company: string;
  description: string;
  originalUrl: string;
  source: string;
  location?: string;
  employmentType?: string;
  status: JobStatus;
  statusReason?: string;
  rawData?: Record<string, unknown>;

  // Enriched fields from LLM
  techStack?: string[];
  responsibilities?: string;
  requirements?: string;
  compensation?: string;
  currency?: string;
  salaryMin?: number;
  salaryMax?: number;
  seniority?: string;
  remoteType?: string;
  timeZone?: string;

  // Company enriched data
  companySize?: string;
  industry?: string;
  companyWebsite?: string;

  // Processing metadata
  processingStage?: number;
  llmCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Search session interface
export interface SearchSession {
  id: string;
  status: ProcessingStatus;
  currentStage?: number;
  totalJobs?: number;
  processedJobs?: number;
  filteredJobs?: number;
  enrichedJobs?: number;
  totalCost?: number;
  estimatedTimeRemaining?: number;
  startedAt?: Date;
  completedAt?: Date;
  config?: Record<string, unknown>;
}

// Search configuration
export interface SearchConfig {
  positions: string[];
  blacklistedWords: string[];
  blacklistedCompanies: string[];
  selectedSources: string[];
  filters: {
    locations: string[];
    employmentTypes: string[];
    remoteTypes: string[];
  };
}

// Progress data
export interface ProgressData {
  currentStage: number;
  status: ProcessingStatus;
  totalJobs: number;
  processedJobs: number;
  filteredJobs: number;
  enrichedJobs: number;
  totalCost: number;
  estimatedTimeRemaining: number;
  processingSpeed: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: "session_update" | "job_update" | "progress_update";
  data: Record<string, unknown>;
}

// Job status types
export type JobStatus =
  | "pending"
  | "filtered"
  | "enriched"
  | "skipped"
  | "blacklisted";
export type SearchStage = 1 | 2 | 3; // Collection, Filtering, Enrichment
export type ProcessingStatus = "running" | "completed" | "stopped" | "error";

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface JobsResponse {
  jobs: JobPost[];
  total: number;
  page: number;
  limit: number;
}

export interface SearchStartResponse {
  sessionId: string;
  message: string;
}

// Scraper types (from our existing scrapers.ts)
export interface BaseScraperInput {
  query: string;
  location?: string;
  country?: string;
  distance?: number;
  jobType?: string;
  easyApply?: boolean;
  datePosted?: number;
  remote?: boolean;
  salary?: {
    min?: number;
    max?: number;
  };
  experienceLevel?: string;
  companyBlacklist?: string[];
  titleBlacklist?: string[];
}

export interface ScraperResponse {
  success: boolean;
  jobs: JobPost[];
  totalResults?: number;
  errors?: string[];
}

// Settings types (from our existing settings.ts)
export interface UserSettings {
  positions: string[];
  blacklistedWords: string[];
  blacklistedCompanies: string[];
  selectedSources: string[];
  filters: {
    locations: string[];
    employmentTypes: string[];
    remoteTypes: string[];
    languages: LanguageRequirement[];
    countries: CountryFilter[];
    workTime: string[];
  };
}

export interface LanguageRequirement {
  language: string;
  level: "basic" | "intermediate" | "advanced" | "native";
}

export interface CountryFilter {
  country: string;
  regions?: string[];
}

// Database vacancy interface (from our existing database.ts)
export interface Vacancy {
  id: string;
  title: string;
  description: string;
  url: string;
  published_date?: string;
  status: string;
  skip_reason?: string;
  processed_at?: string;
  created_at: string;
  collected_at: string;
  filtered_at?: string;
  enriched_at?: string;
  source: string;
  country?: string;
  data: Record<string, unknown>;
}

// Multi-stage search types
export interface MultiStageSearchRequest {
  positions: string[];
  sources: string[];
  filters: {
    locations?: string[];
    employmentTypes?: string[];
    remoteTypes?: string[];
  };
  blacklistedWords?: string[];
  blacklistedCompanies?: string[];
}

export interface MultiStageSearchResponse {
  sessionId: string;
  message: string;
  estimatedJobs?: number;
  estimatedCost?: number;
  estimatedTime?: number;
}
