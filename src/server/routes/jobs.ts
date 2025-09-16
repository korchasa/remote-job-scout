import type { Request, Response } from 'express';
import { Router } from 'express';
import { jobs } from '../storage.js';
import type { JobPost } from '../../shared/schema';
import { logPerformance } from '../middleware/logging.js';
import { validateRequest, validateJobIdParam } from '../middleware/validation.js';
import { jobsQuerySchema, jobUpdateSchema } from '../../shared/validationSchemas.js';

const router = Router();

// GET /api/jobs - Get all jobs with filtering and pagination
router.get('/', validateRequest(jobsQuerySchema, 'query'), (req: Request, res: Response) => {
  try {
    const startTime = performance.now();

    const allJobs = Array.from(jobs.values());
    const query = req.validatedQuery as {
      status?: string;
      source?: string;
      limit: number;
      offset: number;
    };

    // Apply filters
    let filteredJobs = allJobs;
    if (query.status) {
      filteredJobs = filteredJobs.filter((job) => job.status === query.status);
    }
    if (query.source) {
      filteredJobs = filteredJobs.filter((job) => job.source === query.source);
    }

    // Apply pagination
    const paginatedJobs = filteredJobs.slice(query.offset, query.offset + query.limit);

    // Convert to JobPost format for frontend
    const jobPosts: JobPost[] = paginatedJobs.map((job) => ({
      id: job.id,
      title: job.title,
      company: job.data ? (JSON.parse(job.data).company ?? 'Unknown') : 'Unknown',
      description: job.description,
      originalUrl: job.url,
      source: job.source,
      location: job.country,
      status: job.status as JobPost['status'],
      statusReason: job.skip_reason,
      createdAt: new Date(job.created_at),
      rawData: job.data ? JSON.parse(job.data) : undefined,
    }));

    const response = {
      jobs: jobPosts,
      total: filteredJobs.length,
      count: jobPosts.length,
    };

    res.json(response);
    logPerformance(req.method, req.path, startTime, 200);
  } catch (error) {
    console.error('❌ Jobs API error:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id - Get single job
router.get('/:id', validateJobIdParam(), (req: Request, res: Response) => {
  try {
    const params = req.validatedParams as { id: string };
    const job = jobs.get(params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const jobPost: JobPost = {
      id: job.id,
      title: job.title,
      company: job.data ? (JSON.parse(job.data).company ?? 'Unknown') : 'Unknown',
      description: job.description,
      originalUrl: job.url,
      source: job.source,
      location: job.country,
      status: job.status as JobPost['status'],
      statusReason: job.skip_reason,
      createdAt: new Date(job.created_at),
      rawData: job.data ? JSON.parse(job.data) : undefined,
    };

    res.json(jobPost);
  } catch (error) {
    console.error('❌ Get job API error:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// PATCH /api/jobs/:id - Update job
router.patch(
  '/:id',
  validateJobIdParam(),
  validateRequest(jobUpdateSchema, 'body'),
  (req: Request, res: Response) => {
    try {
      const params = req.validatedParams as { id: string };
      const updates = req.validatedBody as Record<string, unknown>;

      const job = jobs.get(params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Update job with validated data
      const updatedJob = { ...job, ...updates };
      jobs.set(params.id, updatedJob);

      res.json({ success: true });
    } catch (error) {
      console.error('❌ Update job API error:', error);
      res.status(500).json({ error: 'Failed to update job' });
    }
  },
);

export default router;
