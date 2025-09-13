// Simple in-memory storage for demo (will be replaced with SQLite)
export const jobs = new Map();
export const sessions = new Map();
// Helper functions for storage operations
export const storage = {
    // Jobs operations
    saveJob: (job) => {
        jobs.set(job.id, job);
    },
    getJob: (id) => {
        return jobs.get(id);
    },
    getAllJobs: () => {
        return Array.from(jobs.values());
    },
    updateJob: (id, updates) => {
        const job = jobs.get(id);
        if (!job)
            return false;
        const updatedJob = { ...job, ...updates };
        jobs.set(id, updatedJob);
        return true;
    },
    deleteJob: (id) => {
        return jobs.delete(id);
    },
    // Sessions operations
    saveSession: (sessionId, data) => {
        sessions.set(sessionId, data);
    },
    getSession: (sessionId) => {
        return sessions.get(sessionId);
    },
    updateSession: (sessionId, updates) => {
        const session = sessions.get(sessionId);
        if (!session)
            return false;
        const updatedSession = { ...session, ...updates };
        sessions.set(sessionId, updatedSession);
        return true;
    },
    deleteSession: (sessionId) => {
        return sessions.delete(sessionId);
    },
    // Utility functions
    clearAll: () => {
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
