import type { Vacancy } from '../types/database.js';

// Simple in-memory storage for demo (will be replaced with SQLite)
export const jobs = new Map<string, Vacancy>();

// Simple in-memory storage for sessions
export interface SessionData {
  status: string;
  settings: unknown;
  startedAt: string;
  progress: number;
}

export const sessions = new Map<string, SessionData>();

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

  // Sessions operations
  saveSession: (sessionId: string, data: SessionData): void => {
    sessions.set(sessionId, data);
  },

  getSession: (sessionId: string): SessionData | undefined => {
    return sessions.get(sessionId);
  },

  updateSession: (sessionId: string, updates: Partial<SessionData>): boolean => {
    const session = sessions.get(sessionId);
    if (!session) return false;

    const updatedSession = { ...session, ...updates };
    sessions.set(sessionId, updatedSession);
    return true;
  },

  deleteSession: (sessionId: string): boolean => {
    return sessions.delete(sessionId);
  },

  // Utility functions
  clearAll: (): void => {
    jobs.clear();
    sessions.clear();
  },

  getStats: () => {
    return {
      jobsCount: jobs.size,
      sessionsCount: sessions.size,
    };
  },
};
