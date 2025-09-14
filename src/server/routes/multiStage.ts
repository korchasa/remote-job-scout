import type { Request, Response } from 'express';
import { Router } from 'express';
import type { SearchRequest } from '../../types/database.js';
import { CollectionController } from '../../controllers/collectionController.js';
import { jobs } from '../storage.js';
import { logPerformance } from '../middleware/logging.js';

// Create collection controller instance
const collectionController = new CollectionController(jobs);

const router = Router();

// POST /api/multi-stage/search - Start multi-stage search
router.post('/search', (req: Request, res: Response) => {
  void (async () => {
    try {
      const startTime = performance.now();
      const searchRequest: SearchRequest = req.body;

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
});

// GET /api/multi-stage/progress/:sessionId - Get multi-stage progress
router.get('/progress/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const progress = collectionController.getMultiStageProgress(sessionId);

  if (progress) {
    res.json(progress);
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// POST /api/multi-stage/stop/:sessionId - Stop multi-stage search
router.post('/stop/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const result = collectionController.stopMultiStageSearch(sessionId);
  res.json(result);
});

// POST /api/multi-stage/pause/:sessionId - Pause multi-stage search
router.post('/pause/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const result = collectionController.pauseMultiStageSearch(sessionId);
  res.json(result);
});

// POST /api/multi-stage/resume/:sessionId - Resume multi-stage search
router.post('/resume/:sessionId', (req: Request, res: Response) => {
  void (async () => {
    try {
      const sessionId = req.params.sessionId;
      const searchRequest: SearchRequest = req.body;

      console.log('▶️ Resume multi-stage search request:', {
        sessionId: searchRequest.session_id,
        positions: searchRequest.settings.searchPositions,
        sources: searchRequest.settings.sources.jobSites,
      });

      const response = await collectionController.resumeMultiStageSearch(sessionId, searchRequest);

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
});

export default router;
