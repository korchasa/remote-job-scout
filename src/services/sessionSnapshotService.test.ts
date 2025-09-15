/**
 * Session Snapshot Service Tests
 * Tests the session snapshot save/load functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { SessionSnapshotService } from './sessionSnapshotService.js';
import type {
  SessionSnapshot,
  MultiStageProgress,
  SearchRequest,
  Vacancy,
} from '../types/database.js';

// Mock fs operations
vi.mock('fs', () => {
  const mockPromises = {
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  };

  return {
    default: mockPromises,
    promises: mockPromises,
  };
});

describe('SessionSnapshotService', () => {
  let service: SessionSnapshotService;
  const mockDataDir = '/mock/data';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SessionSnapshotService(mockDataDir);
  });

  describe('saveSnapshot', () => {
    it('should save a session snapshot successfully', async () => {
      // Setup mocks
      const { promises: fsPromises } = await import('fs');
      const mockMkdir = vi.mocked(fsPromises.mkdir);
      const mockWriteFile = vi.mocked(fsPromises.writeFile);

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const mockProgress: MultiStageProgress = {
        sessionId: 'test-session-1',
        currentStage: 'collecting',
        status: 'running',
        overallProgress: 25,
        stageProgress: 50,
        stages: {
          collecting: {
            status: 'running',
            progress: 50,
            itemsProcessed: 10,
            itemsTotal: 20,
            errors: [],
          },
          filtering: {
            status: 'pending',
            progress: 0,
            itemsProcessed: 0,
            itemsTotal: 0,
            errors: [],
          },
          enriching: {
            status: 'pending',
            progress: 0,
            itemsProcessed: 0,
            itemsTotal: 0,
            errors: [],
          },
        },
        startTime: '2024-01-01T10:00:00Z',
        isComplete: false,
        canStop: true,
        errors: [],
      };

      const mockSettings: SearchRequest['settings'] = {
        searchPositions: ['Software Engineer'],
        filters: {
          blacklistedCompanies: ['Evil Corp'],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: ['US'],
          languages: [],
        },
        sources: {
          jobSites: ['indeed'],
        },
      };

      const mockVacancies: Vacancy[] = [
        {
          id: 'job-1',
          title: 'Software Engineer',
          description: 'Great job',
          url: 'https://example.com/job-1',
          status: 'collected',
          source: 'indeed',
          created_at: '2024-01-01T10:00:00Z',
          collected_at: '2024-01-01T10:00:00Z',
        },
      ];

      const result = await service.saveSnapshot(
        'test-session-1',
        mockProgress,
        mockSettings,
        mockVacancies,
      );

      expect(result.success).toBe(true);
      expect(result.snapshotPath).toBe('/mock/data/sessions/test-session-1.json');
      expect(result.snapshotVersion).toBe(1);

      expect(mockMkdir).toHaveBeenCalledWith('/mock/data/sessions', { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        '/mock/data/sessions/test-session-1.json',
        expect.any(String),
        'utf-8',
      );

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(writtenContent.sessionId).toBe('test-session-1');
      expect(writtenContent.version).toBe('1.0.0');
      expect(writtenContent.status).toBe('running');
      expect(writtenContent.canResume).toBe(true);
      expect(writtenContent.vacancies).toEqual(mockVacancies);
    });

    it('should increment snapshot version on subsequent saves', async () => {
      const mockProgress: MultiStageProgress = {
        sessionId: 'test-session-1',
        currentStage: 'collecting',
        status: 'running',
        overallProgress: 25,
        stageProgress: 50,
        stages: {
          collecting: {
            status: 'running',
            progress: 50,
            itemsProcessed: 10,
            itemsTotal: 20,
            errors: [],
          },
          filtering: {
            status: 'pending',
            progress: 0,
            itemsProcessed: 0,
            itemsTotal: 0,
            errors: [],
          },
          enriching: {
            status: 'pending',
            progress: 0,
            itemsProcessed: 0,
            itemsTotal: 0,
            errors: [],
          },
        },
        startTime: '2024-01-01T10:00:00Z',
        isComplete: false,
        canStop: true,
        errors: [],
      };

      const mockSettings: SearchRequest['settings'] = {
        searchPositions: ['Software Engineer'],
        filters: {
          blacklistedCompanies: [],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: [],
          languages: [],
        },
        sources: { jobSites: ['indeed'] },
      };

      const existingSnapshot: SessionSnapshot = {
        sessionId: 'test-session-1',
        version: '1.0.0',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:05:00Z',
        snapshotVersion: 1,
        status: 'running',
        currentStage: 'collecting',
        settings: mockSettings,
        progress: mockProgress,
        vacancies: [],
        canResume: true,
        restorationNotes: [],
      };

      const mockReadFile = vi.mocked(fs.readFile);
      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockMkdir = vi.mocked(fs.mkdir);

      mockMkdir.mockResolvedValue(undefined);
      mockReadFile.mockResolvedValue(JSON.stringify(existingSnapshot));
      mockWriteFile.mockResolvedValue(undefined);

      const result = await service.saveSnapshot('test-session-1', mockProgress, mockSettings, []);

      expect(result.success).toBe(true);
      expect(result.snapshotVersion).toBe(2);
    });

    it('should not resume completed sessions', async () => {
      const mockProgress: MultiStageProgress = {
        sessionId: 'test-session-1',
        currentStage: 'completed',
        status: 'completed',
        overallProgress: 100,
        stageProgress: 100,
        stages: {
          collecting: {
            status: 'completed',
            progress: 100,
            itemsProcessed: 20,
            itemsTotal: 20,
            errors: [],
          },
          filtering: {
            status: 'completed',
            progress: 100,
            itemsProcessed: 15,
            itemsTotal: 20,
            errors: [],
          },
          enriching: {
            status: 'completed',
            progress: 100,
            itemsProcessed: 10,
            itemsTotal: 15,
            errors: [],
          },
        },
        startTime: '2024-01-01T10:00:00Z',
        isComplete: true,
        canStop: false,
        errors: [],
      };

      const mockSettings: SearchRequest['settings'] = {
        searchPositions: ['Software Engineer'],
        filters: {
          blacklistedCompanies: [],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: [],
          languages: [],
        },
        sources: { jobSites: ['indeed'] },
      };

      const mockWriteFile = vi.mocked(fs.writeFile);
      const mockMkdir = vi.mocked(fs.mkdir);

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await service.saveSnapshot('test-session-1', mockProgress, mockSettings, []);

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
      expect(writtenContent.canResume).toBe(false);
    });

    it('should handle filesystem errors', async () => {
      const mockProgress: MultiStageProgress = {
        sessionId: 'test-session-1',
        currentStage: 'collecting',
        status: 'running',
        overallProgress: 25,
        stageProgress: 50,
        stages: {
          collecting: {
            status: 'running',
            progress: 50,
            itemsProcessed: 10,
            itemsTotal: 20,
            errors: [],
          },
          filtering: {
            status: 'pending',
            progress: 0,
            itemsProcessed: 0,
            itemsTotal: 0,
            errors: [],
          },
          enriching: {
            status: 'pending',
            progress: 0,
            itemsProcessed: 0,
            itemsTotal: 0,
            errors: [],
          },
        },
        startTime: '2024-01-01T10:00:00Z',
        isComplete: false,
        canStop: true,
        errors: [],
      };

      const mockSettings: SearchRequest['settings'] = {
        searchPositions: ['Software Engineer'],
        filters: {
          blacklistedCompanies: [],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: [],
          languages: [],
        },
        sources: { jobSites: ['indeed'] },
      };

      const mockMkdir = vi.mocked(fs.mkdir);
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await service.saveSnapshot('test-session-1', mockProgress, mockSettings, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save session snapshot');
    });
  });

  describe('loadSnapshot', () => {
    it('should load a session snapshot successfully', async () => {
      const mockSnapshot: SessionSnapshot = {
        sessionId: 'test-session-1',
        version: '1.0.0',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:05:00Z',
        snapshotVersion: 1,
        status: 'running',
        currentStage: 'collecting',
        settings: {
          searchPositions: ['Software Engineer'],
          filters: {
            blacklistedCompanies: [],
            blacklistedWordsTitle: [],
            blacklistedWordsDescription: [],
            countries: [],
            languages: [],
          },
          sources: { jobSites: ['indeed'] },
        },
        progress: {
          sessionId: 'test-session-1',
          currentStage: 'collecting',
          status: 'running',
          overallProgress: 25,
          stageProgress: 50,
          stages: {
            collecting: {
              status: 'running',
              progress: 50,
              itemsProcessed: 10,
              itemsTotal: 20,
              errors: [],
            },
            filtering: {
              status: 'pending',
              progress: 0,
              itemsProcessed: 0,
              itemsTotal: 0,
              errors: [],
            },
            enriching: {
              status: 'pending',
              progress: 0,
              itemsProcessed: 0,
              itemsTotal: 0,
              errors: [],
            },
          },
          startTime: '2024-01-01T10:00:00Z',
          isComplete: false,
          canStop: true,
          errors: [],
        },
        vacancies: [],
        canResume: true,
        restorationNotes: [],
      };

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockResolvedValue(JSON.stringify(mockSnapshot));

      const result = await service.loadSnapshot('test-session-1');

      expect(result.success).toBe(true);
      expect(result.snapshot).toEqual(mockSnapshot);
    });

    it('should handle missing snapshot files', async () => {
      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await service.loadSnapshot('non-existent-session');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load session snapshot');
    });

    it('should validate snapshot structure', async () => {
      const invalidSnapshot = {
        // Missing required fields
        sessionId: 'test-session-1',
      };

      const mockReadFile = vi.mocked(fs.readFile);
      mockReadFile.mockResolvedValue(JSON.stringify(invalidSnapshot));

      const result = await service.loadSnapshot('test-session-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid snapshot structure');
    });
  });

  describe('listSnapshots', () => {
    it('should list all available snapshots', async () => {
      const mockSnapshots: SessionSnapshot[] = [
        {
          sessionId: 'session-1',
          version: '1.0.0',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:05:00Z',
          snapshotVersion: 1,
          status: 'completed',
          currentStage: 'completed',
          settings: { searchPositions: [], filters: {}, sources: {} },
          progress: {} as MultiStageProgress,
          vacancies: [],
          canResume: false,
          restorationNotes: [],
        },
        {
          sessionId: 'session-2',
          version: '1.0.0',
          createdAt: '2024-01-01T11:00:00Z',
          updatedAt: '2024-01-01T11:05:00Z',
          snapshotVersion: 1,
          status: 'running',
          currentStage: 'collecting',
          settings: { searchPositions: [], filters: {}, sources: {} },
          progress: {} as MultiStageProgress,
          vacancies: [],
          canResume: true,
          restorationNotes: [],
        },
      ];

      const mockReaddir = vi.mocked(fs.readdir);
      const mockReadFile = vi.mocked(fs.readFile);

      mockReaddir.mockResolvedValue(['session-1.json', 'session-2.json', 'invalid-file.txt']);
      mockReadFile
        .mockResolvedValueOnce(JSON.stringify(mockSnapshots[0]))
        .mockResolvedValueOnce(JSON.stringify(mockSnapshots[1]));

      const result = await service.listSnapshots();

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(2);
      // Should be sorted by updated time (newest first)
      expect(result.sessions[0].sessionId).toBe('session-2');
      expect(result.sessions[1].sessionId).toBe('session-1');
    });

    it('should handle empty snapshots directory', async () => {
      const mockReaddir = vi.mocked(fs.readdir);
      mockReaddir.mockResolvedValue([]);

      const result = await service.listSnapshots();

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(0);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot successfully', async () => {
      const mockUnlink = vi.mocked(fs.unlink);
      mockUnlink.mockResolvedValue(undefined);

      const result = await service.deleteSnapshot('test-session-1');

      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalledWith('/mock/data/sessions/test-session-1.json');
    });

    it('should handle deletion errors', async () => {
      const mockUnlink = vi.mocked(fs.unlink);
      mockUnlink.mockRejectedValue(new Error('Permission denied'));

      const result = await service.deleteSnapshot('test-session-1');

      expect(result).toBe(false);
    });
  });

  describe('getStorageStats', () => {
    it('should return storage statistics', async () => {
      const mockSnapshots: SessionSnapshot[] = [
        {
          sessionId: 'session-1',
          version: '1.0.0',
          createdAt: '2024-01-01T10:00:00Z',
          updatedAt: '2024-01-01T10:05:00Z',
          snapshotVersion: 1,
          status: 'completed',
          currentStage: 'completed',
          settings: { searchPositions: [], filters: {}, sources: {} },
          progress: {} as MultiStageProgress,
          vacancies: [],
          canResume: false,
          restorationNotes: [],
        },
      ];

      const mockReaddir = vi.mocked(fs.readdir);
      const mockReadFile = vi.mocked(fs.readFile);
      const mockStat = vi.mocked(fs.stat);

      mockReaddir.mockResolvedValue(['session-1.json']);
      mockReadFile.mockResolvedValue(JSON.stringify(mockSnapshots[0]));
      mockStat.mockResolvedValue({ size: 1024 } as any);

      const result = await service.getStorageStats();

      expect(result.totalSnapshots).toBe(1);
      expect(result.totalSizeBytes).toBe(1024);
      expect(result.oldestSnapshot).toBe('session-1');
      expect(result.newestSnapshot).toBe('session-1');
    });
  });
});
