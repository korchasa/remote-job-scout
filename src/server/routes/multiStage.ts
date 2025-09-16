import type { Request, Response } from 'express';
import { Router } from 'express';
import type { SearchRequest } from '../../types/database.js';
import { CollectionController } from '../../controllers/collectionController.js';
import { jobs } from '../storage.js';
import { logPerformance } from '../middleware/logging.js';
import { validateRequest, validateSessionIdParam } from '../middleware/validation.js';
import { searchRequestSchema, resumeSearchSchema } from '../../shared/validationSchemas.js';

// Create collection controller instance
const collectionController = new CollectionController(jobs);

const router = Router();

// POST /api/multi-stage/search - Start multi-stage search
router.post(
  '/search',
  validateRequest(searchRequestSchema, 'body'),
  (req: Request, res: Response) => {
    void (async () => {
      try {
        const startTime = performance.now();
        const searchRequest = req.validatedBody as SearchRequest;

        console.log('🚀 New multi-stage search request:', {
          sessionId: searchRequest.session_id,
          positions: searchRequest.settings.searchPositions,
          sources: searchRequest.settings.sources.jobSites,
        });

        const response = await collectionController.startMultiStageSearch(searchRequest);

        res.json(response);
        logPerformance(req.method, req.path, startTime, 200);
      } catch (error) {
        console.error('❌ Multi-stage search API error:', error);
        res.status(400).json({
          success: false,
          message: 'Invalid request',
        });
      }
    })();
  },
);

// GET /api/multi-stage/progress/:sessionId - Get multi-stage progress
router.get('/progress/:sessionId', validateSessionIdParam(), (req: Request, res: Response) => {
  const params = req.validatedParams as { sessionId: string };
  const progress = collectionController.getMultiStageProgress(params.sessionId);

  if (progress) {
    res.json(progress);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// POST /api/multi-stage/stop/:sessionId - Stop multi-stage search
router.post('/stop/:sessionId', validateSessionIdParam(), (req: Request, res: Response) => {
  const params = req.validatedParams as { sessionId: string };
  const result = collectionController.stopMultiStageSearch(params.sessionId);
  res.json(result);
});

// POST /api/multi-stage/pause/:sessionId - Pause multi-stage search
router.post('/pause/:sessionId', validateSessionIdParam(), (req: Request, res: Response) => {
  const params = req.validatedParams as { sessionId: string };
  const result = collectionController.pauseMultiStageSearch(params.sessionId);
  res.json(result);
});

// POST /api/multi-stage/resume/:sessionId - Resume multi-stage search
router.post(
  '/resume/:sessionId',
  validateSessionIdParam(),
  validateRequest(resumeSearchSchema, 'body'),
  (req: Request, res: Response) => {
    void (async () => {
      try {
        const params = req.validatedParams as { sessionId: string };
        const searchRequest = req.validatedBody as SearchRequest;

        console.log('▶️ Resume multi-stage search request:', {
          sessionId: searchRequest.session_id,
          positions: searchRequest.settings.searchPositions,
          sources: searchRequest.settings.sources.jobSites,
        });

        const response = await collectionController.resumeMultiStageSearch(
          params.sessionId,
          searchRequest,
        );

        res.json(response);
        logPerformance(req.method, req.path, performance.now() - performance.now(), 200);
      } catch (error) {
        console.error('❌ Multi-stage resume API error:', error);
        res.status(400).json({
          success: false,
          message: 'Invalid resume request',
        });
      }
    })();
  },
);

// GET /api/multi-stage/sessions - Get all available sessions
router.get('/sessions', (_req: Request, res: Response) => {
  void (async () => {
    try {
      const sessions = await collectionController.getAllSessions();
      res.json({
        success: true,
        sessions,
      });
    } catch (error) {
      console.error('❌ Get sessions API error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions',
      });
    }
  })();
});

export default router;
