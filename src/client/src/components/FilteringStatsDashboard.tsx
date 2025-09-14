import { Card, CardContent, CardHeader, CardTitle } from './ui/card.tsx';
import { Badge } from './ui/badge.tsx';
import { Progress } from './ui/progress.tsx';
import { AlertTriangle, CheckCircle, XCircle, Filter } from 'lucide-react';
import type { FilteringStats } from '../../../shared/schema.ts';

interface FilteringStatsDashboardProps {
  filteringStats?: FilteringStats;
  isVisible?: boolean;
}

const reasonLabels: {
  [key: string]: { label: string; icon: React.ComponentType<any>; color: string };
} = {
  company_blacklisted: { label: 'Company Blacklisted', icon: XCircle, color: 'bg-red-500' },
  title_blacklisted_words: {
    label: 'Blacklisted Words in Title',
    icon: AlertTriangle,
    color: 'bg-orange-500',
  },
  description_blacklisted_words: {
    label: 'Blacklisted Words in Description',
    icon: AlertTriangle,
    color: 'bg-orange-500',
  },
  country_not_allowed: { label: 'Country Not Allowed', icon: XCircle, color: 'bg-red-500' },
  language_not_required: {
    label: 'Language Not Required',
    icon: AlertTriangle,
    color: 'bg-yellow-500',
  },
  work_time_mismatch: { label: 'Work Time Mismatch', icon: AlertTriangle, color: 'bg-yellow-500' },
  unknown: { label: 'Other Reasons', icon: AlertTriangle, color: 'bg-gray-500' },
};

export function FilteringStatsDashboard({
  filteringStats,
  isVisible = true,
}: FilteringStatsDashboardProps) {
  if (!isVisible || !filteringStats) {
    return null;
  }

  const { totalFiltered, totalSkipped, skipReasons } = filteringStats;
  const totalProcessed = totalFiltered + totalSkipped;
  const filteredPercentage = totalProcessed > 0 ? (totalFiltered / totalProcessed) * 100 : 0;
  const skippedPercentage = totalProcessed > 0 ? (totalSkipped / totalProcessed) * 100 : 0;

  // Sort reasons by count (descending)
  const sortedReasons = Object.entries(skipReasons)
    .sort(([, countA], [, countB]) => countB - countA)
    .filter(([, count]) => count > 0);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtering Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalProcessed}</div>
            <div className="text-sm text-muted-foreground">Total Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalFiltered}</div>
            <div className="text-sm text-muted-foreground">Jobs Passed</div>
            <div className="text-xs text-muted-foreground">{filteredPercentage.toFixed(1)}%</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{totalSkipped}</div>
            <div className="text-sm text-muted-foreground">Jobs Filtered Out</div>
            <div className="text-xs text-muted-foreground">{skippedPercentage.toFixed(1)}%</div>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Passed Jobs</span>
            </div>
            <span className="font-medium">{totalFiltered}</span>
          </div>
          <Progress value={filteredPercentage} className="h-3" />

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>Filtered Out</span>
            </div>
            <span className="font-medium">{totalSkipped}</span>
          </div>
          <Progress value={skippedPercentage} className="h-3" />
        </div>

        {/* Skip Reasons */}
        {sortedReasons.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Filter Reasons</h4>
            <div className="space-y-2">
              {sortedReasons.map(([reason, count]) => {
                const config = reasonLabels[reason] || reasonLabels.unknown;
                const percentage = totalSkipped > 0 ? (count / totalSkipped) * 100 : 0;
                const IconComponent = config.icon;

                return (
                  <div
                    key={reason}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${config.color} text-white`}>
                        <IconComponent className="h-3 w-3" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{config.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {count} jobs ({percentage.toFixed(1)}%)
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {sortedReasons.length === 0 && totalProcessed === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <div className="text-sm">No filtering data available yet</div>
            <div className="text-xs">Statistics will appear once jobs are processed</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
