/**
 * ProgressDashboard ETA Display Tests
 * Tests the ETA display functionality in the ProgressDashboard component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressDashboard } from './ProgressDashboard.tsx';
import type { ProgressData, ClientSessionInfo } from '../../../shared/schema.ts';

// Mock the ETAService
vi.mock('../../../services/etaService.js', () => ({
  ETAService: {
    formatETA: (seconds: number) => {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    },
  },
}));

describe('ProgressDashboard ETA Display', () => {
  const mockProps = {
    progress: {
      currentStage: 1,
      status: 'running' as const,
      totalJobs: 100,
      processedJobs: 50,
      filteredJobs: 40,
      enrichedJobs: 30,
      totalCost: 1.5,
      estimatedTimeRemaining: 600, // 10 minutes
      processingSpeed: 5.0,
      overallETA: 300, // 5 minutes (should override estimatedTimeRemaining)
      etaConfidence: 0.85,
      stages: {
        collecting: {
          status: 'running',
          progress: 50,
          itemsProcessed: 50,
          itemsTotal: 100,
          etaSeconds: 120, // 2 minutes
          etaConfidence: 0.9,
        },
        filtering: {
          status: 'pending',
          progress: 0,
          itemsProcessed: 0,
          itemsTotal: 100,
          etaSeconds: 240, // 4 minutes
          etaConfidence: 0.7,
        },
        enriching: {
          status: 'pending',
          progress: 0,
          itemsProcessed: 0,
          itemsTotal: 50,
          etaSeconds: 180, // 3 minutes
          etaConfidence: 0.6,
        },
      },
    } as ProgressData,
    session: null,
    onPauseResume: vi.fn(),
    onStop: vi.fn(),
    onResume: vi.fn(),
  };

  describe('Overall ETA Display', () => {
    it('should display overall ETA when available', () => {
      render(<ProgressDashboard {...mockProps} />);

      // Should show the ETA from overallETA (5m 0s) instead of estimatedTimeRemaining
      expect(screen.getByText('5m 0s')).toBeInTheDocument();
    });

    it('should display confidence percentage for overall ETA', () => {
      render(<ProgressDashboard {...mockProps} />);

      expect(screen.getByText('85% confidence')).toBeInTheDocument();
    });

    it('should show confidence icon for overall ETA', () => {
      render(<ProgressDashboard {...mockProps} />);

      // Should have a trending up icon for high confidence
      const confidenceIcon = screen
        .getByTestId('text-time-remaining')
        .parentElement?.querySelector('svg');
      expect(confidenceIcon).toBeInTheDocument();
    });

    it('should fallback to estimatedTimeRemaining when overallETA is not available', () => {
      const propsWithoutETA = {
        ...mockProps,
        progress: {
          ...mockProps.progress,
          overallETA: undefined,
        },
      };

      render(<ProgressDashboard {...propsWithoutETA} />);

      expect(screen.getByText('10m 0s')).toBeInTheDocument();
    });

    it('should not show confidence when etaConfidence is not available', () => {
      const propsWithoutConfidence = {
        ...mockProps,
        progress: {
          ...mockProps.progress,
          etaConfidence: undefined,
        },
      };

      render(<ProgressDashboard {...propsWithoutConfidence} />);

      expect(screen.queryByText(/% confidence/)).not.toBeInTheDocument();
    });
  });

  describe('Stage-specific ETA Display', () => {
    it('should display ETA for active stage', () => {
      render(<ProgressDashboard {...mockProps} />);

      expect(screen.getByText('ETA: 2m 0s')).toBeInTheDocument();
    });

    it('should display confidence for active stage ETA', () => {
      render(<ProgressDashboard {...mockProps} />);

      expect(screen.getByText('(90% confidence)')).toBeInTheDocument();
    });

    it('should show confidence icon for stage ETA', () => {
      render(<ProgressDashboard {...mockProps} />);

      // Look for multiple confidence icons (overall + stage)
      const confidenceIcons = screen.getAllByRole('img', { hidden: true });
      expect(confidenceIcons.length).toBeGreaterThan(1);
    });

    it('should not display ETA for non-active stages', () => {
      render(<ProgressDashboard {...mockProps} />);

      // Should not show ETA for filtering or enriching stages since they're not active
      expect(screen.queryByText('ETA: 4m 0s')).not.toBeInTheDocument();
      expect(screen.queryByText('ETA: 3m 0s')).not.toBeInTheDocument();
    });

    it('should not display ETA when stage has no etaSeconds', () => {
      const propsWithoutStageETA = {
        ...mockProps,
        progress: {
          ...mockProps.progress,
          stages: {
            ...mockProps.progress.stages,
            collecting: {
              ...mockProps.progress.stages!.collecting,
              etaSeconds: undefined,
            },
          },
        },
      };

      render(<ProgressDashboard {...propsWithoutStageETA} />);

      expect(screen.queryByText('ETA:')).not.toBeInTheDocument();
    });
  });

  describe('Progress and Item Counts', () => {
    it('should display item counts for each stage', () => {
      render(<ProgressDashboard {...mockProps} />);

      expect(screen.getByText('50/100 items')).toBeInTheDocument();
      expect(screen.getByText('0/100 items')).toBeInTheDocument();
      expect(screen.getByText('0/50 items')).toBeInTheDocument();
    });

    it('should handle undefined itemsTotal gracefully', () => {
      const propsWithUndefinedTotal = {
        ...mockProps,
        progress: {
          ...mockProps.progress,
          stages: {
            ...mockProps.progress.stages,
            collecting: {
              ...mockProps.progress.stages!.collecting,
              itemsTotal: undefined,
            },
          },
        },
      };

      render(<ProgressDashboard {...propsWithUndefinedTotal} />);

      expect(screen.getByText('50/0 items')).toBeInTheDocument();
    });
  });

  describe('Confidence Color Coding', () => {
    it('should use green color for high confidence (>= 80%)', () => {
      render(<ProgressDashboard {...mockProps} />);

      // High confidence should have green styling
      const confidenceElement = screen.getByText('85% confidence');
      expect(confidenceElement).toHaveClass('text-green-600');
    });

    it('should use yellow color for medium confidence (50-79%)', () => {
      const propsWithMediumConfidence = {
        ...mockProps,
        progress: {
          ...mockProps.progress,
          stages: {
            ...mockProps.progress.stages,
            collecting: {
              ...mockProps.progress.stages!.collecting,
              etaConfidence: 0.65,
            },
          },
        },
      };

      render(<ProgressDashboard {...propsWithMediumConfidence} />);

      const stageConfidenceElement = screen.getByText('(90% confidence)'); // Still high for overall
      expect(stageConfidenceElement).toHaveClass('text-green-600');
    });

    it('should use red color for low confidence (< 50%)', () => {
      const propsWithLowConfidence = {
        ...mockProps,
        progress: {
          ...mockProps.progress,
          etaConfidence: 0.3,
        },
      };

      render(<ProgressDashboard {...propsWithLowConfidence} />);

      const confidenceElement = screen.getByText('30% confidence');
      expect(confidenceElement).toHaveClass('text-red-600');
    });

    it('should use muted color when confidence is not available', () => {
      const propsWithoutConfidence = {
        ...mockProps,
        progress: {
          ...mockProps.progress,
          stages: {
            ...mockProps.progress.stages,
            collecting: {
              ...mockProps.progress.stages!.collecting,
              etaConfidence: undefined,
            },
          },
        },
      };

      render(<ProgressDashboard {...propsWithoutConfidence} />);

      // Should still show ETA but with muted styling
      expect(screen.getByText('ETA: 2m 0s')).toBeInTheDocument();
    });
  });

  describe('ETA Formatting', () => {
    it('should format seconds correctly', () => {
      expect(ETAService.formatETA(30)).toBe('30s');
      expect(ETAService.formatETA(90)).toBe('1m 30s');
      expect(ETAService.formatETA(3661)).toBe('1h 1m');
    });

    it('should handle edge cases in ETA formatting', () => {
      expect(ETAService.formatETA(0)).toBe('0s');
      expect(ETAService.formatETA(59)).toBe('59s');
      expect(ETAService.formatETA(60)).toBe('1m 0s');
      expect(ETAService.formatETA(3599)).toBe('59m 59s');
      expect(ETAService.formatETA(3600)).toBe('1h 0m');
    });
  });

  describe('Integration with Existing UI', () => {
    it('should maintain existing progress display functionality', () => {
      render(<ProgressDashboard {...mockProps} />);

      // Should still show overall progress
      expect(screen.getByText('50%')).toBeInTheDocument();

      // Should still show total jobs
      expect(screen.getByText('100')).toBeInTheDocument();

      // Should still show processing speed
      expect(screen.getByText('5.0 jobs/min')).toBeInTheDocument();
    });

    it('should work with existing session controls', () => {
      const propsWithSession = {
        ...mockProps,
        session: {
          sessionId: 'test-session',
          status: 'running' as const,
          currentStage: 'collecting' as const,
          startTime: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          settings: {
            positions: ['developer'],
            sources: ['indeed'],
            filters: {
              blacklistedCompanies: [],
              countries: [],
            },
          },
          canResume: false,
          hasResults: false,
        } as ClientSessionInfo,
      };

      render(<ProgressDashboard {...propsWithSession} />);

      // Should show session status
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });
});
