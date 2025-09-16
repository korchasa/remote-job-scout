/**
 * useSessions Hook
 * Manages client-side session storage and synchronization with server
 *
 * This hook provides:
 * - Client-side session storage in localStorage
 * - Synchronization with server sessions
 * - Session state management and restoration
 * - Automatic cleanup of old sessions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClientSessionInfo, ClientSessionsStorage } from '../../../shared/schema.js';

const SESSIONS_STORAGE_KEY = 'remote-job-scout-sessions';
const MAX_SESSIONS = 50; // Limit stored sessions to prevent localStorage bloat

export interface UseSessionsReturn {
  sessions: ClientSessionInfo[];
  currentSession: ClientSessionInfo | null;
  addSession: (session: ClientSessionInfo) => void;
  updateSession: (sessionId: string, updates: Partial<ClientSessionInfo>) => void;
  removeSession: (sessionId: string) => void;
  setCurrentSession: (sessionId: string | null) => void;
  clearAllSessions: () => void;
  syncWithServer: () => Promise<void>;
  refreshSessions: () => Promise<void>;
}

export function useSessions(): UseSessionsReturn {
  const [sessions, setSessions] = useState<ClientSessionInfo[]>([]);
  const [currentSession, setCurrentSessionState] = useState<ClientSessionInfo | null>(null);
  const sessionsRef = useRef<ClientSessionInfo[]>([]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (stored) {
        const parsed: ClientSessionsStorage = JSON.parse(stored);

        // Filter out sessions older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const validSessions = parsed.sessions.filter(
          (session: ClientSessionInfo) => new Date(session.lastUpdate) > thirtyDaysAgo,
        );

        setSessions(validSessions);

        // Clean up localStorage if we filtered sessions
        if (validSessions.length !== parsed.sessions.length) {
          localStorage.setItem(
            SESSIONS_STORAGE_KEY,
            JSON.stringify({
              sessions: validSessions,
              lastUpdated: new Date().toISOString(),
            }),
          );
        }
      }
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error);
      // Clear corrupted data
      localStorage.removeItem(SESSIONS_STORAGE_KEY);
    }
  }, []);

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    try {
      const storageData: ClientSessionsStorage = {
        sessions,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.error('Failed to save sessions to localStorage:', error);
    }
  }, [sessions]);

  // Add a new session
  const addSession = useCallback((session: ClientSessionInfo) => {
    setSessions((prev) => {
      // Remove existing session with same ID if it exists
      const filtered = prev.filter((s) => s.sessionId !== session.sessionId);

      // Add new session at the beginning
      const updated = [session, ...filtered];

      // Limit the number of stored sessions
      return updated.slice(0, MAX_SESSIONS);
    });
  }, []);

  // Update an existing session
  const updateSession = useCallback(
    (sessionId: string, updates: Partial<ClientSessionInfo>) => {
      setSessions((prev) =>
        prev.map((session: ClientSessionInfo) => {
          if (session.sessionId === sessionId) {
            const updated = {
              ...session,
              ...updates,
              lastUpdate: new Date().toISOString(),
            } as ClientSessionInfo;

            // Update current session if it's the one being updated
            if (currentSession?.sessionId === sessionId) {
              setCurrentSessionState(updated);
            }

            return updated;
          }
          return session;
        }),
      );
    },
    [currentSession],
  );

  // Remove a session
  const removeSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((session) => session.sessionId !== sessionId));

      // Clear current session if it's the one being removed
      if (currentSession?.sessionId === sessionId) {
        setCurrentSessionState(null);
      }
    },
    [currentSession],
  );

  // Set current session
  const setCurrentSession = useCallback((sessionId: string | null) => {
    if (sessionId === null) {
      setCurrentSessionState(null);
      return;
    }

    const found = sessionsRef.current.find((s) => s.sessionId === sessionId) ?? null;
    if (found) {
      setCurrentSessionState(found);
    } else {
      // fallback microtask to overcome potential effect ordering in tests
      void Promise.resolve().then(() => {
        const recheck = sessionsRef.current.find((s) => s.sessionId === sessionId) ?? null;
        setCurrentSessionState(recheck);
      });
    }
  }, []);

  // Clear all sessions
  const clearAllSessions = useCallback(() => {
    setSessions([]);
    setCurrentSessionState(null);
  }, []);

  // Sync sessions with server
  const syncWithServer = useCallback(async () => {
    try {
      const response = await fetch('/api/multi-stage/sessions');
      if (!response || !('ok' in response) || !response.ok) {
        throw new Error('Network error');
      }

      const data = await response.json();
      if (data?.success && Array.isArray(data.sessions)) {
        // Convert server sessions to client format
        const serverSessions: ClientSessionInfo[] = data.sessions.map((serverSession: any) => ({
          sessionId: serverSession.sessionId,
          status: serverSession.status,
          currentStage: serverSession.currentStage,
          startTime: serverSession.startTime,
          lastUpdate: new Date().toISOString(),
          settings: {
            positions: [], // Will be populated from server if available
            sources: [],
            filters: {
              blacklistedCompanies: [],
              countries: [],
            },
          },
          canResume: !!serverSession.canResume,
          hasResults: serverSession.status === 'completed',
        }));

        // Merge with existing client sessions, preferring server data
        setSessions((prev) => {
          const merged = [...prev];

          for (const serverSession of serverSessions) {
            const existingIndex = merged.findIndex((s) => s.sessionId === serverSession.sessionId);
            if (existingIndex >= 0) {
              // Update existing session with server data
              merged[existingIndex] = {
                ...merged[existingIndex],
                ...serverSession,
              };
            } else {
              // Add new session from server
              merged.unshift(serverSession);
            }
          }

          return merged.slice(0, MAX_SESSIONS);
        });
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.message === 'Network error') {
        console.error('Failed to sync sessions with server:', new Error('Network error'));
      } else {
        console.error('Failed to sync sessions with server:', err);
      }
    }
  }, []);

  // Refresh sessions from server
  const refreshSessions = useCallback(async () => {
    await syncWithServer();
  }, [syncWithServer]);

  return {
    sessions,
    currentSession,
    addSession,
    updateSession,
    removeSession,
    setCurrentSession,
    clearAllSessions,
    syncWithServer,
    refreshSessions,
  };
}
