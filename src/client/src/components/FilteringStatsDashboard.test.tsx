/**
 * Unit tests for FilteringStatsDashboard component
 */
import { expect, test, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { FilteringStatsDashboard } from './FilteringStatsDashboard.tsx';
import type { FilteringStats } from '../../../shared/schema.ts';

// Mock the UI components
vi.mock('./ui/card.tsx', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-title">{children}</div>
  ),
}));

vi.mock('./ui/badge.tsx', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <div data-testid="badge">{children}</div>,
}));

vi.mock('./ui/progress.tsx', () => ({
  Progress: ({ value }: { value: number }) => <div data-testid="progress" data-value={value} />,
}));

vi.mock('lucide-react', () => ({
  Filter: () => <div data-testid="filter-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
}));

// Use isolated containers for each test to prevent DOM pollution
let testContainer: HTMLElement;

beforeEach(() => {
  testContainer = document.createElement('div');
  document.body.appendChild(testContainer);
});

afterEach(() => {
  if (testContainer?.parentNode) {
    testContainer.parentNode.removeChild(testContainer);
  }
  cleanup();
});

test('FilteringStatsDashboard - renders with filtering stats', () => {
  const filteringStats: FilteringStats = {
    totalFiltered: 8,
    totalSkipped: 2,
    skipReasons: {
      company_blacklisted: 1,
      title_blacklisted_words: 1,
    },
  };

  render(<FilteringStatsDashboard filteringStats={filteringStats} />, { container: testContainer });

  // Check if main elements are rendered
  expect(screen.getByTestId('card')).toBeDefined();
  expect(screen.getByTestId('card-title')).toBeDefined();
  expect(screen.getAllByTestId('progress')).toHaveLength(2);

  // Check if stats are displayed
  expect(screen.getByText('10')).toBeDefined(); // Total processed (8 + 2)

  // Check that the number 8 appears (multiple times in different contexts)
  const eightElements = screen.getAllByText('8');
  expect(eightElements.length).toBeGreaterThanOrEqual(2); // At least 2 occurrences

  // Check that the number 2 appears (multiple times)
  const twoElements = screen.getAllByText('2');
  expect(twoElements.length).toBeGreaterThanOrEqual(2); // At least 2 occurrences
});

test('FilteringStatsDashboard - renders empty state when no data', () => {
  const filteringStats: FilteringStats = {
    totalFiltered: 0,
    totalSkipped: 0,
    skipReasons: {},
  };

  render(<FilteringStatsDashboard filteringStats={filteringStats} />, { container: testContainer });

  // Should show empty state message
  expect(screen.getByText('No filtering data available yet')).toBeDefined();
});

test('FilteringStatsDashboard - does not render when not visible', () => {
  const filteringStats: FilteringStats = {
    totalFiltered: 5,
    totalSkipped: 3,
    skipReasons: {
      company_blacklisted: 3,
    },
  };

  render(<FilteringStatsDashboard filteringStats={filteringStats} isVisible={false} />, {
    container: testContainer,
  });

  // Should not render anything - component should return null
  expect(screen.queryByTestId('card')).toBeNull();
});

test('FilteringStatsDashboard - does not render when no filtering stats', () => {
  render(<FilteringStatsDashboard filteringStats={undefined} />, { container: testContainer });

  // Should not render anything
  expect(screen.queryByTestId('card')).toBeNull();
});

test('FilteringStatsDashboard - shows skip reasons correctly', () => {
  const filteringStats: FilteringStats = {
    totalFiltered: 7,
    totalSkipped: 3,
    skipReasons: {
      company_blacklisted: 2,
      title_blacklisted_words: 1,
    },
  };

  render(<FilteringStatsDashboard filteringStats={filteringStats} />, { container: testContainer });

  // Check if reasons are displayed
  expect(screen.getByText('Company Blacklisted')).toBeDefined();
  expect(screen.getByText('Blacklisted Words in Title')).toBeDefined();

  // Check counts - each should appear at least once
  expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  expect(screen.getAllByText('1').length).toBeGreaterThan(0);
});

test('FilteringStatsDashboard - calculates percentages correctly', () => {
  const filteringStats: FilteringStats = {
    totalFiltered: 8,
    totalSkipped: 2,
    skipReasons: {
      company_blacklisted: 1,
      title_blacklisted_words: 1,
    },
  };

  render(<FilteringStatsDashboard filteringStats={filteringStats} />, { container: testContainer });

  // 8 out of 10 = 80%
  expect(screen.getByText('80.0%')).toBeDefined();

  // 2 out of 10 = 20%
  expect(screen.getByText('20.0%')).toBeDefined();

  // 1 out of 2 = 50% (should appear in the reason descriptions)
  const fiftyPercentElements = screen.getAllByText(/1 jobs \(50\.0%\)/);
  expect(fiftyPercentElements.length).toBeGreaterThanOrEqual(1);
});
