/**
 * Job Collection Service
 * Координирует сбор вакансий из множественных источников
 */

import { SearchRequest, Vacancy } from "../types/database.ts";
import {
  BaseScraper,
  JobPost,
  ScraperInput,
  ScraperResponse,
} from "../types/scrapers.ts";
import { IndeedScraper } from "./scrapers/indeed.ts";
import { LinkedInScraper } from "./scrapers/linkedin.ts";
import { OpenAIWebSearchScraper } from "./scrapers/openai-web-search.ts";

export interface CollectionResult {
  success: boolean;
  vacancies: Vacancy[];
  totalCollected: number;
  sourcesProcessed: string[];
  errors: string[];
  sessionId: string;
}

export interface CollectionProgress {
  sessionId: string;
  currentSource: string;
  sourcesCompleted: number;
  totalSources: number;
  jobsCollected: number;
  errors: string[];
  isComplete: boolean;
}

export class JobCollectionService {
  private scrapers: Map<string, BaseScraper> = new Map();
  private openaiScraper?: OpenAIWebSearchScraper;
  private activeSessions: Map<string, CollectionProgress> = new Map();

  constructor() {
    this.initializeScrapers();
  }

  /**
   * Инициализация доступных скрапперов
   */
  private initializeScrapers(): void {
    // Indeed - самый надежный
    this.scrapers.set("indeed", new IndeedScraper());

    // LinkedIn - требует осторожности
    this.scrapers.set("linkedin", new LinkedInScraper());

    // Остальные скрапперы можно добавить позже
    // this.scrapers.set("glassdoor", new GlassdoorScraper());
    // this.scrapers.set("google", new GoogleScraper());
  }

  /**
   * Настройка OpenAI WebSearch (опционально)
   */
  setOpenAIWebSearch(apiKey: string, globalSearch: boolean = true): void {
    this.openaiScraper = new OpenAIWebSearchScraper({
      apiKey,
      globalSearch,
      maxResults: 50,
    });
  }

