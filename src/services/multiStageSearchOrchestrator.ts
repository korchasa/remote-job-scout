/**
 * Multi-Stage Search Orchestrator
 * Координирует выполнение многоэтапного процесса поиска вакансий
 */

import type { MultiStageProgress, SearchRequest, Vacancy } from '../types/database.js';
import type { CollectionResult } from './jobCollectionService.js';
import { JobCollectionService } from './jobCollectionService.js';
import type { FilteringResult } from './filteringService.js';
import { FilteringService } from './filteringService.js';
import type { EnrichmentResult } from './enrichmentService.js';
import { EnrichmentService } from './enrichmentService.js';
// Using HTTP polling for progress updates

export interface OrchestratorResult {
  success: boolean;
  sessionId: string;
  finalProgress: MultiStageProgress;
  collectionResult?: CollectionResult;
  filteringResult?: FilteringResult;
  enrichmentResult?: EnrichmentResult;
  errors: string[];
}

export class MultiStageSearchOrchestrator {
  private collectionService: JobCollectionService;
  private filteringService: FilteringService;
  private enrichmentService: EnrichmentService;
  private activeProcesses: Map<string, MultiStageProgress> = new Map();
  private jobsStorage?: Map<string, Vacancy>;

  constructor(jobsStorage?: Map<string, Vacancy>) {
    this.collectionService = new JobCollectionService();
    this.filteringService = new FilteringService();
    this.enrichmentService = new EnrichmentService();
    this.jobsStorage = jobsStorage;
  }

  /**
   * Запускает полный многоэтапный процесс поиска
   */
  async startMultiStageSearch(request: SearchRequest): Promise<OrchestratorResult> {
    const { session_id, settings } = request;
    const startTime = new Date().toISOString();

    // Инициализируем прогресс
    const progress: MultiStageProgress = {
      sessionId: session_id,
      currentStage: 'collecting',
      overallProgress: 0,
      stageProgress: 0,
      stages: {
        collecting: {
          status: 'pending',
          progress: 0,
          itemsProcessed: 0,
          itemsTotal: 0,
          errors: [],
        },
        filtering: {
          status: 'pending',
          progress: 0,
          itemsProcessed: 0,
          itemsTotal: 0,
          errors: [],
        },
        enriching: {
          status: 'pending',
          progress: 0,
          itemsProcessed: 0,
          itemsTotal: 0,
          errors: [],
        },
      },
      startTime,
      isComplete: false,
      canStop: true,
      errors: [],
    };

    this.activeProcesses.set(session_id, progress);

    // Progress updates available via polling: GET /api/multi-stage/progress/:sessionId

    const result: OrchestratorResult = {
      success: false,
      sessionId: session_id,
      finalProgress: progress,
      errors: [],
    };

    try {
      console.log(`🚀 Starting multi-stage search process for session ${session_id}`);

      // Stage 1: Collection
      const collectionResult = await this.executeCollectionStage(request, progress);
      result.collectionResult = collectionResult;

      if (!collectionResult.success || collectionResult.vacancies.length === 0) {
        throw new Error('Collection stage failed or returned no vacancies');
      }

      // Save collected vacancies
      this.saveVacancies(collectionResult.vacancies, session_id);

      // Stage 2: Filtering
      const filteringResult = this.executeFilteringStage(
        collectionResult.vacancies,
        settings,
        progress,
        session_id,
      );
      result.filteringResult = filteringResult;

      // Update vacancy statuses after filtering
      this.updateVacancyStatuses(filteringResult, session_id);

      if (!filteringResult.success) {
        console.warn('⚠️ Filtering stage had errors, continuing with available data');
      }

      // Stage 3: Enrichment (если настроен OpenAI и есть вакансии для обогащения)
      if (
        settings.sources.openaiWebSearch?.apiKey &&
        filteringResult.filteredVacancies.length > 0
      ) {
        const enrichmentResult = await this.executeEnrichmentStage(
          filteringResult.filteredVacancies,
          settings,
          progress,
          session_id,
        );
        result.enrichmentResult = enrichmentResult;

        if (!enrichmentResult.success) {
          console.warn('⚠️ Enrichment stage had errors, using filtered data');
        }
      }

      // Завершаем процесс
      progress.currentStage = 'completed';
      progress.isComplete = true;
      progress.canStop = false;
      progress.overallProgress = 100;

      result.success = true;
      result.finalProgress = progress;

      // Progress updates available via polling: GET /api/multi-stage/progress/:sessionId

      console.log(`✅ Multi-stage search completed for session ${session_id}`);
      this.logFinalStatistics(result);

      return result;
    } catch (error) {
      progress.isComplete = true;
      progress.canStop = false;
      progress.errors.push((error as Error).message);
      result.errors.push((error as Error).message);
      result.finalProgress = progress;

      console.error(`❌ Multi-stage search failed for session ${session_id}:`, error);
      return result;
    } finally {
      // Очищаем активные процессы через некоторое время
      setTimeout(() => {
        this.activeProcesses.delete(session_id);
      }, 300000); // 5 минут
    }
  }

