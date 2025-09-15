import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Button } from './ui/button.tsx';
import { Badge } from './ui/badge.tsx';
import { Separator } from './ui/separator.tsx';
import { SearchConfigPanel } from './SearchConfigPanel.tsx';
import { ProgressDashboard } from './ProgressDashboard.tsx';
import { FilteringStatsDashboard } from './FilteringStatsDashboard.tsx';
import { JobListView } from './JobListView.tsx';
import { FavoritesView } from './FavoritesView.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';
import { useJobs } from '../hooks/useJobs.ts';
import {
  useStartSearch,
  useStopSearch,
  usePauseSearch,
  useResumeSearch,
  useSearchProgress,
} from '../hooks/useSearchSessions.ts';
import { useSaveUserConfig } from '../hooks/useUserConfig.ts';
import { useSessions } from '../hooks/useSessions.ts';
// Using HTTP polling for progress updates
import { useToast } from '../hooks/use-toast.ts';
import { queryClient } from '../lib/queryClient.ts';
import { BarChart3, Briefcase, Heart, Search, Settings, TrendingUp, Zap } from 'lucide-react';
import type { JobPost, ProgressData, SearchConfig } from '../../../shared/schema.ts';

// Real data is now fetched from API hooks above

type ViewMode = 'config' | 'progress' | 'results' | 'favorites';

