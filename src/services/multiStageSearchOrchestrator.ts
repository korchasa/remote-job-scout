/**
 * Multi-Stage Search Orchestrator
 * Координирует выполнение многоэтапного процесса поиска вакансий
 *
 * ## Responsibilities:
 * - Manages the complete 3-stage search pipeline (Collect → Filter → Enrich)
 * - Tracks processing progress and calculates ETA for each stage
 * - Handles pause/resume functionality with state persistence
 * - Integrates with ETAService for real-time time estimation
 * - Manages session snapshots for recovery after restarts
 *
 * ## Relationships:
 * - Uses JobCollectionService for parallel job scraping
 * - Uses FilteringService for vacancy filtering logic
 * - Uses EnrichmentService for LLM-based job enrichment
 * - Uses SessionSnapshotService for persistence and recovery
 * - Uses ETAService for ETA calculations and progress tracking
 * - Provides progress data to ProgressDashboard via API endpoints
 */

import type {
  MultiStageProgress,
  SearchRequest,
  Vacancy,
  ProcessingStage,
} from '../types/database.js';
import type { CollectionResult } from './jobCollectionService.js';
import { JobCollectionService } from './jobCollectionService.js';
import type { FilteringResult } from './filteringService.js';
import { FilteringService } from './filteringService.js';
import type { EnrichmentResult } from './enrichmentService.js';
import { EnrichmentService } from './enrichmentService.js';
import type { Scraper } from '../types/scrapers.js';
import { IndeedScraper } from './scrapers/indeed.js';
import { LinkedInScraper } from './scrapers/linkedin.js';
import { GlassdoorScraper } from './scrapers/glassdoor.js';
import { OpenAIWebSearchScraper } from './scrapers/openai-web-search.js';
import { SessionSnapshotService } from './sessionSnapshotService.js';
import { ETAService } from './etaService.js';
import { loggingService } from './loggingService.js';
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
  private snapshotService: SessionSnapshotService;
  private etaService: ETAService;
  private activeProcesses: Map<string, MultiStageProgress> = new Map();
  private jobsStorage?: Map<string, Vacancy>;
  private stageStartTimes: Map<string, Date> = new Map();

  constructor(jobsStorage?: Map<string, Vacancy>) {
    this.collectionService = new JobCollectionService();
    this.filteringService = new FilteringService();
    this.enrichmentService = new EnrichmentService();
    this.snapshotService = new SessionSnapshotService();
    this.etaService = new ETAService();
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
      status: 'running',
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

    // Initialize ETA tracking for this session
    this.etaService.resetAllData();
    this.stageStartTimes.set(`${session_id}-collecting`, new Date());

    // Progress updates available via polling: GET /api/multi-stage/progress/:sessionId

    const result: OrchestratorResult = {
      success: false,
      sessionId: session_id,
      finalProgress: progress,
      errors: [],
    };

    try {
      loggingService.logSearchStart(session_id, {
        positions: (request as any).positions,
        sources: Object.keys((request as any).sources),
      });

      // Stage 1: Collection
      const collectionResult = await this.executeCollectionStage(request, progress);
      result.collectionResult = collectionResult;

      if (!collectionResult.success || collectionResult.vacancies.length === 0) {
        throw new Error('Collection stage failed or returned no vacancies');
      }

      // Save collected vacancies
      this.saveVacancies(collectionResult.vacancies, session_id);

      // Save session snapshot after collection
      await this.saveSessionSnapshot(session_id, progress, settings, collectionResult);

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

      // Add filtering statistics to progress
      if (progress.stages.filtering.status === 'completed') {
        progress.filteringStats = {
          totalFiltered: filteringResult.filteredCount,
          totalSkipped: filteringResult.skippedCount,
          skipReasons: filteringResult.reasons,
        };
      }

      if (!filteringResult.success) {
        console.warn('⚠️ Filtering stage had errors, continuing with available data');
      }

      // Save session snapshot after filtering
      await this.saveSessionSnapshot(
        session_id,
        progress,
        settings,
        collectionResult,
        filteringResult,
      );

      // Stage 3: Enrichment (обязательная стадия)
      if (filteringResult.filteredVacancies.length > 0) {
        if (!settings.sources.openaiWebSearch?.apiKey) {
          throw new Error('OpenAI API key is required for enrichment stage');
        }

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

        // Save session snapshot after enrichment
        await this.saveSessionSnapshot(
          session_id,
          progress,
          settings,
          collectionResult,
          filteringResult,
          enrichmentResult,
        );
      } else {
        // Если нет вакансий для обогащения, помечаем стадию как пропущенную
        progress.stages.enriching.status = 'skipped';
        progress.stages.enriching.endTime = new Date().toISOString();
        loggingService.logStageTransition(session_id, 'enrichment', 'pending', 'skipped', {
          reason: 'no vacancies to enrich',
        });

        // Save session snapshot after enrichment skipped
        await this.saveSessionSnapshot(
          session_id,
          progress,
          settings,
          collectionResult,
          filteringResult,
        );
      }

      // Завершаем процесс
      progress.currentStage = 'completed';
      progress.status = 'completed';
      progress.isComplete = true;
      progress.canStop = false;
      progress.overallProgress = 100;

      result.success = true;
      result.finalProgress = progress;

      // Save final session snapshot
      await this.saveSessionSnapshot(
        session_id,
        progress,
        settings,
        collectionResult,
        filteringResult,
        result.enrichmentResult,
      );

      // Progress updates available via polling: GET /api/multi-stage/progress/:sessionId

      loggingService.logInfo(`Multi-stage search completed for session ${session_id}`, {
        sessionId: session_id,
      });
      this.logFinalStatistics(result);

      return result;
    } catch (error) {
      progress.status = 'error';
      progress.isComplete = true;
      progress.canStop = false;
      progress.errors.push((error as Error).message);
      result.errors.push((error as Error).message);
      result.finalProgress = progress;

      // Save error session snapshot (using available results)
      await this.saveSessionSnapshot(
        session_id,
        progress,
        settings,
        result.collectionResult,
        result.filteringResult,
        result.enrichmentResult,
      );

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
   * Updates ETA information in the progress object
   *
   * This method integrates with the ETAService to calculate real-time ETA
   * for the overall process and individual stages. It implements the formula:
   * ETA = (total - processed) / speed × 60 seconds with smoothing.
   *
   * @param progress - The MultiStageProgress object to update with ETA data
   */
  private updateProgressWithETA(progress: MultiStageProgress): void {
    // Create a properly typed stages object for the ETA service
    const stagesForETA: Record<ProcessingStage, any> = {
      ...progress.stages,
      completed: {
        status: 'completed',
        progress: 100,
        itemsProcessed: 0,
        itemsTotal: 0,
        errors: [],
      },
    };

    const overallETA = this.etaService.calculateOverallETA(
      stagesForETA as any,
      progress.currentStage,
    );

    // Update overall ETA
    progress.estimatedCompletionTime =
      overallETA.totalEstimatedTime > 0
        ? new Date(Date.now() + overallETA.totalEstimatedTime * 1000).toISOString()
        : undefined;

    // Update stage-specific ETA information (only for stages that exist in progress.stages)
    for (const stageETA of overallETA.stageBreakdown) {
      const stageKey = stageETA.stage as keyof typeof progress.stages;
      if (stageKey in progress.stages) {
        progress.stages[stageKey].etaSeconds = stageETA.smoothedETA;
        progress.stages[stageKey].etaConfidence = stageETA.confidence;
      }
    }

    // Store overall ETA for backward compatibility with existing UI
    progress.overallETA = overallETA.totalEstimatedTime;
    progress.etaConfidence = overallETA.overallConfidence;
  }

  /**
   * Records current progress data for ETA speed calculation
   *
   * This method captures processing speed data points that are used by the ETAService
   * to calculate accurate ETA estimates. Speed is calculated as items processed per minute.
   * The data is recorded periodically during active processing stages.
   *
   * @param sessionId - The session identifier for tracking
   * @param stage - Current processing stage (collecting, filtering, enriching)
   * @param progress - Current progress data containing stage information
   */
  private recordProgressForETA(
    sessionId: string,
    stage: ProcessingStage,
    progress: MultiStageProgress,
  ): void {
    const stageKey = `${sessionId}-${stage}`;
    const stageStartTime = this.stageStartTimes.get(stageKey);

    // Only record progress for stages that exist in the progress object
    const stageKeyTyped = stage as keyof typeof progress.stages;
    if (stageStartTime && stageKeyTyped in progress.stages) {
      const elapsedSeconds = (Date.now() - stageStartTime.getTime()) / 1000;
      this.etaService.recordProgress(stage, progress.stages[stageKeyTyped], elapsedSeconds);
    }
  }

  /**
   * Gets current process progress with updated ETA information
   *
   * This method extends the base progress retrieval to include real-time ETA calculations.
   * Each call triggers progress recording for speed calculation and updates ETA estimates
   * based on current processing speed and remaining work.
   *
   * @param sessionId - The session identifier to get progress for
   * @returns MultiStageProgress with ETA data or null if session not found
   */
  getProgress(sessionId: string): MultiStageProgress | null {
    const progress = this.activeProcesses.get(sessionId);
    if (!progress) return null;

    // Record current progress for ETA calculation
    this.recordProgressForETA(sessionId, progress.currentStage, progress);

    // Update progress with latest ETA information
    this.updateProgressWithETA(progress);

    return progress;
  }

  /**
   * Restores sessions from filesystem snapshots on server startup
   */
  async restoreSessionsFromSnapshots(): Promise<{ restored: number; failed: number }> {
    try {
      const listResult = await this.snapshotService.listSnapshots();

      if (!listResult.success) {
        console.error('❌ Failed to list snapshots for restoration:', listResult.error);
        return { restored: 0, failed: 0 };
      }

      let restored = 0;
      let failed = 0;

      for (const snapshot of listResult.sessions) {
        try {
          // Only restore sessions that are not completed
          if (snapshot.status === 'completed') {
            console.log(
              `⏭️ Skipping completed session ${snapshot.sessionId} (available for read-only viewing)`,
            );
            continue;
          }

          // Restore progress to active processes
          this.activeProcesses.set(snapshot.sessionId, snapshot.progress);

          // Restore vacancies to storage if available
          if (this.jobsStorage && snapshot.vacancies.length > 0) {
            for (const vacancy of snapshot.vacancies) {
              this.jobsStorage.set(vacancy.id, vacancy);
            }
          }

          console.log(
            `🔄 Restored session ${snapshot.sessionId} (${snapshot.status} at ${snapshot.currentStage})`,
          );
          restored++;
        } catch (error) {
          console.error(`❌ Failed to restore session ${snapshot.sessionId}:`, error);
          failed++;
        }
      }

      console.log(`📊 Session restoration complete: ${restored} restored, ${failed} failed`);
      return { restored, failed };
    } catch (error) {
      console.error('❌ Error during session restoration:', error);
      return { restored: 0, failed: 1 };
    }
  }

  /**
   * Gets all available sessions (both active and from snapshots)
   */
  async getAllSessions(): Promise<
    Array<{
      sessionId: string;
      status: string;
      currentStage: string;
      startTime: string;
      canResume: boolean;
      hasSnapshot: boolean;
    }>
  > {
    const sessions: Array<{
      sessionId: string;
      status: string;
      currentStage: string;
      startTime: string;
      canResume: boolean;
      hasSnapshot: boolean;
    }> = [];

    // Add active processes
    for (const [sessionId, progress] of this.activeProcesses.entries()) {
      sessions.push({
        sessionId,
        status: progress.status,
        currentStage: progress.currentStage,
        startTime: progress.startTime,
        canResume: !progress.isComplete,
        hasSnapshot: true, // Active processes should have snapshots
      });
    }

    // Add sessions from snapshots (excluding duplicates)
    try {
      const listResult = await this.snapshotService.listSnapshots();
      if (listResult.success) {
        for (const snapshot of listResult.sessions) {
          // Skip if already in active processes
          if (this.activeProcesses.has(snapshot.sessionId)) {
            continue;
          }

          sessions.push({
            sessionId: snapshot.sessionId,
            status: snapshot.status,
            currentStage: snapshot.currentStage,
            startTime: snapshot.createdAt,
            canResume: snapshot.canResume,
            hasSnapshot: true,
          });
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load sessions from snapshots:', error);
    }

    // Sort by start time (newest first)
    sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return sessions;
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
    progress.status = 'stopped';
    progress.isComplete = true;
    progress.canStop = false;
    progress.errors.push(`Process stopped at ${currentStage} stage`);

    // Save snapshot when process is stopped
    void this.saveSessionSnapshot(sessionId, progress, {} as SearchRequest['settings']);

    loggingService.logUserAction(
      'search.stop',
      `Process stopped for session ${sessionId} at ${currentStage} stage`,
      { sessionId },
    );
    return true;
  }

  /**
   * Приостанавливает процесс поиска
   */
  pauseProcess(sessionId: string): boolean {
    const progress = this.activeProcesses.get(sessionId);
    if (!progress || progress.isComplete || progress.status === 'paused' || !progress.canStop) {
      return false;
    }

    // Приостанавливаем текущую стадию
    const currentStage = progress.currentStage;
    if (currentStage !== 'completed') {
      progress.stages[currentStage].status = 'paused';
      progress.stages[currentStage].pauseTime = new Date().toISOString();
    }
    progress.status = 'paused';
    progress.canStop = false;
    progress.errors.push(`Process paused at ${currentStage} stage`);

    // Save snapshot when process is paused
    void this.saveSessionSnapshot(sessionId, progress, {} as SearchRequest['settings']);

    console.log(`⏸️ Process paused for session ${sessionId} at ${currentStage} stage`);
    return true;
  }

  /**
   * Возобновляет приостановленный процесс поиска
   */
  async resumeProcess(sessionId: string, request: SearchRequest): Promise<OrchestratorResult> {
    const progress = this.activeProcesses.get(sessionId);
    if (!progress) {
      return {
        success: false,
        sessionId,
        finalProgress: {} as MultiStageProgress,
        errors: [`No process found for session ${sessionId}`],
      };
    }

    if (progress.status !== 'paused') {
      return {
        success: false,
        sessionId,
        finalProgress: progress,
        errors: [`Process ${sessionId} is not paused`],
      };
    }

    // Возобновляем процесс
    progress.status = 'running';
    progress.canStop = true;
    const resumeTime = new Date().toISOString();

    // Удаляем сообщение о паузе из ошибок
    progress.errors = progress.errors.filter((error) => !error.includes('paused'));

    console.log(`▶️ Process resumed for session ${sessionId} at ${progress.currentStage} stage`);

    // Продолжаем выполнение с текущей стадии
    return this.continueFromStage(request, progress, resumeTime);
  }

  /**
   * Продолжает выполнение процесса с указанной стадии
   */
  private async continueFromStage(
    request: SearchRequest,
    progress: MultiStageProgress,
    resumeTime: string,
  ): Promise<OrchestratorResult> {
    const { session_id, settings } = request;
    const result: OrchestratorResult = {
      success: false,
      sessionId: session_id,
      finalProgress: progress,
      errors: [],
    };

    try {
      // Определяем, с какой стадии продолжить
      const currentStage = progress.currentStage;

      if (currentStage === 'collecting' && progress.stages.collecting.status === 'paused') {
        // Продолжаем сбор данных
        progress.stages.collecting.status = 'running';
        progress.stages.collecting.pauseTime = undefined;
        const collectionResult = await this.executeCollectionStage(request, progress);
        result.collectionResult = collectionResult;

        if (!collectionResult.success) {
          throw new Error('Collection stage failed during resume');
        }

        // Сохраняем вакансии и переходим к следующей стадии
        this.saveVacancies(collectionResult.vacancies, session_id);
      }

      // Если сбор завершен, выполняем фильтрацию
      if (
        progress.stages.collecting.status === 'completed' &&
        (progress.stages.filtering.status === 'pending' ||
          progress.stages.filtering.status === 'paused')
      ) {
        // Получаем собранные вакансии (в реальности нужно восстановить из хранилища)
        const collectedVacancies = this.getCollectedVacancies(session_id);
        if (collectedVacancies.length === 0) {
          throw new Error('No collected vacancies found for filtering');
        }

        const filteringResult = this.executeFilteringStage(
          collectedVacancies,
          settings,
          progress,
          session_id,
        );
        result.filteringResult = filteringResult;

        // Обновляем статусы вакансий
        this.updateVacancyStatuses(filteringResult, session_id);

        // Add filtering statistics to progress
        progress.filteringStats = {
          totalFiltered: filteringResult.filteredCount,
          totalSkipped: filteringResult.skippedCount,
          skipReasons: filteringResult.reasons,
        };
      }

      // Если фильтрация завершена, выполняем обогащение
      if (
        progress.stages.filtering.status === 'completed' &&
        (progress.stages.enriching.status === 'pending' ||
          progress.stages.enriching.status === 'paused')
      ) {
        const filteredVacancies = this.getFilteredVacancies(session_id);
        if (filteredVacancies.length > 0 && settings.sources.openaiWebSearch?.apiKey) {
          const enrichmentResult = await this.executeEnrichmentStage(
            filteredVacancies,
            settings,
            progress,
            session_id,
          );
          result.enrichmentResult = enrichmentResult;
        } else {
          progress.stages.enriching.status = 'skipped';
          progress.stages.enriching.endTime = resumeTime;
        }
      }

      // Завершаем процесс
      progress.currentStage = 'completed';
      progress.status = 'completed';
      progress.isComplete = true;
      progress.canStop = false;
      progress.overallProgress = 100;

      result.success = true;
      result.finalProgress = progress;

      console.log(`✅ Resumed process completed for session ${session_id}`);
      this.logFinalStatistics(result);

      return result;
    } catch (error) {
      progress.status = 'error';
      progress.isComplete = true;
      progress.canStop = false;
      progress.errors.push((error as Error).message);
      result.errors.push((error as Error).message);
      result.finalProgress = progress;

      console.error(`❌ Resume failed for session ${session_id}:`, error);
      return result;
    } finally {
      // Очищаем активные процессы через некоторое время
      setTimeout(() => {
        this.activeProcesses.delete(session_id);
      }, 300000); // 5 минут
    }
  }

  /**
   * Получает собранные вакансии из хранилища
   */
  private getCollectedVacancies(sessionId: string): Vacancy[] {
    if (!this.jobsStorage) return [];

    const vacancies: Vacancy[] = [];
    for (const vacancy of this.jobsStorage.values()) {
      if (vacancy.session_id === sessionId) {
        vacancies.push(vacancy);
      }
    }
    return vacancies;
  }

  /**
   * Получает отфильтрованные вакансии
   */
  private getFilteredVacancies(sessionId: string): Vacancy[] {
    if (!this.jobsStorage) return [];

    const vacancies: Vacancy[] = [];
    for (const vacancy of this.jobsStorage.values()) {
      if (vacancy.session_id === sessionId && vacancy.status === 'filtered') {
        vacancies.push(vacancy);
      }
    }
    return vacancies;
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

    loggingService.logStageStart(session_id, 'collection', {
      positions: (request as any).positions,
      sources: Object.keys((request as any).sources),
    });

    // Формируем массив скрейперов на основе настроек
    const scrapers: Scraper[] = [];

    // Добавляем скрейперы для выбранных источников
    for (const sourceName of settings.sources.jobSites) {
      switch (sourceName) {
        case 'indeed':
          scrapers.push(new IndeedScraper());
          break;
        case 'linkedin':
          scrapers.push(new LinkedInScraper());
          break;
        case 'glassdoor':
          scrapers.push(new GlassdoorScraper());
          break;
      }
    }

    // Добавляем OpenAI WebSearch если настроен
    if (settings.sources.openaiWebSearch?.apiKey) {
      scrapers.push(new OpenAIWebSearchScraper(settings.sources.openaiWebSearch.apiKey));
    }

    try {
      // Запускаем сбор в фоне с отслеживанием прогресса
      const collectionPromise = this.collectionService.collectJobs(scrapers, request);

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

          // Record progress for ETA calculation
          this.recordProgressForETA(session_id, 'collecting', progress);

          // Progress update available via polling
        }
      }, 2000); // Increased interval for better ETA calculation stability

      const result = await collectionPromise;
      clearInterval(progressInterval);

      progress.stages.collecting.status = result.success ? 'completed' : 'failed';
      progress.stages.collecting.endTime = new Date().toISOString();
      progress.stages.collecting.itemsTotal = result.totalCollected;
      progress.stages.collecting.errors = result.errors;

      loggingService.logStageComplete(session_id, 'collection', {
        totalCollected: result.totalCollected,
        duration: (result as any).duration,
      });

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
    sessionId: string,
  ): FilteringResult {
    progress.currentStage = 'filtering';
    progress.stages.filtering.status = 'running';
    progress.stages.filtering.startTime = new Date().toISOString();
    progress.stages.filtering.itemsTotal = vacancies.length;
    progress.overallProgress = 40; // Переходим к 40%

    // Record stage start time for ETA calculation
    this.stageStartTimes.set(`${sessionId}-filtering`, new Date());

    loggingService.logStageStart(sessionId, 'filtering', { vacancyCount: vacancies.length });

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
    sessionId: string,
  ): Promise<EnrichmentResult> {
    progress.currentStage = 'enriching';
    progress.stages.enriching.status = 'running';
    progress.stages.enriching.startTime = new Date().toISOString();
    progress.stages.enriching.itemsTotal = vacancies.length;
    progress.overallProgress = 70; // Переходим к 70%

    // Record stage start time for ETA calculation
    this.stageStartTimes.set(`${sessionId}-enriching`, new Date());

    loggingService.logStageStart(sessionId, 'enrichment', { vacancyCount: vacancies.length });
    loggingService.logInfo('OpenAI API key availability check', {
      sessionId: sessionId,
      stage: 'enrichment',
      metadata: { apiKeyAvailable: !!settings.sources.openaiWebSearch?.apiKey },
    });

    // Настраиваем OpenAI
    if (settings.sources.openaiWebSearch?.apiKey) {
      this.enrichmentService.setOpenAIKey(settings.sources.openaiWebSearch.apiKey);
      loggingService.logInfo('OpenAI API key configured for enrichment service', {
        sessionId: sessionId,
        stage: 'enrichment',
      });
    } else {
      loggingService.logError('No OpenAI API key provided for enrichment', undefined, {
        sessionId: sessionId,
        stage: 'enrichment',
      });
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

      // Update enrichment stats
      progress.enrichmentStats = {
        totalEnriched: result.enrichedCount,
        totalFailed: result.failedCount,
        tokensUsed: result.tokensUsed,
        costUsd: result.costUsd,
        sourcesCount: result.sources.length,
      };

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
   * Saves a session snapshot to filesystem
   */
  private async saveSessionSnapshot(
    sessionId: string,
    progress: MultiStageProgress,
    settings: SearchRequest['settings'],
    collectionResult?: CollectionResult,
    filteringResult?: FilteringResult,
    enrichmentResult?: EnrichmentResult,
  ): Promise<void> {
    try {
      // Get all vacancies for this session
      const vacancies = this.getCollectedVacancies(sessionId);

      const result = await this.snapshotService.saveSnapshot(
        sessionId,
        progress,
        settings,
        vacancies,
        collectionResult,
        filteringResult,
        enrichmentResult,
      );

      if (!result.success) {
        console.warn(`⚠️ Failed to save session snapshot: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error saving session snapshot:`, error);
    }
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
