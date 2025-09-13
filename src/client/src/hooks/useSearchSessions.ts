import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient.ts";
import type { SearchSession, ProgressData } from "../shared/schema.ts";

interface SearchSessionsResponse {
  sessions: SearchSession[];
}

export function useSearchSessions(limit?: number) {
  return useQuery({
    queryKey: ["/api/sessions", { limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());

      const response = await fetch(`/api/sessions?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch sessions");
      return response.json() as Promise<SearchSessionsResponse>;
    },
  });
}

export function useSearchSession(id: string) {
  return useQuery({
    queryKey: ["/api/sessions", id],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${id}`);
      if (!response.ok) throw new Error("Failed to fetch session");
      return response.json() as Promise<SearchSession>;
    },
    enabled: !!id,
  });
}

export function useStartSearch() {
  return useMutation({
    mutationFn: async (config: {
      positions: string[];
      blacklistedWords: string[];
      blacklistedCompanies: string[];
      selectedSources: string[];
      filters: Record<string, unknown>;
    }) => {
      // Convert config to the format expected by our multi-stage search API
      const searchRequest = {
        positions: config.positions,
        sources: config.selectedSources,
        filters: {
          locations: config.filters?.locations || [],
          employmentTypes: config.filters?.employmentTypes || [],
          remoteTypes: config.filters?.remoteTypes || [],
        },
        blacklistedWords: config.blacklistedWords,
        blacklistedCompanies: config.blacklistedCompanies,
      };

      const response = await apiRequest("POST", "/api/multi-stage/search", searchRequest);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });
}

export function usePauseSearch() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/search/${sessionId}/pause`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });
}

export function useStopSearch() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/multi-stage/stop/${sessionId}`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    },
  });
}

export function useSearchProgress(sessionId: string | null) {
  return useQuery({
    queryKey: ["/api/multi-stage/progress", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await fetch(`/api/multi-stage/progress/${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch progress");
      return response.json() as Promise<ProgressData>;
    },
    enabled: !!sessionId,
    refetchInterval: (data: ProgressData | null) => {
      // Stop polling when search is completed or failed
      if (data && (data.status === "completed" || data.status === "error")) {
        return false;
      }
      // Poll every 2 seconds during active search
      return 2000;
    },
  });
}
