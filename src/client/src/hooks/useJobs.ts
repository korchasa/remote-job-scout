import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient.ts";
import type { JobPost } from "../shared/schema.ts";

interface JobsResponse {
  jobs: JobPost[];
  count: number;
}

interface JobFilters {
  status?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: ["/api/jobs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append("status", filters.status);
      if (filters?.source) params.append("source", filters.source);
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.offset) params.append("offset", filters.offset.toString());

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch jobs");
      return response.json() as Promise<JobsResponse>;
    },
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) throw new Error("Failed to fetch job");
      return response.json() as Promise<JobPost>;
    },
    enabled: !!id,
  });
}

export function useUpdateJob() {
  return useMutation({
    mutationFn: async (
      { id, updates }: { id: string; updates: Partial<JobPost> },
    ) => {
      const response = await apiRequest("PATCH", `/api/jobs/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}

export function useDeleteJob() {
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}
