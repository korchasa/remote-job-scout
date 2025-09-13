import { Router } from 'express';
import { jobs } from '../storage.js';
import { logPerformance } from '../middleware/logging.js';
const router = Router();
// GET /api/jobs - Get all jobs with filtering and pagination
router.get('/', (req, res) => {
    try {
        const startTime = performance.now();
        const allJobs = Array.from(jobs.values());
        // Apply filters
        const status = req.query.status;
        const source = req.query.source;
        const limit = parseInt(req.query.limit ?? '50');
        const offset = parseInt(req.query.offset ?? '0');
        let filteredJobs = allJobs;
        if (status) {
            filteredJobs = filteredJobs.filter((job) => job.status === status);
        }
        if (source) {
            filteredJobs = filteredJobs.filter((job) => job.source === source);
        }
        // Apply pagination
        const paginatedJobs = filteredJobs.slice(offset, offset + limit);
        // Convert to JobPost format for frontend
        const jobPosts = paginatedJobs.map((job) => ({
            id: job.id,
            title: job.title,
            company: job.data ? (JSON.parse(job.data).company ?? 'Unknown') : 'Unknown',
            description: job.description,
            originalUrl: job.url,
            source: job.source,
            location: job.country,
            status: job.status,
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
    }
    catch (error) {
        console.error('❌ Jobs API error:', error);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});
// GET /api/jobs/:id - Get single job
router.get('/:id', (req, res) => {
    try {
        const jobId = req.params.id;
        const job = jobs.get(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const jobPost = {
            id: job.id,
            title: job.title,
            company: job.data ? (JSON.parse(job.data).company ?? 'Unknown') : 'Unknown',
            description: job.description,
            originalUrl: job.url,
            source: job.source,
            location: job.country,
            status: job.status,
            statusReason: job.skip_reason,
            createdAt: new Date(job.created_at),
            rawData: job.data ? JSON.parse(job.data) : undefined,
        };
        res.json(jobPost);
    }
    catch (error) {
        console.error('❌ Get job API error:', error);
        res.status(500).json({ error: 'Failed to fetch job' });
    }
});
// PATCH /api/jobs/:id - Update job
router.patch('/:id', (req, res) => {
    try {
        const jobId = req.params.id;
        const updates = req.body;
        const job = jobs.get(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Update job
        const updatedJob = { ...job, ...updates };
        jobs.set(jobId, updatedJob);
        res.json({ success: true });
    }
    catch (error) {
        console.error('❌ Update job API error:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
});
export default router;
