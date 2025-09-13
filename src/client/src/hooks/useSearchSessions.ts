import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient.ts';
import type { SearchSession, ProgressData } from '@shared/schema';

interface SearchSessionsResponse {
  sessions: SearchSession[];
}

export function useSearchSessions(limit?: number) {
  return useQuery({
    queryKey: ['/api/sessions', { limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());

      const response = await fetch(`/api/sessions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return response.json() as Promise<SearchSessionsResponse>;
    },
  });
}

export function useSearchSession(id: string) {
  return useQuery({
    queryKey: ['/api/sessions', id],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${id}`);
      if (!response.ok) throw new Error('Failed to fetch session');
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
      // Generate unique session ID
      const sessionId = crypto.randomUUID();

      // Convert config to the format expected by our multi-stage search API
      const searchRequest = {
        session_id: sessionId,
        settings: {
          searchPositions: config.positions,
          filters: {
            blacklistedCompanies: config.blacklistedCompanies,
            blacklistedWordsTitle: config.blacklistedWords,
            blacklistedWordsDescription: config.blacklistedWords,
            countries: [], // Empty for now
            languages: [], // Empty for now
          },
          sources: {
            jobSites: config.selectedSources,
          },
          llm: {
            enrichmentInstructions: [],
            processingRules: [],
          },
        },
      };

      const response = await apiRequest('POST', '/api/multi-stage/search', searchRequest);
      const payload = await response.json();
      return { ...payload, sessionId } as { sessionId: string } & Record<string, unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
  });
}

export function usePauseSearch() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/search/${sessionId}/pause`);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
  });
}

export function useStopSearch() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/multi-stage/stop/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
  });
}

export function useSearchProgress(sessionId: string | null) {
  console.log('🔄 [REACT] useSearchProgress called with sessionId:', sessionId);

  return useQuery({
    queryKey: ['/api/multi-stage/progress', sessionId],
    queryFn: async () => {
      if (!sessionId) {
        console.log('❌ [REACT] No sessionId provided, skipping progress fetch');
        return null;
      }

      console.log(`📡 [REACT] Fetching progress for session: ${sessionId}`);
      try {
        const response = await fetch(`/api/multi-stage/progress/${sessionId}`);

        if (!response.ok) {
          console.error(
            `❌ [REACT] Progress fetch failed: ${response.status} ${response.statusText}`,
          );
          throw new Error(`Failed to fetch progress: ${response.status}`);
        }

        const raw = await response.json();
        console.log(`✅ [REACT] Progress received:`, raw);

        // Normalize backend MultiStageProgress to ProgressData
        const mapStageToNumber = (stage: string | undefined): number => {
          switch (stage) {
            case 'collecting':
              return 1;
            case 'filtering':
              return 2;
            case 'enriching':
              return 3;
            default:
              return 1;
          }
        };

        const progress: ProgressData = {
          currentStage: mapStageToNumber(raw?.currentStage),
          status: raw?.isComplete
            ? 'completed'
            : raw?.stages?.[raw?.currentStage]?.status === 'failed'
              ? 'error'
              : 'running',
          totalJobs: Number(raw?.stages?.collecting?.itemsTotal ?? 0),
          processedJobs: Number(raw?.stages?.collecting?.itemsProcessed ?? 0),
          filteredJobs: Number(raw?.stages?.filtering?.itemsProcessed ?? 0),
          enrichedJobs: Number(raw?.stages?.enriching?.itemsProcessed ?? 0),
          totalCost: Number(raw?.totalCost ?? 0),
          estimatedTimeRemaining: Number(raw?.eta_seconds ?? 0),
          processingSpeed: Number(raw?.processing_speed_per_minute ?? 0),
        };

        return progress;
      } catch (error) {
        console.error('❌ [REACT] Progress fetch error:', error);
        throw error;
      }
    },
    enabled: !!sessionId,
    refetchInterval: (data: ProgressData | null) => {
      // Stop polling when search is completed or failed
      if (data && (data.status === 'completed' || data.status === 'error')) {
        console.log('🛑 [REACT] Stopping polling - search completed or failed');
        return false;
      }

      console.log('🔄 [REACT] Polling every 1 second during active search');
      // Poll every 1 second during active search
      return 1000;
    },
    refetchIntervalInBackground: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
}
