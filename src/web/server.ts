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

// Collection controller
const collectionController = new CollectionController();

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Serve static files
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile(
        join(Deno.cwd(), "src/web/index.html"),
      );
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  if (url.pathname === "/app.js") {
    try {
      const js = await Deno.readTextFile(join(Deno.cwd(), "src/web/app.js"));
      return new Response(js, {
        headers: { "Content-Type": "application/javascript" },
      });
    } catch {
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

      return new Response(
        JSON.stringify(response),
        {
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      console.error("❌ Multi-stage search API error:", error);
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
    const progress = collectionController.getMultiStageProgress(sessionId || "");

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
  if (url.pathname.startsWith("/api/multi-stage/stop/") && request.method === "POST") {
    const sessionId = url.pathname.split("/").pop();
    const result = collectionController.stopMultiStageSearch(sessionId || "");

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not found", { status: 404 });
}

// Export default handler for deno serve
export default {
  async fetch(request: Request): Promise<Response> {
    return await handleRequest(request);
  },
} satisfies Deno.ServeDefaultExport;
