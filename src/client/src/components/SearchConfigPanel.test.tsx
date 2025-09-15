/**
 * Unit tests for SearchConfigPanel component
 */
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchConfigPanel } from './SearchConfigPanel.tsx';
import type { SearchConfig } from '../../../shared/schema.ts';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Generate unique IDs for tests
let testIdCounter = 0;

const getUniqueTestId = (baseId: string) => `${baseId}-${testIdCounter++}`;

// Mock UI components
vi.mock('./ui/button.tsx', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button
      onClick={onClick}
      {...props}
      data-testid={props['data-testid'] || getUniqueTestId('button')}
    >
      {children}
    </button>
  ),
}));

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

vi.mock('./ui/input.tsx', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      {...props}
      data-testid={props['data-testid'] || getUniqueTestId('input')}
    />
  ),
}));

vi.mock('./ui/label.tsx', () => ({
  Label: ({ children, ...props }: any) => (
    <label {...props} data-testid={props['data-testid'] || getUniqueTestId('label')}>
      {children}
    </label>
  ),
}));

vi.mock('./ui/checkbox.tsx', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...props}
      data-testid={props['data-testid'] || getUniqueTestId('checkbox')}
    />
  ),
}));

vi.mock('./ui/badge.tsx', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <div data-testid="badge">{children}</div>,
}));

vi.mock('./ui/select.tsx', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select">
      <select value={value} onChange={(e) => onValueChange(e.target.value)}>
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>,
}));

vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="play-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  X: () => <div data-testid="x-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Languages: () => <div data-testid="languages-icon" />,
}));

describe('SearchConfigPanel', () => {
  const mockOnStartSearch = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    testIdCounter = 0; // Reset counter for each test
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    // More aggressive cleanup
    document.body.innerHTML = '';
    // Reset test ID counter
    testIdCounter = 0;
  });

  test('renders with default config', () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    expect(screen.getByTestId('card')).toBeDefined();
    expect(screen.getByText('Search Configuration')).toBeDefined();
    expect(screen.getByTestId('new-position')).toBeDefined();
    expect(screen.getByTestId('openai-api-key')).toBeDefined();
  });

  test('loads config from localStorage on mount', () => {
    const savedConfig: SearchConfig = {
      positions: ['Saved Position'],
      blacklistedWords: ['saved', 'word'],
      blacklistedCompanies: ['Saved Company'],
      selectedSources: ['indeed'],
      sources: {
        indeed: { enabled: true },
        linkedin: { enabled: false },
        openai: { enabled: false },
      },
      llm: {
        apiKey: 'saved-api-key',
      },
      filters: {
        locations: [],
        employmentTypes: [],
        remoteTypes: [],
        languages: [{ language: 'English', level: 'advanced' }],
        countries: ['United States'],
      },
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig));

    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    // Check if config was loaded (this would be verified by checking the component state)
    expect(localStorageMock.getItem).toHaveBeenCalledWith('remote-job-scout-config');

    // Verify that the config is being used by checking if positions from saved config are displayed
    expect(screen.getByText('Saved Position')).toBeDefined();
  });

  test.skip('saves config to localStorage when config changes', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const positionInput = screen.getByTestId('new-position');
    const addButton = screen.getByTestId('add-position');

    // Add a position
    await user.type(positionInput, 'Test Position');
    await user.click(addButton);

    // Wait for localStorage to be called
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'remote-job-scout-config',
        expect.stringContaining('Test Position'),
      );
    });
  });

  test.skip('adds and removes positions correctly', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const positionInput = screen.getByTestId('new-position');
    const addButton = screen.getByTestId('add-position');

    // Add position
    await user.type(positionInput, 'Frontend Developer');
    await user.click(addButton);

    // Check if position was added (badge should appear)
    expect(screen.getByText('Frontend Developer')).toBeDefined();

    // Remove position
    const removeButton = screen.getByTestId('remove-position-Frontend Developer');
    await user.click(removeButton);

    // Position should be removed
    expect(screen.queryByText('Frontend Developer')).toBeNull();
  });

  test.skip('adds and removes blacklisted words correctly', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const wordInput = screen.getByTestId('blacklisted-word');
    const addButton = screen.getByTestId('add-blacklisted-word');

    // Add word
    await user.type(wordInput, 'unpaid');
    await user.click(addButton);

    // Check if word was added
    expect(screen.getByText('unpaid')).toBeDefined();

    // Remove word
    const removeButton = screen.getByTestId('remove-blacklisted-word-unpaid');
    await user.click(removeButton);

    // Word should be removed
    expect(screen.queryByText('unpaid')).toBeNull();
  });

  test.skip('adds and removes blacklisted companies correctly', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const companyInput = screen.getByTestId('blacklisted-company');
    const addButton = screen.getByTestId('add-blacklisted-company');

    // Add company
    await user.type(companyInput, 'TestCorp');
    await user.click(addButton);

    // Check if company was added
    await waitFor(() => {
      expect(screen.getByText('TestCorp')).toBeDefined();
    });

    // Remove company
    const removeButton = screen.getByTestId('remove-blacklisted-company-TestCorp');
    await user.click(removeButton);

    // Company should be removed
    expect(screen.queryByText('TestCorp')).toBeNull();
  });

  test.skip('toggles sources correctly', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const linkedinCheckbox = screen.getByTestId('source-linkedin');

    // Initially should be checked (from default config)
    expect(linkedinCheckbox).toBeChecked();

    // Toggle off
    await user.click(linkedinCheckbox);
    expect(linkedinCheckbox).not.toBeChecked();

    // Toggle back on
    await user.click(linkedinCheckbox);
    expect(linkedinCheckbox).toBeChecked();
  });

  test('validates config before starting search', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const startButton = screen.getByTestId('start-search');

    // Try to start search without required fields
    await user.click(startButton);

    // Should not call onStartSearch due to validation
    expect(mockOnStartSearch).not.toHaveBeenCalled();
  });

  test.skip('starts search with valid config', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    // Add required fields
    const positionInput = screen.getByTestId('new-position');
    const addPositionButton = screen.getByTestId('add-position');
    const apiKeyInput = screen.getByTestId('openai-api-key');
    const startButton = screen.getByTestId('start-search');

    await user.type(positionInput, 'Software Engineer');
    await user.click(addPositionButton);
    await user.type(apiKeyInput, 'sk-test-key');
    await user.click(startButton);

    // Should call onStartSearch with config
    expect(mockOnStartSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        positions: expect.arrayContaining(['Software Engineer']),
        llm: expect.objectContaining({
          apiKey: 'sk-test-key',
        }),
      }),
    );
  });

  test.skip('handles API key input correctly', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const apiKeyInput = screen.getByTestId('openai-api-key');

    await user.type(apiKeyInput, 'sk-test-api-key-123');

    // Check if API key is set in config
    expect(apiKeyInput).toHaveValue('sk-test-api-key-123');
  });

  test.skip('shows validation errors for missing required fields', async () => {
    render(<SearchConfigPanel onStartSearch={mockOnStartSearch} />);

    const startButton = screen.getByTestId('start-search');

    // Try to start without any configuration
    await user.click(startButton);

    // Should show validation errors but not call onStartSearch
    expect(mockOnStartSearch).not.toHaveBeenCalled();
    // The validation errors would be shown in the UI
  });
});
