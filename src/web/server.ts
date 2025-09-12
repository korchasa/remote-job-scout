import { join } from "https://deno.land/std@0.208.0/path/mod.ts";
import { SearchRequest } from "../types/database.ts";

// Simple in-memory storage for demo (will be replaced with SQLite)
interface SessionData {
  status: string;
  settings: unknown;
  startedAt: string;
  progress: number;
}
const sessions = new Map<string, SessionData>();

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

      // Store session
      sessions.set(searchRequest.session_id, {
        status: "started",
        settings: searchRequest.settings,
        startedAt: new Date().toISOString(),
        progress: 0,
      });

      // Simulate starting search process
      setTimeout(() => {
        console.log(`✅ Search session ${searchRequest.session_id} completed`);
        const currentSession = sessions.get(searchRequest.session_id);
        if (currentSession) {
          sessions.set(searchRequest.session_id, {
            ...currentSession,
            status: "completed",
            progress: 100,
          });
        }
      }, 5000);

      return new Response(
        JSON.stringify({
          success: true,
          session_id: searchRequest.session_id,
          message: "Search started successfully",
          total_found: 0,
        }),
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
    const session = sessions.get(sessionId || "");

    if (session) {
      return new Response(JSON.stringify(session), {
        headers: { "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Not found", { status: 404 });
}

// Export default handler for deno serve
export default {
  async fetch(request: Request): Promise<Response> {
    return await handleRequest(request);
  },
} satisfies Deno.ServeDefaultExport;
