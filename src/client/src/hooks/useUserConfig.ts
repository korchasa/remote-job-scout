import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../lib/queryClient.ts';
import type { UserConfig } from '../shared/schema.ts';

export function useUserConfig() {
  return useQuery({
    queryKey: ['/api/config'],
    queryFn: async () => {
      const response = await fetch('/api/config');
      if (!response.ok) throw new Error('Failed to fetch config');
      return response.json() as Promise<UserConfig | null>;
    },
  });
}

export function useSaveUserConfig() {
  return useMutation({
    mutationFn: async (config: {
      positions?: string[];
      blacklistedWords?: string[];
      blacklistedCompanies?: string[];
      selectedSources?: string[];
      filters?: Record<string, unknown>;
    }) => {
      const response = await apiRequest('POST', '/api/config', config);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/api/config'] });
    },
  });
}
