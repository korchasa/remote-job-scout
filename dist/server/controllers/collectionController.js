/**
 * Collection Controller
 * Обрабатывает HTTP запросы для сбора вакансий
 */
import { JobCollectionService } from '../services/jobCollectionService.js';
import { MultiStageSearchOrchestrator } from '../services/multiStageSearchOrchestrator.js';
// Using HTTP polling for progress updates
export class CollectionController {
    collectionService;
    multiStageOrchestrator;
    constructor(jobsStorage) {
        this.collectionService = new JobCollectionService();
        this.multiStageOrchestrator = new MultiStageSearchOrchestrator(jobsStorage);
    }
    /**
     * Начать сбор вакансий
     */
    startCollection(request) {
        try {
            console.log('🚀 Starting job collection process');
            // Настраиваем OpenAI WebSearch если указан API ключ
            if (request.settings.sources.openaiWebSearch?.apiKey) {
                this.collectionService.setOpenAIWebSearch(request.settings.sources.openaiWebSearch.apiKey, request.settings.sources.openaiWebSearch.globalSearch);
            }
            // Запускаем сбор в фоне (асинхронно, без блокировки)
            void (async () => {
                try {
                    const result = await this.collectionService.collectJobs(request);
                    console.log(`✅ Collection completed for session ${request.session_id}: ${result.totalCollected} jobs`);
                }
                catch (error) {
                    console.error(`❌ Collection failed for session ${request.session_id}:`, error);
                }
            })();
            return Promise.resolve({
                success: true,
                session_id: request.session_id,
                message: 'Job collection started successfully',
                total_found: 0, // Будет обновлено по мере сбора
            });
        }
        catch (error) {
            console.error('❌ Failed to start collection:', error);
            return Promise.resolve({
                success: false,
                session_id: request.session_id,
                message: `Failed to start collection: ${error.message}`,
            });
        }
    }
    /**
     * Получить прогресс сбора
     */
    getCollectionProgress(sessionId) {
        return this.collectionService.getProgress(sessionId);
    }
    /**
     * Остановить сбор вакансий
     */
    stopCollection(sessionId) {
        const stopped = this.collectionService.stopCollection(sessionId);
        if (stopped) {
            return {
                success: true,
                message: `Collection stopped for session ${sessionId}`,
            };
        }
        else {
            return {
                success: false,
                message: `No active collection found for session ${sessionId}`,
            };
        }
    }
    /**
     * Получить статистику сбора
     */
    getCollectionStats(sessionId) {
        const progress = this.collectionService.getProgress(sessionId);
        return {
            sessionId,
            progress: progress ?? undefined,
            isActive: progress ? !progress.isComplete : false,
        };
    }
    /**
     * Запустить многоэтапный поиск
     */
    startMultiStageSearch(request) {
        try {
            console.log('🚀 Starting multi-stage search process');
            console.log(`🔄 Progress updates will be available via polling: GET /api/multi-stage/progress/${request.session_id}`);
            // Запускаем процесс в фоне
            void (async () => {
                try {
                    const result = await this.multiStageOrchestrator.startMultiStageSearch(request);
                    console.log(`✅ Multi-stage search completed for session ${request.session_id}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
                }
                catch (error) {
                    console.error(`❌ Multi-stage search failed for session ${request.session_id}:`, error);
                }
            })();
            return Promise.resolve({
                success: true,
                session_id: request.session_id,
                message: 'Multi-stage search started successfully',
            });
        }
        catch (error) {
            console.error('❌ Failed to start multi-stage search:', error);
            return Promise.resolve({
                success: false,
                session_id: request.session_id,
                message: `Failed to start multi-stage search: ${error.message}`,
            });
        }
    }
    /**
     * Получить прогресс многоэтапного поиска
     */
    getMultiStageProgress(sessionId) {
        return this.multiStageOrchestrator.getProgress(sessionId);
    }
    /**
     * Остановить многоэтапный поиск
     */
    stopMultiStageSearch(sessionId) {
        const stopped = this.multiStageOrchestrator.stopProcess(sessionId);
        if (stopped) {
            return {
                success: true,
                message: `Multi-stage search stopped for session ${sessionId}`,
            };
        }
        else {
            return {
                success: false,
                message: `No active multi-stage search found for session ${sessionId}`,
            };
        }
    }
}
