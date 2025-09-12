/**
 * Типы и интерфейсы для системы скрапперов вакансий
 * Основаны на анализе JobSpy архитектуры
 */

export interface JobPost {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  date_posted?: string;
  job_type?: string;
  is_remote?: boolean;
  salary?: string;
  source: string;
  country?: string;
}

export interface ScraperInput {
  search_term: string;
  location?: string;
  country?: string;
  distance?: number;
  job_type?: string;
  is_remote?: boolean;
  hours_old?: number;
  results_wanted?: number;
}

export interface ScraperResponse {
  success: boolean;
  jobs: JobPost[];
  total_found: number;
  errors: string[];
  source: string;
}

export interface ScraperConfig {
  max_retries: number;
  retry_delay_ms: number;
  timeout_ms: number;
  max_results_per_request: number;
  rate_limit_delay_ms: number;
}

/**
 * Абстрактный базовый класс для всех скрапперов
 * Реализует общую логику retry, rate limiting и обработки ошибок
 */
export abstract class BaseScraper {
  protected config: ScraperConfig;

  constructor(config: Partial<ScraperConfig> = {}) {
    this.config = {
      max_retries: 3,
      retry_delay_ms: 1000,
      timeout_ms: 30000,
      max_results_per_request: 50,
      rate_limit_delay_ms: 2000,
      ...config,
    };
  }

  /**
   * Основной метод для скраппинга вакансий
   */
  abstract scrape(input: ScraperInput): Promise<ScraperResponse>;

  /**
   * Получить название источника
   */
  abstract getSourceName(): string;

  /**
   * Проверить доступность источника
   */
  abstract checkAvailability(): Promise<boolean>;

  /**
   * Реализация retry логики с exponential backoff
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.max_retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `⚠️ ${this.getSourceName()} ${context} failed (attempt ${attempt}/${this.config.max_retries}):`,
          lastError.message,
        );

        if (attempt < this.config.max_retries) {
          const delay = this.config.retry_delay_ms * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Задержка для соблюдения rate limits
   */
  protected async rateLimitDelay(): Promise<void> {
    await new Promise((resolve) =>
      setTimeout(resolve, this.config.rate_limit_delay_ms)
    );
  }
}

/**
 * Фабрика для создания скрапперов
 */
export interface ScraperFactory {
  createScraper(source: string, config?: Partial<ScraperConfig>): BaseScraper;
  getSupportedSources(): string[];
}

/**
 * Конфигурация для OpenAI WebSearch API
 */
export interface OpenAIWebSearchConfig {
  apiKey: string;
  model?: string;
  searchSites?: string[];
  globalSearch?: boolean;
  maxResults?: number;
}

/**
 * Конфигурация для источников в SearchRequest
 */
export interface OpenAISearchSource {
  apiKey: string;
  searchSites: string[];
  globalSearch: boolean;
  maxResults?: number;
}

/**
 * Результаты поиска через OpenAI WebSearch
 */
export interface OpenAISearchResult {
  title: string;
  url: string;
  snippet: string;
  published_date?: string;
}

/**
 * Ответ от OpenAI WebSearch API
 */
export interface OpenAIWebSearchResponse {
  results: OpenAISearchResult[];
  total_found: number;
  search_query: string;
}
