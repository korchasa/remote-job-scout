/**
 * useClientJobActions Hook (FR-11: Client-Side Job Actions)
 *
 * Responsibility: Manages client-side job actions (hide/skip/defer and block companies) with localStorage persistence
 * Relationships: Used by JobCard, JobDetailsModal, and JobListView components for job actions
 * Features: localStorage persistence, reactive state updates, filtering integration
 */

import { useState, useEffect, useCallback } from 'react';
import type { JobPost, HiddenJob, BlockedCompany } from '../../../shared/schema.ts';

// localStorage keys for client-side job actions
const HIDDEN_JOBS_STORAGE_KEY = 'remote-job-scout-hidden-jobs';
const BLOCKED_COMPANIES_STORAGE_KEY = 'remote-job-scout-blocked-companies';

/**
 * Custom hook for managing client-side job actions with localStorage persistence
 * Provides methods to hide jobs, block companies, and check action status
 */
export function useClientJobActions() {
  const [hiddenJobs, setHiddenJobs] = useState<HiddenJob[]>([]);
  const [blockedCompanies, setBlockedCompanies] = useState<BlockedCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const hiddenJobsStored = localStorage.getItem(HIDDEN_JOBS_STORAGE_KEY);
      const blockedCompaniesStored = localStorage.getItem(BLOCKED_COMPANIES_STORAGE_KEY);

      if (hiddenJobsStored) {
        const parsedHiddenJobs = JSON.parse(hiddenJobsStored) as HiddenJob[];
        // Ensure dates are properly parsed
        const hiddenJobsWithDates = parsedHiddenJobs.map((job) => ({
          ...job,
          hiddenAt: new Date(job.hiddenAt),
        }));
        setHiddenJobs(hiddenJobsWithDates);
      }

      if (blockedCompaniesStored) {
        const parsedBlockedCompanies = JSON.parse(blockedCompaniesStored) as BlockedCompany[];
        // Ensure dates are properly parsed
        const blockedCompaniesWithDates = parsedBlockedCompanies.map((company) => ({
          ...company,
          blockedAt: new Date(company.blockedAt),
        }));
        setBlockedCompanies(blockedCompaniesWithDates);
      }
    } catch (error) {
      console.error('Failed to load client job actions from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save hidden jobs to localStorage whenever hiddenJobs change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(HIDDEN_JOBS_STORAGE_KEY, JSON.stringify(hiddenJobs));
      } catch (error) {
        console.error('Failed to save hidden jobs to localStorage:', error);
      }
    }
  }, [hiddenJobs, isLoading]);

  // Save blocked companies to localStorage whenever blockedCompanies change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(BLOCKED_COMPANIES_STORAGE_KEY, JSON.stringify(blockedCompanies));
      } catch (error) {
        console.error('Failed to save blocked companies to localStorage:', error);
      }
    }
  }, [blockedCompanies, isLoading]);

  /**
   * Check if a job is hidden
   * @param jobId - The ID of the job to check
   * @returns true if the job is hidden, false otherwise
   */
  const isJobHidden = useCallback(
    (jobId: string): boolean => {
      return hiddenJobs.some((job) => job.jobId === jobId);
    },
    [hiddenJobs],
  );

  /**
   * Check if a company is blocked
   * @param companyName - The name of the company to check
   * @returns true if the company is blocked, false otherwise
   */
  const isCompanyBlocked = useCallback(
    (companyName: string): boolean => {
      return blockedCompanies.some(
        (company) => company.companyName.toLowerCase() === companyName.toLowerCase(),
      );
    },
    [blockedCompanies],
  );

  /**
   * Hide a job (skip/defer)
   * @param job - The job post to hide
   * @param reason - The reason for hiding the job
   */
  const hideJob = useCallback((job: JobPost, reason: HiddenJob['hiddenReason']): void => {
    setHiddenJobs((prev) => {
      // Check if already hidden to prevent duplicates
      if (prev.some((hidden) => hidden.jobId === job.id)) {
        return prev;
      }

      const hiddenJob: HiddenJob = {
        id: `hidden-${Date.now()}-${job.id}`,
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        employmentType: job.employmentType,
        remoteType: job.remoteType,
        hiddenAt: new Date(),
        originalUrl: job.originalUrl,
        source: job.source,
        hiddenReason: reason,
      };

      return [...prev, hiddenJob];
    });
  }, []);

  /**
   * Block a company
   * @param companyName - The name of the company to block
   * @param reason - The reason for blocking the company
   */
  const blockCompany = useCallback(
    (companyName: string, reason: BlockedCompany['reason']): void => {
      setBlockedCompanies((prev) => {
        // Check if already blocked to prevent duplicates
        if (
          prev.some((blocked) => blocked.companyName.toLowerCase() === companyName.toLowerCase())
        ) {
          return prev;
        }

        const blockedCompany: BlockedCompany = {
          id: `blocked-${Date.now()}-${companyName.toLowerCase().replace(/\s+/g, '-')}`,
          companyName: companyName,
          blockedAt: new Date(),
          reason: reason,
          jobCount: 1, // Start with 1, can be updated later
        };

        return [...prev, blockedCompany];
      });
    },
    [],
  );

  /**
   * Restore a hidden job (unhide)
   * @param jobId - The ID of the job to restore
   */
  const restoreJob = useCallback((jobId: string): void => {
    setHiddenJobs((prev) => prev.filter((job) => job.jobId !== jobId));
  }, []);

  /**
   * Unblock a company
   * @param companyName - The name of the company to unblock
   */
  const unblockCompany = useCallback((companyName: string): void => {
    setBlockedCompanies((prev) =>
      prev.filter((company) => company.companyName.toLowerCase() !== companyName.toLowerCase()),
    );
  }, []);

  /**
   * Get hidden job by job ID
   * @param jobId - The ID of the job
   * @returns The hidden job object or undefined if not found
   */
  const getHiddenJobById = useCallback(
    (jobId: string): HiddenJob | undefined => {
      return hiddenJobs.find((job) => job.jobId === jobId);
    },
    [hiddenJobs],
  );

  /**
   * Get blocked company by name
   * @param companyName - The name of the company
   * @returns The blocked company object or undefined if not found
   */
  const getBlockedCompany = useCallback(
    (companyName: string): BlockedCompany | undefined => {
      return blockedCompanies.find(
        (company) => company.companyName.toLowerCase() === companyName.toLowerCase(),
      );
    },
    [blockedCompanies],
  );

  /**
   * Clear all hidden jobs
   */
  const clearAllHiddenJobs = useCallback((): void => {
    setHiddenJobs([]);
  }, []);

  /**
   * Clear all blocked companies
   */
  const clearAllBlockedCompanies = useCallback((): void => {
    setBlockedCompanies([]);
  }, []);

  /**
   * Get statistics about client-side actions
   * @returns Statistics object with counts
   */
  const getActionStats = useCallback(() => {
    const stats = {
      totalHiddenJobs: hiddenJobs.length,
      totalBlockedCompanies: blockedCompanies.length,
      hiddenByReason: {
        manual: hiddenJobs.filter((job) => job.hiddenReason === 'manual').length,
        defer: hiddenJobs.filter((job) => job.hiddenReason === 'defer').length,
        skip: hiddenJobs.filter((job) => job.hiddenReason === 'skip').length,
      },
      blockedByReason: {
        manual: blockedCompanies.filter((company) => company.reason === 'manual').length,
        job_action: blockedCompanies.filter((company) => company.reason === 'job_action').length,
      },
    };
    return stats;
  }, [hiddenJobs, blockedCompanies]);

  return {
    // State
    hiddenJobs,
    blockedCompanies,
    isLoading,

    // Check methods
    isJobHidden,
    isCompanyBlocked,

    // Action methods
    hideJob,
    blockCompany,
    restoreJob,
    unblockCompany,

    // Get methods
    getHiddenJobById,
    getBlockedCompany,

    // Clear methods
    clearAllHiddenJobs,
    clearAllBlockedCompanies,

    // Stats
    getActionStats,
  };
}