  /**
   * Основной метод сбора вакансий
   */
  async collectJobs(request: SearchRequest): Promise<CollectionResult> {
    const { session_id, settings } = request;
    const progress: CollectionProgress = {
      sessionId: session_id,
      currentSource: "",
      sourcesCompleted: 0,
      totalSources: 0,
      jobsCollected: 0,
      errors: [],
      isComplete: false,
    };

    this.activeSessions.set(session_id, progress);

    try {
      console.log(`🔍 Starting job collection for session ${session_id}`);
      console.log(`📋 Positions: ${settings.searchPositions.join(", ")}`);
      console.log(`🌐 Sources: ${settings.sources.jobSites.join(", ")}`);

      // Определяем источники для обработки
      const sourcesToProcess = this.getSourcesToProcess(settings);
      progress.totalSources = sourcesToProcess.length;

      const allVacancies: Vacancy[] = [];
      const processedSources: string[] = [];
      const errors: string[] = [];

      // Обрабатываем каждый источник
      for (const source of sourcesToProcess) {
        progress.currentSource = source;

        try {
          const sourceVacancies = await this.processSource(
            source,
            settings,
            session_id,
          );
          allVacancies.push(...sourceVacancies);
          processedSources.push(source);
          progress.sourcesCompleted++;
          progress.jobsCollected = allVacancies.length;

          console.log(`✅ ${source}: collected ${sourceVacancies.length} jobs`);
        } catch (error) {
          const errorMsg = `${source}: ${(error as Error).message}`;
          errors.push(errorMsg);
          progress.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      // Обрабатываем OpenAI WebSearch если настроен
      if (this.shouldUseOpenAIWebSearch(settings)) {
        progress.currentSource = "OpenAI WebSearch";

        try {
          const openaiVacancies = await this.processOpenAIWebSearch(
            settings,
            session_id,
          );
          allVacancies.push(...openaiVacancies);
          processedSources.push("openai-websearch");
          progress.sourcesCompleted++;
          progress.jobsCollected = allVacancies.length;

          console.log(
            `✅ OpenAI WebSearch: collected ${openaiVacancies.length} jobs`,
          );
        } catch (error) {
          const errorMsg = `OpenAI WebSearch: ${(error as Error).message}`;
          errors.push(errorMsg);
          progress.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      progress.isComplete = true;

      const result: CollectionResult = {
        success: errors.length === 0,
        vacancies: allVacancies,
        totalCollected: allVacancies.length,
        sourcesProcessed: processedSources,
        errors,
        sessionId: session_id,
      };

      console.log(
        `🎉 Collection complete: ${allVacancies.length} jobs from ${processedSources.length} sources`,
      );

      return result;
    } catch (error) {
      progress.isComplete = true;
      progress.errors.push((error as Error).message);

      return {
        success: false,
        vacancies: [],
        totalCollected: 0,
        sourcesProcessed: [],
        errors: [(error as Error).message],
        sessionId: session_id,
      };
    }
  }

  /**
   * Получить прогресс сбора для сессии
   */
  getProgress(sessionId: string): CollectionProgress | null {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Остановить сбор для сессии
   */
  stopCollection(sessionId: string): boolean {
    const progress = this.activeSessions.get(sessionId);
    if (progress && !progress.isComplete) {
      progress.isComplete = true;
      progress.errors.push("Collection stopped by user");
      return true;
    }
    return false;
  }

  /**
   * Определить источники для обработки
   */
  private getSourcesToProcess(settings: SearchRequest["settings"]): string[] {
    const requestedSources = settings.sources.jobSites;

    // Фильтруем только поддерживаемые источники
    return requestedSources.filter((source) =>
      this.scrapers.has(source.toLowerCase())
    );
  }

  /**
   * Проверить нужно ли использовать OpenAI WebSearch
   */
  private shouldUseOpenAIWebSearch(
    settings: SearchRequest["settings"],
  ): boolean {
    return !!(
      this.openaiScraper &&
      settings.sources.openaiWebSearch?.apiKey &&
      settings.sources.openaiWebSearch.globalSearch
    );
  }

  /**
   * Обработать один источник
   */
  private async processSource(
    source: string,
    settings: SearchRequest["settings"],
    sessionId: string,
  ): Promise<Vacancy[]> {
    const scraper = this.scrapers.get(source.toLowerCase());
    if (!scraper) {
      throw new Error(`Scraper for ${source} not found`);
    }

    // Проверяем доступность источника
    const isAvailable = await scraper.checkAvailability();
    if (!isAvailable) {
      throw new Error(`${source} is not available`);
    }

    const vacancies: Vacancy[] = [];

    // Обрабатываем каждую позицию
    for (const position of settings.searchPositions) {
      const input: ScraperInput = {
        search_term: position,
        location: settings.filters.countries.length > 0
          ? settings.filters.countries[0].name
          : undefined,
        is_remote: true, // Фокусируемся на remote вакансиях
        results_wanted: 25, // Ограничиваем для тестирования
      };

      const response: ScraperResponse = await scraper.scrape(input);

      if (!response.success) {
        console.warn(
          `⚠️ ${source} partial failure for ${position}:`,
          response.errors,
        );
      }

      // Конвертируем JobPost в Vacancy
      for (const job of response.jobs) {
        const vacancy = this.convertJobToVacancy(job, sessionId);
        vacancies.push(vacancy);
      }

      // Небольшая задержка между запросами
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return vacancies;
  }

  /**
   * Обработать OpenAI WebSearch
   */
  private async processOpenAIWebSearch(
    settings: SearchRequest["settings"],
    sessionId: string,
  ): Promise<Vacancy[]> {
    if (!this.openaiScraper || !settings.sources.openaiWebSearch) {
      return [];
    }

    // Комбинируем все позиции в один запрос
    const combinedQuery = settings.searchPositions.join(" OR ");

    const input: ScraperInput = {
      search_term: combinedQuery,
      is_remote: true,
      results_wanted: settings.sources.openaiWebSearch.maxResults || 50,
    };

    const response = await this.openaiScraper.scrape(input);

    if (!response.success) {
      throw new Error(`OpenAI WebSearch failed: ${response.errors.join(", ")}`);
    }

    return response.jobs.map((job) => this.convertJobToVacancy(job, sessionId));
  }

  /**
   * Конвертировать JobPost в Vacancy
   */
  private convertJobToVacancy(job: JobPost, _sessionId: string): Vacancy {
    return {
      id: crypto.randomUUID(),
      title: job.title,
      description: job.description,
      url: job.url,
      published_date: job.date_posted,
      status: "collected",
      created_at: new Date().toISOString(),
      collected_at: new Date().toISOString(),
      source: job.source,
      country: job.country,
      // data будет содержать дополнительную информацию в YAML формате
      data: JSON.stringify({
        company: job.company,
        location: job.location,
        is_remote: job.is_remote,
        job_type: job.job_type,
        salary: job.salary,
      }),
    };
  }
}
