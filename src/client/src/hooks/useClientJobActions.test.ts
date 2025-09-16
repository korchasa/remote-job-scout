/**
 * useClientJobActions Hook Tests (FR-11: Client-Side Job Actions)
 *
 * Tests for client-side job actions management with localStorage persistence
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useClientJobActions } from './useClientJobActions';
import type { JobPost } from '../../../shared/schema';

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

describe('useClientJobActions', () => {
  const mockJob: JobPost = {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    description: 'A great job',
    originalUrl: 'https://example.com/job/1',
    source: 'indeed',
    location: 'Remote',
    employmentType: 'Full-time',
    status: 'filtered',
    salaryMin: 50000,
    salaryMax: 70000,
    currency: 'USD',
    remoteType: 'Fully Remote',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  describe('Initial state', () => {
    it('should start with empty arrays when no localStorage data', () => {
      const { result } = renderHook(() => useClientJobActions());

      expect(result.current.hiddenJobs).toEqual([]);
      expect(result.current.blockedCompanies).toEqual([]);
    });

    it('should load data from localStorage on mount', () => {
      const mockHiddenJobs = [
        {
          id: 'hidden-1',
          jobId: 'job-1',
          title: 'Software Engineer',
          company: 'Tech Corp',
          hiddenAt: new Date('2024-01-01'),
          originalUrl: 'https://example.com/job/1',
          source: 'indeed',
          hiddenReason: 'manual' as const,
        },
      ];

      const mockBlockedCompanies = [
        {
          id: 'blocked-1',
          companyName: 'Bad Corp',
          blockedAt: new Date('2024-01-01'),
          reason: 'manual' as const,
        },
      ];

      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify(mockHiddenJobs))
        .mockReturnValueOnce(JSON.stringify(mockBlockedCompanies));

      const { result } = renderHook(() => useClientJobActions());

      // Wait for loading to complete
      expect(result.current.hiddenJobs).toHaveLength(1);
      expect(result.current.blockedCompanies).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Job hiding functionality', () => {
    it('should hide a job with manual reason', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.hideJob(mockJob, 'manual');
      });

      expect(result.current.hiddenJobs).toHaveLength(1);
      expect(result.current.hiddenJobs[0].jobId).toBe('job-1');
      expect(result.current.hiddenJobs[0].hiddenReason).toBe('manual');
      expect(result.current.isJobHidden('job-1')).toBe(true);
    });

    it('should not duplicate hidden jobs', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.hideJob(mockJob, 'manual');
        result.current.hideJob(mockJob, 'skip'); // Try to hide same job again
      });

      expect(result.current.hiddenJobs).toHaveLength(1);
      expect(result.current.hiddenJobs[0].hiddenReason).toBe('manual'); // Original reason preserved
    });

    it('should restore a hidden job', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.hideJob(mockJob, 'manual');
      });
      expect(result.current.isJobHidden('job-1')).toBe(true);

      act(() => {
        result.current.restoreJob('job-1');
      });
      expect(result.current.isJobHidden('job-1')).toBe(false);
      expect(result.current.hiddenJobs).toHaveLength(0);
    });
  });

  describe('Company blocking functionality', () => {
    it('should block a company', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.blockCompany('Bad Corp', 'manual');
      });

      expect(result.current.blockedCompanies).toHaveLength(1);
      expect(result.current.blockedCompanies[0].companyName).toBe('Bad Corp');
      expect(result.current.blockedCompanies[0].reason).toBe('manual');
      expect(result.current.isCompanyBlocked('Bad Corp')).toBe(true);
    });

    it('should handle case-insensitive company blocking', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.blockCompany('Bad Corp', 'manual');
      });

      expect(result.current.isCompanyBlocked('bad corp')).toBe(true);
      expect(result.current.isCompanyBlocked('BAD CORP')).toBe(true);
    });

    it('should not duplicate blocked companies', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.blockCompany('Bad Corp', 'manual');
        result.current.blockCompany('Bad Corp', 'job_action'); // Try to block same company again
      });

      expect(result.current.blockedCompanies).toHaveLength(1);
      expect(result.current.blockedCompanies[0].reason).toBe('manual'); // Original reason preserved
    });

    it('should unblock a company', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.blockCompany('Bad Corp', 'manual');
      });
      expect(result.current.isCompanyBlocked('Bad Corp')).toBe(true);

      act(() => {
        result.current.unblockCompany('Bad Corp');
      });
      expect(result.current.isCompanyBlocked('Bad Corp')).toBe(false);
      expect(result.current.blockedCompanies).toHaveLength(0);
    });
  });

  describe('Statistics and utilities', () => {
    it('should provide accurate action statistics', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.hideJob(mockJob, 'manual');
        result.current.hideJob({ ...mockJob, id: 'job-2' }, 'skip');
        result.current.blockCompany('Bad Corp', 'manual');
        result.current.blockCompany('Worse Corp', 'job_action');
      });

      const stats = result.current.getActionStats();
      expect(stats.totalHiddenJobs).toBe(2);
      expect(stats.totalBlockedCompanies).toBe(2);
      expect(stats.hiddenByReason.manual).toBe(1);
      expect(stats.hiddenByReason.skip).toBe(1);
      expect(stats.blockedByReason.manual).toBe(1);
      expect(stats.blockedByReason.job_action).toBe(1);
    });

    it('should get hidden job by ID', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.hideJob(mockJob, 'manual');
      });

      const hiddenJob = result.current.getHiddenJobById('job-1');
      expect(hiddenJob?.jobId).toBe('job-1');
      expect(hiddenJob?.hiddenReason).toBe('manual');
    });

    it('should get blocked company by name', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.blockCompany('Bad Corp', 'manual');
      });

      const blockedCompany = result.current.getBlockedCompany('Bad Corp');
      expect(blockedCompany?.companyName).toBe('Bad Corp');
      expect(blockedCompany?.reason).toBe('manual');
    });
  });

  describe('localStorage persistence', () => {
    it('should save hidden jobs to localStorage', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.hideJob(mockJob, 'manual');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'remote-job-scout-hidden-jobs',
        expect.stringContaining('job-1'),
      );
    });

    it('should save blocked companies to localStorage', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.blockCompany('Bad Corp', 'manual');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'remote-job-scout-blocked-companies',
        expect.stringContaining('Bad Corp'),
      );
    });
  });

  describe('Clear functionality', () => {
    it('should clear all hidden jobs', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.hideJob(mockJob, 'manual');
        result.current.hideJob({ ...mockJob, id: 'job-2' }, 'skip');
      });
      expect(result.current.hiddenJobs).toHaveLength(2);

      act(() => {
        result.current.clearAllHiddenJobs();
      });
      expect(result.current.hiddenJobs).toHaveLength(0);
    });

    it('should clear all blocked companies', () => {
      const { result } = renderHook(() => useClientJobActions());

      act(() => {
        result.current.blockCompany('Bad Corp', 'manual');
        result.current.blockCompany('Worse Corp', 'job_action');
      });
      expect(result.current.blockedCompanies).toHaveLength(2);

      act(() => {
        result.current.clearAllBlockedCompanies();
      });
      expect(result.current.blockedCompanies).toHaveLength(0);
    });
  });
});
