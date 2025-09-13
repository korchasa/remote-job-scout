/**
 * Job Collection Service
 * Координирует сбор вакансий из множественных источников
 */

import { randomUUID } from 'node:crypto';

import type { SearchRequest, Vacancy } from '../types/database.js';
import type { Country, JobPost, JobResponse, Scraper, ScraperInput } from '../types/scrapers.js';
import { countryFromString, Site } from '../types/scrapers.js';
import { IndeedScraper } from './scrapers/indeed.js';
import { LinkedInScraper } from './scrapers/linkedin.js';
import { OpenAIWebSearchScraper } from './scrapers/openai-web-search.js';

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
  private scrapers: Map<string, Scraper> = new Map();
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
    this.scrapers.set('indeed', new IndeedScraper());

    // LinkedIn - требует осторожности
    this.scrapers.set('linkedin', new LinkedInScraper());

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
      currentSource: '',
      sourcesCompleted: 0,
      totalSources: 0,
      jobsCollected: 0,
      errors: [],
      isComplete: false,
    };

    this.activeSessions.set(session_id, progress);

    try {
      console.log(`🔍 Starting job collection for session:`, {
        session: session_id,
        positions: settings.searchPositions,
        sources: settings.sources.jobSites,
      });

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
          const sourceVacancies = await this.processSource(source, settings, session_id);
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
        progress.currentSource = 'OpenAI WebSearch';

        try {
          const openaiVacancies = await this.processOpenAIWebSearch(settings, session_id);
          allVacancies.push(...openaiVacancies);
          processedSources.push('openai-websearch');
          progress.sourcesCompleted++;
          progress.jobsCollected = allVacancies.length;

          console.log(`✅ OpenAI WebSearch: collected ${openaiVacancies.length} jobs`);
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
    return this.activeSessions.get(sessionId) ?? null;
  }

  /**
   * Остановить сбор для сессии
   */
  stopCollection(sessionId: string): boolean {
    const progress = this.activeSessions.get(sessionId);
    if (progress && !progress.isComplete) {
      progress.isComplete = true;
      progress.errors.push('Collection stopped by user');
      return true;
    }
    return false;
  }

  /**
   * Определить источники для обработки
   */
  private getSourcesToProcess(settings: SearchRequest['settings']): string[] {
    const requestedSources = settings.sources.jobSites;

    // Фильтруем только поддерживаемые источники
    return requestedSources.filter((source) => this.scrapers.has(source.toLowerCase()));
  }

  /**
   * Проверить нужно ли использовать OpenAI WebSearch
   */
  private shouldUseOpenAIWebSearch(settings: SearchRequest['settings']): boolean {
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
    settings: SearchRequest['settings'],
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
      let country: Country | undefined;
      try {
        if (
          settings.filters?.countries &&
          Array.isArray(settings.filters.countries) &&
          settings.filters.countries.length > 0
        ) {
          country = countryFromString(settings.filters.countries[0].name);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to parse country "${settings.filters.countries[0].name}":`, error);
        // Continue without country filter
      }

      const input: ScraperInput = {
        site_type: [Site.INDEED], // Пока только Indeed
        search_term: position,
        location:
          settings.filters?.countries &&
          Array.isArray(settings.filters.countries) &&
          settings.filters.countries.length > 0
            ? settings.filters.countries[0].name
            : undefined,
        country: country,
        is_remote: true, // Фокусируемся на remote вакансиях
        results_wanted: 25, // Ограничиваем для тестирования
      };

      const response: JobResponse = await scraper.scrape(input);

      if (response.jobs.length === 0) {
        console.warn(`⚠️ ${source} no jobs found for ${position}`);
      }

      // Проверяем, что response.jobs является массивом
      if (!response.jobs || !Array.isArray(response.jobs)) {
        console.error(`❌ ${source} returned invalid jobs data for ${position}:`, response.jobs);
        continue;
      }

      // Конвертируем JobPost в Vacancy
      for (const job of response.jobs) {
        if (job && typeof job === 'object') {
          const vacancy = this.convertJobToVacancy(job, sessionId);
          vacancies.push(vacancy);
        } else {
          console.warn(`⚠️ ${source} returned invalid job object for ${position}:`, job);
        }
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
    settings: SearchRequest['settings'],
    sessionId: string,
  ): Promise<Vacancy[]> {
    if (!this.openaiScraper || !settings.sources.openaiWebSearch) {
      return [];
    }

    // Комбинируем все позиции в один запрос
    const combinedQuery = settings.searchPositions.join(' OR ');

    const input: ScraperInput = {
      site_type: [Site.GOOGLE], // OpenAI web search
      search_term: combinedQuery,
      is_remote: true,
      results_wanted: settings.sources.openaiWebSearch.maxResults ?? 50,
    };

    const response = await this.openaiScraper.scrape(input);

    if (!response.jobs || response.jobs.length === 0) {
      throw new Error(`OpenAI WebSearch returned no jobs`);
    }

    return response.jobs.map((job) => this.convertJobToVacancy(job, sessionId));
  }

  /**
   * Конвертировать JobPost в Vacancy
   */
  private convertJobToVacancy(job: JobPost, _sessionId: string): Vacancy {
    return {
      id: randomUUID(),
      title: job.title,
      description: job.description ?? '',
      url: job.job_url,
      published_date: job.date_posted ? job.date_posted.toISOString() : undefined,
      status: 'collected',
      created_at: new Date().toISOString(),
      collected_at: new Date().toISOString(),
      source: 'indeed', // Default source
      country: job.location?.country ?? undefined,
      // data будет содержать дополнительную информацию в JSON формате
      data: JSON.stringify({
        company: job.company_name,
        location: job.location,
        is_remote: job.is_remote,
        job_type: job.job_type,
        compensation: job.compensation,
        emails: job.emails,
      }),
    };
  }
}
