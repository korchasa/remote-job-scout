/**
 * useFavorites Hook
 *
 * Responsibility: Manages favorite jobs with localStorage persistence and reactive state updates
 * Relationships: Used by JobCard, JobDetailsModal, and FavoritesView components for favorite operations
 * Features: localStorage persistence, reactive state updates, automatic deduplication
 */

import { useState, useEffect, useCallback } from 'react';
import type { FavoriteJob, JobPost } from '../../../shared/schema.ts';

// localStorage key for favorites persistence
const FAVORITES_STORAGE_KEY = 'remote-job-scout-favorites';

/**
 * Custom hook for managing favorite jobs with localStorage persistence
 * Provides methods to add, remove, and check favorite status of jobs
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored) as FavoriteJob[];
        // Ensure dates are properly parsed
        const favoritesWithDates = parsedFavorites.map((fav) => ({
          ...fav,
          addedAt: new Date(fav.addedAt),
        }));
        setFavorites(favoritesWithDates);
      }
    } catch (error) {
      console.error('Failed to load favorites from localStorage:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save favorites to localStorage whenever favorites change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      } catch (error) {
        console.error('Failed to save favorites to localStorage:', error);
      }
    }
  }, [favorites, isLoading]);

  /**
   * Check if a job is in favorites
   * @param jobId - The ID of the job to check
   * @returns true if the job is favorited, false otherwise
   */
  const isFavorite = useCallback(
    (jobId: string): boolean => {
      return favorites.some((fav) => fav.jobId === jobId);
    },
    [favorites],
  );

  /**
   * Add a job to favorites
   * @param job - The job post to add to favorites
   */
  const addToFavorites = useCallback((job: JobPost): void => {
    setFavorites((prev) => {
      // Check if already in favorites to prevent duplicates
      if (prev.some((fav) => fav.jobId === job.id)) {
        return prev;
      }

      const favoriteJob: FavoriteJob = {
        id: `fav-${Date.now()}-${job.id}`,
        jobId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        employmentType: job.employmentType,
        remoteType: job.remoteType,
        addedAt: new Date(),
        originalUrl: job.originalUrl,
        source: job.source,
      };

      return [...prev, favoriteJob];
    });
  }, []);

  /**
   * Remove a job from favorites
   * @param jobId - The ID of the job to remove from favorites
   */
  const removeFromFavorites = useCallback((jobId: string): void => {
    setFavorites((prev) => prev.filter((fav) => fav.jobId !== jobId));
  }, []);

  /**
   * Toggle favorite status of a job
   * @param job - The job post to toggle favorite status for
   */
  const toggleFavorite = useCallback(
    (job: JobPost): void => {
      if (isFavorite(job.id)) {
        removeFromFavorites(job.id);
      } else {
        addToFavorites(job);
      }
    },
    [isFavorite, addToFavorites, removeFromFavorites],
  );

  /**
   * Clear all favorites
   */
  const clearAllFavorites = useCallback((): void => {
    setFavorites([]);
  }, []);

  /**
   * Get favorite by job ID
   * @param jobId - The ID of the job
   * @returns The favorite job object or undefined if not found
   */
  const getFavoriteByJobId = useCallback(
    (jobId: string): FavoriteJob | undefined => {
      return favorites.find((fav) => fav.jobId === jobId);
    },
    [favorites],
  );

  return {
    favorites,
    isLoading,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    clearAllFavorites,
    getFavoriteByJobId,
  };
}
