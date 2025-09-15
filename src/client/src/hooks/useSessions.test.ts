/**
 * useSessions Hook Tests
 * Tests the client-side session management functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessions } from './useSessions.js';
import type { ClientSessionInfo, ClientSessionsStorage } from '../../../shared/schema.js';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for syncWithServer
global.fetch = vi.fn();

describe('useSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty sessions', () => {
      const { result } = renderHook(() => useSessions());

      expect(result.current.sessions).toEqual([]);
      expect(result.current.currentSession).toBeNull();
    });

    it('should load sessions from localStorage on mount', async () => {
      const mockStorage: ClientSessionsStorage = {
        sessions: [
          {
            sessionId: 'session-1',
            status: 'completed',
            currentStage: 'completed',
            startTime: '2024-01-01T10:00:00Z',
            lastUpdate: '2024-01-01T10:05:00Z',
            settings: {
              positions: ['Software Engineer'],
              sources: ['indeed'],
              filters: { blacklistedCompanies: [], countries: [] },
            },
            canResume: false,
            hasResults: true,
          },
        ],
        lastUpdated: '2024-01-01T10:05:00Z',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStorage));

      const { result } = renderHook(() => useSessions());

      // Wait for useEffect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].sessionId).toBe('session-1');
    });

    it('should filter out old sessions (older than 30 days)', () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      const mockStorage: ClientSessionsStorage = {
        sessions: [
          {
            sessionId: 'old-session',
            status: 'completed',
            currentStage: 'completed',
            startTime: thirtyOneDaysAgo.toISOString(),
            lastUpdate: thirtyOneDaysAgo.toISOString(),
            settings: {
              positions: ['Software Engineer'],
              sources: ['indeed'],
              filters: { blacklistedCompanies: [], countries: [] },
            },
            canResume: false,
            hasResults: true,
          },
          {
            sessionId: 'new-session',
            status: 'running',
            currentStage: 'collecting',
            startTime: new Date().toISOString(),
            lastUpdate: new Date().toISOString(),
            settings: {
              positions: ['Software Engineer'],
              sources: ['indeed'],
              filters: { blacklistedCompanies: [], countries: [] },
            },
            canResume: true,
            hasResults: false,
          },
        ],
        lastUpdated: new Date().toISOString(),
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStorage));

      const { result } = renderHook(() => useSessions());

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0].sessionId).toBe('new-session');
    });

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useSessions());

      expect(result.current.sessions).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load sessions from localStorage:',
        expect.any(SyntaxError),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('session management', () => {
    it('should add a new session', () => {
      const { result } = renderHook(() => useSessions());

      const newSession: ClientSessionInfo = {
        sessionId: 'session-1',
        status: 'running',
        currentStage: 'collecting',
        startTime: '2024-01-01T10:00:00Z',
        lastUpdate: '2024-01-01T10:00:00Z',
        settings: {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: { blacklistedCompanies: [], countries: [] },
        },
        canResume: false,
        hasResults: false,
      };

      act(() => {
        result.current.addSession(newSession);
      });

      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions[0]).toEqual(newSession);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should update an existing session', () => {
      const { result } = renderHook(() => useSessions());

      const initialSession: ClientSessionInfo = {
        sessionId: 'session-1',
        status: 'running',
        currentStage: 'collecting',
        startTime: '2024-01-01T10:00:00Z',
        lastUpdate: '2024-01-01T10:00:00Z',
        settings: {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: { blacklistedCompanies: [], countries: [] },
        },
        canResume: false,
        hasResults: false,
      };

      act(() => {
        result.current.addSession(initialSession);
      });

      act(() => {
        result.current.updateSession('session-1', {
          status: 'completed',
          hasResults: true,
        });
      });

      expect(result.current.sessions[0].status).toBe('completed');
      expect(result.current.sessions[0].hasResults).toBe(true);
      expect(result.current.sessions[0].lastUpdate).not.toBe('2024-01-01T10:00:00Z');
    });

    it('should remove a session', () => {
      const { result } = renderHook(() => useSessions());

      const session: ClientSessionInfo = {
        sessionId: 'session-1',
        status: 'running',
        currentStage: 'collecting',
        startTime: '2024-01-01T10:00:00Z',
        lastUpdate: '2024-01-01T10:00:00Z',
        settings: {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: { blacklistedCompanies: [], countries: [] },
        },
        canResume: false,
        hasResults: false,
      };

      act(() => {
        result.current.addSession(session);
        result.current.removeSession('session-1');
      });

      expect(result.current.sessions).toHaveLength(0);
    });

    it('should set current session', async () => {
      const { result } = renderHook(() => useSessions());

      const session: ClientSessionInfo = {
        sessionId: 'session-1',
        status: 'running',
        currentStage: 'collecting',
        startTime: '2024-01-01T10:00:00Z',
        lastUpdate: '2024-01-01T10:00:00Z',
        settings: {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: { blacklistedCompanies: [], countries: [] },
        },
        canResume: false,
        hasResults: false,
      };

      act(() => {
        result.current.addSession(session);
      });

      // Wait for state update
      await new Promise((resolve) => setTimeout(resolve, 0));

      act(() => {
        result.current.setCurrentSession('session-1');
      });

      expect(result.current.currentSession).toEqual(session);
    });

    it('should clear all sessions', () => {
      const { result } = renderHook(() => useSessions());

      const session: ClientSessionInfo = {
        sessionId: 'session-1',
        status: 'running',
        currentStage: 'collecting',
        startTime: '2024-01-01T10:00:00Z',
        lastUpdate: '2024-01-01T10:00:00Z',
        settings: {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: { blacklistedCompanies: [], countries: [] },
        },
        canResume: false,
        hasResults: false,
      };

      act(() => {
        result.current.addSession(session);
        result.current.setCurrentSession('session-1');
        result.current.clearAllSessions();
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(result.current.currentSession).toBeNull();
    });

    it('should limit the number of stored sessions', () => {
      const { result } = renderHook(() => useSessions());

      // Add more than MAX_SESSIONS (50) sessions
      for (let i = 0; i < 55; i++) {
        const session: ClientSessionInfo = {
          sessionId: `session-${i}`,
          status: 'running',
          currentStage: 'collecting',
          startTime: '2024-01-01T10:00:00Z',
          lastUpdate: '2024-01-01T10:00:00Z',
          settings: {
            positions: ['Software Engineer'],
            sources: ['indeed'],
            filters: { blacklistedCompanies: [], countries: [] },
          },
          canResume: false,
          hasResults: false,
        };

        act(() => {
          result.current.addSession(session);
        });
      }

      expect(result.current.sessions).toHaveLength(50);
    });
  });

  describe('server synchronization', () => {
    it('should sync sessions with server', async () => {
      const mockServerSessions = [
        {
          sessionId: 'server-session-1',
          status: 'completed',
          currentStage: 'completed',
          startTime: '2024-01-01T10:00:00Z',
          canResume: false,
          hasSnapshot: true,
        },
        {
          sessionId: 'server-session-2',
          status: 'paused',
          currentStage: 'filtering',
          startTime: '2024-01-01T11:00:00Z',
          canResume: true,
          hasSnapshot: true,
        },
      ];

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, sessions: mockServerSessions }),
      } as any);

      const { result } = renderHook(() => useSessions());

      // Wait for hook to initialize
      await new Promise((resolve) => setTimeout(resolve, 0));

      await act(async () => {
        await result.current.syncWithServer();
      });

      expect(result.current.sessions).toHaveLength(2);
      expect(result.current.sessions[0].sessionId).toBe('server-session-2'); // Newer first
      expect(result.current.sessions[1].sessionId).toBe('server-session-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/multi-stage/sessions');
    });

    it('should handle server sync errors gracefully', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSessions());

      // Wait for hook to initialize
      await new Promise((resolve) => setTimeout(resolve, 0));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await result.current.syncWithServer();
      });

      expect(result.current.sessions).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to sync sessions with server:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should handle server response errors', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as any);

      const { result } = renderHook(() => useSessions());

      // Wait for hook to initialize
      await new Promise((resolve) => setTimeout(resolve, 0));

      await act(async () => {
        await result.current.syncWithServer();
      });

      expect(result.current.sessions).toHaveLength(0);
    });
  });

  describe('localStorage persistence', () => {
    it('should save sessions to localStorage when they change', () => {
      const { result } = renderHook(() => useSessions());

      const session: ClientSessionInfo = {
        sessionId: 'session-1',
        status: 'running',
        currentStage: 'collecting',
        startTime: '2024-01-01T10:00:00Z',
        lastUpdate: '2024-01-01T10:00:00Z',
        settings: {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: { blacklistedCompanies: [], countries: [] },
        },
        canResume: false,
        hasResults: false,
      };

      act(() => {
        result.current.addSession(session);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'remote-job-scout-sessions',
        expect.stringContaining('"sessionId":"session-1"'),
      );
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Quota exceeded');
      });

      const { result } = renderHook(() => useSessions());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const session: ClientSessionInfo = {
        sessionId: 'session-1',
        status: 'running',
        currentStage: 'collecting',
        startTime: '2024-01-01T10:00:00Z',
        lastUpdate: '2024-01-01T10:00:00Z',
        settings: {
          positions: ['Software Engineer'],
          sources: ['indeed'],
          filters: { blacklistedCompanies: [], countries: [] },
        },
        canResume: false,
        hasResults: false,
      };

      act(() => {
        result.current.addSession(session);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save sessions to localStorage:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});
