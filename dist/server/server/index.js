import express from 'express';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import process from 'node:process';
// Import middleware
import { corsMiddleware } from './middleware/cors.js';
import { loggingMiddleware, logPerformance } from './middleware/logging.js';
import { securityMiddleware } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
// Import routes
import jobsRouter from './routes/jobs.js';
import searchRouter from './routes/search.js';
import multiStageRouter from './routes/multiStage.js';
// Import storage
// Create Express application
const app = express();
const PORT = process.env.PORT ?? 3000;
// Using HTTP polling for real-time progress updates
// Trust proxy for proper IP detection
app.set('trust proxy', 1);
// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Security middleware
if (process.env.NODE_ENV === 'production') {
    app.use(securityMiddleware);
}
// CORS middleware
app.use(corsMiddleware);
// Logging middleware
app.use(loggingMiddleware);
// Sessions routes (must be before other routes)
app.get('/api/sessions', (req, res) => {
    try {
        const limit = parseInt(req.query.limit ?? '10');
        // Mock sessions data
        const mockSessions = [
            {
                id: 'session-1',
                name: 'Software Engineer Search',
                status: 'completed',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                updatedAt: new Date(Date.now() - 3600000).toISOString(),
                progress: {
                    total: 150,
                    processed: 150,
                    successful: 142,
                    failed: 8,
                },
                settings: {
                    positions: ['Software Engineer'],
                    sources: ['indeed', 'linkedin'],
                    filters: {
                        locations: ['Remote'],
                        employmentTypes: ['Full-time'],
                    },
                },
            },
            {
                id: 'session-2',
                name: 'Frontend Developer Search',
                status: 'running',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                updatedAt: new Date().toISOString(),
                progress: {
                    total: 100,
                    processed: 45,
                    successful: 43,
                    failed: 2,
                },
                settings: {
                    positions: ['Frontend Developer'],
                    sources: ['indeed'],
                    filters: {
                        locations: ['Remote'],
                        employmentTypes: ['Full-time'],
                    },
                },
            },
        ];
        res.json({
            sessions: mockSessions.slice(0, limit),
            total: mockSessions.length,
        });
    }
    catch (error) {
        console.error('❌ Sessions API error:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});
// API Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/search', searchRouter);
app.use('/api/multi-stage', multiStageRouter);
// Serve React app or simple test page
app.get('/', (req, res) => {
    try {
        const startTime = performance.now();
        // Try to serve built React app
        const indexPath = join(process.cwd(), 'dist/client/index.html');
        if (existsSync(indexPath)) {
            const html = readFileSync(indexPath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
            logPerformance(req.method, req.path, startTime, 200);
            return;
        }
        // Fallback to development HTML if build doesn't exist
        try {
            const devIndexPath = join(process.cwd(), 'src/client/index.html');
            const html = readFileSync(devIndexPath, 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
            return;
        }
        catch {
            // Create a simple test page for integration testing
            const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Remote Job Scout - Integration Test</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-center mb-8">Remote Job Scout - Integration Test</h1>

        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">API Test</h2>
            <button id="testApiBtn" class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full">
                Test /api/jobs
            </button>
            <div id="apiResult" class="mt-4 p-4 bg-gray-50 rounded text-sm"></div>
        </div>

        <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 class="text-xl font-semibold mb-4">Search Test</h2>
            <button id="testSearchBtn" class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full">
                Start Multi-Stage Search
            </button>
            <div id="searchResult" class="mt-4 p-4 bg-gray-50 rounded text-sm"></div>
        </div>
    </div>

    <script>
        // Test API endpoint
        document.getElementById('testApiBtn').addEventListener('click', async () => {
            const resultDiv = document.getElementById('apiResult');
            try {
                const response = await fetch('/api/jobs');
                const data = await response.json();
                resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                resultDiv.innerHTML = '<p class="text-red-500">Error: ' + error.message + '</p>';
            }
        });

        // Test search endpoint
        document.getElementById('testSearchBtn').addEventListener('click', async () => {
            const resultDiv = document.getElementById('searchResult');
            try {
                const searchData = {
                    session_id: 'test-' + Date.now(),
                    settings: {
                        searchPositions: ['Software Engineer'],
                        sources: {
                            jobSites: ['indeed'],
                        },
                        filters: {
                            blacklistedCompanies: [],
                            blacklistedWordsTitle: [],
                            blacklistedWordsDescription: [],
                            countries: [],
                            languages: [],
                        },
                    }
                };

                const response = await fetch('/api/multi-stage/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(searchData)
                });
                const data = await response.json();
                resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                resultDiv.innerHTML = '<p class="text-red-500">Error: ' + error.message + '</p>';
            }
        });
    </script>
</body>
</html>`;
            res.setHeader('Content-Type', 'text/html');
            res.send(testHtml);
        }
    }
    catch (error) {
        console.error('❌ Error serving index.html:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Serve React build assets
app.get('/assets/*', (req, res) => {
    try {
        const assetPath = join(process.cwd(), 'dist/client', req.path);
        if (existsSync(assetPath)) {
            const file = readFileSync(assetPath);
            // Set appropriate content type based on file extension
            const ext = req.path.split('.').pop();
            let contentType = 'application/octet-stream';
            if (ext === 'js' || ext === 'mjs')
                contentType = 'application/javascript';
            else if (ext === 'css')
                contentType = 'text/css';
            res.setHeader('Content-Type', contentType);
            res.send(file);
        }
        else {
            res.status(404).send('Asset not found');
        }
    }
    catch {
        res.status(404).send('Asset not found');
    }
});
// Serve React development files from src/client/src/
app.get('/src/*', (req, res) => {
    try {
        // Remove leading slash and construct path relative to src/client/src/
        const relativePath = req.path.slice(1); // Remove leading /
        const filePath = join(process.cwd(), 'src', 'client', relativePath);
        if (existsSync(filePath)) {
            const file = readFileSync(filePath);
            // Determine content type based on file extension
            let contentType = 'text/plain';
            const ext = relativePath.split('.').pop();
            if (ext === 'js' || ext === 'mjs' || ext === 'ts' || ext === 'tsx') {
                contentType = 'application/javascript';
            }
            else if (ext === 'css') {
                contentType = 'text/css';
            }
            else if (ext === 'json') {
                contentType = 'application/json';
            }
            else if (ext === 'html') {
                contentType = 'text/html';
            }
            res.setHeader('Content-Type', contentType);
            res.send(file);
        }
        else {
            console.log(`❌ Static file not found: ${req.path}`);
            res.status(404).send('Not found');
        }
    }
    catch (error) {
        console.log(`❌ Static file error: ${req.path} - ${error}`);
        res.status(404).send('Not found');
    }
});
// Serve test files from project root
app.get('/test-*.html', (req, res) => {
    try {
        const filePath = join(process.cwd(), req.path.slice(1)); // Remove leading /
        if (existsSync(filePath)) {
            const file = readFileSync(filePath);
            res.setHeader('Content-Type', 'text/html');
            res.send(file);
        }
        else {
            console.log(`❌ Test file not found: ${req.path}`);
            res.status(404).send('Test file not found');
        }
    }
    catch (error) {
        console.log(`❌ Test file error: ${req.path} - ${error}`);
        res.status(404).send('Test file error');
    }
});
// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version,
    });
});
// 404 handler for unmatched routes
app.use(notFoundHandler);
// Error handling middleware (must be last)
app.use(errorHandler);
// Start server only if not in build mode
const isBuildMode = process.argv.includes('--build');
if (import.meta.url === `file://${process.argv[1]}` && !isBuildMode) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Health check available at http://localhost:${PORT}/health`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
        console.log(`🔄 Using HTTP polling for progress updates`);
    });
}
export default app;
