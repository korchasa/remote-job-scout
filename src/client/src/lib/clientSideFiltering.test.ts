/**
 * Client-Side Filtering Utilities Tests (FR-11: Client-Side Job Actions)
 *
 * Tests for client-side filtering functions that apply user actions to job lists
 */

import { describe, it, expect } from 'vitest';
import {
  filterHiddenJobs,
  filterBlockedCompanies,
  applyClientSideFiltering,
  isJobHiddenByClient,
  getJobHiddenReasons,
} from './clientSideFiltering';
import type { JobPost, HiddenJob, BlockedCompany } from '../../../shared/schema';

describe('Client-Side Filtering Utilities', () => {
  const mockJob1: JobPost = {
    id: 'job-1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    description: 'A great job',
    originalUrl: 'https://example.com/job/1',
    source: 'indeed',
    location: 'Remote',
    employmentType: 'Full-time',
    status: 'filtered',
  };

  const mockJob2: JobPost = {
    id: 'job-2',
    title: 'Senior Developer',
    company: 'Bad Corp',
    description: 'Another job',
    originalUrl: 'https://example.com/job/2',
    source: 'linkedin',
    location: 'Remote',
    employmentType: 'Full-time',
    status: 'filtered',
  };

  const mockJob3: JobPost = {
    id: 'job-3',
    title: 'Designer',
    company: 'Good Corp',
    description: 'Design job',
    originalUrl: 'https://example.com/job/3',
    source: 'glassdoor',
    location: 'Remote',
    employmentType: 'Full-time',
    status: 'filtered',
  };

  const mockHiddenJob: HiddenJob = {
    id: 'hidden-1',
    jobId: 'job-1',
    title: 'Software Engineer',
    company: 'Tech Corp',
    hiddenAt: new Date('2024-01-01'),
    originalUrl: 'https://example.com/job/1',
    source: 'indeed',
    hiddenReason: 'manual',
  };

  const mockBlockedCompany: BlockedCompany = {
    id: 'blocked-1',
    companyName: 'Bad Corp',
    blockedAt: new Date('2024-01-01'),
    reason: 'manual',
  };

  describe('filterHiddenJobs', () => {
    it('should filter out hidden jobs', () => {
      const jobs = [mockJob1, mockJob2];
      const hiddenJobs = [mockHiddenJob];

      const result = filterHiddenJobs(jobs, hiddenJobs);

      expect(result.filtered).toHaveLength(1);
      expect(result.filtered[0].id).toBe('job-2');
      expect(result.hidden).toHaveLength(1);
      expect(result.hidden[0].id).toBe('job-1');
    });

    it('should return all jobs when no hidden jobs', () => {
      const jobs = [mockJob1, mockJob2];
      const result = filterHiddenJobs(jobs, []);

      expect(result.filtered).toHaveLength(2);
      expect(result.hidden).toHaveLength(0);
    });

    it('should handle empty job list', () => {
      const result = filterHiddenJobs([], [mockHiddenJob]);

      expect(result.filtered).toHaveLength(0);
      expect(result.hidden).toHaveLength(0);
    });
  });

  describe('filterBlockedCompanies', () => {
    it('should filter out jobs from blocked companies', () => {
      const jobs = [mockJob1, mockJob2, mockJob3];
      const blockedCompanies = [mockBlockedCompany];

      const result = filterBlockedCompanies(jobs, blockedCompanies);

      expect(result.filtered).toHaveLength(2);
      expect(result.filtered.map((j) => j.id)).toEqual(['job-1', 'job-3']);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].id).toBe('job-2');
    });

    it('should handle case-insensitive company matching', () => {
      const jobs = [mockJob2];
      const blockedCompany: BlockedCompany = {
        ...mockBlockedCompany,
        companyName: 'bad corp', // lowercase
      };

      const result = filterBlockedCompanies(jobs, [blockedCompany]);

      expect(result.filtered).toHaveLength(0);
      expect(result.blocked).toHaveLength(1);
    });

    it('should return all jobs when no blocked companies', () => {
      const jobs = [mockJob1, mockJob2];
      const result = filterBlockedCompanies(jobs, []);

      expect(result.filtered).toHaveLength(2);
      expect(result.blocked).toHaveLength(0);
    });
  });

  describe('applyClientSideFiltering', () => {
    it('should apply both hidden jobs and blocked companies filtering', () => {
      const jobs = [mockJob1, mockJob2, mockJob3];
      const hiddenJobs = [mockHiddenJob]; // hides job-1
      const blockedCompanies = [mockBlockedCompany]; // hides job-2 from Bad Corp

      const result = applyClientSideFiltering(jobs, hiddenJobs, blockedCompanies);

      expect(result.filteredJobs).toHaveLength(1);
      expect(result.filteredJobs[0].id).toBe('job-3');
      expect(result.hiddenJobs).toHaveLength(2);
      expect(result.hiddenJobs.map((j) => j.id)).toEqual(['job-1', 'job-2']);
      expect(result.stats.totalHidden).toBe(2);
      expect(result.stats.hiddenByAction).toBe(1);
      expect(result.stats.hiddenByCompany).toBe(1);
    });

    it('should handle overlapping filters correctly', () => {
      const jobs = [mockJob1];
      const hiddenJobs = [mockHiddenJob]; // hides job-1
      const blockedCompanies = [
        {
          ...mockBlockedCompany,
          companyName: 'Tech Corp', // also blocks job-1's company
        },
      ];

      const result = applyClientSideFiltering(jobs, hiddenJobs, blockedCompanies);

      // Job should only be counted once even if it matches multiple filters
      expect(result.filteredJobs).toHaveLength(0);
      expect(result.hiddenJobs).toHaveLength(1);
      expect(result.stats.totalHidden).toBe(1);
      expect(result.stats.hiddenByAction).toBe(1);
      expect(result.stats.hiddenByCompany).toBe(0); // Not counted since job was already hidden
    });

    it('should return all jobs when no filters', () => {
      const jobs = [mockJob1, mockJob2, mockJob3];
      const result = applyClientSideFiltering(jobs, [], []);

      expect(result.filteredJobs).toHaveLength(3);
      expect(result.hiddenJobs).toHaveLength(0);
      expect(result.stats.totalHidden).toBe(0);
    });
  });

  describe('isJobHiddenByClient', () => {
    it('should return true for hidden jobs', () => {
      const hiddenJobs = [mockHiddenJob];
      const blockedCompanies: BlockedCompany[] = [];

      const result = isJobHiddenByClient(mockJob1, hiddenJobs, blockedCompanies);

      expect(result).toBe(true);
    });

    it('should return true for jobs from blocked companies', () => {
      const hiddenJobs: HiddenJob[] = [];
      const blockedCompanies = [mockBlockedCompany];

      const result = isJobHiddenByClient(mockJob2, hiddenJobs, blockedCompanies);

      expect(result).toBe(true);
    });

    it('should return false for visible jobs', () => {
      const hiddenJobs: HiddenJob[] = [];
      const blockedCompanies: BlockedCompany[] = [];

      const result = isJobHiddenByClient(mockJob1, hiddenJobs, blockedCompanies);

      expect(result).toBe(false);
    });

    it('should handle case-insensitive company matching', () => {
      const hiddenJobs: HiddenJob[] = [];
      const blockedCompanies = [
        {
          ...mockBlockedCompany,
          companyName: 'bad corp', // lowercase
        },
      ];

      const result = isJobHiddenByClient(mockJob2, hiddenJobs, blockedCompanies);

      expect(result).toBe(true);
    });
  });

  describe('getJobHiddenReasons', () => {
    it('should return reasons for hidden job', () => {
      const hiddenJobs = [mockHiddenJob];
      const blockedCompanies: BlockedCompany[] = [];

      const reasons = getJobHiddenReasons(mockJob1, hiddenJobs, blockedCompanies);

      expect(reasons).toHaveLength(1);
      expect(reasons[0]).toBe('Hidden (manual)');
    });

    it('should return reasons for blocked company job', () => {
      const hiddenJobs: HiddenJob[] = [];
      const blockedCompanies = [mockBlockedCompany];

      const reasons = getJobHiddenReasons(mockJob2, hiddenJobs, blockedCompanies);

      expect(reasons).toHaveLength(1);
      expect(reasons[0]).toBe('Company blocked (manual)');
    });

    it('should return multiple reasons when applicable', () => {
      const hiddenJobs = [mockHiddenJob];
      const blockedCompanies = [
        {
          ...mockBlockedCompany,
          companyName: 'Tech Corp', // same company as hidden job
        },
      ];

      const reasons = getJobHiddenReasons(mockJob1, hiddenJobs, blockedCompanies);

      expect(reasons).toHaveLength(1); // Only hidden reason, since job is already hidden
      expect(reasons[0]).toBe('Hidden (manual)');
    });

    it('should return empty array for visible jobs', () => {
      const hiddenJobs: HiddenJob[] = [];
      const blockedCompanies: BlockedCompany[] = [];

      const reasons = getJobHiddenReasons(mockJob1, hiddenJobs, blockedCompanies);

      expect(reasons).toHaveLength(0);
    });
  });
});
