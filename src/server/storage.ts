import type { Vacancy } from '../types/database.js';

// Simple in-memory storage for demo (will be replaced with SQLite)
export const jobs = new Map<string, Vacancy>();

// Helper functions for storage operations
export const storage = {
  // Jobs operations
  saveJob: (job: Vacancy): void => {
    jobs.set(job.id, job);
  },

  getJob: (id: string): Vacancy | undefined => {
    return jobs.get(id);
  },

  getAllJobs: (): Vacancy[] => {
    return Array.from(jobs.values());
  },

  updateJob: (id: string, updates: Partial<Vacancy>): boolean => {
    const job = jobs.get(id);
    if (!job) return false;

    const updatedJob = { ...job, ...updates };
    jobs.set(id, updatedJob);
    return true;
  },

  deleteJob: (id: string): boolean => {
    return jobs.delete(id);
  },

  // Utility functions
  clearAll: (): void => {
    jobs.clear();
  },

  getStats: () => {
    return {
      jobsCount: jobs.size,
    };
  },
};
