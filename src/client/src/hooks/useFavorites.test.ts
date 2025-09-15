/**
 * Tests for useFavorites hook
 *
 * Tests cover:
 * - Initial state loading from localStorage
 * - Adding jobs to favorites
 * - Removing jobs from favorites
 * - Checking favorite status
 * - Toggle favorite functionality
 * - Clearing all favorites
 * - Persistence across sessions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFavorites } from './useFavorites.ts';
import type { JobPost } from '../../../shared/schema.ts';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock job data for testing
const mockJob: JobPost = {
  id: 'job-1',
  title: 'Software Engineer',
  company: 'Tech Corp',
  description: 'A great job opportunity',
  originalUrl: 'https://example.com/job/1',
  source: 'indeed',
  location: 'Remote',
  employmentType: 'Full-time',
  remoteType: 'Fully remote',
  salaryMin: 50000,
  salaryMax: 70000,
  currency: 'USD',
  status: 'enriched',
};

const mockJob2: JobPost = {
  id: 'job-2',
  title: 'Product Manager',
  company: 'Product Inc',
  description: 'Another great job',
  originalUrl: 'https://example.com/job/2',
  source: 'linkedin',
  location: 'San Francisco',
  employmentType: 'Full-time',
  remoteType: 'Hybrid',
  status: 'enriched',
};

describe('useFavorites', () => {
  beforeEach(() => {
    // Reset localStorage mocks
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();

    // Default localStorage behavior
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    // Clean up after each test
    vi.clearAllMocks();
  });

  it('should initialize with empty favorites when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it('should load favorites from localStorage on initialization', () => {
    const storedFavorites = [
      {
        id: 'fav-1',
        jobId: 'job-1',
        title: 'Software Engineer',
        company: 'Tech Corp',
        addedAt: new Date('2024-01-01'),
        originalUrl: 'https://example.com/job/1',
        source: 'indeed',
      },
    ];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedFavorites));

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0]).toEqual({
      ...storedFavorites[0],
      addedAt: new Date('2024-01-01'),
    });
  });

  it('should handle invalid localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favorites).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load favorites from localStorage:',
      expect.any(SyntaxError),
    );

    consoleSpy.mockRestore();
  });

  it('should add a job to favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addToFavorites(mockJob);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0]).toMatchObject({
      jobId: mockJob.id,
      title: mockJob.title,
      company: mockJob.company,
      originalUrl: mockJob.originalUrl,
      source: mockJob.source,
    });
    expect(result.current.favorites[0].addedAt).toBeInstanceOf(Date);

    // Check that localStorage.setItem was called
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'remote-job-scout-favorites',
      expect.any(String),
    );
  });

  it('should not add duplicate jobs to favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addToFavorites(mockJob);
      result.current.addToFavorites(mockJob); // Try to add the same job again
    });

    expect(result.current.favorites).toHaveLength(1);
  });

  it('should remove a job from favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addToFavorites(mockJob);
      result.current.addToFavorites(mockJob2);
    });

    expect(result.current.favorites).toHaveLength(2);

    act(() => {
      result.current.removeFromFavorites(mockJob.id);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].jobId).toBe(mockJob2.id);
  });

  it('should check if a job is favorited', () => {
    const { result } = renderHook(() => useFavorites());

    expect(result.current.isFavorite(mockJob.id)).toBe(false);

    act(() => {
      result.current.addToFavorites(mockJob);
    });

    expect(result.current.isFavorite(mockJob.id)).toBe(true);
    expect(result.current.isFavorite('non-existent-job')).toBe(false);
  });

  it('should toggle favorite status', () => {
    const { result } = renderHook(() => useFavorites());

    expect(result.current.isFavorite(mockJob.id)).toBe(false);

    // Add to favorites
    act(() => {
      result.current.toggleFavorite(mockJob);
    });

    expect(result.current.isFavorite(mockJob.id)).toBe(true);

    // Remove from favorites
    act(() => {
      result.current.toggleFavorite(mockJob);
    });

    expect(result.current.isFavorite(mockJob.id)).toBe(false);
  });

  it('should clear all favorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addToFavorites(mockJob);
      result.current.addToFavorites(mockJob2);
    });

    expect(result.current.favorites).toHaveLength(2);

    act(() => {
      result.current.clearAllFavorites();
    });

    expect(result.current.favorites).toEqual([]);
  });

  it('should persist favorites to localStorage', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addToFavorites(mockJob);
    });

    // Verify localStorage.setItem was called with correct data
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'remote-job-scout-favorites',
      expect.stringContaining(mockJob.id),
    );
  });

  it('should get favorite by job ID', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addToFavorites(mockJob);
    });

    const favorite = result.current.getFavoriteByJobId(mockJob.id);
    expect(favorite).toBeDefined();
    expect(favorite?.jobId).toBe(mockJob.id);
    expect(favorite?.title).toBe(mockJob.title);

    const nonExistent = result.current.getFavoriteByJobId('non-existent');
    expect(nonExistent).toBeUndefined();
  });
});
