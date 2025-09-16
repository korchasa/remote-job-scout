/**
 * ProgressDashboard Component
 *
 * Displays real-time progress information for multi-stage job search processes.
 * Enhanced with ETA (Estimated Time of Arrival) calculations and confidence indicators.
 *
 * ## Features:
 * - Real-time progress tracking across 3 stages (Collect → Filter → Enrich)
 * - ETA calculation with confidence levels for overall process and individual stages
 * - Color-coded confidence indicators (green ≥80%, yellow 50-79%, red <50%)
 * - Item count display for each processing stage
 * - Pause/resume/stop controls with session management
 *
 * ## ETA Integration:
 * - Uses ETAService for time formatting and confidence visualization
 * - Displays overall ETA with fallback to legacy estimatedTimeRemaining
 * - Shows stage-specific ETA only for currently active stages
 * - Confidence indicators help users understand ETA reliability
 */

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
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import type { ProgressData, ClientSessionInfo } from '../../../shared/schema.ts';
import { ETAService } from '../../../services/etaService.js';

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

  const formatETA = (seconds: number) => {
    return ETAService.formatETA(seconds);
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (confidence?: number) => {
    if (!confidence) return <AlertCircle className="h-3 w-3" />;
    if (confidence >= 0.8) return <TrendingUp className="h-3 w-3" />;
    if (confidence >= 0.5) return <AlertCircle className="h-3 w-3" />;
    return <AlertCircle className="h-3 w-3" />;
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

            // Get stage-specific ETA data
            const stageKey =
              stage.id === 1 ? 'collecting' : stage.id === 2 ? 'filtering' : 'enriching';
            const stageData = progress.stages?.[stageKey];
            const stageETA = stageData?.etaSeconds;
            const stageConfidence = stageData?.etaConfidence;

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
                    <div className="flex-1">
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-xs text-muted-foreground">{stage.description}</div>
                      {stageETA && isActive && (
                        <div
                          className={`text-xs flex items-center gap-1 mt-1 ${getConfidenceColor(stageConfidence)}`}
                        >
                          {getConfidenceIcon(stageConfidence)}
                          <span>ETA: {formatETA(stageETA)}</span>
                          {stageConfidence && (
                            <span className="text-xs opacity-75">
                              ({Math.round(stageConfidence * 100)}% confidence)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{stageProgress.toFixed(0)}%</div>
                    {stageData && (
                      <div className="text-xs text-muted-foreground">
                        {stageData.itemsProcessed}/{stageData.itemsTotal || 0} items
                      </div>
                    )}
                  </div>
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
              <div className="text-right">
                <div className="font-mono text-sm" data-testid="text-time-remaining">
                  {progress.overallETA
                    ? formatETA(progress.overallETA)
                    : formatTime(progress.estimatedTimeRemaining)}
                </div>
                {progress.etaConfidence && (
                  <div
                    className={`text-xs flex items-center justify-end gap-1 ${getConfidenceColor(progress.etaConfidence)}`}
                  >
                    {getConfidenceIcon(progress.etaConfidence)}
                    <span>{Math.round(progress.etaConfidence * 100)}% confidence</span>
                  </div>
                )}
              </div>
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
