import { useEffect, useState } from 'react';
import { Button } from './ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Badge } from './ui/badge.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx';
import { Play, Plus, Settings, X, Globe, Languages } from 'lucide-react';
import type { SearchConfig, LanguageRequirement } from '@shared/schema.ts';

const availableCountries = [
  'United States',
  'Canada',
  'United Kingdom',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Australia',
  'New Zealand',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'Colombia',
];

const defaultConfig: SearchConfig = {
  positions: ['Senior React Developer', 'Frontend Engineer'],
  blacklistedWords: ['unpaid', 'internship', 'commission'],
  blacklistedCompanies: ['Tyrell Corporation'],
  selectedSources: ['indeed', 'linkedin', 'glassdoor', 'openai'],
  sources: {
    indeed: { enabled: true },
    linkedin: { enabled: true },
    glassdoor: { enabled: true },
    openai: { enabled: true },
  },
  llm: {
    apiKey: '',
  },
  filters: {
    locations: ['Remote', 'United States', 'Europe'],
    employmentTypes: ['Full-time'],
    remoteTypes: ['Fully Remote', 'Hybrid'],
    languages: [{ language: 'English', level: 'advanced' }],
    countries: availableCountries, // All countries as whitelist by default
  },
};

const availableSources = [
  { id: 'indeed', name: 'Indeed', description: 'Most comprehensive job board' },
  { id: 'linkedin', name: 'LinkedIn', description: 'Professional networking platform' },
  { id: 'glassdoor', name: 'Glassdoor', description: 'Company reviews and job listings' },
  { id: 'openai', name: 'OpenAI WebSearch', description: 'AI-powered web search' },
] as const;

const availableLanguages = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
];

const languageLevels = ['basic', 'intermediate', 'advanced', 'native'] as const;

interface SearchConfigPanelProps {
  onStartSearch: (config: SearchConfig) => Promise<void>;
  isSearching?: boolean;
}

