/**
 * Job Collection Service
 * Координирует сбор вакансий из множественных источников
 */

import { randomUUID } from 'node:crypto';

import type { SearchRequest, Vacancy } from '../types/database.js';
import type { Country, JobPost, JobResponse, Scraper, ScraperInput } from '../types/scrapers.js';
import { countryFromString, Site } from '../types/scrapers.js';

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

export interface CollectionConfig {
  maxConcurrentSources: number; // Максимум источников одновременно
  maxConcurrentPositions: number; // Максимум позиций одновременно
  maxRetries: number; // Максимум повторных попыток
  baseRetryDelay: number; // Базовая задержка для экспоненциального backoff
  enableYamlSerialization: boolean; // Включить YAML сериализацию
}

const defaultConfig: CollectionConfig = {
  maxConcurrentSources: 2,
  maxConcurrentPositions: 3,
  maxRetries: 3,
  baseRetryDelay: 1000, // 1 секунда
  enableYamlSerialization: true,
};

export class JobCollectionService {
  private activeSessions: Map<string, CollectionProgress> = new Map();

  constructor() {
    // JobCollectionService больше не хранит скрейперы сам
  }

  /**
   * Основной метод сбора вакансий
   */
  async collectJobs(scrapers: Scraper[], request: SearchRequest): Promise<CollectionResult> {
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
      const sourcesToProcess = this.getSourcesToProcessWith(scrapers, settings);
      progress.totalSources = sourcesToProcess.length;

      const allVacancies: Vacancy[] = [];
      const processedSources: string[] = [];
      const errors: string[] = [];

      // Параллельная обработка источников с ограничением конкуренции
      const sourceResults = await this.processSourcesInParallel(
        sourcesToProcess,
        settings,
        session_id,
        progress,
        scrapers,
      );

      // Обрабатываем результаты
      for (const result of sourceResults) {
        if (result.success) {
          allVacancies.push(...result.vacancies);
          processedSources.push(result.source);
          progress.sourcesCompleted++;
          progress.jobsCollected = allVacancies.length;

          console.log(`✅ ${result.source}: collected ${result.vacancies.length} jobs`);
        } else {
          errors.push(result.error!);
          progress.errors.push(result.error!);
          console.error(`❌ ${result.error}`);
        }
      }

      progress.isComplete = true;

      // Сериализуем в YAML если включено
      if (defaultConfig.enableYamlSerialization && allVacancies.length > 0) {
        await this.serializeVacanciesToYaml(allVacancies, session_id);
      }

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
   * Определить источники для обработки на основе переданных скрейперов
   */
  private getSourcesToProcessWith(
    scrapers: Scraper[],
    settings: SearchRequest['settings'],
  ): string[] {
    const requestedSources = Object.keys(settings.sources).filter(
      (sourceName) => settings.sources[sourceName].enabled,
    );
    const available = new Set(scrapers.map((s) => s.getName().toLowerCase()));

    // Фильтруем только поддерживаемые источники
    return requestedSources.filter((source) => available.has(source.toLowerCase()));
  }

  /**
   * Обработать один источник
   */
  private async processSource(
    source: string,
    settings: SearchRequest['settings'],
    sessionId: string,
    scrapers: Scraper[],
  ): Promise<Vacancy[]> {
    const scraper = scrapers.find((s) => s.getName().toLowerCase() === source.toLowerCase());
    if (!scraper) {
      throw new Error(`Scraper for ${source} not found`);
    }

    const allVacancies: Vacancy[] = [];

    // Параллельная обработка позиций
    const positionBatches = this.chunkArray(
      settings.searchPositions,
      defaultConfig.maxConcurrentPositions,
    );

    for (const batch of positionBatches) {
      const positionPromises = batch.map((position) =>
        this.processPosition(scraper, source, position, settings, sessionId),
      );

      const batchResults = await Promise.all(positionPromises);
      for (const vacancies of batchResults) {
        allVacancies.push(...vacancies);
      }
    }

    return allVacancies;
  }

  /**
   * Обработать одну позицию для источника
   */
  private async processPosition(
    scraper: Scraper,
    source: string,
    position: string,
    settings: SearchRequest['settings'],
    sessionId: string,
  ): Promise<Vacancy[]> {
    const vacancies: Vacancy[] = [];

    let country: Country | undefined;
    try {
      if (
        settings.filters?.countries &&
        Array.isArray(settings.filters.countries) &&
        settings.filters.countries.length > 0
      ) {
        country = countryFromString(settings.filters.countries[0]);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to parse country "${settings.filters.countries[0]}":`, error);
      // Continue without country filter
    }

    // Определяем site_type на основе источника
    let siteType: Site;
    switch (source.toLowerCase()) {
      case 'indeed':
        siteType = Site.INDEED;
        break;
      case 'linkedin':
        siteType = Site.LINKEDIN;
        break;
      case 'openai':
        siteType = Site.OPENAI;
        break;
      case 'google':
        siteType = Site.GOOGLE;
        break;
      default:
        siteType = Site.INDEED; // fallback
    }

    const input: ScraperInput = {
      site_type: [siteType],
      search_term: position,
      location:
        settings.filters?.countries &&
        Array.isArray(settings.filters.countries) &&
        settings.filters.countries.length > 0
          ? settings.filters.countries[0]
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
      return vacancies;
    }

    // Конвертируем JobPost в Vacancy
    for (const job of response.jobs) {
      if (job && typeof job === 'object') {
        const vacancy = this.convertJobToVacancy(job, sessionId, source);
        vacancies.push(vacancy);
      } else {
        console.warn(`⚠️ ${source} returned invalid job object for ${position}:`, job);
      }
    }

    return vacancies;
  }

  /**
   * Конвертировать JobPost в Vacancy
   */
  private convertJobToVacancy(job: JobPost, sessionId: string, source?: string): Vacancy {
    return {
      id: randomUUID(),
      title: job.title,
      description: job.description ?? '',
      url: job.job_url,
      published_date: job.date_posted ? job.date_posted.toISOString() : undefined,
      status: 'collected',
      created_at: new Date().toISOString(),
      collected_at: new Date().toISOString(),
      source: source ?? 'unknown',
      country: job.location?.country ?? undefined,
      session_id: sessionId,
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

  /**
   * Параллельная обработка источников с ограничением конкуренции
   */
  private async processSourcesInParallel(
    sources: string[],
    settings: SearchRequest['settings'],
    sessionId: string,
    progress: CollectionProgress,
    scrapers: Scraper[],
  ): Promise<Array<{ source: string; success: boolean; vacancies: Vacancy[]; error?: string }>> {
    const results: Array<{
      source: string;
      success: boolean;
      vacancies: Vacancy[];
      error?: string;
    }> = [];

    // Разбиваем источники на батчи для параллельной обработки
    const batches = this.chunkArray(sources, defaultConfig.maxConcurrentSources);

    for (const batch of batches) {
      const batchPromises = batch.map((source) =>
        this.processSourceWithRetry(source, settings, sessionId, progress, scrapers),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Обработка источника с retry
   */
  private async processSourceWithRetry(
    source: string,
    settings: SearchRequest['settings'],
    sessionId: string,
    progress: CollectionProgress,
    scrapers: Scraper[],
  ): Promise<{ source: string; success: boolean; vacancies: Vacancy[]; error?: string }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= defaultConfig.maxRetries; attempt++) {
      try {
        progress.currentSource = source;
        const vacancies = await this.processSource(source, settings, sessionId, scrapers);
        return { source, success: true, vacancies };
      } catch (error) {
        lastError = error as Error;

        if (attempt < defaultConfig.maxRetries) {
          const delay = defaultConfig.baseRetryDelay * Math.pow(2, attempt);
          console.log(
            `⏳ Retrying ${source} in ${delay}ms (attempt ${attempt + 1}/${
              defaultConfig.maxRetries + 1
            })`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return {
      source,
      success: false,
      vacancies: [],
      error: `${source}: ${lastError?.message ?? 'Unknown error'}`,
    };
  }

  /**
   * Разбить массив на чанки
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      result.push(array.slice(i, i + size));
    }
    return result;
  }

  /**
   * Сериализация вакансий в YAML
   */
  private async serializeVacanciesToYaml(vacancies: Vacancy[], sessionId: string): Promise<void> {
    try {
      const { writeFileSync, mkdirSync } = await import('node:fs');
      const { dirname, resolve } = await import('node:path');
      const yamlModule = await import('js-yaml');
      const yaml = yamlModule.default;

      const filePath = resolve('data', 'jobs', `${sessionId}.yml`);
      mkdirSync(dirname(filePath), { recursive: true });

      const data = {
        session_id: sessionId,
        total: vacancies.length,
        vacancies: vacancies.map((v) => ({
          id: v.id,
          title: v.title,
          company: JSON.parse(v.data ?? '{}').company,
          url: v.url,
          published_date: v.published_date ?? null,
          source: v.source ?? 'unknown',
        })),
      };

      writeFileSync(filePath, yaml.dump(data), 'utf8');
    } catch (error) {
      console.error('❌ Failed to serialize vacancies to YAML:', error);
    }
  }
}
