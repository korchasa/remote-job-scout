import type { Request, Response } from 'express';
import { Router } from 'express';
import type { SearchRequest } from '../../types/database.js';
import { CollectionController } from '../../controllers/collectionController.js';
import { jobs, sessions } from '../storage.js';
import { logPerformance } from '../middleware/logging.js';

// Create collection controller instance
const collectionController = new CollectionController(jobs);

const router = Router();

// POST /api/search - Start new search
router.post('/', (req: Request, res: Response) => {
  void (async () => {
    try {
      const startTime = performance.now();
      const searchRequest: SearchRequest = req.body;

      console.log('🔍 New search request:', {
        sessionId: searchRequest.session_id,
        positions: searchRequest.settings.searchPositions,
        sources: searchRequest.settings.sources.jobSites,
      });

      // Use collection controller
      const response = await collectionController.startCollection(searchRequest);

      // Store session for backward compatibility
      sessions.set(searchRequest.session_id, {
        status: response.success ? 'collecting' : 'failed',
        settings: searchRequest.settings,
        startedAt: new Date().toISOString(),
        progress: 0,
      });

      res.json(response);
      logPerformance(req.method, req.path, startTime, 200);
    } catch (error) {
      console.error('❌ Search API error:', error);
      res.status(400).json({
        success: false,
        message: 'Invalid request',
      });
    }
  })();
});

// GET /api/progress/:sessionId - Get collection progress
router.get('/progress/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const progress = collectionController.getCollectionProgress(sessionId);

  if (progress) {
    res.json({
      session_id: sessionId,
      status: progress.isComplete ? 'completed' : 'collecting',
      progress: Math.round((progress.sourcesCompleted / progress.totalSources) * 100),
      current_source: progress.currentSource,
      jobs_collected: progress.jobsCollected,
      sources_completed: progress.sourcesCompleted,
      total_sources: progress.totalSources,
      errors: progress.errors,
    });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// POST /api/stop/:sessionId - Stop collection
router.post('/stop/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const result = collectionController.stopCollection(sessionId);
  res.json(result);
});

// GET /api/stats/:sessionId - Get collection stats
router.get('/stats/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId;
  const stats = collectionController.getCollectionStats(sessionId);
  res.json(stats);
});

// GET /api/sessions - Get all search sessions
router.get('/sessions', (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) ?? '10');
    const allSessions = Array.from(sessions.values());

    // Convert sessions to frontend format
    const sessionList = allSessions.slice(0, limit).map((session, index) => {
      const sessionId = `session-${Date.now()}-${Math.random()}-${index}`;
      return {
        id: sessionId,
        name: `Search Session ${sessionId}`,
        status: session.status ?? 'completed',
        createdAt: session.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        progress: {
          total: 100,
          processed: Math.floor(Math.random() * 100), // Mock data
          successful: Math.floor(Math.random() * 80),
          failed: Math.floor(Math.random() * 20),
        },
        settings: session.settings ?? {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: {},
        },
      };
    });

    res.json({
      sessions: sessionList,
      total: allSessions.length,
    });
  } catch (error) {
    console.error('❌ Sessions API error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// GET /api/sessions/:id - Get single session
router.get('/sessions/:id', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = {
      id: sessionId,
      name: `Search Session ${sessionId}`,
      status: session.status ?? 'completed',
      createdAt: session.startedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: {
        total: 100,
        processed: Math.floor(Math.random() * 100),
        successful: Math.floor(Math.random() * 80),
        failed: Math.floor(Math.random() * 20),
      },
      settings: session.settings ?? {
        positions: ['Software Engineer'],
        sources: ['indeed'],
        filters: {},
      },
    };

    res.json(sessionData);
  } catch (error) {
    console.error('❌ Session API error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// POST /api/search/:sessionId/pause - Pause search session
router.post('/:sessionId/pause', (req: Request, res: Response) => {
  try {
    const sessionId = req.params.sessionId;
    collectionController.stopCollection(sessionId);

    res.json({
      success: true,
      message: 'Search paused',
      sessionId,
    });
  } catch (error) {
    console.error('❌ Pause search API error:', error);
    res.status(500).json({ error: 'Failed to pause search' });
  }
});

export default router;
