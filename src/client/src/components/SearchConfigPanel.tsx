import { useEffect, useState } from 'react';
import { Button } from './ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';
import { Checkbox } from './ui/checkbox.tsx';
import { Badge } from './ui/badge.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.tsx';
import { Play, Plus, Settings, X, Globe, Clock, Languages } from 'lucide-react';
import type {
  SearchConfig,
  LanguageRequirement,
  CountryFilter,
  AVAILABLE_SOURCES,
} from '../shared/schema.ts';

const defaultConfig: SearchConfig = {
  positions: ['Senior React Developer', 'Frontend Engineer'],
  blacklistedWords: ['unpaid', 'internship', 'commission'],
  blacklistedCompanies: [],
  selectedSources: ['indeed', 'linkedin', 'openai'],
  filters: {
    locations: ['Remote', 'United States', 'Europe'],
    employmentTypes: ['Full-time'],
    remoteTypes: ['Fully Remote', 'Hybrid'],
    languages: [{ language: 'English', level: 'advanced' }],
    countries: [{ country: 'United States', type: 'whitelist' }],
    workTime: {
      timezone: 'America/New_York',
      startHour: 9,
      endHour: 17,
      daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
    },
  },
};

const availableSources = AVAILABLE_SOURCES;

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

const timezones = [
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'UTC',
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
  const [newCountry, setNewCountry] = useState('');
  const [newCountryType, setNewCountryType] = useState<'whitelist' | 'blacklist'>('whitelist');

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
      selectedSources: prev.selectedSources.includes(source)
        ? prev.selectedSources.filter((s) => s !== source)
        : [...prev.selectedSources, source],
    }));
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

  const addCountry = () => {
    if (
      newCountry.trim() &&
      !config.filters.countries.some((c) => c.country === newCountry.trim())
    ) {
      const countryFilter: CountryFilter = {
        country: newCountry.trim(),
        type: newCountryType,
      };
      setConfig((prev) => ({
        ...prev,
        filters: {
          ...prev.filters,
          countries: [...prev.filters.countries, countryFilter],
        },
      }));
      setNewCountry('');
      setNewCountryType('whitelist');
    }
  };

  const removeCountry = (country: string) => {
    setConfig((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        countries: prev.filters.countries.filter((c) => c.country !== country),
      },
    }));
  };

  const updateWorkTime = (field: keyof typeof config.filters.workTime, value: any) => {
    setConfig((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        workTime: {
          ...prev.filters.workTime,
          [field]: value,
        },
      },
    }));
  };

  const toggleWorkDay = (day: number) => {
    setConfig((prev) => ({
      ...prev,
      filters: {
        ...prev.filters,
        workTime: {
          ...prev.filters.workTime,
          daysOfWeek: prev.filters.workTime.daysOfWeek.includes(day)
            ? prev.filters.workTime.daysOfWeek.filter((d) => d !== day)
            : [...prev.filters.workTime.daysOfWeek, day].sort(),
        },
      },
    }));
  };

  const handleStartSearch = () => {
    console.log('Starting search with config:', config);
    onStartSearch(config).catch(console.error);
  };

  return (
    <Card className="h-fit">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Search Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Job Positions */}
        <div className="space-y-2">
          <Label htmlFor="positions">Target Positions</Label>
          <div className="flex gap-2">
            <Input
              id="positions"
              placeholder="e.g., Senior React Developer"
              value={newPosition}
              onChange={(e) => setNewPosition(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPosition()}
              data-testid="input-new-position"
            />
            <Button size="sm" onClick={addPosition} data-testid="button-add-position">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.positions.map((position) => (
              <Badge key={position} variant="secondary" className="text-xs">
                {position}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removePosition(position)}
                  data-testid={`button-remove-position-${position}`}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Job Sources */}
        <div className="space-y-2">
          <Label>Job Sources</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableSources.map((source) => (
              <div key={source.id} className="flex items-center space-x-2">
                <Checkbox
                  id={source.id}
                  checked={config.selectedSources.includes(source.id)}
                  onCheckedChange={() => toggleSource(source.id)}
                  data-testid={`checkbox-source-${source.id}`}
                />
                <Label htmlFor={source.id} className="text-sm" title={source.description}>
                  {source.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Blacklisted Words */}
        <div className="space-y-2">
          <Label htmlFor="blacklisted-words">Blacklisted Words</Label>
          <div className="flex gap-2">
            <Input
              id="blacklisted-words"
              placeholder="e.g., unpaid, internship"
              value={newBlacklistedWord}
              onChange={(e) => setNewBlacklistedWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlacklistedWord()}
              data-testid="input-blacklisted-word"
            />
            <Button
              size="sm"
              onClick={addBlacklistedWord}
              data-testid="button-add-blacklisted-word"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.blacklistedWords.map((word) => (
              <Badge key={word} variant="destructive" className="text-xs">
                {word}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removeBlacklistedWord(word)}
                  data-testid={`button-remove-blacklisted-word-${word}`}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Blacklisted Companies */}
        <div className="space-y-2">
          <Label htmlFor="blacklisted-companies">Blacklisted Companies</Label>
          <div className="flex gap-2">
            <Input
              id="blacklisted-companies"
              placeholder="e.g., Company Name"
              value={newBlacklistedCompany}
              onChange={(e) => setNewBlacklistedCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addBlacklistedCompany()}
              data-testid="input-blacklisted-company"
            />
            <Button
              size="sm"
              onClick={addBlacklistedCompany}
              data-testid="button-add-blacklisted-company"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.blacklistedCompanies.map((company) => (
              <Badge key={company} variant="destructive" className="text-xs">
                {company}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removeBlacklistedCompany(company)}
                  data-testid={`button-remove-blacklisted-company-${company}`}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Language Requirements */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
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
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.filters.languages.map((langReq) => (
              <Badge key={langReq.language} variant="secondary" className="text-xs">
                {langReq.language} ({langReq.level})
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removeLanguage(langReq.language)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Country Filters */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Country Filters
          </Label>
          <div className="flex gap-2">
            <Select value={newCountry} onValueChange={setNewCountry}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {availableCountries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={newCountryType}
              onValueChange={(value: 'whitelist' | 'blacklist') => setNewCountryType(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whitelist">Whitelist</SelectItem>
                <SelectItem value="blacklist">Blacklist</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={addCountry}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {config.filters.countries.map((countryFilter) => (
              <Badge
                key={countryFilter.country}
                variant={countryFilter.type === 'whitelist' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {countryFilter.country} ({countryFilter.type})
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 ml-1"
                  onClick={() => removeCountry(countryFilter.country)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Work Time Window */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Work Time Window
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm">
                Timezone
              </Label>
              <Select
                value={config.filters.workTime.timezone}
                onValueChange={(value) => updateWorkTime('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Working Hours</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="Start"
                  value={config.filters.workTime.startHour}
                  onChange={(e) => updateWorkTime('startHour', parseInt(e.target.value) || 9)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">-</span>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="End"
                  value={config.filters.workTime.endHour}
                  onChange={(e) => updateWorkTime('endHour', parseInt(e.target.value) || 17)}
                  className="w-20"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Working Days</Label>
            <div className="flex gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                <Button
                  key={day}
                  variant={
                    config.filters.workTime.daysOfWeek.includes(index) ? 'default' : 'outline'
                  }
                  size="sm"
                  className="h-8 w-10 text-xs"
                  onClick={() => toggleWorkDay(index)}
                >
                  {day}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Start Search Button */}
        <Button
          onClick={handleStartSearch}
          className="w-full"
          disabled={
            isSearching || config.positions.length === 0 || config.selectedSources.length === 0
          }
          data-testid="button-start-search"
        >
          <Play className="h-4 w-4 mr-2" />
          {isSearching ? 'Searching...' : 'Start Job Search'}
        </Button>
      </CardContent>
    </Card>
  );
}