export function SearchConfigPanel({ onStartSearch, isSearching = false }: SearchConfigPanelProps) {
  const [config, setConfig] = useState<SearchConfig>(defaultConfig);
  const [newPosition, setNewPosition] = useState('');
  const [newBlacklistedWord, setNewBlacklistedWord] = useState('');
  const [newBlacklistedCompany, setNewBlacklistedCompany] = useState('');
  const [newLanguage, setNewLanguage] = useState('');
  const [newLanguageLevel, setNewLanguageLevel] =
    useState<(typeof languageLevels)[number]>('intermediate');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('remote-job-scout-config');
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch {
        console.log('Failed to parse saved config, using defaults');
      }
    }
  }, []);

  // Save to localStorage on config change
  useEffect(() => {
    localStorage.setItem('remote-job-scout-config', JSON.stringify(config));
  }, [config]);

  const addPosition = () => {
    if (newPosition.trim() && !config.positions.includes(newPosition.trim())) {
      setConfig((prev) => ({
        ...prev,
        positions: [...prev.positions, newPosition.trim()],
      }));
      setNewPosition('');
      // Clear positions error when adding a position
      if (validationErrors.positions) {
        setValidationErrors((prev) => ({ ...prev, positions: '' }));
      }
    }
  };

  const removePosition = (position: string) => {
    setConfig((prev) => ({
      ...prev,
      positions: prev.positions.filter((p) => p !== position),
    }));
  };

  const addBlacklistedWord = () => {
    if (newBlacklistedWord.trim() && !config.blacklistedWords.includes(newBlacklistedWord.trim())) {
      setConfig((prev) => ({
        ...prev,
        blacklistedWords: [...prev.blacklistedWords, newBlacklistedWord.trim()],
      }));
      setNewBlacklistedWord('');
    }
  };

  const removeBlacklistedWord = (word: string) => {
    setConfig((prev) => ({
      ...prev,
      blacklistedWords: prev.blacklistedWords.filter((w) => w !== word),
    }));
  };

  const addBlacklistedCompany = () => {
    if (
      newBlacklistedCompany.trim() &&
      !config.blacklistedCompanies.includes(newBlacklistedCompany.trim())
    ) {
      setConfig((prev) => ({
        ...prev,
        blacklistedCompanies: [...prev.blacklistedCompanies, newBlacklistedCompany.trim()],
      }));
      setNewBlacklistedCompany('');
    }
  };

  const removeBlacklistedCompany = (company: string) => {
    setConfig((prev) => ({
      ...prev,
      blacklistedCompanies: prev.blacklistedCompanies.filter((c) => c !== company),
    }));
  };

  const toggleSource = (source: string) => {
    setConfig((prev) => ({
      ...prev,
      sources: {
        ...prev.sources,
        [source]: {
          enabled: !(prev.sources[source]?.enabled ?? false),
        },
      },
      // Also update selectedSources for backward compatibility
      selectedSources: prev.selectedSources.includes(source)
        ? prev.selectedSources.filter((s) => s !== source)
        : [...prev.selectedSources, source],
    }));

    // Clear sources error when enabling a source
    if (validationErrors.sources) {
      setValidationErrors((prev) => ({ ...prev, sources: '' }));
    }
  };

  const addLanguage = () => {
    if (
      newLanguage.trim() &&
      !config.filters.languages.some((l) => l.language === newLanguage.trim())
    ) {
      const languageReq: LanguageRequirement = {
        language: newLanguage.trim(),
        level: newLanguageLevel,
      };
      setConfig((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          languages: [...prev.filters.languages, languageReq],
        },
      }));
      setNewLanguage('');
      setNewLanguageLevel('intermediate');

      // Clear languages error when adding a language
      if (validationErrors.languages) {
        setValidationErrors((prev) => ({ ...prev, languages: '' }));
      }
    }
  };

  const removeLanguage = (language: string) => {
    setConfig((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        languages: prev.filters.languages.filter((l) => l.language !== language),
      },
    }));
  };

  const toggleCountry = (country: string) => {
    setConfig((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        countries: prev.filters.countries.includes(country)
          ? prev.filters.countries.filter((c) => c !== country)
          : [...prev.filters.countries, country],
      },
    }));

    // Clear countries error when selecting a country
    if (validationErrors.countries) {
      setValidationErrors((prev) => ({ ...prev, countries: '' }));
    }
  };

  const validateConfig = (config: SearchConfig): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Check if at least one source is enabled
    const enabledSources = Object.values(config.sources).filter((s) => s.enabled);
    if (enabledSources.length === 0) {
      errors.sources = 'Select at least one job source';
    }

    // Check if at least one position is specified
    if (!config.positions || config.positions.length === 0) {
      errors.positions = 'Add at least one search position';
    }

    // Check if at least one country is selected
    if (!config.filters.countries || config.filters.countries.length === 0) {
      errors.countries = 'Select at least one country';
    }

    // Check if at least one language is specified
    if (!config.filters.languages || config.filters.languages.length === 0) {
      errors.languages = 'Add at least one language requirement';
    }

    // Check OpenAI API key if OpenAI source is enabled
    if (config.sources.openai?.enabled && !config.llm?.apiKey?.trim()) {
      errors.apiKey = 'OpenAI API key is required when OpenAI source is enabled';
    }

    return errors;
  };

  const handleStartSearch = () => {
    const errors = validateConfig(config);
    setValidationErrors(errors);

    // Check if there are any validation errors
    const hasErrors = Object.keys(errors).some((key) => errors[key]);

    if (hasErrors) {
      // Show validation errors but don't start search
      console.log('Validation errors found, not starting search:', errors);
      return;
    }

    // No errors, proceed with search
    console.log('Starting search with config:', config);
    onStartSearch(config).catch(console.error);
  };

  return (
    <Card className="h-fit" data-testid="card">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-2"
        data-testid="card-header"
      >
        <CardTitle className="text-lg font-medium flex items-center gap-2" data-testid="card-title">
          <Settings className="h-4 w-4" data-testid="settings-icon" />
          Search Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6" data-testid="card-content">
        {/* Job Positions */}
        <div className="space-y-2">
          <Label
            htmlFor="positions"
            className={validationErrors.positions ? 'text-destructive' : ''}
            data-testid="default"
          >
            Target Positions
          </Label>
          <div className="flex gap-2">
            <Input
              id="positions"
              placeholder="e.g., Senior React Developer"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPosition()}
              className={validationErrors.positions ? 'border-destructive' : ''}
              data-testid="new-position"
            />
            <Button size="sm" onClick={addPosition} data-testid="add-position">
              <Plus className="h-3 w-3" data-testid="plus-icon" />
            </Button>
          </div>
          {validationErrors.positions && (
            <p className="text-sm text-destructive">{validationErrors.positions}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {config.positions.map((position) => (
              <Badge key={position} variant="secondary" className="text-xs" data-testid="badge">
                {position}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removePosition(position)}
                  data-testid={`remove-position-${position}`}
                >
                  <X className="h-2 w-2" data-testid="x-icon" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* API Keys - FR-14: Client-side only storage */}
        <div className="space-y-2">
          <Label data-testid="default">API Keys</Label>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label
                htmlFor="openai-key"
                className={`text-sm font-medium ${validationErrors.apiKey ? 'text-destructive' : ''}`}
                data-testid="default"
              >
                OpenAI API Key
              </Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-..."
                value={config.llm?.apiKey ?? ''}
                onChange={(e) => {
                  const apiKey = e.target.value;
                  setConfig((prev) => ({
                    ...prev,
                    llm: {
                      ...prev.llm,
                      apiKey,
                    },
                  }));

                  // Clear API key error when typing
                  if (validationErrors.apiKey) {
                    setValidationErrors((prev) => ({ ...prev, apiKey: '' }));
                  }
                }}
                className={validationErrors.apiKey ? 'border-destructive' : ''}
                data-testid="openai-api-key"
              />
              {validationErrors.apiKey && (
                <p className="text-sm text-destructive">{validationErrors.apiKey}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {/* FR-14: API key is stored only on client-side localStorage, never on server */}
                Required for LLM enrichment. Stored locally in browser, sent securely to server only
                during search operations. Never persisted on server-side for security and privacy.
              </p>
            </div>
          </div>
        </div>

        {/* Job Sources */}
        <div className="space-y-2">
          <Label
            className={validationErrors.sources ? 'text-destructive' : ''}
            data-testid="default"
          >
            Job Sources
          </Label>
          <div
            className={`grid grid-cols-2 gap-2 ${validationErrors.sources ? 'border border-destructive rounded-md p-3' : ''}`}
          >
            {availableSources.map((source) => (
              <div key={source.id} className="flex items-center space-x-2">
                <Checkbox
                  id={source.id}
                  checked={config.sources[source.id]?.enabled ?? false}
                  onCheckedChange={() => toggleSource(source.id)}
                  data-testid={`source-${source.id}`}
                />
                <Label
                  htmlFor={source.id}
                  className="text-sm"
                  title={source.description}
                  data-testid="default"
                >
                  {source.name}
                </Label>
              </div>
            ))}
          </div>
          {validationErrors.sources && (
            <p className="text-sm text-destructive">{validationErrors.sources}</p>
          )}
        </div>

        {/* Blacklisted Words */}
        <div className="space-y-2">
          <Label htmlFor="blacklisted-words" data-testid="default">
            Blacklisted Words
          </Label>
          <div className="flex gap-2">
            <Input
              id="blacklisted-words"
              placeholder="e.g., unpaid, internship"
              value={newBlacklistedWord}
              onChange={(e) => setNewBlacklistedWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlacklistedWord()}
              data-testid="blacklisted-word"
            />
            <Button size="sm" onClick={addBlacklistedWord} data-testid="add-blacklisted-word">
              <Plus className="h-3 w-3" data-testid="plus-icon" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.blacklistedWords.map((word) => (
              <Badge key={word} variant="destructive" className="text-xs" data-testid="badge">
                {word}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removeBlacklistedWord(word)}
                  data-testid={`remove-blacklisted-word-${word}`}
                >
                  <X className="h-2 w-2" data-testid="x-icon" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Blacklisted Companies */}
        <div className="space-y-2">
          <Label htmlFor="blacklisted-companies" data-testid="default">
            Blacklisted Companies
          </Label>
          <div className="flex gap-2">
            <Input
              id="blacklisted-companies"
              placeholder="e.g., Company Name"
              value={newBlacklistedCompany}
              onChange={(e) => setNewBlacklistedCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlacklistedCompany()}
              data-testid="blacklisted-company"
            />
            <Button size="sm" onClick={addBlacklistedCompany} data-testid="add-blacklisted-company">
              <Plus className="h-3 w-3" data-testid="plus-icon" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.blacklistedCompanies.map((company) => (
              <Badge key={company} variant="destructive" className="text-xs" data-testid="badge">
                {company}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removeBlacklistedCompany(company)}
                  data-testid={`remove-blacklisted-company-${company}`}
                >
                  <X className="h-2 w-2" data-testid="x-icon" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Language Requirements */}
        <div className="space-y-2">
          <Label
            className={`flex items-center gap-2 ${validationErrors.languages ? 'text-destructive' : ''}`}
            data-testid="default"
          >
            <Languages className="h-4 w-4" />
            Language Requirements
          </Label>
          <div className="flex gap-2">
            <Select value={newLanguage} onValueChange={setNewLanguage}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newLanguageLevel}
              onValueChange={(value: (typeof languageLevels)[number]) => setNewLanguageLevel(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageLevels.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addLanguage}>
              <Plus className="h-3 w-3" data-testid="plus-icon" />
            </Button>
          </div>
          {validationErrors.languages && (
            <p className="text-sm text-destructive">{validationErrors.languages}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {config.filters.languages.map((langReq) => (
              <Badge
                key={langReq.language}
                variant="secondary"
                className="text-xs"
                data-testid="badge"
              >
                {langReq.language} ({langReq.level})
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removeLanguage(langReq.language)}
                >
                  <X className="h-2 w-2" data-testid="x-icon" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Country Filters */}
        <div className="space-y-2">
          <Label
            className={`flex items-center gap-2 ${validationErrors.countries ? 'text-destructive' : ''}`}
            data-testid="default"
          >
            <Globe className="h-4 w-4" />
            Allowed Countries ({config.filters.countries.length} selected)
          </Label>
          <div
            className={`grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3 ${validationErrors.countries ? 'border-destructive' : ''}`}
          >
            {availableCountries.map((country) => (
              <div key={country} className="flex items-center space-x-2">
                <Checkbox
                  id={`country-${country}`}
                  checked={config.filters.countries.includes(country)}
                  onCheckedChange={() => toggleCountry(country)}
                />
                <Label htmlFor={`country-${country}`} className="text-sm" data-testid="default">
                  {country}
                </Label>
              </div>
            ))}
          </div>
          {validationErrors.countries && (
            <p className="text-sm text-destructive">{validationErrors.countries}</p>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConfig((prev) => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    countries: availableCountries,
                  },
                }));

                // Clear countries error when selecting all
                if (validationErrors.countries) {
                  setValidationErrors((prev) => ({ ...prev, countries: '' }));
                }
              }}
            >
              Select All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  filters: {
                    ...prev.filters,
                    countries: [],
                  },
                }))
              }
            >
              Clear All
            </Button>
          </div>
        </div>

        {/* Start Search Button */}
        <Button
          onClick={handleStartSearch}
          className="w-full"
          disabled={isSearching}
          data-testid="start-search"
        >
          <Play className="h-4 w-4 mr-2" data-testid="play-icon" />
          {isSearching ? 'Searching...' : 'Start Job Search'}
        </Button>
      </CardContent>
    </Card>
  );
}