export function MainDashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('config');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Toast hook
  const { toast } = useToast();

  // API hooks
  const { data: jobsResponse, isLoading: _jobsLoading } = useJobs();
  const startSearchMutation = useStartSearch();
  const stopSearchMutation = useStopSearch();
  const pauseSearchMutation = usePauseSearch();
  const resumeSearchMutation = useResumeSearch();
  const { data: progressData, isLoading: progressLoading } = useSearchProgress(currentSessionId);
  const saveUserConfigMutation = useSaveUserConfig();

  // Sessions management
  const { sessions, currentSession, addSession, updateSession, setCurrentSession, syncWithServer } =
    useSessions();

  // Using HTTP polling for progress updates

  const jobs = jobsResponse?.jobs ?? [];
  const progressUnion = (progressData ?? null) as ProgressData | null;
  const normalizedProgress: ProgressData = progressUnion ?? {
    currentStage: 1,
    status: 'running',
    totalJobs: 0,
    processedJobs: 0,
    filteredJobs: 0,
    enrichedJobs: 0,
    totalCost: 0,
    estimatedTimeRemaining: 0,
    processingSpeed: 0,
  };
  const isCompleted =
    normalizedProgress.status === 'completed' ||
    normalizedProgress.status === 'error' ||
    normalizedProgress.status === 'stopped';
  const isSearching = !isPaused && currentSessionId !== null && !isCompleted;

  // When backend process finishes, switch to results but keep sessionId to allow viewing progress snapshot
  useEffect(() => {
    if (currentSessionId && isCompleted) {
      setIsPaused(false);
      setViewMode('results');
      // Invalidate jobs cache to refresh the jobs list
      void queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
    }
  }, [currentSessionId, isCompleted]);

  // Sync sessions with server on mount
  useEffect(() => {
    void syncWithServer();
  }, [syncWithServer]);

  // Update session when currentSessionId changes
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find((s) => s.sessionId === currentSessionId);
      if (session) {
        setCurrentSession(session.sessionId);
      }
    } else {
      setCurrentSession(null);
    }
  }, [currentSessionId, sessions, setCurrentSession]);

  // Update session progress when progress data changes
  useEffect(() => {
    if (currentSessionId && progressData) {
      const status =
        progressData.status === 'running'
          ? 'running'
          : progressData.status === 'completed'
            ? 'completed'
            : progressData.status === 'error'
              ? 'error'
              : progressData.status === 'stopped'
                ? 'stopped'
                : 'paused';

      updateSession(currentSessionId, {
        status,
        currentStage:
          progressData.currentStage === 1
            ? 'collecting'
            : progressData.currentStage === 2
              ? 'filtering'
              : progressData.currentStage === 3
                ? 'enriching'
                : 'completed',
        lastUpdate: new Date().toISOString(),
        canResume: status === 'paused' || status === 'stopped',
        hasResults: progressData.processedJobs > 0,
      });
    }
  }, [currentSessionId, progressData, updateSession]);

  // Using HTTP polling for progress updates

  // Progress updates handled by HTTP polling via useSearchProgress hook

  const handleStartSearch = async (config: SearchConfig) => {
    console.log('🏠 [REACT] Starting search with config:', config);
    try {
      const result = await startSearchMutation.mutateAsync(config);
      console.log('🏠 [REACT] Search started, setting sessionId:', result.sessionId);

      // Add session to local storage
      const sessionInfo = {
        sessionId: result.sessionId,
        status: 'running' as const,
        currentStage: 'collecting' as const,
        startTime: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        settings: {
          positions: config.positions,
          sources: config.sources.jobSites || [],
          filters: {
            blacklistedCompanies: config.blacklistedCompanies,
            countries: config.filters.countries,
          },
        },
        canResume: false,
        hasResults: false,
      };

      addSession(sessionInfo);
      setCurrentSessionId(result.sessionId);
      setViewMode('progress');
      setIsPaused(false);

      toast({
        title: 'Search Started',
        description: 'Your job search has been initiated successfully.',
      });
    } catch (error) {
      console.error('🏠 [REACT] Failed to start search:', error);
      toast({
        title: 'Search Failed',
        description: 'Failed to start the job search. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleResumeSearch = async () => {
    if (!currentSessionId || !currentSession) return;

    try {
      // Create config from current session settings
      const config: SearchConfig & { sessionId: string } = {
        sessionId: currentSessionId,
        positions: currentSession.settings.positions,
        blacklistedCompanies: currentSession.settings.filters.blacklistedCompanies,
        blacklistedWords: [], // Will be populated from user config
        sources: {
          jobSites: currentSession.settings.sources,
        },
        llm: {
          apiKey: '', // Will need to be populated from user config
        },
        filters: {
          locations: [],
          employmentTypes: [],
          remoteTypes: [],
          languages: [],
          countries: currentSession.settings.filters.countries,
        },
      };

      const result = await resumeSearchMutation.mutateAsync(config);
      console.log('▶️ Search resumed, sessionId:', result.sessionId);

      setCurrentSessionId(result.sessionId);
      setViewMode('progress');
      setIsPaused(false);

      toast({
        title: 'Search Resumed',
        description: 'Your job search has been resumed successfully.',
      });
    } catch (error) {
      console.error('Failed to resume search:', error);
      toast({
        title: 'Resume Failed',
        description: 'Failed to resume the search. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePauseResume = async () => {
    if (!currentSessionId) return;

    try {
      if (isPaused) {
        // Resume search
        await handleResumeSearch();
      } else {
        // Pause search
        await pauseSearchMutation.mutateAsync(currentSessionId);
        setIsPaused(true);
        toast({
          title: 'Search Paused',
          description: 'Your job search has been paused.',
        });
      }
    } catch (error) {
      console.error('Failed to pause/resume search:', error);
      toast({
        title: 'Operation Failed',
        description: 'Failed to pause/resume the search. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStopSearch = async () => {
    console.log('Stop search');
    if (currentSessionId) {
      try {
        await stopSearchMutation.mutateAsync(currentSessionId);
        setCurrentSessionId(null);
        setIsPaused(false);
        // Invalidate jobs cache to refresh the jobs list
        void queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
        toast({
          title: 'Search Stopped',
          description: 'Your job search has been stopped.',
        });
      } catch (error) {
        console.error('Failed to stop search:', error);
        toast({
          title: 'Stop Failed',
          description: 'Failed to stop the search. Please try again.',
          variant: 'destructive',
        });
      }
    }
    setViewMode('results');
  };

  const handleJobAction = async (job: JobPost, action: 'skip' | 'defer' | 'blacklist') => {
    console.log(`${action} job:`, job.id);
    try {
      // Update job status via API
      await fetch(`/api/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: action === 'blacklist' ? 'blacklisted' : 'skipped',
          statusReason: action,
        }),
      });

      // If blacklisting, also add the company to blacklist and update search config
      if (action === 'blacklist' && job.company) {
        try {
          await saveUserConfigMutation.mutateAsync({
            blacklistedCompanies: [job.company], // This will be merged with existing blacklist
          });
          console.log(`Added ${job.company} to blacklist`);
        } catch (configError) {
          console.error('Failed to update blacklist config:', configError);
        }
      }

      // Refresh jobs list
      void queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });

      const actionMessage =
        action === 'blacklist'
          ? `Job blacklisted and ${job.company} added to company blacklist.`
          : `Job has been ${action === 'skip' ? 'skipped' : 'deferred'}.`;

      toast({
        title: 'Job Updated',
        description: actionMessage,
      });
    } catch (error) {
      console.error(`Failed to ${action} job:`, error);
      toast({
        title: 'Update Failed',
        description: `Failed to ${action} the job. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const getActiveJobs = () =>
    jobs.filter((job) => job.status !== 'skipped' && job.status !== 'blacklisted');
  const getEnrichedJobs = () => jobs.filter((job) => job.status === 'enriched');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary text-primary-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Remote Job Scout</h1>
                  <p className="text-sm text-muted-foreground">AI-powered remote job discovery</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Session Status Indicator */}
              {currentSession && (
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      currentSession.status === 'running'
                        ? 'bg-green-500 animate-pulse'
                        : currentSession.status === 'paused'
                          ? 'bg-yellow-500'
                          : currentSession.status === 'stopped'
                            ? 'bg-orange-500'
                            : currentSession.status === 'error'
                              ? 'bg-red-500'
                              : 'bg-blue-500'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {currentSession.status === 'running'
                        ? 'Searching...'
                        : currentSession.status === 'paused'
                          ? 'Paused'
                          : currentSession.status === 'stopped'
                            ? 'Stopped'
                            : currentSession.status === 'error'
                              ? 'Error'
                              : 'Completed'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Stage: {currentSession.currentStage}
                      {currentSession.canResume && currentSession.status !== 'running' && (
                        <span className="ml-1 text-blue-600">(Resumable)</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Sessions Count */}
              {sessions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}

              {/* Quick Stats */}
              {jobs.length > 0 && (
                <div className="flex items-center gap-3 text-sm">
                  <Badge variant="secondary">{getActiveJobs().length} Active</Badge>
                  <Badge variant="default">{getEnrichedJobs().length} Enriched</Badge>
                </div>
              )}

              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'config' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('config')}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              data-testid="button-nav-config"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuration
            </Button>
            <Button
              variant={viewMode === 'progress' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('progress')}
              disabled={!isSearching && !isCompleted && jobs.length === 0}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              data-testid="button-nav-progress"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Progress
            </Button>
            <Button
              variant={viewMode === 'results' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('results')}
              disabled={jobs.length === 0}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              data-testid="button-nav-results"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Results ({jobs.length})
            </Button>
            <Button
              variant={viewMode === 'favorites' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('favorites')}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              data-testid="button-nav-favorites"
            >
              <Heart className="h-4 w-4 mr-2" />
              Favorites
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {viewMode === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SearchConfigPanel onStartSearch={handleStartSearch} isSearching={isSearching} />
            </div>
            <div className="space-y-6">
              {/* Welcome Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Getting Started
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">1. Configure Search</h4>
                    <p className="text-sm text-muted-foreground">
                      Set up your target positions, blacklists, and preferred job sources.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">2. Start Search</h4>
                    <p className="text-sm text-muted-foreground">
                      Our AI will collect, filter, and enrich job listings in real-time.
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-medium">3. Review Results</h4>
                    <p className="text-sm text-muted-foreground">
                      Browse enriched job listings with structured data and company insights.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Features Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Platform Features
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>Multi-source job aggregation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>Intelligent pre-filtering</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>AI-powered data enrichment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>Real-time progress tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      <span>Cost monitoring & optimization</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {viewMode === 'progress' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProgressDashboard
                progress={normalizedProgress}
                session={currentSession}
                onPauseResume={handlePauseResume}
                onStop={handleStopSearch}
                onResume={handleResumeSearch}
              />

              {/* Filtering Statistics - show when filtering stage is completed or in progress */}
              {(normalizedProgress.currentStage >= 2 || normalizedProgress.filteringStats) && (
                <FilteringStatsDashboard
                  filteringStats={normalizedProgress.filteringStats}
                  isVisible={normalizedProgress.processedJobs > 0}
                />
              )}
            </div>
            <div className="space-y-6">
              {/* Live Updates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Live Updates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {progressLoading ? (
                    <div className="text-sm text-muted-foreground">Loading progress...</div>
                  ) : progressUnion ? (
                    <>
                      <div className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Current Stage</span>
                          <Badge variant="default">Stage {normalizedProgress.currentStage}</Badge>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Speed</span>
                          <span className="font-mono">
                            {normalizedProgress.processingSpeed.toFixed(1)} jobs/min
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Cost</span>
                          <span className="font-mono">
                            ${normalizedProgress.totalCost.toFixed(4)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <Badge
                            variant={
                              normalizedProgress.status === 'running' ? 'default' : 'secondary'
                            }
                          >
                            {normalizedProgress.status}
                          </Badge>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No progress data available</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {viewMode === 'results' && <JobListView jobs={jobs} onJobAction={handleJobAction} />}
        {viewMode === 'favorites' && <FavoritesView />}
      </main>
    </div>
  );
}
