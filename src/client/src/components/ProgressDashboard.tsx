import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Progress } from './ui/progress.tsx';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import {
  Brain,
  CheckCircle,
  Clock,
  DollarSign,
  Filter,
  Pause,
  Search,
  RotateCcw,
  Square,
} from 'lucide-react';
import type { ProgressData, ClientSessionInfo } from '../../../shared/schema.ts';

interface ProgressDashboardProps {
  progress: ProgressData;
  session?: ClientSessionInfo | null;
  onPauseResume: () => void | Promise<void>;
  onStop: () => void | Promise<void>;
  onResume?: () => void | Promise<void>;
}

const stages = [
  {
    id: 1 as const,
    name: 'Job Collection',
    icon: Search,
    description: 'Gathering jobs from selected sources',
  },
  {
    id: 2 as const,
    name: 'Pre-filtering',
    icon: Filter,
    description: 'Applying blacklists and basic filters',
  },
  {
    id: 3 as const,
    name: 'LLM Enrichment',
    icon: Brain,
    description: 'Extracting structured data with AI',
  },
];

export function ProgressDashboard({
  progress,
  session,
  onPauseResume,
  onStop,
  onResume,
}: ProgressDashboardProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const getStageProgress = (stageId: number) => {
    if (stageId < progress.currentStage) return 100;
    if (stageId > progress.currentStage) return 0;

    switch (stageId) {
      case 1:
        return progress.totalJobs > 0 ? (progress.processedJobs / progress.totalJobs) * 100 : 0;
      case 2:
        return progress.processedJobs > 0
          ? (progress.filteredJobs / progress.processedJobs) * 100
          : 0;
      case 3:
        return progress.filteredJobs > 0
          ? (progress.enrichedJobs / progress.filteredJobs) * 100
          : 0;
      default:
        return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const isRunning = progress.status === 'running';
  const isCompleted = progress.status === 'completed';
  const isPaused = progress.status === 'paused';
  const isStopped = progress.status === 'stopped';
  const canResume = session?.canResume ?? (isPaused || isStopped);

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Search Progress</CardTitle>
          <Badge variant="secondary" className={`${getStatusColor(progress.status)} text-white`}>
            {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Jobs Found</div>
              <div className="text-2xl font-bold" data-testid="text-total-jobs">
                {progress.totalJobs}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Jobs Processed</div>
              <div className="text-2xl font-bold" data-testid="text-processed-jobs">
                {progress.processedJobs}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Filtered Jobs</div>
              <div className="text-2xl font-bold text-green-600" data-testid="text-filtered-jobs">
                {progress.filteredJobs}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Enriched Jobs</div>
              <div className="text-2xl font-bold text-blue-600" data-testid="text-enriched-jobs">
                {progress.enrichedJobs}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Processing Stages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stages.map((stage) => {
            const stageProgress = getStageProgress(stage.id);
            const isActive = stage.id === progress.currentStage;
            const isComplete = stage.id < progress.currentStage;

            return (
              <div key={stage.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`p-1 rounded ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : isComplete
                            ? 'bg-green-500 text-white'
                            : 'bg-muted'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <stage.icon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-xs text-muted-foreground">{stage.description}</div>
                    </div>
                  </div>
                  <div className="text-sm font-medium">{stageProgress.toFixed(0)}%</div>
                </div>
                <Progress value={stageProgress} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Time Remaining</span>
              </div>
              <span className="font-mono text-sm" data-testid="text-time-remaining">
                {formatTime(progress.estimatedTimeRemaining)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Cost</span>
              </div>
              <span className="font-mono text-sm" data-testid="text-total-cost">
                {formatCost(progress.totalCost)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Processing Speed</span>
              <span className="font-mono text-sm" data-testid="text-processing-speed">
                {progress.processingSpeed.toFixed(1)} jobs/min
              </span>
            </div>
            {progress.enrichmentStats && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Tokens Used</span>
                <span className="font-mono text-sm" data-testid="text-tokens-used">
                  {progress.enrichmentStats.tokensUsed.toLocaleString()}
                </span>
              </div>
            )}
            {progress.enrichmentStats && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Sources Count</span>
                <span className="font-mono text-sm" data-testid="text-sources-count">
                  {progress.enrichmentStats.sourcesCount}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      {!isCompleted && (
        <div className="flex gap-2">
          {isRunning && (
            <Button
              variant="secondary"
              onClick={() => void onPauseResume()}
              className="flex-1"
              data-testid="button-pause"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}

          {canResume && !isRunning && (
            <Button
              variant="default"
              onClick={() => void (onResume ? onResume() : onPauseResume())}
              className="flex-1"
              data-testid="button-resume"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resume
            </Button>
          )}

          <Button
            variant="destructive"
            onClick={() => void onStop()}
            className="flex-1"
            data-testid="button-stop"
          >
            <Square className="h-4 w-4 mr-2" />
            Stop Search
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="flex gap-2">
          {canResume && onResume && (
            <Button
              variant="default"
              onClick={() => void onResume()}
              className="flex-1"
              data-testid="button-resume-completed"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Resume Search
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.reload()} className="flex-1">
            Start New Search
          </Button>
        </div>
      )}
    </div>
  );
}
