import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient.ts';
import type { ProgressData } from '@shared/schema';

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
    // Sessions invalidation removed - using multi-stage search instead
  });
}

export function usePauseSearch() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/search/${sessionId}/pause`);
      return response.json();
    },
    // Sessions invalidation removed - using multi-stage search instead
  });
}

export function useStopSearch() {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('POST', `/api/multi-stage/stop/${sessionId}`);
      return response.json();
    },
    // Sessions invalidation removed - using multi-stage search instead
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
          status:
            raw?.status ??
            (raw?.isComplete || raw?.currentStage === 'completed' ? 'completed' : 'running'),
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
      if (data?.status && data.status !== 'running') {
        console.log('🛑 [REACT] Stopping polling - status:', data.status);
        return false;
      }
      return 1000;
    },
    refetchIntervalInBackground: true,
    // Disable automatic refetches to prevent unnecessary requests after completion
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
