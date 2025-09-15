/**
 * Session Snapshot Service
 * Manages persistence and restoration of search session snapshots to/from filesystem
 *
 * This service handles:
 * - Saving session snapshots to data/sessions/<sessionId>.json
 * - Loading session snapshots for restoration
 * - Managing session directory structure
 * - Providing utilities for session recovery
 */

import { promises as fs } from 'fs';
import type {
  SessionSnapshot,
  MultiStageProgress,
  SearchRequest,
  Vacancy,
  ProcessingStage,
} from '../types/database.js';

export interface SnapshotSaveResult {
  success: boolean;
  snapshotPath: string;
  snapshotVersion: number;
  error?: string;
}

export interface SnapshotLoadResult {
  success: boolean;
  snapshot?: SessionSnapshot;
  error?: string;
}

export interface SessionListResult {
  success: boolean;
  sessions: SessionSnapshot[];
  error?: string;
}

export class SessionSnapshotService {
  private readonly sessionsDir: string;
  private readonly schemaVersion = '1.0.0';

  constructor(dataDir = './data') {
    // Use string concatenation for better testability
    this.sessionsDir = dataDir.endsWith('/') ? `${dataDir}sessions` : `${dataDir}/sessions`;
  }

  /**
   * Ensures the sessions directory exists
   */
  private async ensureSessionsDir(): Promise<void> {
    try {
      await fs.mkdir(this.sessionsDir, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create sessions directory:', error);
      throw new Error(`Cannot create sessions directory: ${this.sessionsDir}`);
    }
  }

  /**
   * Saves a session snapshot to filesystem
   */
  async saveSnapshot(
    sessionId: string,
    progress: MultiStageProgress,
    settings: SearchRequest['settings'],
    vacancies: Vacancy[],
    collectionResult?: any,
    filteringResult?: any,
    enrichmentResult?: any,
  ): Promise<SnapshotSaveResult> {
    try {
      await this.ensureSessionsDir();

      const snapshotPath = `${this.sessionsDir}/${sessionId}.json`;

      // Load existing snapshot to get version number
      let snapshotVersion = 1;
      try {
        const existing = await this.loadSnapshot(sessionId);
        if (existing.success && existing.snapshot) {
          snapshotVersion = existing.snapshot.snapshotVersion + 1;
        }
      } catch {
        // File doesn't exist, start with version 1
      }

      // Determine restoration capabilities
      const canResume = this.canResumeFromProgress(progress);
      const lastCompletedStage = this.getLastCompletedStage(progress);

      const snapshot: SessionSnapshot = {
        // Metadata
        sessionId,
        version: this.schemaVersion,
        createdAt: progress.startTime,
        updatedAt: new Date().toISOString(),
        snapshotVersion,

        // Session state
        status: progress.status,
        currentStage: progress.currentStage,

        // Original request settings
        settings,

        // Progress data
        progress,

        // Collected data
        vacancies,

        // Results
        collectionResult,
        filteringResult,
        enrichmentResult,

        // Restoration flags
        canResume,
        lastCompletedStage,
        restorationNotes: this.generateRestorationNotes(progress),
      };

      // Write snapshot to file
      const snapshotJson = JSON.stringify(snapshot, null, 2);
      await fs.writeFile(snapshotPath, snapshotJson, 'utf-8');

      console.log(`💾 Session snapshot saved: ${snapshotPath} (v${snapshotVersion})`);

      return {
        success: true,
        snapshotPath,
        snapshotVersion,
      };
    } catch (error) {
      const errorMessage = `Failed to save session snapshot: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        success: false,
        snapshotPath: `${this.sessionsDir}/${sessionId}.json`,
        snapshotVersion: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Loads a session snapshot from filesystem
   */
  async loadSnapshot(sessionId: string): Promise<SnapshotLoadResult> {
    try {
      const snapshotPath = `${this.sessionsDir}/${sessionId}.json`;

      const snapshotData = await fs.readFile(snapshotPath, 'utf-8');
      const snapshot: SessionSnapshot = JSON.parse(snapshotData);

      // Validate snapshot structure
      if (!this.validateSnapshot(snapshot)) {
        return {
          success: false,
          error: 'Invalid snapshot structure',
        };
      }

      console.log(`📂 Session snapshot loaded: ${snapshotPath} (v${snapshot.snapshotVersion})`);

      return {
        success: true,
        snapshot,
      };
    } catch (error) {
      const errorMessage = `Failed to load session snapshot: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Lists all available session snapshots
   */
  async listSnapshots(): Promise<SessionListResult> {
    try {
      await this.ensureSessionsDir();

      const files = await fs.readdir(this.sessionsDir);
      const sessions: SessionSnapshot[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionId = file.replace('.json', '');
          const result = await this.loadSnapshot(sessionId);
          if (result.success && result.snapshot) {
            sessions.push(result.snapshot);
          }
        }
      }

      // Sort by updated time (newest first)
      sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return {
        success: true,
        sessions,
      };
    } catch (error) {
      const errorMessage = `Failed to list session snapshots: ${(error as Error).message}`;
      console.error(`❌ ${errorMessage}`);

      return {
        success: false,
        sessions: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Deletes a session snapshot
   */
  async deleteSnapshot(sessionId: string): Promise<boolean> {
    try {
      const snapshotPath = `${this.sessionsDir}/${sessionId}.json`;
      await fs.unlink(snapshotPath);

      console.log(`🗑️ Session snapshot deleted: ${snapshotPath}`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to delete session snapshot ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Determines if a session can be resumed from the given progress
   */
  private canResumeFromProgress(progress: MultiStageProgress): boolean {
    // Can resume if not completed and not in error state
    return !progress.isComplete && progress.status !== 'error';
  }

  /**
   * Gets the last completed stage from progress
   */
  private getLastCompletedStage(progress: MultiStageProgress): ProcessingStage | undefined {
    const stages: Array<keyof typeof progress.stages> = ['collecting', 'filtering', 'enriching'];

    for (let i = stages.length - 1; i >= 0; i--) {
      const stage = stages[i];
      if (progress.stages[stage].status === 'completed') {
        return stage as ProcessingStage;
      }
    }

    return undefined;
  }

  /**
   * Generates restoration notes for the snapshot
   */
  private generateRestorationNotes(progress: MultiStageProgress): string[] {
    const notes: string[] = [];

    if (progress.status === 'paused') {
      notes.push(`Session was paused at ${progress.currentStage} stage`);
    }

    if (progress.status === 'stopped') {
      notes.push(`Session was manually stopped at ${progress.currentStage} stage`);
    }

    if (progress.errors.length > 0) {
      notes.push(`Session has ${progress.errors.length} error(s) that occurred during execution`);
    }

    const lastCompletedStage = this.getLastCompletedStage(progress);
    if (lastCompletedStage) {
      notes.push(`Last completed stage: ${lastCompletedStage}`);
    }

    return notes;
  }

  /**
   * Validates snapshot structure
   */
  private validateSnapshot(snapshot: any): snapshot is SessionSnapshot {
    return (
      typeof snapshot === 'object' &&
      typeof snapshot.sessionId === 'string' &&
      typeof snapshot.version === 'string' &&
      typeof snapshot.createdAt === 'string' &&
      typeof snapshot.updatedAt === 'string' &&
      typeof snapshot.snapshotVersion === 'number' &&
      typeof snapshot.status === 'string' &&
      typeof snapshot.currentStage === 'string' &&
      typeof snapshot.settings === 'object' &&
      typeof snapshot.progress === 'object' &&
      Array.isArray(snapshot.vacancies) &&
      typeof snapshot.canResume === 'boolean'
    );
  }

  /**
   * Gets session storage statistics
   */
  async getStorageStats(): Promise<{
    totalSnapshots: number;
    totalSizeBytes: number;
    oldestSnapshot?: string;
    newestSnapshot?: string;
  }> {
    try {
      const listResult = await this.listSnapshots();
      if (!listResult.success) {
        return {
          totalSnapshots: 0,
          totalSizeBytes: 0,
        };
      }

      const sessions = listResult.sessions;
      let totalSizeBytes = 0;

      for (const session of sessions) {
        try {
          const snapshotPath = `${this.sessionsDir}/${session.sessionId}.json`;
          const stats = await fs.stat(snapshotPath);
          totalSizeBytes += stats.size;
        } catch {
          // Skip files that can't be stat'd
        }
      }

      return {
        totalSnapshots: sessions.length,
        totalSizeBytes,
        oldestSnapshot: sessions.length > 0 ? sessions[sessions.length - 1].sessionId : undefined,
        newestSnapshot: sessions.length > 0 ? sessions[0].sessionId : undefined,
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {
        totalSnapshots: 0,
        totalSizeBytes: 0,
      };
    }
  }
}
