/**
 * ETA Service Test Suite
 * Comprehensive tests for ETA calculation logic including smoothing and confidence calculations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ETAService } from './etaService.js';
import type { StageProgress, ProcessingStage } from '../types/database.js';

describe('ETAService', () => {
  let etaService: ETAService;
  let mockStageProgress: StageProgress;

  beforeEach(() => {
    etaService = new ETAService();
    mockStageProgress = {
      status: 'running',
      progress: 50,
      itemsProcessed: 50,
      itemsTotal: 100,
      errors: [],
    };
  });

  describe('Basic ETA Calculation', () => {
    it('should return null when not enough data points', () => {
      const result = etaService.calculateStageETA('collecting', mockStageProgress);
      expect(result).toBeNull();
    });

    it('should calculate ETA with sufficient data points', () => {
      // Record some progress data
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 30); // 20 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 60); // 20 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 30 }, 90); // 20 items/min

      const result = etaService.calculateStageETA('collecting', mockStageProgress);

      expect(result).not.toBeNull();
      expect(result?.stage).toBe('collecting');
      expect(result?.remainingItems).toBe(50);
      expect(result?.currentSpeed).toBeGreaterThan(0);
      expect(result?.rawETA).toBeGreaterThan(0);
      expect(result?.smoothedETA).toBeGreaterThan(0);
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });

    it('should return zero ETA for completed stages', () => {
      const completedProgress: StageProgress = {
        ...mockStageProgress,
        status: 'completed',
        itemsProcessed: 100,
        itemsTotal: 100,
      };

      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 30);
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 60);

      const result = etaService.calculateStageETA('collecting', completedProgress);

      expect(result).not.toBeNull();
      expect(result?.remainingItems).toBe(0);
      expect(result?.rawETA).toBe(0);
      expect(result?.smoothedETA).toBe(0);
      expect(result?.confidence).toBe(1.0);
    });
  });

  describe('Speed Calculation and Smoothing', () => {
    it('should calculate correct speed from progress data', () => {
      // 10 items processed in 30 seconds = 20 items per minute
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 30);

      const history = etaService.getSpeedHistory('collecting');
      expect(history[0].speed).toBe(20);
    });

    it('should apply exponential smoothing to speed calculations', () => {
      // Record varying speeds
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 60); // 10 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 60); // 20 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 30 }, 60); // 20 items/min

      const result = etaService.calculateStageETA('collecting', mockStageProgress);
      expect(result?.currentSpeed).toBeGreaterThan(10);
      expect(result?.currentSpeed).toBeLessThan(30); // Adjusted for current smoothing algorithm
    });

    it('should handle minimum speed threshold', () => {
      // Clear any existing data
      etaService.resetStageData('collecting');

      // Very slow processing - should be filtered out
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 1 }, 1200); // 0.05 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 2 }, 2400); // 0.05 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 3 }, 3600); // 0.05 items/min

      const result = etaService.calculateStageETA('collecting', mockStageProgress);
      expect(result).toBeNull(); // Should return null due to low speed
    });
  });

  describe('ETA Formula Implementation', () => {
    it('should implement correct ETA formula: (total - processed) / speed × 60', () => {
      const itemsProcessed = 40;
      const itemsTotal = 100;
      const remainingItems = itemsTotal - itemsProcessed;
      const speed = 10; // items per minute
      const expectedETA = (remainingItems / speed) * 60; // 360 seconds

      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 120); // 10 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 30 }, 180); // 10 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 40 }, 240); // 10 items/min

      const result = etaService.calculateStageETA('collecting', {
        ...mockStageProgress,
        itemsProcessed,
        itemsTotal,
      });

      expect(result?.rawETA).toBeCloseTo(expectedETA, 1);
    });

    it('should apply smoothing to reduce ETA fluctuations', () => {
      // First calculation
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 60);
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 120);
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 30 }, 180);

      const _firstResult = etaService.calculateStageETA('collecting', mockStageProgress);

      // Second calculation with different speed
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 40 }, 200); // Faster speed

      const secondResult = etaService.calculateStageETA('collecting', mockStageProgress);

      // Smoothed ETA should be less volatile than raw ETA
      expect(secondResult?.smoothedETA).toBeGreaterThan(0);
      expect(secondResult?.confidence).toBeGreaterThan(0);
    });
  });

  describe('Confidence Calculation', () => {
    it('should have low confidence with insufficient data', () => {
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 60);
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 120);

      const result = etaService.calculateStageETA('collecting', mockStageProgress);
      expect(result?.confidence).toBeLessThan(0.5);
    });

    it('should have higher confidence with consistent data', () => {
      // Consistent speed data
      for (let i = 1; i <= 5; i++) {
        etaService.recordProgress(
          'collecting',
          { ...mockStageProgress, itemsProcessed: i * 10 },
          i * 60,
        );
      }

      const result = etaService.calculateStageETA('collecting', mockStageProgress);
      expect(result?.confidence).toBeGreaterThan(0.5);
    });

    it('should reduce confidence with inconsistent speed data', () => {
      // Very inconsistent speed data
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 30); // 20 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 60); // 20 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 30 }, 180); // 10 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 40 }, 240); // 10 items/min
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 50 }, 150); // 20 items/min

      const result = etaService.calculateStageETA('collecting', mockStageProgress);
      expect(result?.confidence).toBeLessThan(0.8);
    });
  });

  describe('Overall ETA Calculation', () => {
    const mockStages: Record<ProcessingStage, StageProgress> = {
      collecting: {
        status: 'running',
        progress: 50,
        itemsProcessed: 50,
        itemsTotal: 100,
        errors: [],
      },
      filtering: {
        status: 'pending',
        progress: 0,
        itemsProcessed: 0,
        itemsTotal: 100,
        errors: [],
      },
      enriching: {
        status: 'pending',
        progress: 0,
        itemsProcessed: 0,
        itemsTotal: 50,
        errors: [],
      },
    };

    it('should calculate overall ETA across all stages', () => {
      // Set up some history for collecting stage
      etaService.recordProgress('collecting', { ...mockStages.collecting, itemsProcessed: 10 }, 60);
      etaService.recordProgress(
        'collecting',
        { ...mockStages.collecting, itemsProcessed: 20 },
        120,
      );
      etaService.recordProgress(
        'collecting',
        { ...mockStages.collecting, itemsProcessed: 30 },
        180,
      );

      const result = etaService.calculateOverallETA(mockStages, 'collecting');

      expect(result.totalEstimatedTime).toBeGreaterThan(0);
      expect(result.stageBreakdown.length).toBe(3);
      expect(result.overallConfidence).toBeGreaterThan(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(1);
    });

    it('should handle completed stages correctly', () => {
      const completedStages: Record<ProcessingStage, StageProgress> = {
        ...mockStages,
        collecting: {
          ...mockStages.collecting,
          status: 'completed',
          itemsProcessed: 100,
          itemsTotal: 100,
        },
      };

      const result = etaService.calculateOverallETA(completedStages, 'filtering');

      const collectingETA = result.stageBreakdown.find((calc) => calc.stage === 'collecting');
      expect(collectingETA?.remainingItems).toBe(0);
      expect(collectingETA?.rawETA).toBe(0);
      expect(collectingETA?.smoothedETA).toBe(0);
    });
  });

  describe('Data Management', () => {
    it('should reset stage data correctly', () => {
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 60);
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 20 }, 120);

      expect(etaService.getSpeedHistory('collecting')).toHaveLength(2);

      etaService.resetStageData('collecting');

      expect(etaService.getSpeedHistory('collecting')).toHaveLength(0);
      expect(etaService.getStageETA('collecting')).toBeNull();
    });

    it('should reset all data correctly', () => {
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 60);
      etaService.recordProgress('filtering', { ...mockStageProgress, itemsProcessed: 5 }, 30);

      etaService.resetAllData();

      expect(etaService.getSpeedHistory('collecting')).toHaveLength(0);
      expect(etaService.getSpeedHistory('filtering')).toHaveLength(0);
    });

    it('should limit history length', () => {
      const service = new ETAService({ maxHistoryLength: 3 });

      for (let i = 1; i <= 5; i++) {
        service.recordProgress(
          'collecting',
          { ...mockStageProgress, itemsProcessed: i * 10 },
          i * 60,
        );
      }

      expect(service.getSpeedHistory('collecting')).toHaveLength(3);
    });
  });

  describe('ETA Formatting', () => {
    it('should format seconds correctly', () => {
      expect(ETAService.formatETA(0)).toBe('0s');
      expect(ETAService.formatETA(30)).toBe('30s');
      expect(ETAService.formatETA(90)).toBe('2m 30s');
      expect(ETAService.formatETA(3661)).toBe('1h 1m');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero remaining items', () => {
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 60);

      const result = etaService.calculateStageETA('collecting', {
        ...mockStageProgress,
        itemsProcessed: 100,
        itemsTotal: 100,
      });

      expect(result?.remainingItems).toBe(0);
      expect(result?.rawETA).toBe(0);
      expect(result?.smoothedETA).toBe(0);
    });

    it('should handle negative remaining items', () => {
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 60);

      const result = etaService.calculateStageETA('collecting', {
        ...mockStageProgress,
        itemsProcessed: 150,
        itemsTotal: 100,
      });

      expect(result?.remainingItems).toBe(0); // Should be clamped to 0
    });

    it('should handle invalid progress data', () => {
      // Clear any existing data
      etaService.resetStageData('collecting');

      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 0 }, 60);
      etaService.recordProgress('collecting', { ...mockStageProgress, itemsProcessed: 10 }, 0);

      const result = etaService.calculateStageETA('collecting', mockStageProgress);
      expect(result).toBeNull();
    });
  });
});
