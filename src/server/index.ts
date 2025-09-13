import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { SearchRequest } from "../types/database.ts";
import { CollectionController } from "../controllers/collectionController.ts";

// Simple in-memory storage for demo (will be replaced with SQLite)
interface SessionData {
  status: string;
  settings: unknown;
  startedAt: string;
  progress: number;
}
const sessions = new Map<string, SessionData>();

// Simple in-memory storage for jobs (will be replaced with SQLite)
import type { Vacancy } from "../types/database.ts";
import type { JobPost } from "../shared/schema.ts";
const jobs = new Map<string, Vacancy>();

// Collection controller
const collectionController = new CollectionController(jobs);

// Performance monitoring helper
function logPerformance(
  method: string,
  path: string,
  startTime: number,
  status: number = 200,
) {
  const duration = performance.now() - startTime;
  console.log(`📊 ${method} ${path} - ${duration.toFixed(2)}ms - ${status}`);
}

async function handleRequest(request: Request): Promise<Response> {
  const startTime = performance.now();
  const url = new URL(request.url);

  // Serve React app or simple test page
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile(
        join(Deno.cwd(), "dist/client/index.html"),
      );
      const response = new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
      logPerformance(request.method, url.pathname, startTime, 200);
      return response;
    } catch {
      // Fallback to development HTML if build doesn't exist
      try {
        const html = await Deno.readTextFile(
          join(Deno.cwd(), "src/client/index.html"),
        );
        return new Response(html, {
          headers: { "Content-Type": "text/html" },
        });
      } catch {
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
        return new Response(testHtml, {
          headers: { "Content-Type": "text/html" },
        });
      }
    }
  }

  // Serve React build assets
  if (
    url.pathname.startsWith("/assets/") || url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") || url.pathname.endsWith(".tsx") ||
    url.pathname.endsWith(".ts")
  ) {
    try {
      const filePath = join(Deno.cwd(), "dist/client", url.pathname);
      const file = await Deno.readFile(filePath);

      let contentType = "application/octet-stream";
      if (
        url.pathname.endsWith(".js") || url.pathname.endsWith(".mjs") ||
        url.pathname.endsWith(".ts") || url.pathname.endsWith(".tsx")
      ) {
        contentType = "application/javascript";
      } else if (url.pathname.endsWith(".css")) {
        contentType = "text/css";
      }

      return new Response(file, {
        headers: { "Content-Type": contentType },
      });
    } catch {
      // Try development assets
      try {
        const filePath = join(Deno.cwd(), "src/client", url.pathname);
        const file = await Deno.readFile(filePath);

        let contentType = "application/octet-stream";
        if (
          url.pathname.endsWith(".js") || url.pathname.endsWith(".mjs") ||
          url.pathname.endsWith(".ts") || url.pathname.endsWith(".tsx")
        ) {
          contentType = "application/javascript";
        } else if (url.pathname.endsWith(".css")) {
          contentType = "text/css";
        }

        return new Response(file, {
          headers: { "Content-Type": contentType },
        });
      } catch {
        return new Response("Asset not found", { status: 404 });
      }
    }
  }

  // Serve React development files from src/client/src/
  if (url.pathname.startsWith("/src/")) {
    try {
      // Remove leading slash and construct path relative to src/client/src/
      const relativePath = url.pathname.slice(1); // Remove leading /
      const filePath = join(Deno.cwd(), "src", "client", relativePath);
      const file = await Deno.readFile(filePath);

      // Determine content type based on file extension
      let contentType = "text/plain";
      if (
        relativePath.endsWith(".js") || relativePath.endsWith(".mjs") ||
        relativePath.endsWith(".ts") || relativePath.endsWith(".tsx")
      ) {
        contentType = "application/javascript";
      } else if (relativePath.endsWith(".css")) {
        contentType = "text/css";
      } else if (relativePath.endsWith(".json")) {
        contentType = "application/json";
      } else if (relativePath.endsWith(".html")) {
        contentType = "text/html";
      }

      const response = new Response(file, {
        headers: { "Content-Type": contentType },
      });
      logPerformance(request.method, url.pathname, startTime, 200);
      return response;
    } catch (error) {
      console.log(`❌ Static file not found: ${url.pathname} - ${error}`);
      logPerformance(request.method, url.pathname, startTime, 404);
      return new Response("Not found", { status: 404 });
    }
  }

  // API endpoints
  if (url.pathname === "/api/search" && request.method === "POST") {
    try {
      const searchRequest: SearchRequest = await request.json();

      console.log("🔍 New search request:", {
        sessionId: searchRequest.session_id,
        positions: searchRequest.settings.searchPositions,
        sources: searchRequest.settings.sources.jobSites,
      });

      // Используем новый collection controller
      const response = await collectionController.startCollection(
        searchRequest,
      );

      // Store session for backward compatibility
      sessions.set(searchRequest.session_id, {
        status: response.success ? "collecting" : "failed",
        settings: searchRequest.settings,
        startedAt: new Date().toISOString(),
        progress: 0,
      });

      return new Response(
        JSON.stringify(response),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("❌ Search API error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid request",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  if (url.pathname.startsWith("/api/progress/")) {
    const sessionId = url.pathname.split("/").pop();
    const progress = collectionController.getCollectionProgress(
      sessionId || "",
    );

    if (progress) {
      return new Response(
        JSON.stringify({
          session_id: sessionId,
          status: progress.isComplete ? "completed" : "collecting",
          progress: Math.round(
            (progress.sourcesCompleted / progress.totalSources) * 100,
          ),
          current_source: progress.currentSource,
          jobs_collected: progress.jobsCollected,
          sources_completed: progress.sourcesCompleted,
          total_sources: progress.totalSources,
          errors: progress.errors,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Stop collection endpoint
  if (url.pathname.startsWith("/api/stop/") && request.method === "POST") {
    const sessionId = url.pathname.split("/").pop();
    const result = collectionController.stopCollection(sessionId || "");

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Collection stats endpoint
  if (url.pathname.startsWith("/api/stats/")) {
    const sessionId = url.pathname.split("/").pop();
    const stats = collectionController.getCollectionStats(sessionId || "");

    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Multi-stage search endpoint
  if (url.pathname === "/api/multi-stage/search" && request.method === "POST") {
    try {
      const searchRequest: SearchRequest = await request.json();

      console.log("🚀 New multi-stage search request:", {
        sessionId: searchRequest.session_id,
        positions: searchRequest.settings.searchPositions,
        sources: searchRequest.settings.sources.jobSites,
      });

      const response = await collectionController.startMultiStageSearch(
        searchRequest,
      );

      const apiResponse = new Response(
        JSON.stringify(response),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      logPerformance(request.method, url.pathname, startTime, 200);
      return apiResponse;
    } catch (error) {
      console.error("❌ Multi-stage search API error:", error);
      logPerformance(request.method, url.pathname, startTime, 400);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Invalid request",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // Multi-stage progress endpoint
  if (url.pathname.startsWith("/api/multi-stage/progress/")) {
    const sessionId = url.pathname.split("/").pop();
    const progress = collectionController.getMultiStageProgress(
      sessionId || "",
    );

    if (progress) {
      return new Response(
        JSON.stringify(progress),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } else {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Stop multi-stage search endpoint
  if (
    url.pathname.startsWith("/api/multi-stage/stop/") &&
    request.method === "POST"
  ) {
    const sessionId = url.pathname.split("/").pop();
    const result = collectionController.stopMultiStageSearch(sessionId || "");

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Jobs API endpoints
  if (url.pathname === "/api/jobs" && request.method === "GET") {
    try {
      const allJobs = Array.from(jobs.values());

      // Apply filters
      const status = url.searchParams.get("status");
      const source = url.searchParams.get("source");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

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
      const jobPosts: JobPost[] = paginatedJobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.data
          ? JSON.parse(job.data).company || "Unknown"
          : "Unknown",
        description: job.description,
        originalUrl: job.url,
        source: job.source,
        location: job.country,
        status: job.status as JobPost["status"],
        statusReason: job.skip_reason,
        createdAt: new Date(job.created_at),
        rawData: job.data ? JSON.parse(job.data) : undefined,
      }));

      const response = new Response(
        JSON.stringify({
          jobs: jobPosts,
          total: filteredJobs.length,
          count: jobPosts.length,
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
      logPerformance(request.method, url.pathname, startTime, 200);
      return response;
    } catch (error) {
      console.error("❌ Jobs API error:", error);
      logPerformance(request.method, url.pathname, startTime, 500);
      return new Response(JSON.stringify({ error: "Failed to fetch jobs" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Get single job endpoint
  if (url.pathname.startsWith("/api/jobs/") && request.method === "GET") {
    const jobId = url.pathname.split("/").pop();
    const job = jobs.get(jobId || "");

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const jobPost: JobPost = {
      id: job.id,
      title: job.title,
      company: job.data ? JSON.parse(job.data).company || "Unknown" : "Unknown",
      description: job.description,
      originalUrl: job.url,
      source: job.source,
      location: job.country,
      status: job.status as JobPost["status"],
      statusReason: job.skip_reason,
      createdAt: new Date(job.created_at),
      rawData: job.data ? JSON.parse(job.data) : undefined,
    };

    logPerformance(request.method, url.pathname, startTime, 200);
    return new Response(JSON.stringify(jobPost), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Update job endpoint
  if (url.pathname.startsWith("/api/jobs/") && request.method === "PATCH") {
    try {
      const jobId = url.pathname.split("/").pop();
      const updates = await request.json();

      const job = jobs.get(jobId || "");
      if (!job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Update job
      const updatedJob = { ...job, ...updates };
      jobs.set(jobId!, updatedJob);

      logPerformance(request.method, url.pathname, startTime, 200);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("❌ Update job API error:", error);
      logPerformance(request.method, url.pathname, startTime, 500);
      return new Response(JSON.stringify({ error: "Failed to update job" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  logPerformance(request.method, url.pathname, startTime, 404);
  return new Response("Not found", { status: 404 });
}

// Export default handler for deno serve
export default {
  async fetch(request: Request): Promise<Response> {
    return await handleRequest(request);
  },
} satisfies Deno.ServeDefaultExport;
