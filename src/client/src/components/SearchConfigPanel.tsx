import { useEffect, useState } from "react";
import { Button } from "./ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.tsx";
import { Input } from "./ui/input.tsx";
import { Label } from "./ui/label.tsx";
import { Textarea as _Textarea } from "./ui/textarea.tsx";
import { Checkbox } from "./ui/checkbox.tsx";
import { Badge } from "./ui/badge.tsx";
import { Play, Plus, Settings, X } from "lucide-react";
import type { SearchConfig } from "../shared/schema.ts";

const defaultConfig: SearchConfig = {
  positions: ["Senior React Developer", "Frontend Engineer"],
  blacklistedWords: ["unpaid", "internship", "commission"],
  blacklistedCompanies: [],
  selectedSources: ["Indeed", "LinkedIn", "OpenAI"],
  filters: {
    locations: ["Remote", "United States", "Europe"],
    employmentTypes: ["Full-time"],
    remoteTypes: ["Fully Remote", "Hybrid"],
  },
};

const availableSources = [
  "Indeed",
  "LinkedIn",
  "OpenAI",
];

interface SearchConfigPanelProps {
  onStartSearch: (config: SearchConfig) => void;
  isSearching?: boolean;
}

export function SearchConfigPanel(
  { onStartSearch, isSearching = false }: SearchConfigPanelProps,
) {
  const [config, setConfig] = useState<SearchConfig>(defaultConfig);
  const [newPosition, setNewPosition] = useState("");
  const [newBlacklistedWord, setNewBlacklistedWord] = useState("");
  const [newBlacklistedCompany, setNewBlacklistedCompany] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("remote-job-scout-config");
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (_e) {
        console.log("Failed to parse saved config, using defaults");
      }
    }
  }, []);

  // Save to localStorage on config change
  useEffect(() => {
    localStorage.setItem("remote-job-scout-config", JSON.stringify(config));
  }, [config]);

  const addPosition = () => {
    if (newPosition.trim() && !config.positions.includes(newPosition.trim())) {
      setConfig((prev) => ({
        ...prev,
        positions: [...prev.positions, newPosition.trim()],
      }));
      setNewPosition("");
    }
  };

  const removePosition = (position: string) => {
    setConfig((prev) => ({
      ...prev,
      positions: prev.positions.filter((p) => p !== position),
    }));
  };

  const addBlacklistedWord = () => {
    if (
      newBlacklistedWord.trim() &&
      !config.blacklistedWords.includes(newBlacklistedWord.trim())
    ) {
      setConfig((prev) => ({
        ...prev,
        blacklistedWords: [...prev.blacklistedWords, newBlacklistedWord.trim()],
      }));
      setNewBlacklistedWord("");
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
        blacklistedCompanies: [
          ...prev.blacklistedCompanies,
          newBlacklistedCompany.trim(),
        ],
      }));
      setNewBlacklistedCompany("");
    }
  };

  const removeBlacklistedCompany = (company: string) => {
    setConfig((prev) => ({
      ...prev,
      blacklistedCompanies: prev.blacklistedCompanies.filter((c) =>
        c !== company
      ),
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

  const handleStartSearch = () => {
    console.log("Starting search with config:", config);
    onStartSearch(config);
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
              onKeyDown={(e) => e.key === "Enter" && addPosition()}
              data-testid="input-new-position"
            />
            <Button
              size="sm"
              onClick={addPosition}
              data-testid="button-add-position"
            >
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
                  onClick={() =>
                    removePosition(position)}
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
              <div key={source} className="flex items-center space-x-2">
                <Checkbox
                  id={source}
                  checked={config.selectedSources.includes(source)}
                  onCheckedChange={() =>
                    toggleSource(source)}
                  data-testid={`checkbox-source-${source}`}
                />
                <Label htmlFor={source} className="text-sm">{source}</Label>
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
              onKeyDown={(e) => e.key === "Enter" && addBlacklistedWord()}
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
                  onClick={() =>
                    removeBlacklistedWord(word)}
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
              onKeyDown={(e) => e.key === "Enter" && addBlacklistedCompany()}
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
                  onClick={() =>
                    removeBlacklistedCompany(company)}
                  data-testid={`button-remove-blacklisted-company-${company}`}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Start Search Button */}
        <Button
          onClick={handleStartSearch}
          className="w-full"
          disabled={isSearching || config.positions.length === 0 ||
            config.selectedSources.length === 0}
          data-testid="button-start-search"
        >
          <Play className="h-4 w-4 mr-2" />
          {isSearching ? "Searching..." : "Start Job Search"}
        </Button>
      </CardContent>
    </Card>
  );
}