  /**
   * Получает текущий прогресс процесса
   */
  getProgress(sessionId: string): MultiStageProgress | null {
    return this.activeProcesses.get(sessionId) ?? null;
  }

  /**
   * Останавливает процесс поиска
   */
  stopProcess(sessionId: string): boolean {
    const progress = this.activeProcesses.get(sessionId);
    if (!progress || progress.isComplete || !progress.canStop) {
      return false;
    }

    // Останавливаем текущую стадию
    const currentStage = progress.currentStage;
    if (currentStage !== 'completed') {
      progress.stages[currentStage].status = 'stopped';
      progress.stages[currentStage].endTime = new Date().toISOString();
    }
    progress.isComplete = true;
    progress.canStop = false;
    progress.errors.push(`Process stopped at ${currentStage} stage`);

    console.log(`🛑 Process stopped for session ${sessionId} at ${currentStage} stage`);
    return true;
  }

  /**
   * Выполняет стадию сбора вакансий
   */
  private async executeCollectionStage(
    request: SearchRequest,
    progress: MultiStageProgress,
  ): Promise<CollectionResult> {
    const { session_id, settings } = request;

    progress.currentStage = 'collecting';
    progress.stages.collecting.status = 'running';
    progress.stages.collecting.startTime = new Date().toISOString();
    progress.overallProgress = 10; // 10% за подготовку

    console.log(`📥 Starting collection stage for session ${session_id}`);

    // Настраиваем OpenAI если нужно
    if (settings.sources.openaiWebSearch?.apiKey) {
      this.collectionService.setOpenAIWebSearch(
        settings.sources.openaiWebSearch.apiKey,
        settings.sources.openaiWebSearch.globalSearch,
      );
    }

    try {
      // Запускаем сбор в фоне с отслеживанием прогресса
      const collectionPromise = this.collectionService.collectJobs(request);

      // Отслеживаем прогресс сбора
      const progressInterval = setInterval(() => {
        const collectionProgress = this.collectionService.getProgress(session_id);
        if (collectionProgress) {
          progress.stages.collecting.progress = Math.round(
            (collectionProgress.sourcesCompleted / collectionProgress.totalSources) * 100,
          );
          progress.stages.collecting.itemsProcessed = collectionProgress.jobsCollected;
          progress.stages.collecting.itemsTotal = collectionProgress.jobsCollected; // Обновляем по мере сбора
          progress.stageProgress = progress.stages.collecting.progress;
          progress.overallProgress = 10 + progress.stageProgress * 0.3; // 10-40% за сбор

          // Progress update available via polling
        }
      }, 1000);

      const result = await collectionPromise;
      clearInterval(progressInterval);

      progress.stages.collecting.status = result.success ? 'completed' : 'failed';
      progress.stages.collecting.endTime = new Date().toISOString();
      progress.stages.collecting.itemsTotal = result.totalCollected;
      progress.stages.collecting.errors = result.errors;

      console.log(`📥 Collection stage completed: ${result.totalCollected} jobs collected`);

      // Collection stage completed - progress available via polling

      return result;
    } catch (error) {
      progress.stages.collecting.status = 'failed';
      progress.stages.collecting.endTime = new Date().toISOString();
      progress.stages.collecting.errors.push((error as Error).message);

      throw error;
    }
  }

  /**
   * Выполняет стадию фильтрации
   */
  private executeFilteringStage(
    vacancies: Vacancy[],
    settings: SearchRequest['settings'],
    progress: MultiStageProgress,
    _sessionId: string,
  ): FilteringResult {
    progress.currentStage = 'filtering';
    progress.stages.filtering.status = 'running';
    progress.stages.filtering.startTime = new Date().toISOString();
    progress.stages.filtering.itemsTotal = vacancies.length;
    progress.overallProgress = 40; // Переходим к 40%

    console.log(`🔍 Starting filtering stage with ${vacancies.length} vacancies`);

    try {
      const result = this.filteringService.filterVacancies(vacancies, settings);

      progress.stages.filtering.status = result.success ? 'completed' : 'failed';
      progress.stages.filtering.endTime = new Date().toISOString();
      progress.stages.filtering.progress = 100;
      // Track passed (filtered) vacancies here so UI shows count of successfully filtered jobs
      progress.stages.filtering.itemsProcessed = result.filteredCount;
      progress.stages.filtering.errors = result.errors;
      progress.stageProgress = 100;
      progress.overallProgress = 70; // 70% после фильтрации

      console.log(
        `🔍 Filtering stage completed: ${result.filteredCount} passed, ${result.skippedCount} skipped`,
      );

      // Filtering stage completed - progress available via polling

      return result;
    } catch (error) {
      progress.stages.filtering.status = 'failed';
      progress.stages.filtering.endTime = new Date().toISOString();
      progress.stages.filtering.errors.push((error as Error).message);

      throw error;
    }
  }

