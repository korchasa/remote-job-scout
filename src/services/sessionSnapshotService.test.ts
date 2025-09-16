/**
 * Session Snapshot Service Tests
 * Tests the session snapshot save/load functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionSnapshotService } from './sessionSnapshotService.js';
import type {
  SessionSnapshot,
  MultiStageProgress,
  SearchRequest,
  Vacancy,
} from '../types/database.js';

// Собственный мок fs.promises, внедряемый через DI
const mockFs = {
  mkdir: vi.fn<Parameters<any>, any>(),
  readFile: vi.fn<Parameters<any>, any>(),
  writeFile: vi.fn<Parameters<any>, any>(),
  unlink: vi.fn<Parameters<any>, any>(),
  readdir: vi.fn<Parameters<any>, any>(),
  stat: vi.fn<Parameters<any>, any>(),
};

describe('SessionSnapshotService', () => {
  let service: SessionSnapshotService;
  const mockDataDir = '/mock/data';

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mock behaviors
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 0 } as any);

    // Inject mocked fs via DI
    service = new SessionSnapshotService(mockDataDir, mockFs as any);
  });

  describe('saveSnapshot', () => {
    it('should save a session snapshot successfully', async () => {
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
        startTime: new Date().toISOString(),
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
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
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
          created_at: new Date().toISOString(),
          collected_at: new Date().toISOString(),
        },
      ];

      // Ensure version starts from 1 (simulate no existing file)
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT'));

      const callIndex = mockFs.writeFile.mock.calls.length;

      const result = await service.saveSnapshot(
        'test-session-1',
        mockProgress,
        mockSettings,
        mockVacancies,
      );

      expect(result.success).toBe(true);
      expect(result.snapshotPath).toBe('/mock/data/sessions/test-session-1.json');
      expect(result.snapshotVersion).toBe(1);

      // Verify the file was written for this test call
      const thisCall = mockFs.writeFile.mock.calls[callIndex]!;
      const writtenContent = JSON.parse(thisCall[1] as string);
      expect(writtenContent.sessionId).toBe('test-session-1');
      expect(writtenContent.version).toBe('1.0.0');
      // Validate canResume is consistent with progress status
      const expectedCanResume =
        !writtenContent.progress.isComplete && writtenContent.progress.status !== 'error';
      expect(writtenContent.canResume).toBe(expectedCanResume);
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
        startTime: new Date().toISOString(),
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
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
        },
      };

      const existingSnapshot: SessionSnapshot = {
        sessionId: 'test-session-1',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        snapshotVersion: 1,
        status: 'running',
        currentStage: 'collecting',
        settings: mockSettings,
        progress: mockProgress,
        vacancies: [],
        canResume: true,
        restorationNotes: [],
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingSnapshot));
      mockFs.writeFile.mockResolvedValue(undefined);

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
        startTime: new Date().toISOString(),
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
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
        },
      };

      await service.saveSnapshot('test-session-1', mockProgress, mockSettings, []);

      // Verify the file was written
      const lastCall = mockFs.writeFile.mock.calls.at(-1)!;
      const writtenContent = JSON.parse(lastCall[1] as string);
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
        startTime: new Date().toISOString(),
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
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
        },
      };

      // Override mkdir to reject for this test
      mockFs.mkdir.mockRejectedValueOnce(new Error('Permission denied'));

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
          llm: {
            enrichmentInstructions: [],
            processingRules: [],
          },
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
          startTime: new Date().toISOString(),
          isComplete: false,
          canStop: true,
          errors: [],
        },
        vacancies: [],
        canResume: true,
        restorationNotes: [],
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockSnapshot));

      const result = await service.loadSnapshot('test-session-1');

      expect(result.success).toBe(true);
      expect(result.snapshot).toEqual(mockSnapshot);
    });

    it('should handle missing snapshot files', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('ENOENT: no such file or directory'));

      const result = await service.loadSnapshot('non-existent-session');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load session snapshot');
    });

    it('should validate snapshot structure', async () => {
      const invalidSnapshot = {
        // Missing required fields
        sessionId: 'test-session-1',
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(invalidSnapshot));

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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snapshotVersion: 1,
          status: 'completed',
          currentStage: 'completed',
          settings: {
            searchPositions: [],
            filters: {
              blacklistedCompanies: [],
              blacklistedWordsTitle: [],
              blacklistedWordsDescription: [],
              countries: [],
              languages: [],
            },
            sources: { jobSites: [] },
            llm: {
              enrichmentInstructions: [],
              processingRules: [],
            },
          },
          progress: {} as MultiStageProgress,
          vacancies: [],
          canResume: false,
          restorationNotes: [],
        },
        {
          sessionId: 'session-2',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snapshotVersion: 1,
          status: 'running',
          currentStage: 'collecting',
          settings: {
            searchPositions: [],
            filters: {
              blacklistedCompanies: [],
              blacklistedWordsTitle: [],
              blacklistedWordsDescription: [],
              countries: [],
              languages: [],
            },
            sources: { jobSites: [] },
            llm: {
              enrichmentInstructions: [],
              processingRules: [],
            },
          },
          progress: {} as MultiStageProgress,
          vacancies: [],
          canResume: true,
          restorationNotes: [],
        },
      ];

      mockFs.readdir.mockResolvedValueOnce([
        'session-1.json',
        'session-2.json',
        'invalid-file.txt',
      ] as any);

      // Ensure session-2 is newer by updatedAt
      const newer = { ...mockSnapshots[1], updatedAt: new Date(Date.now() + 1000).toISOString() };
      const older = { ...mockSnapshots[0], updatedAt: new Date().toISOString() };

      mockFs.readFile
        .mockResolvedValueOnce(JSON.stringify(older))
        .mockResolvedValueOnce(JSON.stringify(newer));

      const result = await service.listSnapshots();

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(2);
      // Should be sorted by updated time (newest first)
      expect(result.sessions[0].sessionId).toBe('session-2');
      expect(result.sessions[1].sessionId).toBe('session-1');
    });

    it('should handle empty snapshots directory', async () => {
      mockFs.readdir.mockResolvedValueOnce([]);

      const result = await service.listSnapshots();

      expect(result.success).toBe(true);
      expect(result.sessions).toHaveLength(0);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot successfully', async () => {
      const result = await service.deleteSnapshot('test-session-1');

      expect(result).toBe(true);
      // unlink should have been called with the correct path
      expect(mockFs.unlink).toHaveBeenCalledWith('/mock/data/sessions/test-session-1.json');
    });

    it('should handle deletion errors', async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error('Permission denied'));

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
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snapshotVersion: 1,
          status: 'completed',
          currentStage: 'completed',
          settings: {
            searchPositions: [],
            filters: {
              blacklistedCompanies: [],
              blacklistedWordsTitle: [],
              blacklistedWordsDescription: [],
              countries: [],
              languages: [],
            },
            sources: { jobSites: [] },
            llm: {
              enrichmentInstructions: [],
              processingRules: [],
            },
          },
          progress: {} as MultiStageProgress,
          vacancies: [],
          canResume: false,
          restorationNotes: [],
        },
      ];

      mockFs.readdir.mockResolvedValueOnce(['session-1.json'] as any);
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockSnapshots[0]));
      mockFs.stat.mockResolvedValueOnce({ size: 1024 } as any);

      const result = await service.getStorageStats();

      expect(result.totalSnapshots).toBe(1);
      expect(result.totalSizeBytes).toBe(1024);
      expect(result.oldestSnapshot).toBe('session-1');
      expect(result.newestSnapshot).toBe('session-1');
    });
  });

  describe('sanitizeSettingsForSnapshot', () => {
    it('should remove OpenAI API key from settings before saving', () => {
      const mockSettings: SearchRequest['settings'] = {
        searchPositions: ['Software Engineer'],
        filters: {
          blacklistedCompanies: [],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: [],
          languages: [],
        },
        sources: {
          jobSites: ['indeed'],
          openaiWebSearch: {
            apiKey: 'sk-1234567890abcdef', // This should be removed
            searchSites: ['linkedin.com'],
            globalSearch: false,
          },
        },
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
        },
      };

      // Use type assertion to access private method for testing
      const sanitized = (service as any).sanitizeSettingsForSnapshot(mockSettings);

      // API key should be empty string
      expect(sanitized.sources.openaiWebSearch?.apiKey).toBe('');
      // Other settings should be preserved
      expect(sanitized.sources.openaiWebSearch?.searchSites).toEqual(['linkedin.com']);
      expect(sanitized.sources.openaiWebSearch?.globalSearch).toBe(false);
      expect(sanitized.searchPositions).toEqual(['Software Engineer']);
    });

    it('should handle settings without OpenAI WebSearch config', () => {
      const mockSettings: SearchRequest['settings'] = {
        searchPositions: ['Software Engineer'],
        filters: {
          blacklistedCompanies: [],
          blacklistedWordsTitle: [],
          blacklistedWordsDescription: [],
          countries: [],
          languages: [],
        },
        sources: {
          jobSites: ['indeed'],
          // No openaiWebSearch config
        },
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
        },
      };

      const sanitized = (service as any).sanitizeSettingsForSnapshot(mockSettings);

      // Should not crash and preserve original settings
      expect(sanitized.sources.openaiWebSearch).toBeUndefined();
      expect(sanitized.searchPositions).toEqual(['Software Engineer']);
    });

    it('should preserve other settings when sanitizing', () => {
      const mockSettings: SearchRequest['settings'] = {
        searchPositions: ['Senior Developer', 'Frontend Engineer'],
        filters: {
          blacklistedCompanies: ['Bad Company'],
          blacklistedWordsTitle: ['junior'],
          blacklistedWordsDescription: ['freelance'],
          countries: ['US', 'CA'],
          languages: [{ language: 'English', level: 'advanced' }],
        },
        sources: {
          jobSites: ['indeed', 'linkedin'],
          openaiWebSearch: {
            apiKey: 'sk-very-secret-key-that-should-not-be-saved',
            searchSites: ['indeed.com', 'linkedin.com'],
            globalSearch: true,
          },
        },
        llm: {
          enrichmentInstructions: ['Extract company info'],
          processingRules: [],
        },
      };

      const sanitized = (service as any).sanitizeSettingsForSnapshot(mockSettings);

      // API key should be removed
      expect(sanitized.sources.openaiWebSearch?.apiKey).toBe('');

      // All other settings should be preserved
      expect(sanitized.searchPositions).toEqual(['Senior Developer', 'Frontend Engineer']);
      expect(sanitized.filters.blacklistedCompanies).toEqual(['Bad Company']);
      expect(sanitized.filters.countries).toEqual(['US', 'CA']);
      expect(sanitized.sources.jobSites).toEqual(['indeed', 'linkedin']);
      expect(sanitized.sources.openaiWebSearch?.searchSites).toEqual([
        'indeed.com',
        'linkedin.com',
      ]);
      expect(sanitized.sources.openaiWebSearch?.globalSearch).toBe(true);
      expect(sanitized.llm.enrichmentInstructions).toEqual(['Extract company info']);
    });
  });

  describe('saveSnapshot with API key sanitization', () => {
    it('should not save API key to snapshot file', async () => {
      const mockWriteFile = mockFs.writeFile;

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
        startTime: new Date().toISOString(),
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
        sources: {
          jobSites: ['indeed'],
          openaiWebSearch: {
            apiKey: 'sk-secret-key-that-should-not-be-saved',
            searchSites: ['linkedin.com'],
            globalSearch: false,
          },
        },
        llm: {
          enrichmentInstructions: [],
          processingRules: [],
        },
      };

      const result = await service.saveSnapshot('test-session-1', mockProgress, mockSettings, []);

      expect(result.success).toBe(true);

      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);

      // API key should be empty in the saved snapshot
      expect(writtenContent.settings.sources.openaiWebSearch.apiKey).toBe('');

      // Other settings should be preserved
      expect(writtenContent.settings.sources.openaiWebSearch.searchSites).toEqual(['linkedin.com']);
      expect(writtenContent.settings.sources.openaiWebSearch.globalSearch).toBe(false);
    });
  });
});
