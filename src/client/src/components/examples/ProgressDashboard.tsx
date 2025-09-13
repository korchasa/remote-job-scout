import { ProgressDashboard } from '../ProgressDashboard.tsx';

export default function ProgressDashboardExample() {
  const mockProgress = {
    currentStage: 2 as const,
    status: 'running' as const,
    totalJobs: 150,
    processedJobs: 120,
    filteredJobs: 85,
    enrichedJobs: 45,
    totalCost: 2.3456,
    estimatedTimeRemaining: 420, // 7 minutes
    processingSpeed: 12.5,
  };

  const handlePauseResume = () => {
    console.log('Pause/Resume clicked');
  };

  const handleStop = () => {
    console.log('Stop clicked');
  };

  return (
    <ProgressDashboard
      progress={mockProgress}
      onPauseResume={handlePauseResume}
      onStop={handleStop}
    />
  );
}