  /**
   * Выполняет стадию обогащения
   */
  private async executeEnrichmentStage(
    vacancies: Vacancy[],
    settings: SearchRequest['settings'],
    progress: MultiStageProgress,
    _sessionId: string,
  ): Promise<EnrichmentResult> {
    progress.currentStage = 'enriching';
    progress.stages.enriching.status = 'running';
    progress.stages.enriching.startTime = new Date().toISOString();
    progress.stages.enriching.itemsTotal = vacancies.length;
    progress.overallProgress = 70; // Переходим к 70%

    console.log(`🤖 Starting enrichment stage with ${vacancies.length} vacancies`);

    // Настраиваем OpenAI
    if (settings.sources.openaiWebSearch?.apiKey) {
      this.enrichmentService.setOpenAIKey(settings.sources.openaiWebSearch.apiKey);
    }

    try {
      const result = await this.enrichmentService.enrichVacancies(vacancies, settings);

      progress.stages.enriching.status = result.success ? 'completed' : 'failed';
      progress.stages.enriching.endTime = new Date().toISOString();
      progress.stages.enriching.progress = 100;
      progress.stages.enriching.itemsProcessed = result.totalProcessed;
      progress.stages.enriching.errors = result.errors;
      progress.stageProgress = 100;
      progress.overallProgress = 100; // 100% после обогащения

      console.log(
        `🤖 Enrichment stage completed: ${result.enrichedCount} enriched, ${result.failedCount} failed`,
      );

      // Enrichment stage completed - progress available via polling

      return result;
    } catch (error) {
      progress.stages.enriching.status = 'failed';
      progress.stages.enriching.endTime = new Date().toISOString();
      progress.stages.enriching.errors.push((error as Error).message);

      throw error;
    }
  }

  /**
   * Логирует финальную статистику
   */
  private logFinalStatistics(result: OrchestratorResult): void {
    const { collectionResult, filteringResult, enrichmentResult } = result;

    console.log('📊 Final Search Statistics:');
    console.log(`   📥 Collected: ${collectionResult?.totalCollected ?? 0} jobs`);
    console.log(
      `   🔍 Filtered: ${filteringResult?.filteredCount ?? 0} passed, ${
        filteringResult?.skippedCount ?? 0
      } skipped`,
    );
    console.log(
      `   🤖 Enriched: ${enrichmentResult?.enrichedCount ?? 0} enriched, ${
        enrichmentResult?.failedCount ?? 0
      } failed`,
    );

    if (filteringResult?.reasons && Object.keys(filteringResult.reasons).length > 0) {
      console.log('   📋 Skip reasons:', filteringResult.reasons);
    }

    if (enrichmentResult?.tokensUsed) {
      console.log(
        `   💰 Tokens used: ${enrichmentResult.tokensUsed}, Cost: $${enrichmentResult.costUsd.toFixed(
          4,
        )}`,
      );
    }
  }

  /**
   * Сохраняет вакансии в хранилище
   */
  private saveVacancies(vacancies: Vacancy[], sessionId: string): void {
    if (!this.jobsStorage) return;

    for (const vacancy of vacancies) {
      const vacancyWithSession = {
        ...vacancy,
        session_id: sessionId,
      };
      this.jobsStorage.set(vacancy.id, vacancyWithSession);
    }

    console.log(`💾 Saved ${vacancies.length} vacancies to storage`);
  }

  /**
   * Обновляет статусы вакансий после фильтрации
   */
  private updateVacancyStatuses(filteringResult: FilteringResult, _sessionId: string): void {
    if (!this.jobsStorage) return;

    // Update filtered vacancies
    for (const vacancy of filteringResult.filteredVacancies) {
      const existing = this.jobsStorage.get(vacancy.id);
      if (existing) {
        this.jobsStorage.set(vacancy.id, {
          ...existing,
          status: 'filtered',
          filtered_at: new Date().toISOString(),
        });
      }
    }

    // Update skipped vacancies
    for (const vacancy of filteringResult.skippedVacancies) {
      const existing = this.jobsStorage.get(vacancy.id);
      if (existing) {
        this.jobsStorage.set(vacancy.id, {
          ...existing,
          status: 'skipped',
          skip_reason: vacancy.skip_reason,
          filtered_at: new Date().toISOString(),
        });
      }
    }

    console.log(
      `📝 Updated vacancy statuses: ${filteringResult.filteredCount} filtered, ${filteringResult.skippedCount} skipped`,
    );
  }
}
